# EventScribe — Akshansh Implementation Plan

**Owner:** Akshansh
**Source:** `PRD.md`
**Role:** Lead engineer and integration owner
**Objective:** Build, integrate, test, and prepare the complete MVP while keeping teammate contributions bounded and compatible with the main architecture.

## 1. Execution strategy

Akshansh owns the end-to-end technical path. Work in dependency order and keep the application runnable after every milestone.

```text
Repository foundation
        ↓
Frontend/backend skeleton
        ↓
Configuration and health checks
        ↓
Supabase auth, schema, storage, and RLS
        ↓
Format ingestion and extraction
        ↓
Gemini format analysis
        ↓
Event and photograph workflow
        ↓
Gemini report-content generation
        ↓
DOCX rendering and PDF conversion
        ↓
Preview, editing, history, and downloads
        ↓
Teammate integration, security, testing, deployment
```

Do not start with advanced formatting or a large frontend. First establish the contracts that allow the pieces to connect.

## 2. Working rules

- Read `PRD.md` before each major milestone.
- Keep `main` stable and use feature branches.
- Make small, focused commits.
- Do not commit secrets, uploaded files, generated reports, or local environment files.
- Treat Gemini responses as untrusted data, never as executable code.
- Validate every AI response with Pydantic before persistence or rendering.
- Keep all Gemini calls in the FastAPI backend.
- Prefer a working fallback layout over a renderer crash.
- Run the milestone checks before moving on.
- Do not expand MVP scope until the full happy path works.

## 3. Branch and commit plan

Suggested Akshansh branches:

```text
feature/akshansh-scaffold
feature/akshansh-auth-database
feature/akshansh-format-analysis
feature/akshansh-event-photos
feature/akshansh-content-generation
feature/akshansh-document-rendering
feature/akshansh-history-deployment
```

Suggested commit sequence:

```text
Add project PRD and repository foundation       # already created locally
Create Next.js and FastAPI application skeleton
Add environment configuration and health checks
Add Supabase migrations and authentication
Add format upload and extraction services
Add validated Gemini format analysis
Add event and photo management workflow
Add structured report-content generation
Add deterministic DOCX renderer
Add PDF conversion and download flow
Add report editing and history
Add integration tests and deployment configuration
```

## 4. Milestone 0 — verify the repository foundation

### Objective

Confirm that the local repository contains the finalized PRD and foundation files before adding application code.

### Verify

- `PRD.md` exists and is the source of truth.
- `README.md` explains the project.
- `.gitignore` excludes secrets, uploads, generated files, and build artifacts.
- `.env.example` contains placeholders only.
- `frontend/`, `backend/`, `supabase/`, `fixtures/`, and `docs/` exist.
- The initial commit is present locally.

### Exit criteria

- Repository has a clean working tree, except for intentional work in progress.
- Remote access is fixed before pushing future commits.

## 5. Milestone 1 — scaffold the applications

### Objective

Create a runnable Next.js frontend and FastAPI backend without implementing business logic yet.

### Frontend deliverables

- Next.js application under `frontend/`.
- TypeScript enabled.
- Tailwind CSS configured.
- App layout with a simple EventScribe shell.
- Pages or routes for login, dashboard, and create-report placeholder.
- A shared API client module using `NEXT_PUBLIC_API_BASE_URL`.
- Loading, empty, and error-state components.

### Backend deliverables

- FastAPI application under `backend/app/`.
- `main.py` with application factory or clear application entrypoint.
- `/api/health` endpoint.
- CORS configuration for local frontend origin.
- Settings module using environment variables.
- Structured error response shape.
- Basic test for the health endpoint.

### Suggested files

```text
frontend/app/page.tsx
frontend/app/login/page.tsx
frontend/app/dashboard/page.tsx
frontend/components/AppShell.tsx
frontend/lib/api.ts
backend/app/main.py
backend/app/config.py
backend/app/api/health.py
backend/app/schemas/errors.py
backend/tests/test_health.py
```

### Verification

- Frontend starts locally.
- Backend starts locally.
- Opening the frontend does not show a network error.
- `/api/health` returns JSON such as `{ "status": "ok" }`.
- Backend test passes.

### Commit

`Create Next.js and FastAPI application skeleton`

## 6. Milestone 2 — configuration and local developer experience

### Objective

Make the repository easy for all three teammates to run without exposing secrets.

### Tasks

