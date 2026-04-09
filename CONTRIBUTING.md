# Contributing to SightX

Thank you for your interest in contributing to **SightX** — a diabetic retinopathy detection system built with clinical AI, React, and Supabase. Whether you're fixing a bug, improving documentation, or proposing a new feature, every contribution helps advance accessible eye care.

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
| **Node.js** | 18+ | Frontend & Backend |
| **Python** | 3.10+ | Inference Engine |
| **Docker** | Latest | Full-stack orchestration |
| **Supabase Account** | Free tier | Auth & database |

### Local Setup

1. **Fork & clone** the repository:
   ```bash
   git clone https://github.com/<your-username>/Project-SightX.git
   cd Project-SightX
   ```

2. **Set up environment variables** — create a `.env` file in the project root:
   ```bash
   VITE_SUPABASE_URL=your_project_url
   VITE_SUPABASE_PUBLISHABLE_KEY=your_anon_public_key
   ```

3. **Run with Docker** (recommended):
   ```bash
   docker-compose up --build
   ```

4. **Or run individual services**:
   ```bash
   # Frontend (Vite + React)
   cd frontend && npm install && npm run dev

   # Backend (Express)
   cd backend && npm install && npm run dev

   # Inference Engine (FastAPI + PyTorch)
   cd inference-engine && pip install -r requirements.txt && uvicorn app.main:app --reload
   ```

> [!TIP]
> See the [main README](./README.md) for the full Supabase setup guide, including schema creation, auth configuration, and superuser bootstrapping.

---

## Project Structure

```
Project-SightX/
├── frontend/          # React + Vite clinical interface
│   └── src/
│       ├── components/    # Reusable UI components
│       ├── context/       # Auth & state providers
│       ├── lib/           # Supabase client
│       └── pages/         # Route-level page components
├── backend/           # Express API gateway
├── inference-engine/  # FastAPI + PyTorch AI engine
├── Docs/              # Architecture diagrams & assets
└── docker-compose.yml # Full-stack orchestration
```

---

## Development Workflow

1. **Create a branch** from `main` (see [Branch Naming Convention](#branch-naming-convention)).
2. **Make your changes** in focused, atomic commits.
3. **Test locally** — ensure the app runs without errors.
4. **Push your branch** and open a Pull Request against `main`.

---

## Branch Naming Convention

Use the following prefixes for your branches:

| Prefix | Purpose | Example |
| :--- | :--- | :--- |
| `feature/` | New features or enhancements | `feature/scan-history-export` |
| `fix/` | Bug fixes | `fix/login-redirect-loop` |
| `docs/` | Documentation updates | `docs/supabase-setup-guide` |
| `refactor/` | Code restructuring (no behavior change) | `refactor/auth-context-cleanup` |
| `chore/` | Tooling, CI, or config changes | `chore/docker-compose-update` |

---

## Commit Message Convention

We follow a simplified [Conventional Commits](https://www.conventionalcommits.org/) format:

```
<type>: <short description>

[optional body with more detail]
```

**Types:**
- `feat` — A new feature
- `fix` — A bug fix
- `docs` — Documentation only
- `style` — Formatting, whitespace (no logic change)
- `refactor` — Code restructuring (no behavior change)
- `test` — Adding or updating tests
- `chore` — Build process, CI, tooling

**Examples:**
```
feat: add scan history export to CSV
fix: resolve RLS policy blocking profile reads
docs: add superuser creation guide to README
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
- [ ] No hardcoded secrets, API keys, or credentials
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

### Backend (Node.js / Express)

- **ES Modules**: Use `import/export` syntax
- **Error handling**: Always catch and return meaningful error responses
- **Middleware**: Keep route handlers thin — extract logic into controllers

### Inference Engine (Python / FastAPI)

- **Type hints**: Use Python type annotations on all function signatures
- **Docstrings**: Include docstrings on public functions
- **Dependencies**: Pin versions in `requirements.txt`

---

## Reporting Bugs

Use the [Bug Report template](https://github.com/BibeshT-TXST/Project-SightX/issues/new?template=bug_report.md) to file an issue. Please include:

- **Environment**: OS, browser, Node/Python version
- **Steps to reproduce**: Minimal steps to trigger the bug
- **Expected vs. actual behavior**: What should happen vs. what does happen
- **Screenshots / logs**: Console errors, network failures, or UI glitches

---

## Requesting Features

Use the [Feature Request template](https://github.com/BibeshT-TXST/Project-SightX/issues/new?template=feature_request.md) to propose an idea. Please describe:

- The **problem** you're trying to solve
- Your **proposed solution**
- Any **alternatives** you've considered

---

## Clinical & Ethical Guidelines

SightX operates in the medical AI space. All contributors must uphold the following principles:

> [!CAUTION]
> **Patient safety is non-negotiable.** Any contribution that modifies the AI inference pipeline, risk classification logic, or diagnostic output must be reviewed with extreme care.

- **No real patient data** in issues, PRs, or test fixtures. Use synthetic data only.
- **Do not weaken safety thresholds** — the asymmetric cost matrix and Bayesian priors exist to prevent missed diagnoses.
- **Clinical accuracy over cosmetics** — if a change improves visuals but risks misrepresenting diagnostic output, it will be rejected.
- **Accessibility matters** — ensure UI contributions meet WCAG 2.1 AA contrast and interaction standards.

---

## License

By contributing to SightX, you agree that your contributions will be licensed under the [MIT License](./LICENSE).

---

**Thank you for helping build a future where preventable blindness is truly preventable.** 🩺
