# SightX API (Lambda)

One Node.js 22 Lambda behind an API Gateway HTTP API. It creates scan jobs, signs uploads, reports job status and records the final decision. It never handles image bytes and never calls the model: the browser uploads straight to S3, and S3 queues the scan for the inference worker.

## Routes

Every request must carry `X-Trial-Session: <uuid>`, the browser's anonymous trial session. All data is scoped to it; a missing or malformed header returns 400.

| Route | Body | Returns |
| :--- | :--- | :--- |
| `POST /scans` | `{ patientName, patientMrn, contentType }` (`image/jpeg` or `image/png`) | `201 { jobId, upload: { url, fields } }`: a presigned POST valid 5 minutes, max 20 MB |
| `GET /jobs` | | `{ jobs: [...] }`, newest first (up to 200) |
| `GET /jobs/{id}` | | Status, error, AI result, suggestion, decision, patient |
| `POST /jobs/{id}/decision` | `{ finalDiagnosis }` (one of the three clinical tiers) | `200`, or `409` if the job is not graded yet or already decided |

Errors are `{ "error": "<message>" }`. Unexpected failures return a plain 500 without internal details. Throttled requests get 429 from API Gateway before the Lambda runs.

## Layout

| File | Purpose |
| :--- | :--- |
| `src/handler.js` | Lambda entry: route lookup, session header, body parsing, error mapping |
| `src/routes.js` | The four routes. Each takes `(req, deps)` so tests can pass fakes |
| `src/db.js` | One pooled Postgres connection per instance, IAM auth token per connection, verified TLS |
| `src/storage.js` | Presigned S3 POST, locked to key, content type and size |
| `test/handler.test.js` | `node:test` suite with an in-memory database |

## Configuration

| Variable | Default | Notes |
| :--- | :--- | :--- |
| `DB_HOST` | (required) | RDS endpoint |
| `DB_PORT`, `DB_NAME`, `DB_USER` | `5432`, `sightx`, `sightx_api` | |
| `DB_PASSWORD` | unset | Local Postgres only; on AWS an IAM token is used |
| `DB_SSL` | `verify` | `disable` for a local Postgres without TLS |
| `SCANS_BUCKET` | (required) | Upload bucket |
| `NODE_EXTRA_CA_CERTS` | | Set to `/var/runtime/ca-cert.pem` on Lambda so Node trusts RDS |

Terraform sets all of these ([`infrastructure/api.tf`](../infrastructure/api.tf)).

## Develop

```bash
npm ci
npm run check   # syntax
npm test        # node:test suite
```

To deploy, build the production package and apply Terraform: `npm ci --omit=dev`, then see [infrastructure/README.md](../infrastructure/README.md).

Route keys in `src/routes.js` must match the routes in `infrastructure/api.tf`, and `DIAGNOSES` must match the tier names in `inference-engine/clinical_postprocessor.py`.