- Finalize `.env.example` names.
- Add backend dependency file and lockfile strategy.
- Add frontend package scripts.
- Add backend formatting/linting/test scripts.
- Add a root-level setup section to `README.md`.
- Add a root-level command reference.
- Add a consistent API error format.
- Confirm that missing optional environment variables produce readable startup warnings or safe disabled behavior.

### Environment rules

- Frontend may contain only public Supabase URL and anon key variables.
- Backend contains Gemini and service-role secrets.
- Never prefix a secret with `NEXT_PUBLIC_`.
- Never return environment values from `/api/health`.

### Verification

- A clean clone can identify the required commands from `README.md`.
- The application fails clearly when a required backend secret is missing.
- `.env.example` contains no real credential.

## 7. Milestone 3 — Supabase authentication, schema, and storage

### Objective

Implement secure persistence and user ownership before building report workflows.

### Tasks

1. Create Supabase migrations for:
   - `profiles`;
   - `format_profiles`;
   - `events`;
   - `event_photos`;
   - `reports`.
2. Add timestamps and useful indexes.
3. Add foreign keys and deletion behavior.
4. Add RLS policies using the authenticated user ID.
5. Create storage buckets or document the bucket setup.
6. Add storage policies for user-scoped paths.
7. Integrate frontend login, sign-up, logout, and session refresh.
8. Add backend bearer-token validation.
9. Add a protected `/api/me` or equivalent test endpoint.

### Ownership requirements

- Do not accept `user_id` as an authority from the browser.
- Derive the user from the verified session.
- Check ownership before every read, update, download, and delete.
- Test a second user cannot access the first user’s records.

### Verification

- New user can sign up and sign in.
- Refresh preserves the session.
- Unauthenticated dashboard access is blocked.
- User A cannot read User B’s format, event, photo, or report.
- RLS policies are present in migrations and tested.

### Commit

`Add Supabase migrations authentication and ownership policies`

## 8. Milestone 4 — format input and extraction

### Objective

Accept a PDF, DOCX, or text description and normalize it into a safe input for AI analysis.

### Tasks

1. Define `FormatSource` and `ExtractedFormatInput` Pydantic models.
2. Add file extension, MIME, and size validation.
3. Add PDF extraction using PyMuPDF:
   - text;
   - page count;
   - page order;
   - basic metadata.
4. Add DOCX extraction using `python-docx`:
   - paragraphs;
   - heading levels;
   - tables;
   - basic styles;
   - image presence.
5. Add text-description handling.
6. Upload source files to user-scoped storage.
7. Save an initial `format_profiles` record with `pending` status.
8. Return a format-analysis job/result status to the frontend.

### Design rule

The extraction layer should report unknown properties as missing or uncertain. It must not invent formatting values.

### Verification

- Valid PDF is accepted.
- Valid DOCX is accepted.
- Text-only format description is accepted.
- Unsupported extension is rejected.
- Oversized file is rejected.
- Extraction output preserves source order.
- Uploaded source path is not publicly predictable.

### Commit

`Add format upload and reference extraction services`

## 9. Milestone 5 — structured format specification and Gemini adapter

### Objective

Convert extracted format input into a versioned JSON specification that the renderer can consume.

### Tasks

1. Define Pydantic models for:
   - document style;
   - section rules;
   - image rules;
   - table rules;
   - uncertainty notes;
   - full format specification.
2. Add schema versioning, starting at `1.0`.
3. Create a backend-only Gemini adapter.
4. Put model name in `GEMINI_MODEL`.
5. Send a clear system instruction:
   - analyze the supplied format;
   - return only the requested JSON structure;
   - distinguish observed values from uncertain values;
   - never invent unavailable document details.
6. Use structured output/JSON response mode where supported.
7. Validate the response with Pydantic.
8. Retry only safe transient failures.
9. Save successful results and analysis errors.
10. Add request logging without storing full private document content.

### Free-tier safeguards

- Do not enable billing automatically.
- Add configured request/file limits.
- Return a readable quota error.
- Record model and prompt version.
- Verify current free-tier availability before demo deployment.

### Verification

- A sample reference produces valid `format_spec` JSON.
- Malformed JSON is rejected safely.
- Provider errors are mapped to user-readable errors.
- Repeating a successful request does not create duplicate records unnecessarily.
- Gemini API key never appears in frontend bundles or logs.

### Commit

`Add validated Gemini format analysis`

## 10. Milestone 6 — event and photograph workflow

