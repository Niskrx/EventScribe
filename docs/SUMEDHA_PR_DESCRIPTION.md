Closes #2

# test(backend): add API negative cases and rendering QA fixtures

## Summary

- Adds deterministic, fictional event and format fixtures, including a valid event, a valid format specification, a schema-invalid format specification, a missing-required-fields event, and a missing-asset format configuration.
- Adds schema-validation tests so fixtures cannot silently drift from the public Pydantic contracts.
- Expands FastAPI negative coverage for missing/invalid event fields, malformed JSON, empty and corrupt PDF/DOCX references, unanalyzed format prerequisites, report ownership, and nonexistent report actions.
- Adds rendering QA tests for DOCX structure, styles, section order, image embedding, captions, missing-photo fallback, and DOCX download headers/body.
- Documents a repeatable PDF/DOCX rendering checklist and a deployment/demo verification checklist, with environment-dependent failures recorded explicitly.
- Keeps PDF verification environment-aware: when LibreOffice is absent, the test asserts the public `503` failure and skips PDF output inspection instead of reporting a false pass.

## Files changed

- `fixtures/sample-events/innovation-showcase-2026.json`
- `fixtures/sample-events/missing-required-fields.json`
- `fixtures/sample-events/README.md`
- `fixtures/sample-formats/annual-academic-event-format.json`
- `fixtures/sample-formats/malformed-format.json`
- `fixtures/sample-formats/missing-image-format.json`
- `fixtures/sample-formats/README.md`
- `fixtures/sample-images/README.md`
- `backend/tests/test_fixtures.py`
- `backend/tests/test_negative_api.py`
- `backend/tests/test_rendering.py` (test-only LibreOffice skip/assertion)
- `backend/tests/test_rendering_qa.py`
- `docs/SUMEDHA_QA_CHECKLIST.md`
- `docs/SUMEDHA_PR_DESCRIPTION.md`
- `docs/testing.md`

## Commands and results

Baseline before this contribution:

```text
cd backend
python -m pytest
```

Result: `25 passed, 1 failed`. The existing PDF rendering test returned `503` because
LibreOffice/`soffice` was not installed. The backend dependencies were installed from the
pinned `requirements.txt` before rerunning the baseline.

Final verification:

```text
cd backend
python -m compileall -q app tests     # PASS
ruff check app tests                   # PASS
pytest                                 # 56 passed, 1 skipped
git diff --check                       # PASS (no whitespace errors)
```

The single skipped test is `test_rendering.py::test_docx_render_endpoint_creates_editable_document`
after its DOCX assertions pass. It explicitly verifies `503` +
`"LibreOffice is not available on this server."` before skipping PDF output inspection.

## Manual rendering results

- Generated DOCX reopens with `python-docx`; title, headings, section order, bullet list, styles, margins, image, and caption are present.
- A generated 1x1 PNG is embedded as one inline shape and its caption appears in the photo-grid table.
- Deleting the stored photo before rendering still produces a valid DOCX with no inline image; the report does not crash.
- DOCX download returns the Word MIME type, `event-report.docx`, a `PK` body signature, and non-empty content.
- PDF conversion is blocked locally because LibreOffice/`soffice` is unavailable. The failure is surfaced as `503`, not claimed as success.
- Visual Word/LibreOffice inspection, PDF readability, long-text wrapping, and deployed UI loading behavior remain blocked without a desktop viewer and conversion-enabled host.

## Known defects and follow-ups

- **Environment limitation:** PDF conversion returns `503` locally because LibreOffice/`soffice` is unavailable. `backend/Dockerfile` installs `libreoffice-writer` for deployment.
- **Renderer gap:** event metadata (department, venue, date, coordinator, guest) is not emitted in the DOCX.
- **Renderer gap:** format-declared `tables` and `content_type: "table"` are not rendered.
- **Ordering gap:** the renderer consumes report-content order rather than enforcing `FormatSpecification.ordered_sections()`.
- **Missing-image behavior:** the image is safely omitted, but a caption can still appear without an embedded image.
- **Frontend gap:** no UI/API client path yet for format selection, generation, rendering, PDF conversion, or downloads; browser requests also do not attach Supabase tokens.
- No defect issue link was created because these are documented follow-ups outside this bounded QA contribution.

## External checks

BLOCKED because no deployment credentials, hosted backend/frontend, Supabase test account,
Gemini quota, or LibreOffice-enabled external host are available in this workspace session.
The deployment/demo checklist records each item as PASS, PARTIAL, BLOCKED, or PENDING without
including any secret values.

## Workflow evidence

- Branch: `test/sumedha-api-rendering-qa`
- Issue: pending publication by the contributor (recommended title: `Sumedha: API negative tests, safe fixtures, and rendering QA`)
- Reviewer: Akshansh is the final reviewer and integrator
- Merge: not performed by this contributor

## Architecture statement

No production AI orchestration, Gemini prompts, Supabase schema/RLS/auth implementation,
renderer architecture, API contracts, secrets, private data, generated reports, or unrelated
dependencies were changed. The only change to an existing test is a test-only, explicit
LibreOffice skip that still asserts the public failure behavior. Akshansh remains the final
reviewer and integrator.
