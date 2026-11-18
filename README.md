# EventScribe

EventScribe is an AI-assisted academic event report generator. A professor can provide event facts, photographs, and a reference report format—or describe the desired format in text—and receive an editable DOCX and PDF report.

The project’s primary differentiator is dynamic format understanding. The application does not rely on one hardcoded report template.

## Project documentation

- [Product Requirements Document](PRD.md)
- [Contribution Guide](docs/CONTRIBUTING.md)
- [Architecture Notes](docs/architecture.md)
- [Testing Guide](docs/testing.md)
- [Deployment Readiness](docs/DEPLOYMENT.md)
- [Demo Runbook](docs/DEMO_RUNBOOK.md)

## Planned stack

- Frontend: Next.js and Tailwind CSS
- Backend: Python and FastAPI
- AI: Gemini API through a backend-only adapter
- Database and authentication: Supabase
- File storage: Supabase Storage
- Documents: PyMuPDF, python-docx, and LibreOffice headless

## Repository layout

```text
frontend/       Next.js application
backend/        FastAPI application
supabase/       Database migrations and local Supabase configuration
fixtures/       Safe sample files for development and testing
docs/           Project documentation
PRD.md          Product requirements and team execution plan
```

## Local setup

Requirements:

- Node.js 20 or newer
- Python 3.11 or newer
- Git

From the repository root:

```bash
cp .env.example .env.local.example  # reference only; do not commit a populated copy
cd frontend
npm install
npm run dev
```

In a second terminal:

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

The frontend runs at `http://localhost:3000`. The backend health endpoint is `http://localhost:8000/api/health`.

Use `frontend/.env.local.example` for browser-safe variables and `backend/.env.example` for server variables. Copy them to `.env.local` and `.env` respectively only when needed. Never commit populated environment files, API keys, private uploads, or generated report files.

## Command reference

| Area | Command | Purpose |
|---|---|---|
| Frontend | `npm run dev` | Start the Next.js development server |
| Frontend | `npm run typecheck` | Run the TypeScript compiler without emitting files |
| Frontend | `npm run lint` | Run ESLint checks |
| Frontend | `npm run build` | Create a production build |
| Frontend | `npm run verify` | Run frontend lint, typecheck, and production build |
| Backend | `uvicorn app.main:app --reload --port 8000` | Start the FastAPI development server |
| Backend | `python -m compileall -q app tests` | Check Python syntax |
| Backend | `ruff check app tests` | Run Python lint checks |
| Backend | `pytest` | Run backend tests |
| Backend | `python -m compileall -q app tests && ruff check app tests && pytest` | Run backend verification |

GitHub Actions runs the same frontend and backend verification on pushes and pull requests to `main`.

Dependency strategy: frontend dependencies are pinned in `frontend/package.json` and `frontend/package-lock.json`; backend runtime and test dependencies are pinned in `backend/requirements.txt`. A generated Python environment is never committed. A release lock/export can be produced later if deployment requires one.

## Team

- Akshansh — lead engineer and integration owner
- Nishkarsh — bounded frontend and documentation contributor
- Sumedha — bounded testing and document-quality contributor

The detailed task boundaries and coding-agent prompts are defined in `PRD.md`.