### Objective

Persist the professor’s verified event facts and photographs.

### Tasks

1. Define event input and output schemas.
2. Build the event-details form.
3. Implement create, read, update, and delete event endpoints.
4. Add required-field validation.
5. Add photograph upload endpoint.
6. Validate image MIME, size, and decodability.
7. Store photos under an event- and user-scoped path.
8. Store `sort_order` and optional caption.
9. Add photo deletion and reordering.
10. Build the basic frontend upload and ordering experience.

### Fact-grounding rule

The system must preserve the distinction between user-entered facts and generated prose. Do not normalize uncertain details into facts without user confirmation.

### Verification

- Event can be saved as a draft.
- Required fields are enforced.
- Multiple photos upload successfully.
- Photos can be removed and reordered.
- Invalid images are rejected.
- Photo ownership is enforced.

### Teammate integration point

After the basic event form exists, give Nishkarsh the bounded validation task from `PRD.md`. Do not wait for his branch to build the backend workflow. Integrate his branch only after the frontend form contract is stable.

### Commit

`Add event and photo management workflow`

## 11. Milestone 7 — structured report-content generation

### Objective

Generate professional report content from verified facts and the approved format specification.

### Tasks

1. Define report-content Pydantic models.
2. Map format sections to content-generation instructions.
3. Build a prompt containing:
   - verified event facts;
   - format specification;
   - selected photo metadata;
   - strict no-invention rules;
   - tone and section requirements.
4. Call Gemini through the same backend adapter.
5. Validate returned content.
6. Detect empty required sections.
7. Store model, prompt version, and content version.
8. Add retry and failure states.
9. Return section-level content to the frontend.

### No-invention controls

- Instruct the model not to create names, dates, attendance counts, quotes, awards, outcomes, or activities.
- Use `null`, an empty field, or a review note when facts are missing.
- Show the user which sections need confirmation.
- Never silently replace user facts with AI alternatives.

### Verification

- Generated content contains the requested section keys.
- Missing optional facts do not become fabricated facts.
- Invalid model output cannot reach the renderer.
- A retry can recover from a temporary provider failure.

### Commit

`Add structured report content generation`

## 12. Milestone 8 — report editing and preview

### Objective

Let the professor review and edit generated content before rendering.

### Tasks

- Build section-by-section editor.
- Allow title and body edits.
- Preserve section order from the format specification.
- Display missing-fact warnings.
- Save edited content as a new content version.
- Add loading, saving, and error states.
- Build a lightweight HTML preview.

### Scope limit

Do not build a full Microsoft Word clone. A clean section editor is sufficient for MVP.

### Verification

- User can edit generated text.
- Refresh does not discard saved edits.
- Required sections remain present.
- Preview reflects the edited version.

## 13. Milestone 9 — deterministic DOCX rendering

### Objective

Generate an editable Word document using Python and the stored format specification.

### Rendering order

1. Create document.
2. Apply page size and margins.
3. Configure base font and paragraph style.
4. Render title block/title page.
5. Render sections in specification order.
6. Render tables using safe table primitives.
7. Render images according to the image rule.
8. Add captions where configured.
9. Add page breaks, headers, footers, and page numbers where supported.
10. Save to a temporary path.
11. Validate that the output file exists and is readable.
12. Upload the final DOCX to user-scoped storage.

### Supported MVP primitives

- title;
- subtitle/metadata;
- headings;
- paragraphs;
- bullet and numbered lists;
- simple tables;
- single images;
- two-column image grids;
- captions;
- page breaks;
- basic headers/footers.

### Fallback rule

Unsupported format features must produce a warning and use the nearest supported layout. They must not crash the entire report.

### Verification

- DOCX opens in a standard Word-compatible viewer.
- Sections appear in the correct order.
- Images are present and not distorted beyond configured limits.
- Missing optional features create warnings, not fatal errors.
- Temporary files are cleaned up.

### Teammate integration point

After the renderer has a stable testable interface, give Sumedha the bounded test/fixture task from `PRD.md`. She should test the interface, not redesign it.

### Commit

`Add deterministic DOCX report renderer`

## 14. Milestone 10 — PDF conversion and downloads

### Objective

Convert the generated DOCX into a PDF and expose secure downloads.

### Tasks

- Detect LibreOffice availability at startup or through a health check.
- Convert in an isolated temporary directory.
- Capture conversion stdout/stderr for server diagnostics without exposing it to users.
- Save PDF storage path on success.
- Keep the DOCX available even if PDF conversion fails.
- Generate short-lived signed download URLs.
- Add file status to the report response.

