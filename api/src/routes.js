/**
 * SightX API routes.
 *
 * Each route takes (req, deps):
 *   req.sessionId  the caller's trial session ID (validated UUID)
 *   req.body       parsed JSON body, or {}
 *   req.params     path parameters
 *   deps.db        anything with query(sql, params) -> { rows }
 *   deps.presignUpload(key, contentType) -> { url, fields }
 * and returns { status, body }. Throwing HttpError sends that status.
 *
 * V2 is an open trial with no sign-in. Every query is scoped to the caller's
 * session, so visitors never see or decide on each other's scans. A session
 * separates data; it is not authentication.
 */
import { randomUUID } from 'node:crypto';

export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

// Must match TIER_LABELS in inference-engine/clinical_postprocessor.py
export const DIAGNOSES = [
  'Doctor Visit Optional',
  'Doctor Visit Required',
  'Doctor Visit Mandatory',
];

export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const IMAGE_TYPES = { 'image/jpeg': 'jpg', 'image/png': 'png' };
const JOB_LIST_LIMIT = 200;

// ── Helpers ──────────────────────────────────────────────────────────────────

function requireText(value, field, maxLength) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new HttpError(400, `${field} is required`);
  }
  const text = value.trim();
  if (text.length > maxLength) {
    throw new HttpError(400, `${field} must be at most ${maxLength} characters`);
  }
  return text;
}

function requireJobId(params) {
  const id = params?.id;
  if (!UUID_RE.test(id ?? '')) throw new HttpError(404, 'Job not found');
  return id;
}

// ── Routes ───────────────────────────────────────────────────────────────────

/**
 * POST /scans — start a scan.
 * Body: { patientName, patientMrn, contentType }
 *
 * Creates the job row first, then returns a presigned upload for its image.
 * The row always exists before S3 can notify the worker.
 */
export async function createScan(req, { db, presignUpload }) {
  const patientName = requireText(req.body.patientName, 'patientName', 200);
  const patientMrn = requireText(req.body.patientMrn, 'patientMrn', 64);
  const extension = IMAGE_TYPES[req.body.contentType];
  if (!extension) throw new HttpError(400, 'contentType must be image/jpeg or image/png');

  // Within a session, an existing Patient ID keeps its stored name
  await db.query(
    `INSERT INTO patients (session_id, mrn, full_name) VALUES ($1, $2, $3)
     ON CONFLICT (session_id, mrn) DO NOTHING`,
    [req.sessionId, patientMrn, patientName],
  );
  const patient = await db.query(
    'SELECT id FROM patients WHERE session_id = $1 AND mrn = $2',
    [req.sessionId, patientMrn],
  );

  const jobId = randomUUID();
  const imageKey = `scans/${jobId}.${extension}`;
  await db.query(
    'INSERT INTO jobs (id, session_id, patient_id, image_key) VALUES ($1, $2, $3, $4)',
    [jobId, req.sessionId, patient.rows[0].id, imageKey],
  );

  const upload = await presignUpload(imageKey, req.body.contentType);
  return { status: 201, body: { jobId, upload } };
}

/** GET /jobs — the session's scans, newest first (history page). */
export async function listJobs(req, { db }) {
  const { rows } = await db.query(
    `SELECT j.id, j.status, j.created_at, j.ai_diagnosis, j.final_diagnosis,
            p.full_name AS patient_name, p.mrn AS patient_mrn
       FROM jobs j
       JOIN patients p ON p.id = j.patient_id
      WHERE j.session_id = $1
      ORDER BY j.created_at DESC
      LIMIT $2`,
    [req.sessionId, JOB_LIST_LIMIT],
  );
  return { status: 200, body: { jobs: rows } };
}

/** GET /jobs/{id} — one job, polled by the scan page until it is graded. */
export async function getJob(req, { db }) {
  const id = requireJobId(req.params);
  const { rows } = await db.query(
    `SELECT j.id, j.status, j.error, j.result, j.ai_diagnosis,
            j.suggestion, j.final_diagnosis, j.decided_at,
            j.created_at, j.graded_at, j.suggested_at,
            p.full_name AS patient_name, p.mrn AS patient_mrn
       FROM jobs j
       JOIN patients p ON p.id = j.patient_id
      WHERE j.id = $1 AND j.session_id = $2`,
    [id, req.sessionId],
  );
  if (!rows.length) throw new HttpError(404, 'Job not found');
  return { status: 200, body: rows[0] };
}

/**
 * POST /jobs/{id}/decision — record the final diagnosis.
 * Body: { finalDiagnosis }
 *
 * Write-once: the database trigger also rejects any later change.
 */
export async function recordDecision(req, { db }) {
  const id = requireJobId(req.params);
  const finalDiagnosis = req.body.finalDiagnosis;
  if (!DIAGNOSES.includes(finalDiagnosis)) {
    throw new HttpError(400, `finalDiagnosis must be one of: ${DIAGNOSES.join(', ')}`);
  }

  const updated = await db.query(
    `UPDATE jobs
        SET final_diagnosis = $1, decided_at = now()
      WHERE id = $2 AND session_id = $3
        AND final_diagnosis IS NULL
        AND status IN ('graded', 'suggested')
      RETURNING id, final_diagnosis, decided_at`,
    [finalDiagnosis, id, req.sessionId],
  );
  if (updated.rows.length) return { status: 200, body: updated.rows[0] };

  // Nothing updated: work out why
  const { rows } = await db.query(
    'SELECT status, final_diagnosis FROM jobs WHERE id = $1 AND session_id = $2',
    [id, req.sessionId],
  );
  if (!rows.length) throw new HttpError(404, 'Job not found');
  if (rows[0].final_diagnosis) throw new HttpError(409, 'A final diagnosis is already recorded');
  throw new HttpError(409, `Job is ${rows[0].status}; a decision needs a graded result`);
}

// Keys match API Gateway HTTP API route keys
export const routes = {
  'POST /scans': createScan,
  'GET /jobs': listJobs,
  'GET /jobs/{id}': getJob,
  'POST /jobs/{id}/decision': recordDecision,
};
