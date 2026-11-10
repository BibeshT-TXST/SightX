"""
Worker message-handling tests.

AWS clients, Postgres and the predictor are replaced with in-memory
stand-ins, so this runs without torch, credentials or a database:

    cd inference-engine && python -m unittest tests.test_worker

Run it in its own process: it installs stub modules for boto3, psycopg and
predictor before importing worker.
"""

import datetime
import json
import os
import sys
import types
import unittest
from unittest import mock

# ── Stub external modules before importing worker ────────────────────────────
os.environ.update(INFERENCE_QUEUE_URL='queue-url', DB_HOST='db-host', DB_PASSWORD='dev')

boto3 = types.ModuleType('boto3')
boto3.client = lambda *args, **kwargs: mock.MagicMock()
botocore = types.ModuleType('botocore')
botocore_config = types.ModuleType('botocore.config')
botocore_config.Config = lambda **kwargs: None
psycopg = types.ModuleType('psycopg')
psycopg.Connection = object
psycopg_types = types.ModuleType('psycopg.types')
psycopg_json = types.ModuleType('psycopg.types.json')
psycopg_json.Jsonb = lambda value: value

predictor = types.ModuleType('predictor')


class InvalidImageError(ValueError):
    pass


RESULT = {
    'tier': 'Doctor Visit Required',
    'inference_time_ms': 1.0,
    'raw_model_grade_label': 'Grade 2: Moderate',
    'confidence': 0.8,
    'tier_probabilities': {'no_disease': 0.1, 'recommended': 0.8, 'required': 0.1},
}
predictor.InvalidImageError = InvalidImageError
predictor.predict = lambda image_bytes: RESULT

sys.modules.update({
    'boto3': boto3,
    'botocore': botocore,
    'botocore.config': botocore_config,
    'psycopg': psycopg,
    'psycopg.types': psycopg_types,
    'psycopg.types.json': psycopg_json,
    'predictor': predictor,
})

import worker  # noqa: E402


# ── In-memory jobs table ─────────────────────────────────────────────────────
class FakeConnection:
    """Understands only the statements worker.py sends."""

    def __init__(self, jobs):
        self.jobs = jobs          # image_key -> job dict
        self.rolled_back = False
        self._row = None
        self._rows = []

    def __enter__(self):
        return self

    def __exit__(self, *exc):
        return False

    def commit(self):
        pass

    def rollback(self):
        self.rolled_back = True

    def fetchone(self):
        return self._row

    def fetchall(self):
        return self._rows

    def _by_id(self, job_id):
        return next(j for j in self.jobs.values() if j['id'] == job_id)

    def execute(self, sql, params):
        statement = ' '.join(sql.split())
        if statement.startswith("UPDATE jobs SET status = 'processing'"):
            job = self.jobs.get(params[0])
            if job and job['status'] in ('queued', 'processing', 'failed'):
                job.update(status='processing', attempts=job['attempts'] + 1)
                self._row = (job['id'],)
            else:
                self._row = None
        elif statement.startswith('SELECT earlier.created_at'):
            self.history_params = params
            self._rows = [(datetime.datetime(2026, 1, 2), 'Doctor Visit Optional', None)]
        elif "status = 'suggested'" in statement:
            job = self._by_id(params[2])
            if job['status'] == 'graded':
                job.update(status='suggested', suggestion=params[0], suggestion_model=params[1])
        elif "status = 'graded'" in statement:
            job = self._by_id(params[1])
            if job['status'] == 'processing':
                job.update(status='graded', result=params[0])
        elif statement.startswith('UPDATE jobs SET status = %s'):
            job = self._by_id(params[2])
            if job['status'] == 'processing':
                job.update(status=params[0], error=params[1])
        else:
            raise AssertionError(f'unexpected SQL: {statement}')
        return self


def s3_event(key):
    return json.dumps({'Records': [{
        'eventName': 'ObjectCreated:Post',
        's3': {'bucket': {'name': 'scans-bucket'}, 'object': {'key': key}},
    }]})


def bedrock_replying(text):
    return mock.MagicMock(**{'converse.return_value': {
        'output': {'message': {'content': [{'text': text}] if text else []}},
        'usage': {'outputTokens': 5},
    }})


KEY = 'scans/a b.jpg'
ENCODED_KEY = 'scans/a+b.jpg'   # S3 event keys are URL-encoded


