# Sumedha Implementation Plan

## 1. Ownership and objective

Sumedha is the bounded QA and document-rendering contributor for EventScribe. This plan defines the complete GitHub-visible contribution expected from her: safe fixtures, focused API negative tests, report-rendering quality checks, and a deployment/demo verification checklist.

Akshansh remains the primary implementation owner and final integrator. Sumedha should contribute real tests and documentation that she can explain. She should not make broad production changes merely to increase the size of her diff.

## 2. In-scope work

Sumedha may contribute:

- Focused backend tests for invalid report-generation inputs and public API error behavior.
- Small fictional fixtures for event data, format specifications, and rendering inputs.
- A repeatable PDF/DOCX rendering QA checklist.
- Image-layout and missing-image test cases where the current code supports them.
- Defect-reproduction notes with expected and actual behavior.
- A deployment/demo verification checklist covering health, authentication, generation, downloads, and history.

## 3. Explicitly out of scope

Sumedha must not change:

- Core AI orchestration, Gemini prompts, model selection, or report-generation architecture.
- Supabase schema, migrations, RLS policies, authentication implementation, or production data.
- Renderer architecture or conversion tooling except for a narrowly scoped test-only compatibility fix approved by Akshansh.
- API contracts solely to make tests pass.
- Secrets, `.env` files, private credentials, generated reports, or large binary fixtures.
- Unrelated refactors, dependency upgrades, or deployment configuration changes.

## 4. GitHub workflow

### 4.1 Issue

Create or use this issue:

`Sumedha: API negative tests, safe fixtures, and rendering QA`

Issue acceptance criteria:

1. Tests cover the invalid API inputs exposed by the current backend.
2. Tests assert stable public status codes and useful error shapes without overfitting internal stack traces.
3. Fictional fixtures are small, deterministic, and free of personal or secret data.
4. Rendering QA checks cover PDF/DOCX structure, layout, images, missing facts, and downloads.
5. Deployment/demo checks cover health, authentication, generation, download, and history.
6. Test commands and results are recorded, including any environment-dependent limitations.
7. No core AI, database, renderer architecture, or authentication implementation is changed.

### 4.2 Branch

Start from the latest `main` branch:

```bash
git fetch origin
git switch main
git pull --ff-only origin main
git switch -c test/sumedha-api-rendering-qa
```

Do not work directly on `main`.

### 4.3 Recommended commits

Keep the contribution easy to review. A suitable sequence is:

```text
Add safe format and event fixtures
Cover invalid API inputs
Add rendering QA and deployment checklist
Document discovered test limitation
```

The final optional commit should only be created when a real limitation or reproducible defect needs documentation.

Before pushing:

```bash
git diff --check
git status --short
git push -u origin test/sumedha-api-rendering-qa
```

### 4.4 Pull request

Open:

`test(backend): add API negative cases and rendering QA fixtures`

The pull request description must include:

- The tests and fixtures added.
- Exact commands run and their results.
- Which checks are local-only or require external services.
- Manual PDF/DOCX inspection results.
- Any defect reproduction steps and links to follow-up issues.
- A statement that no production AI, database, authentication, or renderer architecture was changed.

Request Akshansh as reviewer. Address comments on the same branch and let Akshansh perform the final merge. Do not force-push unless explicitly requested.

## 5. Detailed implementation phases

### S0 — Test-surface inspection and baseline

1. Read `PRD.md`, `docs/testing.md`, `docs/DEPLOYMENT.md`, `docs/DEMO_RUNBOOK.md`, and the backend README if present.
2. Locate the backend routers, request schemas, report-generation entry point, format extraction code, renderer adapters, fixtures, and existing test conventions.
3. Run the existing backend test command from the repository documentation, for example:

```bash
cd backend
python -m pytest
```

4. Record missing dependencies, unavailable services, and pre-existing failures. Never silently skip a test and report the suite as green.
5. Confirm the public endpoint paths and error response shape before writing assertions.

### S1 — Safe fictional fixtures

Add only the smallest fixtures needed by the tests, using the repository's existing fixture directories and naming conventions.

Fixture rules:

- Use fictional institution names, people, dates, departments, and event content.
- Do not use real student records, private documents, credentials, API keys, or copied user uploads.
- Prefer small JSON, text, or generated-in-test data over committed binaries.
- Keep expected values explicit and deterministic.
- Add a short fixture README or comments when a format is non-obvious.
- Do not make fixtures depend on network access or a live model.

Potential fixture categories include a valid event payload, a minimal valid format specification, a malformed format specification, an event missing required fields, and a format containing an image reference that is intentionally absent.

### S2 — Invalid format and reference tests

