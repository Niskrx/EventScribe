# Nishkarsh Implementation Plan

## 1. Ownership and objective

Nishkarsh is the repository owner and a bounded frontend/documentation contributor for EventScribe. This plan defines the complete GitHub-visible contribution expected from him. The work should be real, reviewable, and limited to small frontend UX and documentation changes that can be completed independently without changing the backend architecture.

Akshansh remains the primary implementation owner and final integrator. Nishkarsh should not manufacture commits, copy another person's work, or commit changes that he cannot explain during review.

## 2. In-scope work

Nishkarsh may contribute:

- Event-form validation and user-facing validation messages.
- Loading, success, failure, and duplicate-submit feedback around the existing submit flow.
- Upload feedback such as selected filenames, removal state, allowed-file messaging, and upload errors, while preserving the existing API contract.
- One small responsive empty state or report-history card using existing data and props.
- Frontend-focused tests or checks where the current frontend test setup supports them.
- README setup instructions, demo walkthrough, screenshots, and known limitations.

## 3. Explicitly out of scope

Nishkarsh must not change:

- Backend routes, AI orchestration, Gemini prompts, report generation, or document rendering.
- Supabase schema, migrations, RLS policies, authentication implementation, or production data.
- API request/response shapes unless Akshansh explicitly approves a compatibility-preserving change.
- Secrets, `.env` files, private credentials, generated reports, or build artifacts.
- Large redesigns, new frameworks, or unrelated refactors.

## 4. GitHub workflow

### 4.1 Issue

Create or use this issue:

`Nishkarsh: frontend validation, upload feedback, and walkthrough`

Issue acceptance criteria:

1. Required event fields show clear inline errors after an invalid submit.
2. Invalid submissions do not call the existing generation endpoint.
3. Valid submissions preserve the existing payload and endpoint behavior.
4. Users can understand loading, success, and failure states.
5. Duplicate submits are prevented while a request is active.
6. Upload feedback explains selected files, rejected files, and request failures without changing backend limits.
7. README instructions are sufficient for a teammate to run and demo the project.
8. Changes pass the available frontend checks and are documented in the pull request.

### 4.2 Branch

Start from the latest `main` branch:

```bash
git fetch origin
git switch main
git pull --ff-only origin main
git switch -c feature/nishkarsh-frontend-ux
```

Do not work directly on `main`.

### 4.3 Recommended commits

Keep commits small and meaningful. A suitable sequence is:

```text
Add event form validation feedback
Improve upload feedback states
Document local setup and demo walkthrough
Add focused frontend checks
```

The final optional commit should only be created if a focused check is genuinely added.

Before pushing:

```bash
git diff --check
git status --short
git push -u origin feature/nishkarsh-frontend-ux
```

### 4.4 Pull request

Open:

`feat(frontend): add event validation and upload feedback`

The pull request description must include:

- A short summary of the user-facing changes.
- The exact files changed.
- Commands run and their results.
- Manual checks performed, including an invalid form, valid form, loading state, and upload failure.
- Screenshots or a short screen recording when the UI changed.
- Any pre-existing failures or limitations.
- A statement that backend, AI, database, and document-rendering behavior was intentionally left unchanged.

Request Akshansh as reviewer. Address review comments on the same branch, push the fixes, and let Akshansh perform the final merge. Do not force-push unless Akshansh explicitly asks for it.

## 5. Detailed implementation phases

### N0 — Repository inspection and baseline

1. Read `PRD.md`, the frontend README, and the current event-form implementation.
2. Identify the existing form fields, submit handler, upload component, API helper, styling system, and available frontend scripts.
3. Run the existing checks before editing:

```bash
cd frontend
npm run lint
npm run typecheck
npm run build
```

4. Record any pre-existing failure in the issue or PR instead of silently treating it as caused by the new work.
5. Confirm the exact endpoint and payload before making UI changes.

### N1 — Event-form validation

Implement client-side validation for the fields already required by the PRD and current API contract. At minimum, cover title, date, department or organizer, venue, objectives, activities, and outcomes wherever those fields exist in the current form.

