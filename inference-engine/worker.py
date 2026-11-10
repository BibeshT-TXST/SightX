"""
SightX Inference Worker — grades scans from the inference queue

Runs on the EC2 worker. Each SQS message is an S3 "ObjectCreated" event for
an image the browser uploaded with a presigned URL. For each one the worker:

  1. finds the job row by its S3 key and claims it (status → processing)
  2. downloads the image and runs predictor.predict()
  3. writes the result (status → graded) and commits
  4. asks Bedrock for a suggestion and stores it (status → suggested)
  5. deletes the message, only after the commits

The suggestion is optional: if Bedrock fails, the job stays graded and the
clinician still sees the AI result. Bedrock only ever sees the current
result and the patient's earlier results (dates, tiers, decisions), read
with a fixed parameterized query. It never sees names, IDs or SQL.

Failure handling:
  • unreadable image  → job failed, message deleted (a retry cannot help)
  • any other error   → job back to queued, message left for SQS to redeliver;
                        on the last allowed delivery the job is marked failed
                        and SQS moves the message to the dead-letter queue
  • duplicate message → job already finished, message deleted

Configuration (environment variables):
  INFERENCE_QUEUE_URL   SQS queue URL (required)
  AWS_REGION            region for SQS, S3 and RDS tokens (default us-east-2)
  MAX_RECEIVE_COUNT     must match the queue's redrive maxReceiveCount (default 3)
  DB_HOST, DB_PORT, DB_NAME, DB_USER
                        Postgres connection (DB_USER default sightx_worker)
  DB_PASSWORD           if set, used instead of an RDS IAM auth token (local dev)
  DB_SSLMODE            default require (IAM auth needs TLS)
  MODEL_WEIGHTS_S3_URI  optional s3://bucket/key; downloaded to
                        MODEL_WEIGHTS_PATH before the model loads
  BEDROCK_MODEL_ID      model or inference profile for suggestions
                        (default us.amazon.nova-micro-v1:0); empty disables them
"""

import json
import logging
import os
import signal
import sys
import time
from urllib.parse import unquote_plus

import boto3
import psycopg
from botocore.config import Config
from psycopg.types.json import Jsonb

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s %(levelname)s %(name)s %(message)s',
    stream=sys.stdout,
)
log = logging.getLogger('sightx.worker')


# ── Configuration ────────────────────────────────────────────────────────────
REGION = os.getenv('AWS_REGION', 'us-east-2')
QUEUE_URL = os.environ['INFERENCE_QUEUE_URL']
MAX_RECEIVE_COUNT = int(os.getenv('MAX_RECEIVE_COUNT', '3'))

DB_HOST = os.environ['DB_HOST']
DB_PORT = int(os.getenv('DB_PORT', '5432'))
DB_NAME = os.getenv('DB_NAME', 'sightx')
DB_USER = os.getenv('DB_USER', 'sightx_worker')
DB_PASSWORD = os.getenv('DB_PASSWORD')
DB_SSLMODE = os.getenv('DB_SSLMODE', 'require')

MODEL_WEIGHTS_S3_URI = os.getenv('MODEL_WEIGHTS_S3_URI')

# Largest image the worker will download; the presigned upload enforces
# its own limit, this is a second guard
MAX_IMAGE_BYTES = 20 * 1024 * 1024

# Pause before polling again after SQS itself could not be reached
RECEIVE_RETRY_SECONDS = 5

# Cheapest Bedrock text model at the time of writing. The "us." prefix is a
# cross-region inference profile, which Nova requires for on-demand calls.
BEDROCK_MODEL_ID = os.getenv('BEDROCK_MODEL_ID', 'us.amazon.nova-micro-v1:0')
HISTORY_LIMIT = 10          # earlier scans included in the prompt
SUGGESTION_MAX_TOKENS = 300

sqs = boto3.client('sqs', region_name=REGION)
s3 = boto3.client('s3', region_name=REGION)
rds = boto3.client('rds', region_name=REGION)
# Short timeouts: a slow suggestion must not hold the queue message for long
bedrock = boto3.client('bedrock-runtime', region_name=REGION, config=Config(
    connect_timeout=5, read_timeout=30, retries={'max_attempts': 2},
))


# ── Model weights ────────────────────────────────────────────────────────────
def download_weights() -> None:
    """Fetch the model weights from S3 if MODEL_WEIGHTS_S3_URI is set."""
    if not MODEL_WEIGHTS_S3_URI:
        return
    if not MODEL_WEIGHTS_S3_URI.startswith('s3://'):
        raise ValueError('MODEL_WEIGHTS_S3_URI must look like s3://bucket/key')

    bucket, _, key = MODEL_WEIGHTS_S3_URI[len('s3://'):].partition('/')
    path = os.getenv('MODEL_WEIGHTS_PATH', 'checkpoints/best_model.pt')
    os.makedirs(os.path.dirname(path) or '.', exist_ok=True)

    log.info('downloading weights from %s to %s', MODEL_WEIGHTS_S3_URI, path)
    s3.download_file(bucket, key, path)


