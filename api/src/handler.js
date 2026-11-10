/**
 * SightX API Lambda entry point (API Gateway HTTP API, payload format 2.0).
 *
 * API Gateway's Cognito JWT authorizer verifies the ID token before this
 * runs, so the claims in the event are trusted. CORS is configured on the
 * HTTP API, not here.
 */
import { routes, HttpError } from './routes.js';
import { getDb } from './db.js';
import { presignUpload } from './storage.js';

const MAX_BODY_BYTES = 16 * 1024;

function respond(status, body) {
  return {
    statusCode: status,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  };
}

function parseBody(event) {
  if (!event.body) return {};
  const raw = event.isBase64Encoded
    ? Buffer.from(event.body, 'base64').toString('utf8')
    : event.body;
  if (raw.length > MAX_BODY_BYTES) throw new HttpError(413, 'Request body too large');
  try {
    const body = JSON.parse(raw);
    if (body === null || typeof body !== 'object' || Array.isArray(body)) throw new Error();
    return body;
  } catch {
    throw new HttpError(400, 'Body must be a JSON object');
  }
}

/**
 * Build a handler. Tests pass fake dependencies; Lambda uses the default,
 * which connects to the database lazily on the first routed request.
 */
export function createHandler(getDeps = () => ({ db: getDb(), presignUpload })) {
  return async function handler(event) {
    const route = routes[event.routeKey];
    if (!route) return respond(404, { error: 'Not found' });

    const claims = event.requestContext?.authorizer?.jwt?.claims;
    if (!claims?.sub) return respond(401, { error: 'Unauthorized' });

    try {
      const req = { claims, params: event.pathParameters ?? {}, body: parseBody(event) };
      const { status, body } = await route(req, getDeps());
      return respond(status, body);
    } catch (err) {
      if (err instanceof HttpError) return respond(err.status, { error: err.message });
      console.error(`[${event.routeKey}] unhandled error`, err);
      return respond(500, { error: 'Internal error' });
    }
  };
}

export const handler = createHandler();