Requirements:

- Trim text before checking whether it is empty.
- Require a valid date according to the existing input type and API expectations.
- Show an inline message beside each invalid field.
- Provide an accessible summary or focus behavior so the user can find the first error.
- Clear a field's error when the user corrects it.
- Keep entered values intact after validation failure.
- Stop submission before the network request when validation fails.
- Do not rename fields or alter the backend payload.

Manual check: submit an empty form, submit partially filled data, correct one field at a time, and then submit a complete valid form.

### N2 — Submit-state feedback

Improve the existing submit flow without changing its API behavior.

Requirements:

- Disable the submit control while the request is active.
- Show a visible loading state.
- Prevent accidental duplicate requests.
- Show a clear success state and the next useful action.
- Show a clear failure state that does not hide the user's entered values.
- Restore the control after success or failure.
- Keep error messages understandable to a non-technical user while preserving useful console or development diagnostics if the project already uses them.

### N3 — Upload feedback

Use the current upload contract and limits. Do not invent new server-side rules.

Requirements:

- Display the selected filename or filenames.
- Allow removal before submission if the current component supports selection management.
- Explain unsupported extensions or oversized files before submission when that information is available locally.
- Show upload or generation progress through the existing loading state.
- Explain a failed upload or generation request and keep the rest of the form usable.
- Handle no-file submission according to the current PRD/API behavior.

If the current backend does not expose a separate upload endpoint, keep the change presentation-only and document that limitation in the PR.

### N4 — Small responsive UI improvement

Choose exactly one small improvement that fits the existing design system:

- A useful empty state when report history has no records; or
- A compact report-history card that uses existing data only.

The improvement must work on mobile and desktop, must not require a schema change, and must not become a new product area. Do not add placeholder data that could be mistaken for real reports.

### N5 — README and demo walkthrough

Update the relevant README or documentation with:

- Prerequisites.
- Install commands.
- Frontend and backend start commands.
- Environment-variable names only; never commit values or secrets.
- How to create or use a Supabase test account.
- How to sign in, fill the form, attach a supported file, generate a report, and inspect history.
- What to do if email confirmation is enabled.
- Known demo limitations, including cold starts or external-service setup.
- A short troubleshooting section for common local errors.

The instructions should be reproducible by another teammate from a clean checkout.

## 6. Definition of done

- The issue is linked to the pull request.
- All changes are on `feature/nishkarsh-frontend-ux`.
- Validation blocks invalid submissions and preserves valid API behavior.
- Loading, success, failure, and upload states are understandable.
- The selected small responsive UI improvement is complete or its deliberate omission is documented.
- README/demo documentation is updated without secrets.
- `npm run lint`, `npm run typecheck`, and `npm run build` pass, or failures are clearly identified as pre-existing.
- `git diff --check` passes.
- The PR contains manual verification notes and screenshots when appropriate.
- Akshansh has reviewed and merged the PR into `main`.

## 7. Copy-paste agent prompt for Nishkarsh

```text
I am Nishkarsh, the repository owner and a bounded frontend/documentation contributor for EventScribe. Work only on branch feature/nishkarsh-frontend-ux and only on the scope in NISHKARSH_IMPLEMENTATION_PLAN.md.

First inspect PRD.md, the current frontend form, upload flow, API helper, available scripts, and existing README. Run the frontend baseline checks and report pre-existing failures. Then implement client-side event-form validation, submit-state feedback, upload feedback using the existing contract, one small responsive empty state or history card, and the local setup/demo documentation. Do not modify backend routes, AI orchestration, Gemini prompts, Supabase schema/RLS/auth implementation, document rendering, secrets, or generated output. Preserve existing payloads and endpoint behavior.

Keep commits small and meaningful, run lint/typecheck/build and git diff --check, then prepare a PR titled feat(frontend): add event validation and upload feedback. Include files changed, checks, manual verification, screenshots if relevant, limitations, and an explicit statement that backend/AI/database/rendering behavior was not changed. Do not merge the PR; Akshansh is the final reviewer and integrator.
```