# Weights must be on disk before predictor is imported, because it loads
# the model at import time.
download_weights()
from predictor import predict, InvalidImageError  # noqa: E402


# ── Database ─────────────────────────────────────────────────────────────────
def connect() -> psycopg.Connection:
    """
    Open a new Postgres connection.

    One connection per job keeps things simple: an IAM auth token is only
    valid for 15 minutes, and a fresh connection never goes stale.
    """
    password = DB_PASSWORD or rds.generate_db_auth_token(
        DBHostname=DB_HOST, Port=DB_PORT, DBUsername=DB_USER, Region=REGION,
    )
    return psycopg.connect(
        host=DB_HOST, port=DB_PORT, dbname=DB_NAME, user=DB_USER,
        password=password, sslmode=DB_SSLMODE, connect_timeout=10,
    )


def claim_job(conn: psycopg.Connection, image_key: str):
    """
    Move the job for this image to processing and return its id.

    Returns None if there is no such job, or if it has already finished
    (graded or suggested), which makes duplicate messages harmless.
    A job left in processing by a crashed worker, or failed and then
    redriven from the dead-letter queue, can be claimed again.
    """
    row = conn.execute(
        """
        UPDATE jobs
           SET status = 'processing', attempts = attempts + 1, error = NULL
         WHERE image_key = %s
           AND status IN ('queued', 'processing', 'failed')
        RETURNING id
        """,
        (image_key,),
    ).fetchone()
    conn.commit()
    return row[0] if row else None


def save_result(conn: psycopg.Connection, job_id, result: dict) -> None:
    conn.execute(
        """
        UPDATE jobs
           SET status = 'graded', result = %s, graded_at = now()
         WHERE id = %s AND status = 'processing'
        """,
        (Jsonb(result), job_id),
    )
    conn.commit()


def save_failure(conn: psycopg.Connection, job_id, error: str, final: bool) -> None:
    """Record an error: failed if final, otherwise back to queued for a retry."""
    conn.execute(
        "UPDATE jobs SET status = %s, error = %s WHERE id = %s AND status = 'processing'",
        ('failed' if final else 'queued', error[:1000], job_id),
    )
    conn.commit()


# ── Bedrock suggestion ───────────────────────────────────────────────────────
SUGGESTION_SYSTEM_PROMPT = """\
You assist an ophthalmology clinician reviewing an AI diabetic retinopathy \
screening result. You do not diagnose; the clinician makes the final decision.

Given the current AI result and the patient's earlier screening results, write \
at most 4 short sentences in plain text that:
- note whether the result is consistent with the patient's history or a change from it
- point out low confidence or disagreement between earlier AI results and clinician decisions
- suggest follow-up questions to ask the patient or further tests worth considering

Use only the data provided. If there is no history, say so in one sentence."""


def load_history(conn: psycopg.Connection, job_id) -> list:
    """
    Earlier finished scans of the same patient, newest first.

    Fixed, parameterized query: the model never writes or sees SQL, and
    only dates, AI tiers and clinician decisions leave the database.
    """
    return conn.execute(
        """
        SELECT earlier.created_at, earlier.ai_diagnosis, earlier.final_diagnosis
          FROM jobs AS current
          JOIN jobs AS earlier ON earlier.patient_id = current.patient_id
         WHERE current.id = %s
           AND earlier.id <> current.id
           AND earlier.status IN ('graded', 'suggested')
         ORDER BY earlier.created_at DESC
         LIMIT %s
        """,
        (job_id, HISTORY_LIMIT),
    ).fetchall()


def build_prompt(result: dict, history: list) -> str:
    probs = result['tier_probabilities']
    lines = [
        'Current AI result:',
        f'- Tier: {result["tier"]}',
        f'- Most common model grade: {result["raw_model_grade_label"]}',
        f'- Confidence: {result["confidence"]:.2f}',
        f'- Tier probabilities: no disease {probs["no_disease"]:.2f}, '
        f'visit recommended {probs["recommended"]:.2f}, visit required {probs["required"]:.2f}',
        '',
        'Earlier results (newest first):',
    ]
    if not history:
        lines.append('- none')
    for created_at, ai_diagnosis, final_diagnosis in history:
        decision = final_diagnosis or 'no decision recorded'
        lines.append(f'- {created_at:%Y-%m-%d}: AI {ai_diagnosis}; clinician {decision}')
    return '\n'.join(lines)


