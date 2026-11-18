# Testing Guide

## Backend

```bash
cd backend
python -m compileall -q app tests
ruff check app tests
pytest
```

Backend coverage includes:

- unit tests for extraction, validation, prompts, and rendering helpers;
- API tests for authentication, ownership boundaries, invalid inputs, and stable error shapes;
- rendering tests for DOCX structure, styles, images, missing-photo fallback, and downloads;
- report editing, history, and retry behavior;
- fixture-contract tests for the fictional event and format files.

Current local result: `56 passed, 1 skipped`. The skipped test is the PDF conversion/download
path; LibreOffice/`soffice` is unavailable locally, so the test verifies the public `503`
failure and skips PDF output inspection. Use `backend/Dockerfile` or install LibreOffice to
verify PDF output.

## Frontend

```bash
cd frontend
npm run lint
npm run typecheck
npm run build
```

`npm run verify` runs all three checks.

## QA documentation

- [`SUMEDHA_QA_CHECKLIST.md`](SUMEDHA_QA_CHECKLIST.md): repeatable DOCX/PDF rendering and deployment/demo checks.
- [`DEPLOYMENT.md`](DEPLOYMENT.md): deployment topology and pre-deployment checklist.
- [`DEMO_RUNBOOK.md`](DEMO_RUNBOOK.md): fictional-data demo sequence.

Use only fictional fixtures and never commit secrets, credentials, private uploads, or
generated report files. Live Gemini generation, Supabase sign-in, deployed CORS, and PDF
output remain environment-dependent and must be marked as such rather than reported as green.
