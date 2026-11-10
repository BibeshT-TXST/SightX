---
name: 🐛 Bug Report
about: Report a bug in SightX to help us improve clinical reliability
title: '[BUG] '
labels: 'bug'
assignees: ''

---

## Describe the Bug
A clear and concise description of what the bug is.

## Service Affected
Which part of the SightX stack is impacted?

- [ ] Frontend (React / Vite)
- [ ] API (Lambda / API Gateway)
- [ ] Inference Engine / Worker (PyTorch / SQS / Bedrock)
- [ ] Database (Postgres / migrations)
- [ ] Infrastructure (Terraform / AWS)
- [ ] Documentation

## To Reproduce
Steps to reproduce the behavior:
1. Navigate to '...'
2. Click on '...'
3. Observe '...'

## Expected Behavior
A clear and concise description of what you expected to happen.

## Actual Behavior
What actually happened instead.

## Screenshots / Logs
If applicable, add screenshots or paste relevant console/terminal output:

```
// Paste error logs here
```

## Environment
- **OS**: [e.g., macOS 15, Windows 11, Ubuntu 24.04]
- **Browser**: [e.g., Chrome 130, Firefox 128]
- **Node.js version**: [e.g., 22.11.0]
- **Python version**: [e.g., 3.11.5]
- **Where**: [hosted trial / local dev / your own AWS deployment]
- **Job ID** (if a scan failed): [shown in the browser's network tab for `GET /jobs/{id}`]

## Additional Context
Add any other context about the problem here (e.g., does it happen with specific retinal images, only after the worker restarts, etc.). Never attach real patient images or details.
