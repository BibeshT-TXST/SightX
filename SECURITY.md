# Security Policy

## Supported Versions

SightX is currently in active development as a research and educational project. Security updates are applied to the latest version on the `main` branch only.

| Version | Supported |
| :--- | :---: |
| `main` (latest) | ✅ |
| Feature branches | ❌ |
| Older commits | ❌ |

---

## Reporting a Vulnerability

If you discover a security vulnerability in SightX, **please do not open a public issue.** Instead, report it privately so we can address it before disclosure.

### How to Report

1. Go to the [**Security** tab](https://github.com/BibeshT-TXST/SightX/security) of this repository.
2. Click **"Report a vulnerability"** to open a private advisory draft.
3. **Include**:
   - A clear description of the vulnerability
   - Steps to reproduce (if applicable)
   - The potential impact (e.g., data exposure, authentication bypass)
   - Any suggested fixes or mitigations

### What to Expect

| Step | Timeline |
| :--- | :--- |
| **Acknowledgment** | Within 48 hours of receipt |
| **Initial assessment** | Within 5 business days |
| **Fix & disclosure** | Coordinated with reporter before public release |

We are committed to addressing legitimate security concerns promptly and transparently.

---

## Scope

The following areas are in scope for security reports:

The V2 trial has **no sign-in by design**: each browser's random session ID separates visitors' data but is not authentication (see [decision 02](./Docs/decisions/02-trial-without-sign-in.md)). Guessing or reusing a session ID is therefore not a vulnerability; reading another session's data **without** its ID is.

| Area | Examples |
| :--- | :--- |
| **Data Isolation** | Reading or changing another session's jobs or patients, leaking patient details into Bedrock prompts |
| **API Security** | Injection, CORS misconfiguration, bypassing throttling, changing a recorded decision |
| **Uploads** | Presigned POSTs that allow other keys, types or sizes; reaching objects outside `scans/` |
| **Data Exposure** | Credentials in logs, public buckets, unencrypted traffic |
| **Infrastructure** | Over-broad IAM or database roles, reachable ports, instance metadata access |
| **Dependency Vulnerabilities** | Known CVEs in npm/pip packages |

### Out of Scope

- Vulnerabilities in AWS services themselves — report those to AWS
- The absence of authentication in the open trial
- Social engineering attacks
- Denial-of-service (DoS) attacks against development/staging environments
- Issues that require physical access to the machine

---

## Security Best Practices for Contributors

If you're contributing to SightX, please follow these guidelines:

1. **Never commit secrets** — keys, passwords, `.env` files and `terraform.tfvars` are `.gitignore`'d; keep it that way. Apps use IAM roles and IAM database auth, so no app needs a stored password.
2. **Scope every query to the trial session** — it is the only thing keeping visitors' data apart. Never trust IDs from a request body.
3. **Keep roles minimal** — new permissions go to the one IAM role or database role (`sightx_api`, `sightx_worker`) that needs them, scoped to specific resources.
4. **Validate all inputs** — Both client-side and server-side validation are required for any user input.
5. **Keep dependencies updated** — Run `npm audit` and `pip audit` periodically to catch known vulnerabilities.
6. **No real patient data** — Use synthetic or mock data in all development, testing, and documentation contexts.

---

## Clinical Data Notice

> [!IMPORTANT]
> The hosted V2 trial is for **made-up patient details only**. For any deployment handling real patient data (HPI/PHI), the following are **mandatory**:
> - Authentication and role-based access control (as in V1)
> - A HIPAA Business Associate Agreement covering every service that touches patient data (RDS, S3, Bedrock), and HIPAA/GDPR-compliant encryption at rest and in transit
> - Private networking for the inference worker (NAT gateway or interface endpoints)
> - Institutional review and approval before clinical use

See the [Clinical Operating Mandate](./README.md#-clinical-operating-mandate) in the README for full details.

---

## Acknowledgments

We appreciate the security research community's efforts in responsibly disclosing vulnerabilities. Contributors who report valid security issues will be credited in this file (with permission).

---

**Security is a shared responsibility. Thank you for helping keep SightX safe.** 🛡️
