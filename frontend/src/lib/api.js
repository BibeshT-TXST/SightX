/**
 * SightX API client.
 *
 * Talks to the API Gateway HTTP API (VITE_API_URL). Every request carries
 * the trial session ID. Scan images never pass through the API: they are
 * uploaded straight to S3 with a presigned POST, and S3 queues them for the
 * inference worker.
 */
import { getSessionId } from './session';

const API_URL = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '');

export const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png'];
export const MAX_IMAGE_BYTES = 20 * 1024 * 1024; // matches the API's upload limit

export class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

async function request(method, path, body) {
  if (!API_URL) throw new ApiError(0, 'VITE_API_URL is not set');

  let response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      method,
      headers: {
        'X-Trial-Session': getSessionId(),
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError(0, 'Could not reach the SightX API. Check your connection and try again.');
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    // 429 comes from API Gateway throttling, before the Lambda runs
    const message = response.status === 429
      ? 'The trial is busy right now. Please wait a moment and try again.'
      : data.error ?? `Request failed (${response.status})`;
    throw new ApiError(response.status, message);
  }
  return data;
}

/** Start a scan. Returns { jobId, upload: { url, fields } }. */
export function createScan({ patientName, patientMrn, contentType }) {
  return request('POST', '/scans', { patientName, patientMrn, contentType });
}

/** Upload the image with the presigned POST returned by createScan. */
export async function uploadScan(upload, file) {
  const form = new FormData();
  Object.entries(upload.fields).forEach(([key, value]) => form.append(key, value));
  form.append('file', file); // S3 requires the file to be the last field

  let response;
  try {
    response = await fetch(upload.url, { method: 'POST', body: form });
  } catch {
    throw new ApiError(0, 'Upload failed. Check your connection and try again.');
  }
  if (!response.ok) throw new ApiError(response.status, 'Upload was rejected by storage.');
}

export function getJob(jobId) {
  return request('GET', `/jobs/${encodeURIComponent(jobId)}`);
}

/** The session's scans, newest first. */
export async function listJobs() {
  const { jobs } = await request('GET', '/jobs');
  return jobs;
}

export function recordDecision(jobId, finalDiagnosis) {
  return request('POST', `/jobs/${encodeURIComponent(jobId)}/decision`, { finalDiagnosis });
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Poll a job until grading finishes, calling onUpdate with each new state.
 *
 * Resolves with the job once it is graded. If a Bedrock suggestion is on
 * its way, keeps polling briefly (in the background, via onUpdate) so the
 * suggestion appears when ready. Rejects if the job fails or takes too long.
 *
 * @param {string} jobId
 * @param {{ onUpdate?: (job: object) => void, isCancelled?: () => boolean }} options
 */
export async function waitForJob(jobId, { onUpdate = () => {}, isCancelled = () => false } = {}) {
  const POLL_MS = 2000;
  const GRADE_TIMEOUT_MS = 5 * 60 * 1000;      // first scan after idle can be slow
  const SUGGESTION_TIMEOUT_MS = 45 * 1000;

  const start = Date.now();
  let job;
  for (;;) {
    if (isCancelled()) return null;
    job = await getJob(jobId);
    onUpdate(job);

    if (job.status === 'failed') {
      throw new ApiError(0, job.error ?? 'The scan could not be processed.');
    }
    if (job.status === 'graded' || job.status === 'suggested') break;
    if (Date.now() - start > GRADE_TIMEOUT_MS) {
      throw new ApiError(0, 'The scan is taking longer than expected. Check the history page later.');
    }
    await sleep(POLL_MS);
  }

  // Graded: keep watching for the suggestion without blocking the caller
  if (job.status === 'graded') {
    (async () => {
      const suggestionStart = Date.now();
      while (!isCancelled() && Date.now() - suggestionStart < SUGGESTION_TIMEOUT_MS) {
        await sleep(POLL_MS);
        try {
          const latest = await getJob(jobId);
          if (isCancelled()) return;
          onUpdate(latest);
          if (latest.status !== 'graded') return;
        } catch {
          return; // the suggestion is optional; stop quietly
        }
      }
    })();
  }
  return job;
}
