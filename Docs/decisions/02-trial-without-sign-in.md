### Problem:
V2's goal is cloud usability: anyone should be able to open SightX and try a scan. V1 already explored authentication and row-level security in depth. Requiring accounts would block casual visitors, and an open app still must not show one visitor's scans to another or let the AWS bill run away

### Options Rejected:
- Cognito user pool with admin-created accounts: blocks the "just try it" goal, and creating users would need a Lambda outside the VPC or a paid Cognito interface endpoint
- Keeping Supabase auth alongside AWS: two identity systems for a trial nobody signs in to
- One shared, global history: every visitor would see the names and results others typed in
- Global patient IDs (`mrn` unique across the database): two visitors typing "MRN-1" would share a patient, and one visitor's history would leak into the other's Bedrock suggestion

### Choice:
- No sign-in. Each browser generates a random UUID once (localStorage, in-memory fallback) and sends it as `X-Trial-Session` on every request
- Every patient and job row carries `session_id`; every API query is scoped to it; patient IDs are unique per session
- The session separates data; it is not authentication. The UI, docs and security policy say so and ask for made-up patient details only
- Abuse is limited by API Gateway throttling (10 rps, burst 20, all callers), a single worker that bounds inference cost, 7-day image expiry, and Bedrock costing ~$0.0001 per scan
- "Start New Session" lets a visitor clear their history; "Exit Trial" keeps it
- Cost of this decision: $0 (no Cognito, no extra Lambda)

## What could change in the future:
- Any real clinical use brings back authentication and role-based access (V1's model, or Cognito), with sessions replaced by user IDs in the same columns
- If throttling proves too blunt, per-session rate limits in the API or AWS WAF rate-based rules (paid)
