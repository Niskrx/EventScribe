# EventScribe

EventScribe is an AI-assisted academic event report generator. A professor can provide event facts, photographs, and a reference report format—or describe the desired format in text—and receive an editable DOCX and PDF report.

The project’s primary differentiator is **dynamic format understanding**. The application does not rely on one hardcoded report template.

## Project documentation

- [Product Requirements Document](PRD.md)
- [Nishkarsh Implementation Plan](NISHKARSH_IMPLEMENTATION_PLAN.md)
- [Akshansh Implementation Plan](AKSHANSH_IMPLEMENTATION_PLAN.md)
- [Sumedha Implementation Plan](SUMEDHA_IMPLEMENTATION_PLAN.md)
- [Contribution Guide](docs/CONTRIBUTING.md)
- [Architecture Notes](docs/architecture.md)
- [Testing Guide](docs/testing.md)
- [Deployment Readiness](docs/DEPLOYMENT.md)
- [Demo Runbook](docs/DEMO_RUNBOOK.md)

## Planned stack

- Frontend: Next.js 15, React 19, and Tailwind CSS v4
- Backend: Python 3.11+ and FastAPI
- AI: Google Gemini API through a backend-only adapter
- Database and authentication: Supabase (PostgreSQL with Row Level Security)
- File storage: Supabase Storage (`eventscribe-files` bucket) with local disk fallback
- Document rendering: PyMuPDF, python-docx, and LibreOffice headless

## Repository layout

```text
frontend/       Next.js application and UI components
backend/        FastAPI application, AI adapters, and document renderers
supabase/       Database migrations and local Supabase configuration
fixtures/       Safe sample files for development and testing
docs/           Project architecture, testing, and deployment documentation
PRD.md          Product requirements and team execution plan
```

## Local setup and installation

### Prerequisites

- **Node.js**: version 20 or newer
- **Python**: version 3.11 or newer
- **Git**
- *(Optional for local PDF generation)*: **LibreOffice** (`soffice` binary in system PATH)

### 1. Environment configuration

Never commit populated environment files, secrets, or API keys.

* **Frontend environment**:
  Copy the frontend example to `.env.local` inside `frontend/`:
  ```bash
  cp frontend/.env.local.example frontend/.env.local
  ```
  Variables used:
  - `NEXT_PUBLIC_API_BASE_URL` (default: `http://localhost:8000`)
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`

* **Backend environment**:
  Copy the backend example to `.env` inside `backend/`:
  ```bash
  cp backend/.env.example backend/.env
  ```
  Variables used:
  - `ENVIRONMENT` (`development` or `production`)
  - `FRONTEND_ORIGIN` (default: `http://localhost:3000`)
  - `GEMINI_API_KEY`
  - `GEMINI_MODEL`
  - `SUPABASE_URL`
  - `SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`

> **Note on Local Development Mode**: When `ENVIRONMENT=development` and Supabase or Gemini are not yet configured, the backend runs gracefully with safe local in-memory fallback stores and mock authenticated identity (`local-dev-user`), enabling complete offline testing of the frontend and rendering workflows.

### 2. Frontend setup

From the repository root:

```bash
cd frontend
npm install
npm run dev
```

The frontend will start at `http://localhost:3000`.

### 3. Backend setup

In a second terminal window:

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

The backend health check is accessible at `http://localhost:8000/api/health`.

---

## User and demo walkthrough

Follow these steps to test or demonstrate the complete application workflow:

### Step 1: Authentication
1. Navigate to `http://localhost:3000/login` (or `/signup` to register).
2. Enter your email and password.
3. *If Supabase email confirmation is enabled*: check your test inbox to verify the email before logging in, or temporarily disable email confirmations in your Supabase project dashboard (`Authentication > Providers > Email > Confirm email`).
4. In local development without Supabase credentials, the application automatically functions with a simulated local user session.

### Step 2: Create an event draft
1. On the dashboard (`http://localhost:3000/dashboard`), click **"Create report"** or navigate to `/reports/new`.
2. Fill in the required event facts:
   - **Event title** (e.g., `National Workshop on AI & Cloud Computing`)
   - **Event date** (YYYY-MM-DD)
   - **Department** (e.g., `Department of Computer Science`)
   - **Venue** (e.g., `Auditorium Hall A`)
   - **Coordinator** (e.g., `Dr. Jane Doe`)
   - **Objectives**, **Activities**, and **Outcomes**
3. *Form validation*: leaving any required field blank will highlight the field in red with an inline error message and scroll directly to the first invalid field.
4. *Attach photographs*:
   - Click the photo picker to select JPEG, PNG, or WebP images.
   - Selected files display file name chips and size indicators (max 8 MB per photo, up to 20 photos).
   - Click **Remove** beside any photo chip to unattach it prior to submitting.
5. Click **"Save event draft"**. While processing, the button disables and displays live upload progress.

### Step 3: Choose reference format & generate report
1. Upload a sample reference `.pdf` or `.docx` file (or type a natural language style description).
2. The backend extracts structural signals and Gemini produces a validated `FormatSpecification`.
3. Click **"Generate Report"**. Gemini creates structured academic prose matching the exact sections of your format specification using only verified input facts.

### Step 4: Review, edit & export
1. Review generated sections in the interactive editor at `/reports/[reportId]/edit`.
2. Modify paragraphs or list items if adjustments are needed, then save the updated version.
3. Click **"Render DOCX"** to construct the formatted Word document with embedded photograph galleries.
4. Click **"Convert to PDF"** to produce the final submission-ready PDF.
5. Download both `.docx` and `.pdf` files.

### Step 5: Report history
1. Visit `/dashboard` to view saved report history.
2. Review report statuses (`draft`, `generating`, `ready`, `failed`).
3. Re-download generated documents, retry failed generations, or delete old reports.

---

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

---

## Known limitations and troubleshooting

* **Headless PDF Conversion**:
  - Converting DOCX to PDF requires LibreOffice (`soffice`) installed on the host or container.
  - If LibreOffice is not installed locally, DOCX rendering remains 100% functional, while PDF conversion returns an informative `503 LibreOffice is not available on this server` message.
* **Cold Starts on Free Cloud Tiers**:
  - When hosted on Render or Vercel free instances, initial backend requests may take 30–50 seconds if the instance is spinning up from idle.
* **CORS Errors**:
  - If the frontend fails to communicate with `http://localhost:8000`, confirm that `FRONTEND_ORIGIN` in `backend/.env` includes `http://localhost:3000`.
* **Duplicate Submissions**:
  - The submit button is automatically locked and disabled during active API requests to prevent accidental duplicate drafts.

---

## Team

- **Akshansh** — lead engineer and integration owner (architecture, backend API, AI adapter, rendering engine, Supabase)
- **Nishkarsh** — bounded frontend and documentation contributor (event form validation, upload feedback, responsive UI, setup & walkthrough docs)
- **Sumedha** — bounded testing and document-quality contributor (backend API negative tests, test fixtures, rendering QA checklist)