### Verification

- Valid DOCX converts to a readable PDF.
- Missing LibreOffice produces a clear `CONVERSION_UNAVAILABLE` error.
- DOCX remains downloadable when PDF conversion fails.
- Download URLs are not permanent public URLs.

### Commit

`Add PDF conversion and secure report downloads`

## 15. Milestone 11 — report history and recovery

### Objective

Make generated reports reusable and failures recoverable.

### Tasks

- Build report-history endpoint and page.
- Show title, event date, status, timestamps, and last error.
- Add reopen action.
- Add retry generation/rendering action.
- Add download actions.
- Add delete confirmation.
- Define storage cleanup behavior.
- Ensure deletion is ownership-protected.

### Verification

- A completed report appears in history.
- A failed report can be retried.
- Reopening preserves event facts and edited content.
- Deleting a report does not delete another user’s records.

## 16. Milestone 12 — teammate branch integration

### Nishkarsh integration

1. Confirm the event form contract is stable.
2. Ask Nishkarsh to use branch `feature/nishkarsh-event-form-validation`.
3. Review only the intended frontend files.
4. Run frontend lint/tests.
5. Test invalid and valid form submissions manually.
6. Merge the PR if acceptance criteria pass.

### Sumedha integration

1. Confirm the backend test harness and renderer interface are stable.
2. Ask Sumedha to use branch `test/sumedha-api-rendering-tests`.
3. Review that tests cover invalid input and safe fixtures.
4. Run the full backend test suite.
5. Confirm no production architecture was changed unnecessarily.
6. Merge the PR if tests pass.

### Integration rule

If a teammate branch conflicts with the main architecture, Akshansh resolves the conflict and explains the required change. Do not merge blindly just to increase activity.

## 17. Milestone 13 — full testing and security hardening

### Automated checks

- frontend lint and typecheck;
- backend formatting/linting;
- backend unit tests;
- API integration tests;
- schema validation tests;
- renderer fixture tests;
- ownership/RLS tests;
- build checks.

### Manual checks

- sign-up/sign-in/logout;
- invalid file upload;
- valid PDF/DOCX/text format input;
- format analysis review;
- incomplete event facts;
- multiple photo upload and reorder;
- content generation and retry;
- editing and saving;
- DOCX openability;
- PDF readability;
- report history;
- unauthorized access attempt;
- mobile-width UI;
- quota/provider error.

### Security checklist

- no secret in Git history;
- no secret in frontend bundle;
- service-role key only on backend;
- RLS enabled;
- storage policies tested;
- signed downloads used;
- file limits enforced;
- private content excluded from logs;
- generated AI output validated;
- user owns the final fact review.

## 18. Milestone 14 — deployment and demo readiness

### Deployment tasks

- deploy frontend to Vercel or selected host;
- deploy backend to Render or selected compatible host;
- configure production environment variables;
- verify CORS and callback URLs;
- verify Supabase production policies;
- confirm LibreOffice availability;
- run a production health check;
- confirm free-tier Gemini model and quotas;
- test signed downloads in production.

### Demo data

Use only fictional or non-sensitive sample data:

- one reference PDF or DOCX;
- one text-only format description;
- one sample event;
- three sample photographs;
- one intentionally incomplete event to demonstrate warnings.

### Demo order

1. Sign in.
2. Upload or describe a format.
3. Show detected sections.
4. Enter verified event facts.
5. Upload photographs.
6. Generate the report.
7. Edit one section.
8. Render DOCX and PDF.
9. Download both files.
10. Reopen the report from history.
11. Show GitHub branches, pull requests, tests, and documentation.

## 19. Final definition of done for Akshansh

Akshansh’s implementation is complete when:

- a clean clone can be configured from documented instructions;
- the professor can sign in;
- a PDF, DOCX, or text format can be analyzed;
- a validated format specification is stored;
- an event and photographs can be saved;
- structured report content can be generated without unsupported invented facts;
- the user can edit the content;
- DOCX rendering works for the supported layout primitives;
- PDF conversion works in the chosen deployment environment;
- report history and downloads work;
- ownership checks and RLS are tested;
- teammate changes are reviewed and integrated;
- automated and manual tests pass;
- no secrets or private files are committed;
- production/demo configuration stays within the verified free-tier plan.
