# EventScribe

EventScribe is an AI-assisted academic event report generator. A professor can provide event facts, photographs, and a reference report format—or describe the desired format in text—and receive an editable DOCX and PDF report.

The project’s primary differentiator is dynamic format understanding. The application does not rely on one hardcoded report template.

## Project documentation

- [Product Requirements Document](PRD.md)
- [Contribution Guide](docs/CONTRIBUTING.md)
- [Architecture Notes](docs/architecture.md)
- [Testing Guide](docs/testing.md)

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

The application code is being added incrementally. Before running the full application:

1. Copy `.env.example` to the appropriate local environment files.
2. Follow the setup instructions in the frontend and backend README files once those applications are scaffolded.
3. Never commit `.env` files, API keys, private uploads, or generated report files.

## Team

- Akshansh — lead engineer and integration owner
- Nishkarsh — bounded frontend and documentation contributor
- Sumedha — bounded testing and document-quality contributor

The detailed task boundaries and coding-agent prompts are defined in `PRD.md`.