def suggest(conn: psycopg.Connection, job_id, result: dict) -> None:
    """
    Ask Bedrock for a suggestion and store it. Never raises: any failure is
    logged and the job stays graded.
    """
    if not BEDROCK_MODEL_ID:
        return
    try:
        prompt = build_prompt(result, load_history(conn, job_id))
        response = bedrock.converse(
            modelId=BEDROCK_MODEL_ID,
            system=[{'text': SUGGESTION_SYSTEM_PROMPT}],
            messages=[{'role': 'user', 'content': [{'text': prompt}]}],
            inferenceConfig={'maxTokens': SUGGESTION_MAX_TOKENS, 'temperature': 0.2},
        )
        text = ''.join(
            block.get('text', '') for block in response['output']['message']['content']
        ).strip()
        if not text:
            raise ValueError('empty response')

        conn.execute(
            """
            UPDATE jobs
               SET status = 'suggested', suggestion = %s,
                   suggestion_model = %s, suggested_at = now()
             WHERE id = %s AND status = 'graded'
            """,
            (text, BEDROCK_MODEL_ID, job_id),
        )
        conn.commit()
        log.info('job %s: suggestion stored (%d output tokens)',
                 job_id, response.get('usage', {}).get('outputTokens', 0))
    except Exception:
        conn.rollback()
        log.exception('job %s: suggestion failed; job stays graded', job_id)


# ── Message handling ─────────────────────────────────────────────────────────
def parse_s3_records(body: str) -> list:
    """
    Return (bucket, key) pairs from an S3 event notification.

    S3 sends a one-off s3:TestEvent when the notification is configured;
    it has no Records and yields an empty list.
    """
    event = json.loads(body)
    return [
        (r['s3']['bucket']['name'], unquote_plus(r['s3']['object']['key']))
        for r in event.get('Records', [])
        if r.get('eventName', '').startswith('ObjectCreated')
    ]


def grade(bucket: str, key: str, receive_count: int) -> bool:
    """
    Grade one uploaded image.

    Returns True when the message can be deleted: the job finished, failed
    for good, or never existed. Returns False to leave it for SQS to retry.
    """
    final_attempt = receive_count >= MAX_RECEIVE_COUNT

    with connect() as conn:
        job_id = claim_job(conn, key)
        if job_id is None:
            log.info('no open job for %s; skipping', key)
            return True

        log.info('job %s: grading %s (delivery %d of %d)',
                 job_id, key, receive_count, MAX_RECEIVE_COUNT)
        try:
            obj = s3.get_object(Bucket=bucket, Key=key)
            if obj['ContentLength'] > MAX_IMAGE_BYTES:
                raise InvalidImageError(f'image is {obj["ContentLength"]} bytes')
            result = predict(obj['Body'].read())

        except InvalidImageError as e:
            log.warning('job %s: invalid image: %s', job_id, e)
            save_failure(conn, job_id, f'Invalid image: {e}', final=True)
            return True

        except Exception as e:
            log.exception('job %s: attempt failed', job_id)
            save_failure(conn, job_id, f'{type(e).__name__}: {e}', final=final_attempt)
            return False

        save_result(conn, job_id, result)
        log.info('job %s: graded as %s in %.0f ms',
                 job_id, result['tier'], result['inference_time_ms'])

        suggest(conn, job_id, result)
        return True


def handle(message: dict) -> None:
    receive_count = int(message['Attributes'].get('ApproximateReceiveCount', '1'))

    try:
        records = parse_s3_records(message['Body'])
    except (ValueError, KeyError):
        log.error('unparseable message %s; deleting', message['MessageId'])
        records, done = [], True
    else:
        # A message normally carries one record; all must succeed to delete it
        done = all([grade(bucket, key, receive_count) for bucket, key in records])

    if done:
        sqs.delete_message(QueueUrl=QUEUE_URL, ReceiptHandle=message['ReceiptHandle'])


# ── Main loop ────────────────────────────────────────────────────────────────
running = True


def stop(signum, _frame):
    """Finish the current job, then exit (EC2 / systemd send SIGTERM)."""
    global running
    log.info('received signal %d; stopping after the current job', signum)
    running = False


def main() -> None:
    signal.signal(signal.SIGTERM, stop)
    signal.signal(signal.SIGINT, stop)
    log.info('worker started; polling %s', QUEUE_URL)

    while running:
        # Long polling: waits up to 20 s for a message, so an idle worker
        # makes about 3 requests a minute instead of hundreds
        try:
            response = sqs.receive_message(
                QueueUrl=QUEUE_URL,
                MaxNumberOfMessages=1,
                WaitTimeSeconds=20,
                MessageSystemAttributeNames=['ApproximateReceiveCount'],
            )
        except Exception:
            log.exception('could not reach SQS; retrying in %d s', RECEIVE_RETRY_SECONDS)
            time.sleep(RECEIVE_RETRY_SECONDS)
            continue

        for message in response.get('Messages', []):
            try:
                handle(message)
            except Exception:
                # Database or SQS unreachable: leave the message for redelivery
                log.exception('could not handle message %s', message['MessageId'])

    log.info('worker stopped')


if __name__ == '__main__':
    main()
