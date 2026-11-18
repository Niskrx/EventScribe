# EventScribe deployment readiness

This repository contains deployment configuration, but the external deployment is intentionally not performed yet. The Supabase project, Gemini key, hosting accounts, and production domains must be supplied by the team before launch.

## Recommended topology

- Frontend: Vercel, using the `frontend` directory.
- Backend: Render web service using `render.yaml` and `backend/Dockerfile`.
- Database/auth/storage: Supabase using the migration in `supabase/migrations/`.
- AI: Gemini called only by the backend.

## Pre-deployment checklist

1. Create or select the production Supabase project.
2. Apply `supabase/migrations/202611180001_initial_schema.sql`.
3. Create the private `eventscribe-files` storage bucket and verify its policies.
4. Create a Gemini API key and select a currently available free-tier model.
5. Deploy the backend from the repository root with the Render blueprint. Set every `sync: false` value in the Render dashboard.
6. Confirm `https://<backend-domain>/api/health` returns a healthy response.
7. Deploy `frontend` to Vercel and set `NEXT_PUBLIC_API_BASE_URL`, `NEXT_PUBLIC_SUPABASE_URL`, and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
8. Set the backend `FRONTEND_ORIGIN` to the exact Vercel origin, including scheme and without a trailing slash.
9. Confirm CORS, authentication callbacks, signed downloads, and PDF conversion in the deployed environment.
10. Never put `SUPABASE_SERVICE_ROLE_KEY` or `GEMINI_API_KEY` in frontend variables, Git, screenshots, or logs.

## Production smoke test

```bash
curl -fsS https://<backend-domain>/api/health
curl -fsS -I https://<frontend-domain>
```

Then follow [`DEMO_RUNBOOK.md`](DEMO_RUNBOOK.md) with fictional data. If LibreOffice is missing, the backend must be fixed before demo day; do not silently claim PDF support.

## Current status

The repository is deployment-ready, but external setup remains pending by design. Local fallback stores are suitable for development only and must not be treated as production persistence.