Add focused tests for invalid inputs supported by the current API. Cover only behaviors that the application actually exposes.

Candidate cases:

- Unsupported file extension or media type.
- Malformed JSON or otherwise unreadable format content.
- Missing required sections in a format specification.
- Empty input where the endpoint rejects empty content.
- Missing or inaccessible referenced assets when the current endpoint validates them.

For every case, assert:

- The public HTTP status code.
- The stable error field or message category.
- That no successful report is claimed.
- That the response does not leak stack traces, credentials, or internal paths.

Avoid asserting exact internal exception text unless it is part of the documented public contract.

### S3 — Invalid event and report tests

Add focused tests for invalid event/report-generation requests:

- Missing title or another required event field.
- Invalid date or invalid payload type.
- Missing generation prerequisites.
- Report access without the required authentication or ownership context, when the existing test harness supports it.
- A request for a report that does not exist, when the route exposes that behavior.

Reuse existing authentication and API helpers. Do not add authentication code or weaken authorization to make a test pass. If a case cannot run without external setup, document the exact setup and mark it as environment-dependent.

### S4 — PDF/DOCX rendering QA checklist

Create a checklist that can be run against a generated report. It should include:

- The report opens successfully in the intended viewer.
- Title, event metadata, headings, section order, and required content are present.
- Margins, spacing, page breaks, tables, and long text do not visibly overflow.
- Images preserve aspect ratio and have sensible sizing and captions where applicable.
- Missing images or unavailable assets produce an understandable warning or fallback.
- The renderer does not invent facts that were absent from the source data.
- DOCX output opens in a compatible office viewer.
- PDF output is readable and conversion failures are surfaced clearly when conversion is available.
- Download response has the expected content type, filename, and non-empty body.
- A failed conversion does not leave the UI stuck in a permanent loading state.
- Repeating a generation after a transient failure behaves predictably.

Record each check as pass, fail, or blocked, with environment, timestamp, input fixture, expected result, actual result, and a defect link when applicable.

### S5 — Deployment and demo verification

Add or update a concise checklist covering:

- Backend health endpoint responds successfully.
- Frontend URL loads and points to the intended backend.
- A test account can sign in without exposing credentials in Git.
- CORS and allowed-origin behavior work for the deployed frontend.
- Required environment-variable names are present in the deployment configuration.
- LibreOffice or the configured document-conversion dependency is available where required.
- Gemini/model quota and failure behavior are known for the demo environment.
- A valid event can generate a report.
- PDF/DOCX downloads work.
- Report history can list and reopen a generated report.
- Cold starts, timeouts, and external-service limitations are documented.
- GitHub issue, branch, PR, checks, and reviewer evidence are linked.

Never paste secret values into the checklist, issue, PR, screenshots, or committed files.

## 6. Definition of done

- The issue is linked to the pull request.
- All changes are on `test/sumedha-api-rendering-qa`.
- Safe fictional fixtures are present and deterministic.
- Invalid API tests cover the supported negative cases and assert public behavior.
- Rendering QA covers both document structure and visual output.
- Deployment/demo checks document pass, fail, or blocked status.
- `python -m pytest` and relevant lint/type checks pass, or failures are clearly reported as pre-existing/environment-dependent.
- `git diff --check` passes.
- No secrets, private data, generated reports, or unrelated architecture changes are included.
- Akshansh has reviewed and merged the PR into `main`.

## 7. Copy-paste agent prompt for Sumedha

```text
I am Sumedha, the bounded QA and document-rendering contributor for EventScribe. Work only on branch test/sumedha-api-rendering-qa and only on the scope in SUMEDHA_IMPLEMENTATION_PLAN.md.

First inspect PRD.md, backend documentation, existing tests, routers, request schemas, report-generation entry points, renderer adapters, and fixture conventions. Run the backend baseline and record pre-existing or environment-dependent failures. Then add small fictional fixtures, focused negative API tests for invalid format/event/report inputs, a repeatable PDF/DOCX rendering QA checklist, and a deployment/demo verification checklist. Reuse existing helpers and public contracts.

Do not modify core AI orchestration, Gemini prompts, Supabase schema/RLS/auth implementation, renderer architecture, secrets, private data, generated reports, or unrelated dependencies. Do not weaken authorization or change API behavior just to make tests pass. Assert public status/error behavior without overfitting stack traces.

Run the documented tests and git diff --check. Prepare a PR titled test(backend): add API negative cases and rendering QA fixtures with commands/results, manual rendering results, blocked external checks, defect links, and an explicit statement that production architecture was not changed. Do not merge the PR; Akshansh is the final reviewer and integrator.
```
