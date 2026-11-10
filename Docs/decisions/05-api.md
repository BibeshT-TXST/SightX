### Problem:
The browser needs a small API to create jobs, sign uploads, read status and record decisions. It must reach the private database, cost nothing while idle, and be safe to leave open to the internet

### Options Rejected:
- Keeping the Express server: an always-on host for four short requests
- API Gateway REST API: $3.50 per million requests versus $1 for an HTTP API, and its extra features (usage plans, request validation) are not needed
- Lambda outside the VPC: it could not reach the private database
- One Lambda per route: four packages and cold starts for no benefit at this size
- A Lambda authorizer or Cognito JWT authorizer: there is no sign-in (see 02)

### Choice:
- One Node.js 22 Lambda on arm64 (Graviton, ~20% cheaper), 256 MB, 10 s timeout, in the private subnets with `sightx-lambda`
- HTTP API with four routes: `POST /scans`, `GET /jobs`, `GET /jobs/{id}`, `POST /jobs/{id}/decision`. CORS allows only the CloudFront site and dev origins, with the `X-Trial-Session` header
- Stage throttling (10 rps, burst 20) is the abuse guard for the open trial; throttled callers get 429, which the UI explains
- The role may only `rds-db:connect` as `sightx_api` and `s3:PutObject` under `scans/`, which also bounds every presigned upload
- One pooled connection per Lambda instance, IAM token per connection, verified TLS (`NODE_EXTRA_CA_CERTS`); reserved concurrency is a variable, unset by default because new accounts often have a 10-execution limit that cannot be reserved from
- Logs kept 14 days; routes are plain functions with injected dependencies, tested in CI with an in-memory database
- Packaged by Terraform's `archive_file` from `api/` after `npm ci --omit=dev`
- Cost: ~$0 at trial volume

## What could change in the future:
- Reserved concurrency (e.g. 5) once the account's Lambda limit is raised
- Per-session rate limits or AWS WAF if throttling for all callers proves too coarse
- A CI job that builds and deploys the package instead of a local `npm ci`
