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

1. Go to the [**Security** tab](https://github.com/BibeshT-TXST/Project-SightX/security) of this repository.
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

| Area | Examples |
| :--- | :--- |
| **Authentication & Authorization** | Session hijacking, RLS bypass, role escalation |
| **API Security** | Injection attacks, CORS misconfiguration, unauthorized access |
| **Data Exposure** | Leaking patient data, credentials in logs, insecure storage |
| **Dependency Vulnerabilities** | Known CVEs in npm/pip packages |
| **Infrastructure** | Docker container escapes, exposed ports, misconfigured services |

### Out of Scope

- Vulnerabilities in third-party services (Supabase, Vercel, etc.) — report those to the respective vendors
- Social engineering attacks
- Denial-of-service (DoS) attacks against development/staging environments
- Issues that require physical access to the machine

---

## Security Best Practices for Contributors

If you're contributing to SightX, please follow these guidelines:

1. **Never commit secrets** — API keys, database passwords, or tokens must stay in `.env` files (which are `.gitignore`'d).
2. **Use the anon key** — The frontend must only use the Supabase `anon` (public) key, never the `service_role` key.
3. **Respect RLS policies** — Row Level Security is the primary data access control mechanism. Do not bypass or disable it.
4. **Validate all inputs** — Both client-side and server-side validation are required for any user input.
5. **Keep dependencies updated** — Run `npm audit` and `pip audit` periodically to catch known vulnerabilities.
6. **No real patient data** — Use synthetic or mock data in all development, testing, and documentation contexts.

---

## Clinical Data Notice

> [!IMPORTANT]
> SightX is designed for institutional deployment under strict clinical governance. For any deployment handling real patient data (HPI/PHI), the following are **mandatory**:
> - Supabase B2B/Enterprise Plan with dedicated infrastructure
> - HIPAA/GDPR-compliant encryption at rest and in transit
> - Institutional review and approval before clinical use

See the [Clinical Operating Mandate](./README.md#-clinical-operating-mandate) in the README for full details.

---

## Acknowledgments

We appreciate the security research community's efforts in responsibly disclosing vulnerabilities. Contributors who report valid security issues will be credited in this file (with permission).

---

**Security is a shared responsibility. Thank you for helping keep SightX safe.** 🛡️