class WorkerTests(unittest.TestCase):

    def setUp(self):
        self.model_id = worker.BEDROCK_MODEL_ID

    def tearDown(self):
        worker.BEDROCK_MODEL_ID = self.model_id

    def run_message(self, jobs, body, receive_count=1, predict=None, size=100, bedrock=None):
        """Handle one message; return (job for KEY, message deleted?)."""
        self.conn = FakeConnection(jobs)
        worker.connect = lambda: self.conn
        worker.s3 = mock.MagicMock()
        worker.s3.get_object.return_value = {'ContentLength': size, 'Body': mock.MagicMock()}
        worker.sqs = mock.MagicMock()
        worker.bedrock = bedrock or bedrock_replying('Consistent with history.')
        worker.predict = predict or predictor.predict
        worker.handle({
            'MessageId': 'm-1', 'ReceiptHandle': 'r-1', 'Body': body,
            'Attributes': {'ApproximateReceiveCount': str(receive_count)},
        })
        return jobs.get(KEY), worker.sqs.delete_message.called

    @staticmethod
    def jobs(status='queued'):
        return {KEY: {'id': 1, 'status': status, 'attempts': 0}}

    # ── Happy path ──
    def test_success_grades_suggests_and_deletes(self):
        job, deleted = self.run_message(self.jobs(), s3_event(ENCODED_KEY))
        self.assertTrue(deleted)
        self.assertEqual(job['status'], 'suggested')
        self.assertEqual(job['suggestion'], 'Consistent with history.')

    def test_prompt_has_history_but_no_identifiers(self):
        self.run_message(self.jobs(), s3_event(ENCODED_KEY))
        call = worker.bedrock.converse.call_args.kwargs
        prompt = call['messages'][0]['content'][0]['text']
        self.assertIn('2026-01-02: AI Doctor Visit Optional', prompt)
        self.assertNotIn('scans/', prompt)
        self.assertEqual(self.conn.history_params, (1, worker.HISTORY_LIMIT))

    # ── Bedrock is optional ──
    def test_bedrock_failure_leaves_job_graded(self):
        failing = mock.MagicMock(**{'converse.side_effect': RuntimeError('throttled')})
        job, deleted = self.run_message(self.jobs(), s3_event(ENCODED_KEY), bedrock=failing)
        self.assertTrue(deleted)
        self.assertEqual(job['status'], 'graded')
        self.assertTrue(self.conn.rolled_back)

    def test_empty_bedrock_reply_leaves_job_graded(self):
        job, _ = self.run_message(self.jobs(), s3_event(ENCODED_KEY), bedrock=bedrock_replying(''))
        self.assertEqual(job['status'], 'graded')

    def test_no_model_configured_skips_bedrock(self):
        worker.BEDROCK_MODEL_ID = ''
        job, deleted = self.run_message(self.jobs(), s3_event(ENCODED_KEY))
        self.assertTrue(deleted)
        self.assertEqual(job['status'], 'graded')
        worker.bedrock.converse.assert_not_called()

    # ── Duplicates and missing jobs ──
    def test_duplicate_message_for_finished_job_is_deleted_untouched(self):
        for status in ('graded', 'suggested'):
            job, deleted = self.run_message(self.jobs(status), s3_event(ENCODED_KEY))
            self.assertTrue(deleted)
            self.assertEqual(job['attempts'], 0)

    def test_message_without_job_is_deleted(self):
        _, deleted = self.run_message({}, s3_event('scans/unknown.jpg'))
        self.assertTrue(deleted)

    def test_job_left_processing_by_a_crash_is_reclaimed(self):
        job, deleted = self.run_message(self.jobs('processing'), s3_event(ENCODED_KEY))
        self.assertTrue(deleted)
        self.assertEqual(job['status'], 'suggested')

    # ── Failures ──
    def test_invalid_image_fails_without_retry(self):
        def bad(_):
            raise InvalidImageError('not an image')
        job, deleted = self.run_message(self.jobs(), s3_event(ENCODED_KEY), predict=bad)
        self.assertTrue(deleted)
        self.assertEqual(job['status'], 'failed')

    def test_oversized_image_fails_without_retry(self):
        job, deleted = self.run_message(self.jobs(), s3_event(ENCODED_KEY), size=10**9)
        self.assertTrue(deleted)
        self.assertEqual(job['status'], 'failed')

    def test_transient_error_requeues_for_retry(self):
        def boom(_):
            raise RuntimeError('out of memory')
        job, deleted = self.run_message(self.jobs(), s3_event(ENCODED_KEY), receive_count=1, predict=boom)
        self.assertFalse(deleted)
        self.assertEqual(job['status'], 'queued')
        self.assertIn('out of memory', job['error'])

    def test_transient_error_on_last_delivery_fails_and_keeps_message_for_dlq(self):
        def boom(_):
            raise RuntimeError('out of memory')
        job, deleted = self.run_message(
            self.jobs(), s3_event(ENCODED_KEY), receive_count=worker.MAX_RECEIVE_COUNT, predict=boom)
        self.assertFalse(deleted)
        self.assertEqual(job['status'], 'failed')

    # ── Odd messages ──
    def test_s3_test_event_is_deleted(self):
        body = json.dumps({'Service': 'Amazon S3', 'Event': 's3:TestEvent'})
        _, deleted = self.run_message({}, body)
        self.assertTrue(deleted)

    def test_unparseable_message_is_deleted(self):
        _, deleted = self.run_message({}, 'not json')
        self.assertTrue(deleted)


if __name__ == '__main__':
    unittest.main()
