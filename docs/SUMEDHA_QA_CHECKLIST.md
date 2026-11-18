# Sumedha QA and document-rendering checklist

## Run metadata

- **Environment:** macOS, local FastAPI `TestClient`, Python 3.14.4, pytest 8.3.4
- **Date:** 18 November 2026
- **Branch:** `test/sumedha-api-rendering-qa`
- **Event fixture:** `fixtures/sample-events/innovation-showcase-2026.json`
- **Format fixture:** `fixtures/sample-formats/annual-academic-event-format.json`
- **Missing-asset fixture:** `fixtures/sample-formats/missing-image-format.json`
- **LibreOffice/`soffice`:** unavailable locally
- **Secret handling:** no credentials, private records, or generated documents are committed

### Commands and results

```text
cd backend
python -m compileall -q app tests     # PASS
ruff check app tests                   # PASS
pytest                                 # 56 passed, 1 skipped
git diff --check                       # PASS
```

The skipped test is the PDF conversion/download path. It explicitly asserts the public
`503` error when LibreOffice is unavailable and then skips PDF output verification.
The skip is also recorded in `docs/SUMEDHA_PR_DESCRIPTION.md`.

## Rendering QA

Record every check as PASS, PARTIAL, FAIL, or BLOCKED. Environment, timestamp, fixtures,
expected result, actual result, and defect links are recorded above or in the row.

| Check | Input | Expected | Actual / evidence | Result | Defect / notes |
|---|---|---|---|---|---|
| DOCX opens in a compatible office viewer | Generated QA DOCX | Opens without a repair warning | `python-docx` reopens the generated file and reads paragraphs, styles, tables, and inline images | PASS (automated) | Full Word/LibreOffice viewer inspection still requires a desktop viewer |
| Report title is present | Event fixture | Fictional event title appears | `test_rendering_qa.py` finds `Innovation Showcase 2026` in document paragraphs | PASS (automated) | — |
| Event metadata is present | Event fixture | Department, venue, date, coordinator, and guest appear | Renderer writes only the report title and generated section blocks; event metadata is not rendered | FAIL | Follow-up: add a metadata block or format rule; no issue filed |
| Headings and section order follow the format | Format fixture with `overview`, `activities`, `outcomes` | Headings appear in the requested order | Automated test observes `Event Overview`, `Activities`, `Outcomes`, `Photographs` | PASS (for spec-ordered content) | Renderer consumes report-content order, not `ordered_sections()`; enforcement is a known gap |
| Required section content is present | Format + report-content fixtures | Overview paragraph, activity bullets, and outcome paragraph appear | Automated test finds paragraph text and `List Bullet` items | PASS (automated) | — |
| Margins and body style are applied | Format fixture style | Arial 11 pt, 2.54 cm margins | Automated test checks `Normal` font, size, and left/top margins | PASS (automated) | — |
| Spacing, page breaks, tables, and long text do not overflow | Rendered DOCX/PDF | No clipping or overflow | Margins/font and the photo-grid page break are generated; format `tables` are not rendered and long text was not visually inspected | PARTIAL | Follow-up: renderer does not implement `tables` or `content_type: "table"` |
| Images preserve aspect ratio with sensible sizing and captions | Generated 1x1 PNG + caption | Image is embedded without stretching; caption is readable | Automated test finds one inline shape and the caption in the photo-grid table cell | PASS (automated) | Aspect ratio and visual size require viewer inspection |
| Missing image produces a safe fallback | Uploaded photo removed before render | Render succeeds without a missing-image crash | Automated test gets a rendered DOCX with zero inline shapes and intact report text | PASS (partial) | The renderer omits the missing image; the caption may still be emitted |
| Renderer does not invent absent facts | Incomplete fictional event | Missing facts remain absent or are warned about | Requires Gemini/manual review; only section-key validation exists in code | BLOCKED | Mechanical fact-grounding validation is not implemented |
| DOCX download has expected content type, filename, and body | Rendered report | Word MIME type, `event-report.docx`, non-empty body | Automated test checks `content-type`, `content-disposition`, `PK` signature, and body length | PASS (automated) | — |
| PDF output is readable | Rendered report | PDF contains readable content and images | LibreOffice is unavailable locally; conversion returns the documented `503` | BLOCKED | Install LibreOffice or use `backend/Dockerfile` |
| PDF download has expected content type, filename, and body | Converted report | `application/pdf`, `event-report.pdf`, non-empty `%PDF` body | Conversion and response checks are skipped locally; assertions are present for a LibreOffice-enabled host | BLOCKED | Re-run with LibreOffice installed |
| Conversion failures are surfaced clearly | Report without/with failed conversion | Clear error, no false success | Missing DOCX returns `422`; missing LibreOffice returns `503` with a stable message | PASS (automated) | — |
| Failed conversion does not leave the UI loading forever | Frontend report workflow | Loading stops and an error is shown | Frontend does not yet expose the render/convert workflow or API calls | BLOCKED | Requires frontend integration |
| Retry after a transient failure behaves predictably | Failed report | Retry reports the latest state | Backend retry and ownership errors are tested; live Gemini retry is not available locally | BLOCKED | Requires configured Gemini or a mock deployment |

