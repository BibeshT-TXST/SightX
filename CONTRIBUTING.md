# Contributing to SightX

Thank you for your interest in contributing to **SightX** — a diabetic retinopathy detection system built with clinical AI, React, and AWS. Whether you're fixing a bug, improving documentation, or proposing a new feature, every contribution helps advance accessible eye care.

Please take a moment to read through these guidelines before submitting your work.

---

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Project Structure](#project-structure)
- [Development Workflow](#development-workflow)
- [Branch Naming Convention](#branch-naming-convention)
- [Commit Message Convention](#commit-message-convention)
- [Pull Request Process](#pull-request-process)
- [Coding Standards](#coding-standards)
- [Reporting Bugs](#reporting-bugs)
- [Requesting Features](#requesting-features)
- [Clinical & Ethical Guidelines](#clinical--ethical-guidelines)

---

## Code of Conduct

This project adheres to the [Contributor Covenant Code of Conduct](./CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code. Please report unacceptable behavior via the channels listed in the Code of Conduct.

---

## Getting Started

### Prerequisites

| Tool | Version | Purpose |
| :--- | :--- | :--- |
| **Node.js** | 22 | Frontend & API |
| **Python** | 3.10+ | Inference engine & worker |
| **Docker** | Latest | Optional: local Postgres for migrations, inference image |
| **Terraform** | 1.10+ | Only for infrastructure changes |

### Local Setup

1. **Fork & clone** the repository:
   ```bash
   git clone https://github.com/<your-username>/SightX.git
   cd SightX
   ```

2. **Run each part's checks** (the same ones CI runs):
   ```bash
   # Frontend (Vite + React)
   cd frontend && npm ci && npm run lint && npm run build

   # API (Lambda handlers)
   cd api && npm ci && npm test

   # Inference engine & worker (CPU-only torch keeps the install small)
   cd inference-engine
   pip install torch torchvision --index-url https://download.pytorch.org/whl/cpu
   pip install -r requirements-worker.txt
   python -m unittest tests.test_worker
   python -m unittest tests.test_predictor

   # Infrastructure
   terraform fmt -check -recursive infrastructure
   ```

3. **Run the app**:
   - **Frontend**: put `VITE_API_URL=<deployed API URL>` in `frontend/.env.local`, then `npm run dev`.
   - **Model only**: `cd inference-engine && uvicorn main:app --reload`, then POST an image to `/predict`.
   - **Database**: [db/README.md](./db/README.md) runs the migrations against a throwaway Postgres container.

> [!TIP]
> Deploying your own copy to AWS is covered step by step in the [Infrastructure README](./infrastructure/README.md).

---

## Project Structure

```
SightX/
├── frontend/          # React + Vite trial interface
│   └── src/
│       ├── components/    # Reusable UI components
│       ├── lib/           # API client and trial session
│       └── pages/         # Route-level page components
├── api/               # Lambda handlers behind the HTTP API
├── inference-engine/  # PyTorch model, SQS worker, local FastAPI server
│   └── tests/             # Worker and predictor tests
├── db/                # PostgreSQL migrations
├── infrastructure/    # Terraform for every AWS resource
├── Docs/              # Diagrams, decision records, build logs
└── .github/           # CI workflow and issue templates
```

---

## Development Workflow

1. **Create a branch** from `main` (see [Branch Naming Convention](#branch-naming-convention)).
2. **Make your changes** in focused, atomic commits.
3. **Test locally** — run the checks for every part you touched (see [Local Setup](#local-setup)); CI runs them all on your PR.
4. **Push your branch** and open a Pull Request against `main`.

---

## Branch Naming Convention

Use the following prefixes for your branches:

| Prefix | Purpose | Example |
| :--- | :--- | :--- |
| `feature/` | New features or enhancements | `feature/scan-history-export` |
| `fix/` | Bug fixes | `fix/scan-poll-timeout` |
| `docs/` | Documentation updates | `docs/deploy-runbook` |
| `refactor/` | Code restructuring (no behavior change) | `refactor/worker-retry-logic` |
| `chore/` | Tooling, CI, or config changes | `chore/ci-node-version` |

---

## Commit Message Convention

We follow a simplified [Conventional Commits](https://www.conventionalcommits.org/) format:

```
<type>(<optional scope>): <short description>

[optional body with more detail]
```

Common scopes: `frontend`, `api`, `inference`, `worker`, `db`, `infra`.

**Types:**
- `feat` — A new feature
- `fix` — A bug fix
- `docs` — Documentation only
- `style` — Formatting, whitespace (no logic change)
- `refactor` — Code restructuring (no behavior change)
- `test` — Adding or updating tests
- `perf` — Performance improvement
- `build` — Dependencies or packaging
- `ci` — CI workflow changes
- `chore` — Housekeeping, tooling

**Examples:**
```
feat(frontend): add scan history export to CSV
fix(worker): requeue jobs when the database is unreachable
docs: add migration steps to the deploy runbook
```

---

## Pull Request Process

1. **Ensure your branch is up to date** with `main`:
   ```bash
   git fetch origin
   git rebase origin/main
   ```

2. **Fill out the PR template** with:
   - A clear description of **what** changed and **why**
   - Screenshots or recordings for any UI changes
   - Steps to test the change locally

3. **Link related issues** (e.g., `Closes #42`)

4. **Wait for review** — a maintainer will review your PR. Please be responsive to feedback.

5. **Squash and merge** — we prefer squash merges to keep `main` history clean.

### PR Checklist

- [ ] Code follows the project's style guidelines
- [ ] CI is green (lint, tests, predictor smoke test, Terraform checks)
- [ ] No hardcoded secrets, API keys, credentials, or `terraform.tfvars`
- [ ] UI changes tested across Chrome and Firefox
- [ ] New features are documented (README or inline)
- [ ] Existing functionality is not broken

---

## Coding Standards

### Frontend (React / JavaScript)

- **Components**: Use functional components with hooks
- **Styling**: MUI `sx` prop with inline token-based design — avoid external CSS files
- **Naming**: PascalCase for components (`RetinalScanPage.jsx`), camelCase for utilities
- **JSDoc**: Add JSDoc comments to all exported components and functions
- **No magic values**: Use named constants for colors, spacing, and breakpoints

### API (Node.js / Lambda)

- **ES Modules**: Use `import/export` syntax
- **Routes take their dependencies**: `(req, { db, presignUpload })`, so tests can pass fakes; add a test for every new route or rule
- **Scope every query to the trial session**; never trust IDs from the request body
- **Errors**: throw `HttpError` with a clear message; unexpected errors must not leak details

### Inference Engine & Worker (Python)

- **Type hints**: Use Python type annotations on all function signatures
- **Docstrings**: Include docstrings on public functions
- **Dependencies**: Serving needs go in `requirements.txt`, worker-only in `requirements-worker.txt`, training-only in `requirements-train.txt`
- **The worker never crashes on bad input**: decide for each new failure whether it retries (transient) or fails the job (permanent)

### Database

- **Never edit a migration that has run on RDS** — add a new numbered file in `db/migrations/`
- **Grant the minimum**: new columns need explicit grants for `sightx_api` or `sightx_worker`

### Infrastructure (Terraform)

- **Run `terraform fmt`** before committing; CI rejects unformatted files
- **Explain cost and security choices** in comments next to the resource, and record bigger decisions in `Docs/decisions/`
- **Never commit `terraform.tfvars`** or state

---

## Reporting Bugs

Use the [Bug Report template](https://github.com/BibeshT-TXST/SightX/issues/new?template=bug_report.md) to file an issue. Please include:

- **Environment**: OS, browser, Node/Python version
- **Steps to reproduce**: Minimal steps to trigger the bug
- **Expected vs. actual behavior**: What should happen vs. what does happen
- **Screenshots / logs**: Console errors, network failures, or UI glitches

---

## Requesting Features

Use the [Feature Request template](https://github.com/BibeshT-TXST/SightX/issues/new?template=feature_request.md) to propose an idea. Please describe:

- The **problem** you're trying to solve
- Your **proposed solution**
- Any **alternatives** you've considered

---

## Clinical & Ethical Guidelines

SightX operates in the medical AI space. All contributors must uphold the following principles:

> [!CAUTION]
> **Patient safety is non-negotiable.** Any contribution that modifies the AI inference pipeline, risk classification logic, or diagnostic output must be reviewed with extreme care.

- **No real patient data** in issues, PRs, test fixtures, or the hosted trial. Use synthetic data only.
- **Keep identifiers away from the model** — Bedrock prompts may contain dates, tiers and decisions, never names or patient IDs.
- **Do not weaken safety thresholds** — the asymmetric cost matrix and Bayesian priors exist to prevent missed diagnoses.
- **Clinical accuracy over cosmetics** — if a change improves visuals but risks misrepresenting diagnostic output, it will be rejected.
- **Accessibility matters** — ensure UI contributions meet WCAG 2.1 AA contrast and interaction standards.

---

## License

By contributing to SightX, you agree that your contributions will be licensed under the [MIT License](./LICENSE).

---

**Thank you for helping build a future where preventable blindness is truly preventable.** 🩺
