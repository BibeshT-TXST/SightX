/**
 * Handler tests with an in-memory stand-in for Postgres and S3.
 * The fake understands only the queries routes.js sends; the real SQL is
 * exercised against Postgres when the stack is deployed.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHandler } from '../src/handler.js';

const ALICE = '11111111-1111-4111-8111-111111111111';
const BOB = '22222222-2222-4222-8222-222222222222';

function fakeDb() {
  const patients = new Map(); // `${session}|${mrn}` -> row
  const jobs = new Map();
  const sql = (s) => s.replace(/\s+/g, ' ').trim();

  return {
    patients, jobs,
    async query(text, params) {
      const q = sql(text);
      if (q.startsWith('INSERT INTO patients')) {
        const [session, mrn, full_name] = params;
        const key = `${session}|${mrn}`;
        if (!patients.has(key)) patients.set(key, { id: `p-${patients.size + 1}`, session, mrn, full_name });
        return { rows: [] };
      }
      if (q === 'SELECT id FROM patients WHERE session_id = $1 AND mrn = $2') {
        return { rows: [patients.get(`${params[0]}|${params[1]}`)] };
      }
      if (q.startsWith('INSERT INTO jobs')) {
        const [id, session_id, patient_id, image_key] = params;
        jobs.set(id, { id, session_id, patient_id, image_key, status: 'queued', final_diagnosis: null, created_at: new Date() });
        return { rows: [] };
      }
      if (q.startsWith('SELECT j.id, j.status, j.created_at')) {
        return { rows: [...jobs.values()].filter((j) => j.session_id === params[0]) };
      }
      if (q.startsWith('SELECT j.id, j.status, j.error')) {
        const j = jobs.get(params[0]);
        return { rows: j && j.session_id === params[1] ? [j] : [] };
      }
      if (q.startsWith('UPDATE jobs SET final_diagnosis')) {
        const [diagnosis, id, session] = params;
        const j = jobs.get(id);
        if (j && j.session_id === session && !j.final_diagnosis && ['graded', 'suggested'].includes(j.status)) {
          Object.assign(j, { final_diagnosis: diagnosis, decided_at: new Date() });
          return { rows: [{ id, final_diagnosis: diagnosis, decided_at: j.decided_at }] };
        }
        return { rows: [] };
      }
      if (q.startsWith('SELECT status, final_diagnosis FROM jobs')) {
        const j = jobs.get(params[0]);
        return { rows: j && j.session_id === params[1] ? [j] : [] };
      }
      throw new Error(`fake db: unexpected query: ${q}`);
    },
  };
}

function setup() {
  const db = fakeDb();
  const presigned = [];
  const presignUpload = async (key, contentType) => {
    presigned.push({ key, contentType });
    return { url: 'https://bucket.s3.amazonaws.com/', fields: { key } };
  };
  const handler = createHandler(() => ({ db, presignUpload }));

  const call = async (routeKey, { session = ALICE, body, params } = {}) => {
    const res = await handler({
      routeKey,
      headers: session === null ? {} : { 'x-trial-session': session },
      pathParameters: params,
      body: body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body),
    });
    return { status: res.statusCode, body: JSON.parse(res.body) };
  };
  return { db, presigned, call };
}

const scanBody = { patientName: 'Pat Doe', patientMrn: 'MRN-1', contentType: 'image/jpeg' };

test('unknown route is 404; missing or malformed session is 400', async () => {
  const { call } = setup();
  assert.equal((await call('DELETE /jobs/{id}')).status, 404);
  assert.equal((await call('GET /me')).status, 404);
  assert.equal((await call('GET /jobs', { session: null })).status, 400);
  assert.equal((await call('GET /jobs', { session: 'abc' })).status, 400);
});

test('POST /scans creates patient and job, returns upload for the job key', async () => {
  const { db, presigned, call } = setup();
  const res = await call('POST /scans', { body: scanBody });
  assert.equal(res.status, 201);
  const job = db.jobs.get(res.body.jobId);
  assert.equal(job.image_key, `scans/${res.body.jobId}.jpg`);
  assert.equal(job.session_id, ALICE);
  assert.deepEqual(presigned, [{ key: job.image_key, contentType: 'image/jpeg' }]);
});

test('POST /scans reuses a patient by Patient ID within a session', async () => {
  const { db, call } = setup();
  await call('POST /scans', { body: scanBody });
  await call('POST /scans', { body: { ...scanBody, patientName: 'Typo Name' } });
  assert.equal(db.patients.size, 1);
  assert.equal(db.patients.get(`${ALICE}|MRN-1`).full_name, 'Pat Doe');
});

test('the same Patient ID in two sessions is two patients', async () => {
  const { db, call } = setup();
  const a = await call('POST /scans', { body: scanBody });
  const b = await call('POST /scans', { body: scanBody, session: BOB });
  assert.equal(db.patients.size, 2);
  assert.notEqual(db.jobs.get(a.body.jobId).patient_id, db.jobs.get(b.body.jobId).patient_id);
});

test('POST /scans validates input', async () => {
  const { call } = setup();
  assert.equal((await call('POST /scans', { body: { ...scanBody, contentType: 'image/gif' } })).status, 400);
  assert.equal((await call('POST /scans', { body: { ...scanBody, patientMrn: '  ' } })).status, 400);
  assert.equal((await call('POST /scans', { body: { ...scanBody, patientName: 'x'.repeat(201) } })).status, 400);
  assert.equal((await call('POST /scans', { body: 'not json' })).status, 400);
  assert.equal((await call('POST /scans', { body: '[1]' })).status, 400);
});

test('jobs are only visible to their own session', async () => {
  const { call } = setup();
  const { body } = await call('POST /scans', { body: scanBody });
  const params = { id: body.jobId };
  assert.equal((await call('GET /jobs/{id}', { params })).status, 200);
  assert.equal((await call('GET /jobs/{id}', { params, session: BOB })).status, 404);
  assert.equal((await call('GET /jobs', { session: BOB })).body.jobs.length, 0);
  assert.equal((await call('GET /jobs')).body.jobs.length, 1);
  assert.equal((await call('GET /jobs/{id}', { params: { id: 'not-a-uuid' } })).status, 404);
});

test('decision: rejected before grading, accepted once, then locked', async () => {
  const { db, call } = setup();
  const { body } = await call('POST /scans', { body: scanBody });
  const params = { id: body.jobId };
  const decide = (finalDiagnosis, session = ALICE) =>
    call('POST /jobs/{id}/decision', { params, session, body: { finalDiagnosis } });

  const early = await decide('Doctor Visit Required');
  assert.equal(early.status, 409);
  assert.match(early.body.error, /queued/);

  db.jobs.get(body.jobId).status = 'graded';
  assert.equal((await decide('Not a tier')).status, 400);
  assert.equal((await decide('Doctor Visit Required', BOB)).status, 404);
  assert.equal((await decide('Doctor Visit Required')).status, 200);

  const again = await decide('Doctor Visit Optional');
  assert.equal(again.status, 409);
  assert.match(again.body.error, /already recorded/);
  assert.equal(db.jobs.get(body.jobId).final_diagnosis, 'Doctor Visit Required');
});

test('unexpected errors return 500 without details', async () => {
  const handler = createHandler(() => ({ db: { query: async () => { throw new Error('connection refused'); } } }));
  const res = await handler({ routeKey: 'GET /jobs', headers: { 'x-trial-session': ALICE } });
  assert.equal(res.statusCode, 500);
  assert.deepEqual(JSON.parse(res.body), { error: 'Internal error' });
});