## Deployment and demo verification

| Check | Result | Verification | Notes |
|---|---|---|---|
| Backend `/api/health` responds | PASS (local automated) | `tests/test_health.py` | Re-check externally with `curl -fsS https://<backend-domain>/api/health` |
| Frontend URL loads and targets the intended backend | BLOCKED externally | `npm run verify` passes locally | Requires deployed environment and browser network inspection |
| Test account can sign in without exposing credentials | BLOCKED externally | Login/signup pages and Supabase client inspected | Use an explicitly test-only account; never commit credentials |
| CORS allows the deployed frontend | BLOCKED externally | CORS configuration inspected in `backend/app/main.py` | Test from the exact deployed origin |
| Required environment variable names exist | PASS (configuration inspection) | `.env.example`, `backend/.env.example`, `render.yaml` | Values remain unset and are not committed |
| LibreOffice/conversion dependency is available | BLOCKED locally | `find_libreoffice()` returns `None`; `backend/Dockerfile` installs `libreoffice-writer` | Re-test in Docker/Render |
| Gemini quota and failure behavior are known | BLOCKED externally | Missing-configuration paths return `503` in tests | Confirm free-tier model and quota in the demo environment |
| A valid event can generate a report | BLOCKED externally | Generation prerequisites and failure persistence tested | Requires configured Gemini and an analyzed format |
| DOCX/PDF downloads work | PARTIAL | DOCX download automated; PDF blocked locally | Verify MIME, filename, body, and file opening externally |
| Report history lists and reopens a report | PARTIAL (backend) | History and ownership tests pass | Frontend report workflow and API authentication are incomplete |
| Cold starts, timeouts, and external-service limits are documented | BLOCKED externally | Deployment documentation reviewed | Observe first request and provider/render timeouts |
| GitHub issue, branch, PR, checks, and reviewer evidence are linked | PENDING | Branch `test/sumedha-api-rendering-qa`; PR description prepared | Issue/PR publication and Akshansh's review remain external workflow steps |

## Repeatable rendering procedure

1. Use only fictional fixtures and no secrets.
2. Start the backend locally with `python -m uvicorn app.main:app --reload --port 8000`.
3. Create a format through `POST /api/formats/text` or the frontend.
4. Create the event fixture through `POST /api/events`.
5. Analyze and select the format, then generate or provide finished report content.
6. Upload a generated tiny PNG, render with `POST /api/reports/{report_id}/render`, and open the DOCX download.
7. Delete the stored photo file and render again to verify missing-image fallback.
8. If LibreOffice is available, call `POST /api/reports/{report_id}/convert-pdf` and open the PDF download.
9. Repeat the check with `missing-image-format.json`, a missing-fact event, and a transient failure.
10. Record PASS, FAIL, or BLOCKED with the environment, timestamp, fixture, expected result, actual result, and defect link.
11. Run `python -m compileall -q app tests`, `ruff check app tests`, `pytest`, and `git diff --check`.

## Known limitations and follow-ups

- LibreOffice/`soffice` is unavailable locally. PDF output and PDF download remain blocked until the Docker host or a local installation provides it.
- The renderer does not currently emit event metadata or format-declared tables, and it does not enforce `ordered_sections()` independently of generated content order.
- Missing photo files are omitted safely, but a caption may still be emitted for an image that was not embedded.
- The frontend has no format-selection, generation, rendering, conversion, or download workflow yet, and its API client does not attach Supabase tokens.
- Live Gemini generation, fact-grounding review, deployed CORS, and real-account sign-in require external setup.
- No production AI, Supabase schema/RLS/auth code, renderer architecture, secrets, or generated documents were changed by this QA contribution.
