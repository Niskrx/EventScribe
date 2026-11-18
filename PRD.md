# EventScribe — Product Requirements Document

**Version:** 1.0  
**Status:** Team baseline for MVP implementation  
**Project type:** University Version Control Systems project  
**Team:** Akshansh, Nishkarsh, Sumedha  
**Primary owner:** Akshansh  
**Last updated:** 17 November 2026

## 1. Executive summary

EventScribe is an AI-assisted academic event report generation application. A professor provides event facts, photographs, and either a reference report or a written description of the desired report format. The system analyzes the requested structure, generates fact-grounded report content, renders an editable DOCX and a PDF, and lets the professor review, edit, download, and revisit the report later.

The defining feature is **dynamic format understanding**. EventScribe must not depend on one hardcoded report template. It should convert a reference document or text description into a validated format specification and use that specification as input to a deterministic document-rendering engine.

The product deliberately separates AI work from document construction:

```text
AI: understand format and draft content
Python: validate data and render the actual DOCX/PDF
```

This separation improves reliability, testability, explainability, and output consistency.

## 2. Problem statement

Academic event reports are often created manually. A professor may need to inspect an old report, reproduce its headings and layout, write a formal summary, arrange photographs, and export the result to a submission-ready document. This is repetitive and error-prone.

The absence of one official report template makes a hardcoded generator unsuitable. Different departments or events may require different title pages, headings, image arrangements, fonts, margins, tables, and section orders.

EventScribe addresses this by accepting the desired format as user input, representing it as structured data, and rendering a report from that structured representation.

## 3. Goals and success criteria

### 3.1 Product goals

1. Let an authenticated professor create a report without manually formatting a Word document from scratch.
2. Support a reference PDF or DOCX as well as a text-only format description.
3. Convert the requested format into a structured, inspectable format specification.
4. Generate polished academic prose using only supplied event facts.
5. Support multiple photographs and deterministic placement rules.
6. Produce both editable DOCX and PDF output.
7. Let the user preview and edit generated report content before export.
8. Save report history so previous reports can be reopened and downloaded.
9. Keep AI usage behind the backend and within an explicitly verified free-tier configuration.
10. Provide clear Git history showing ownership of features, reviews, testing, and documentation.

### 3.2 MVP success criteria

The MVP is successful when a user can:

- sign in;
- upload a small reference PDF/DOCX or enter a format description;
- receive a format specification that can be reviewed;
- enter event facts and upload at least three photographs;
- generate a report draft;
- edit the generated content;
- render a valid DOCX;
- convert the DOCX to a readable PDF;
- preview or download both files;
- reopen the saved report from history;
- see useful errors for invalid files, missing facts, quota errors, and conversion failures.

### 3.3 Non-goals for MVP

The following are explicitly out of scope:

- perfect pixel-level cloning of every arbitrary document;
- social-media caption generation;
- LinkedIn or Instagram integration;
- Google Drive integration;
- advanced image recognition or automatic image captioning;
- event analytics dashboards;
- multi-tenant institutional administration;
- collaborative real-time editing;
- mobile-native applications;
- paid AI billing or unlimited AI usage;
- direct AI generation of a complete binary Word document.

## 4. Users and permissions

### 4.1 Primary user: professor

The professor can:

- create an account and sign in;
- create, save, and reuse format profiles;
- create and edit event drafts;
- upload reference files and event photographs;
- generate report content;
- edit report sections;
- render and download DOCX/PDF files;
- view and delete her own report history.

### 4.2 MVP authorization rule

Every user-owned record must be scoped to the authenticated user. A user must never be able to read another user’s format profile, event, photograph, or report by changing an ID in a request.

Supabase Row Level Security must be enabled for user-owned tables before deployment.

### 4.3 Project team roles

#### Akshansh — lead engineer and integration owner

Akshansh owns the core implementation and final integration:

- repository and branch strategy;
- application architecture;
- FastAPI backend;
- Supabase schema, authentication integration, and storage policy;
- Gemini integration and structured-output validation;
- format-analysis pipeline;
- report-generation orchestration;
- DOCX/PDF rendering integration;
- security, environment variables, error handling, and deployment;
- end-to-end testing and final release.

#### Nishkarsh — bounded frontend/documentation contributor

Nishkarsh receives a small, real frontend coding slice plus documentation work. His work must be independently understandable and finishable in approximately one hour with the existing starter code. Tasks must be real changes, not merely commits made on someone else’s behalf.

Suggested tasks:

- build or polish the event-details form using an existing API contract;
- add client-side validation messages;
- add upload progress and file-type/size feedback;
- create the README setup section and user walkthrough;
- add a responsive empty state or report-history card;
- document screenshots and known limitations.

His primary coding deliverable is **client-side event-form validation and user feedback**. He must not redesign the application architecture or modify the backend generation pipeline.

#### Sumedha — bounded QA/document-rendering contributor

Sumedha receives a small, real testing/document-rendering coding slice plus QA documentation. Her work must be independently understandable and finishable in approximately one hour with the existing starter code. She must not modify the core AI orchestration or database architecture.

- add backend/API test cases using the existing endpoints;
- prepare sample event JSON and sample format specifications;
- test PDF/DOCX output against a checklist;
- add image-layout test fixtures;
- document defect reproduction steps and expected behavior;
- write the deployment/demo checklist.

Her primary coding deliverable is **backend tests for report-rendering inputs and invalid API cases**. She may add small test fixtures or helper utilities, but the production renderer remains Akshansh’s responsibility.

Akshansh remains the final reviewer and integrator for all branches.

### 4.4 Ownership split

The project is intentionally Akshansh-led:

| Owner | Approximate scope | Primary responsibility |
|---|---:|---|
| Akshansh | 80–90% of implementation | Architecture, backend, AI, database, storage, rendering, deployment, integration |
| Nishkarsh | 5–10% of implementation | One small frontend coding slice plus setup/user documentation |
| Sumedha | 5–10% of implementation | One small test/fixture coding slice plus QA and demo documentation |

The percentages are planning guidance, not a requirement to manufacture activity. Each person should only receive credit for work they actually perform and can explain.

### 4.5 Agent-execution workflow

This PRD is designed to be uploaded separately by each teammate to a coding agent. The teammate must state their name in the first message. The agent must then execute only that person’s scope from this document.

#### 4.5.1 Shared rules for every agent session

The coding agent must:

1. Read `PRD.md` and inspect the current repository before changing files.
2. Confirm the named teammate and assigned scope.
3. Preserve existing work and avoid unrelated rewrites.
4. Work only on the named teammate’s task unless Akshansh explicitly expands the scope.
5. Use a separate Git branch named according to the task.
6. Run the relevant tests or checks before finishing.
7. Summarize changed files, tests, and any remaining risks.
8. Never commit secrets, API keys, uploaded documents, generated reports, or private sample data.

#### 4.5.2 Akshansh execution scope

When Akshansh uploads this PRD and says “I am Akshansh,” the coding agent is authorized to execute the main implementation roadmap in dependency order:

1. Inspect the repository and establish the frontend/backend structure.
2. Set up the Next.js frontend and FastAPI backend.
3. Add environment configuration and `.env.example`.
4. Implement Supabase authentication, schema, migrations, storage, and RLS.
5. Implement PDF/DOCX/text format input and extraction.
6. Implement the versioned format specification and Pydantic validation.
7. Implement the server-side Gemini adapter and free-tier safeguards.
8. Implement structured report-content generation and no-invention validation.
9. Implement the event and photograph workflow.
10. Implement the dynamic DOCX renderer and PDF conversion.
11. Implement report preview, editing, history, downloads, and retryable errors.
12. Integrate teammate branches, run end-to-end tests, and prepare deployment.

The agent must break large work into reviewable commits and stop at logical milestones. Akshansh owns final decisions when a teammate task conflicts with the main architecture.

#### 4.5.3 Nishkarsh execution scope

When Nishkarsh uploads this PRD and says “I am Nishkarsh,” the coding agent must not implement the core backend, AI integration, database schema, or document renderer. It should execute only this bounded task:

**Primary coding task:** add client-side validation and user feedback for the existing event-details form.

Expected changes:

- validate required event fields;
- show readable inline validation errors;
- prevent submission when required fields are invalid;
- show loading/success/failure feedback around the existing submit action;
- add or update a focused frontend test if the project already has a test setup;
- update the relevant README/UI note if necessary.

If the event form does not yet exist, the agent should create the smallest reusable form-validation helper and a minimal example integration, then stop. It must not invent a new frontend architecture.

Suggested branch: `feature/nishkarsh-event-form-validation`

#### 4.5.4 Sumedha execution scope

When Sumedha uploads this PRD and says “I am Sumedha,” the coding agent must not implement the core backend, AI integration, database schema, or main document renderer. It should execute only this bounded task:

**Primary coding task:** add focused backend tests and safe fixtures for invalid inputs and rendering prerequisites.

Expected changes:

- add a test for unsupported reference-file types;
- add a test for missing required event data;
- add a test for malformed format specification handling;
- add a minimal report-rendering fixture or test helper if the renderer already exists;
- document how to run the tests and record any discovered defect.

If the backend test harness does not yet exist, the agent should create the smallest test setup compatible with the existing FastAPI project, add one or two focused tests, and stop. It must not refactor production architecture.

Suggested branch: `test/sumedha-api-rendering-tests`

#### 4.5.5 Copy-paste prompts for the three teammates

#### Akshansh prompt

```text
I am Akshansh, the lead engineer for EventScribe. Read PRD.md completely, inspect the repository, and execute only the Akshansh execution scope in section 5.2. I own the main implementation: architecture, backend, Supabase, Gemini, format analysis, report generation, DOCX/PDF rendering, integration, and deployment. Work incrementally, preserve existing changes, use a feature branch, run relevant tests, and do not commit secrets. Before changing files, give me a short implementation checkpoint; then proceed through the next logical milestone and report changed files and verification results.
```

#### Nishkarsh prompt

```text
I am Nishkarsh, a contributor on EventScribe. Read PRD.md and inspect the repository. Execute only the Nishkarsh scope in section 5.3: client-side event-form validation and user feedback. Do not implement backend architecture, Gemini integration, database work, or document rendering. Create or use branch feature/nishkarsh-event-form-validation, preserve Akshansh’s work, make the smallest focused changes, run relevant frontend checks, and summarize changed files and tests. Do not commit secrets or unrelated files.
```

#### Sumedha prompt

```text
I am Sumedha, a contributor on EventScribe. Read PRD.md and inspect the repository. Execute only the Sumedha scope in section 5.4: focused backend tests and safe rendering/input fixtures. Do not implement backend architecture, Gemini integration, database design, or the main renderer. Create or use branch test/sumedha-api-rendering-tests, preserve Akshansh’s work, make the smallest focused changes, run the relevant tests, and summarize changed files and verification results. Do not commit secrets, generated reports, or unrelated files.
```

## 5. Product scope and user journey

### 5.1 Main user journey

1. User opens EventScribe.
2. User signs in.
3. User selects **Create report**.
4. User chooses one of:
   - upload reference PDF/DOCX;
   - describe the desired format in text;
   - select a previously saved format profile.
5. System validates the input.
6. System extracts local document information and asks Gemini to produce a format specification.
7. System validates and saves the specification.
8. User reviews the detected sections and layout summary.
9. User enters event facts.
10. User uploads and orders photographs.
11. System validates required facts and generates structured report content.
12. User reviews and edits each section.
13. System renders DOCX and converts it to PDF.
14. User previews, downloads, or saves the report.
15. The report appears in report history with its status and timestamps.

### 5.2 Report lifecycle

```text
draft
  -> format_ready
  -> event_ready
  -> content_generated
  -> edited
  -> rendering
  -> ready
```

Failure states:

```text
format_failed
generation_failed
render_failed
conversion_failed
```

The UI must show a recoverable error and allow retry without silently losing the event data.

## 6. Functional requirements

### FR-01 Authentication

- The application shall support email/password authentication through Supabase Auth.
- Unauthenticated users shall be redirected to the login page.
- Authenticated API requests shall carry a valid user session.
- The backend shall not trust a user ID supplied only in the request body.
- Logout shall invalidate the local session.

**Acceptance criteria:** A new user can sign up, sign in, refresh the page without losing the session, and sign out. A user cannot open another user’s report by editing the URL.

### FR-02 Format input

The create-report flow shall accept exactly one initial format source:

- PDF reference file;
- DOCX reference file;
- text description.

The MVP shall validate:

- supported extension and MIME type;
- maximum file size configured by the application;
- non-empty text description;
- upload ownership;
- duplicate or repeated submission behavior.

The initial recommended file limit is 10 MB for application UX, even though the provider may support larger documents. This limit can be changed through configuration after testing.

### FR-03 Reference extraction

For PDF:

- extract text and basic metadata with PyMuPDF;
- preserve page order;
- retain page count;
- optionally render page thumbnails for review;
- pass the original PDF or a controlled representation to the AI analysis step.

For DOCX:

- extract paragraphs, heading levels, tables, and basic style information with `python-docx`;
- capture available font, size, alignment, spacing, margin, and image metadata;
- record when a property is unavailable rather than guessing.

The extractor shall produce a normalized intermediate object before AI analysis.

### FR-04 Format analysis

The system shall ask the AI model to infer:

- document purpose and tone;
- title-page presence;
- section names and order;
- heading hierarchy;
- body style;
- font family and approximate sizes where observable;
- margins and alignment where observable;
- table usage;
- image count and placement pattern where observable;
- footer/header and page-number requirements where observable;
- confidence or uncertainty notes;
- unsupported or ambiguous formatting features.

The AI response must conform to a versioned JSON schema. The backend must validate the response with Pydantic before saving it.

The user must be able to review the detected section list and basic layout summary. MVP does not require a full visual format editor.

### FR-05 Format specification

The internal format specification shall contain at minimum:

```json
{
  "schema_version": "1.0",
  "source_type": "pdf|docx|text",
  "document_title_rule": "...",
  "sections": [
    {
      "key": "introduction",
      "title": "Introduction",
      "order": 1,
      "required": true,
      "content_type": "paragraphs",
      "heading_level": 1
    }
  ],
  "style": {
    "font_family": "Times New Roman",
    "body_font_size_pt": 12,
    "heading_alignment": "left",
    "body_alignment": "justified",
    "line_spacing": 1.15,
    "margins": {
      "top_cm": 2.54,
      "right_cm": 2.54,
      "bottom_cm": 2.54,
      "left_cm": 2.54
    }
  },
  "images": {
    "mode": "grid|single|inline|appendix",
    "columns": 2,
    "captions": false
  },
  "tables": [],
  "uncertainties": []
}
```

This is an illustrative contract, not a final implementation mandate. The backend schema is the source of truth once implemented.

### FR-06 Event details

The event form shall support:

- event title;
- event date;
- start/end time, optional;
- department or organizing unit;
- venue;
- coordinator;
- guest/speaker/chief guest, optional;
- participant groups and approximate count, optional;
- objectives;
- activities or agenda;
- outcomes;
- acknowledgements, optional;
- additional verified facts, optional.

The form shall clearly mark required fields. The MVP should not block generation because optional facts are absent.

The UI shall distinguish:

- facts supplied by the user;
- AI-generated prose;
- fields that need confirmation;
- missing or uncertain information.

### FR-07 Photo upload

The system shall support multiple JPEG, PNG, or WebP photographs within configured limits.

The user shall be able to:

- select multiple files;
- see upload progress or status;
- remove a photo before generation;
- reorder photos;
- optionally add a short caption;
- see validation errors for unsupported or oversized files.

The backend shall store photographs under a user- and event-scoped storage path.

### FR-08 AI report-content generation

The generation request shall include:

- verified event facts;
- the approved format specification;
- the list of uploaded photographs and captions, if any;
- strict instructions not to invent names, dates, attendance numbers, awards, quotes, or outcomes;
- a content schema defining the requested sections.

The result shall be structured JSON, not a Word document. Each section shall include a stable key, title, body blocks, and optional notes.

The backend shall:

- validate the JSON schema;
- reject malformed output;
- detect empty required sections;
- record model and prompt version metadata without storing secrets;
- provide a retry path;
- avoid duplicate generation when the user refreshes after a successful request.

### FR-09 Editing and preview

The user shall be able to edit generated section text before rendering.

The MVP editor may be a section-by-section text editor rather than a full Word-like editor.

The preview shall show:

- document title;
- section order;
- approximate formatting;
- image positions;
- warnings for unresolved placeholders or missing required facts.

The final DOCX/PDF render is authoritative for exact output. Browser preview is a convenience preview and does not need to guarantee pixel-level parity.

### FR-10 DOCX generation

The backend shall generate an editable DOCX using deterministic Python code.

The renderer shall support at least:

- title page or title block;
- headings and paragraphs;
- bold/italic emphasis where specified by the content model;
- alignment and line spacing;
- configured margins and basic font styles;
- simple tables;
- single-column and two-column image grids;
- captions when configured;
- page breaks;
- header/footer and page-number behavior where feasible;
- a final appendix/gallery mode for photographs.

Unsupported advanced formatting must be logged as a warning and rendered using the nearest supported layout rather than crashing.

### FR-11 PDF conversion

The system shall convert the generated DOCX to PDF with LibreOffice headless in the backend environment.

The conversion service shall:

- use an isolated temporary working directory;
- return a clear error if LibreOffice is unavailable;
- preserve the report record if conversion fails;
- clean temporary files after completion;
- expose file status to the user.

### FR-12 History

The history page shall show:

- report title;
- event date;
- current status;
- created and updated timestamps;
- last generation error, if applicable;
- actions to reopen, download, retry, or delete.

Deletion must require confirmation. Storage cleanup behavior must be defined before production deployment.

## 7. AI and free-tier constraints

The application must use a free-access configuration and must not require paid billing for normal MVP demonstrations.

Current official Gemini documentation indicates that:

- free access is model- and account-dependent;
- rate limits and available models can change;
- PDF/document input and structured JSON output are supported;
- uploaded files may be temporary, so the application must retain its own source files where required.

Therefore:

1. Do not hard-code a claim such as “unlimited free requests.”
2. Before implementation, verify the selected model’s current free-tier availability, rate limits, region availability, and data-use terms in Google AI Studio and the official pricing/rate-limit pages.
3. Store the selected model name in an environment variable such as `GEMINI_MODEL`.
4. Keep `GEMINI_API_KEY` only in backend environment variables.
5. Never expose the key in Next.js client code, logs, screenshots, commits, or error responses.
6. Add request size limits and a simple per-user generation limit for the demo.
7. Log usage metadata such as request status and token counts where available, but never log full private documents or API keys.
8. If the chosen model becomes unavailable on the free tier, switch through configuration after verifying a compatible model; do not silently enable billing.

Official references used for this requirement:

- Google Gemini billing and tiers: https://ai.google.dev/gemini-api/docs/billing
- Google Gemini pricing: https://ai.google.dev/gemini-api/docs/pricing
- Google Gemini rate limits: https://ai.google.dev/gemini-api/docs/rate-limits
- Gemini document understanding: https://ai.google.dev/gemini-api/docs/document-processing
- Gemini structured outputs: https://ai.google.dev/gemini-api/docs/structured-output

## 8. Technical architecture

### 8.1 High-level architecture

```text
Next.js frontend
        |
        | authenticated HTTPS requests
        v
FastAPI backend
   |       |        |         |
   |       |        |         +--> LibreOffice headless
   |       |        +------------> python-docx / renderer
   |       +---------------------> Gemini API
   +-----------------------------> Supabase Auth, Postgres, Storage
```

### 8.2 Frontend responsibilities

- route protection and session handling;
- form state and client-side validation;
- upload UI and progress state;
- format review screen;
- generation status and error messages;
- section editor;
- preview and download controls;
- report history.

The frontend must not call Gemini directly and must not contain secret credentials.

### 8.3 Backend responsibilities

- authenticate and authorize requests;
- validate file type and size;
- extract PDF/DOCX information;
- call Gemini through a server-side adapter;
- validate structured AI output;
- persist normalized records;
- generate DOCX;
- convert DOCX to PDF;
- create secure download URLs;
- report recoverable errors.

### 8.4 Suggested repository structure

```text
EventScribe/
├── README.md
├── PRD.md
├── .env.example
├── .gitignore
├── docker-compose.yml                 # optional local services
├── frontend/
│   ├── app/
│   │   ├── (auth)/
│   │   ├── dashboard/
│   │   ├── reports/
│   │   └── layout.tsx
│   ├── components/
│   ├── lib/
│   ├── types/
│   └── package.json
├── backend/
│   ├── app/
│   │   ├── main.py
│   │   ├── config.py
│   │   ├── api/
│   │   ├── models/
│   │   ├── schemas/
│   │   ├── services/
│   │   │   ├── extraction/
│   │   │   ├── ai/
│   │   │   ├── rendering/
│   │   │   └── storage/
│   │   └── db/
│   ├── tests/
│   ├── requirements.txt
│   └── pyproject.toml
├── supabase/
│   └── migrations/
├── fixtures/
│   ├── sample-events/
│   ├── sample-formats/
│   └── sample-images/
└── docs/
    ├── architecture.md
    ├── api-contract.md
    ├── testing.md
    └── demo-checklist.md
```

## 9. Data model

### 9.1 `profiles`

- `id` UUID, references Supabase Auth user
- `display_name` text
- `role` text, default `professor`
- `created_at` timestamp
- `updated_at` timestamp

### 9.2 `format_profiles`

- `id` UUID
- `user_id` UUID
- `name` text
- `source_type` enum: `pdf`, `docx`, `text`
- `source_storage_path` text, nullable for text-only source
- `source_description` text, nullable
- `format_spec` JSONB
- `analysis_status` enum: `pending`, `ready`, `failed`
- `analysis_error` text, nullable
- `created_at` timestamp
- `updated_at` timestamp

### 9.3 `events`

- `id` UUID
- `user_id` UUID
- `format_profile_id` UUID, nullable if using an inline format description
- `title` text
- `event_date` date
- `start_time` time, nullable
- `end_time` time, nullable
- `department` text
- `venue` text
- `coordinator` text
- `guest` text, nullable
- `participants` JSONB, nullable
- `objectives` text
- `activities` text
- `outcomes` text
- `additional_facts` text, nullable
- `status` text
- `created_at` timestamp
- `updated_at` timestamp

### 9.4 `event_photos`

- `id` UUID
- `event_id` UUID
- `user_id` UUID
- `storage_path` text
- `original_filename` text
- `mime_type` text
- `size_bytes` integer
- `sort_order` integer
- `caption` text, nullable
- `created_at` timestamp

### 9.5 `reports`

- `id` UUID
- `event_id` UUID
- `user_id` UUID
- `content_json` JSONB
- `content_version` integer
- `docx_storage_path` text, nullable
- `pdf_storage_path` text, nullable
- `status` text
- `generation_model` text, nullable
- `prompt_version` text, nullable
- `last_error` text, nullable
- `created_at` timestamp
- `updated_at` timestamp

All user-owned tables require RLS policies based on `auth.uid()`.

## 10. API contract proposal

The exact route naming may change during implementation, but the contract must be documented before frontend integration.

### Authentication

Authentication is handled by Supabase Auth. The frontend sends the access token to the backend using the standard bearer token header.

### Format routes

```text
POST   /api/formats
GET    /api/formats
GET    /api/formats/{format_id}
POST   /api/formats/{format_id}/analyze
DELETE /api/formats/{format_id}
```

### Event routes

```text
POST   /api/events
GET    /api/events
GET    /api/events/{event_id}
PATCH  /api/events/{event_id}
DELETE /api/events/{event_id}
```

### Photo routes

```text
POST   /api/events/{event_id}/photos
PATCH  /api/events/{event_id}/photos/order
DELETE /api/events/{event_id}/photos/{photo_id}
```

### Report routes

```text
POST   /api/events/{event_id}/generate
GET    /api/events/{event_id}/report
PATCH  /api/reports/{report_id}/content
POST   /api/reports/{report_id}/render
GET    /api/reports/{report_id}/download/{file_type}
DELETE /api/reports/{report_id}
```

Every route must return a consistent error shape, for example:

```json
{
  "error": {
    "code": "INVALID_FILE_TYPE",
    "message": "Only PDF and DOCX reference files are supported.",
    "details": {}
  }
}
```

## 11. Rendering rules

The renderer must be deterministic for a given format specification, content JSON, and photo set.

### Supported layout primitives

- document title;
- subtitle and metadata block;
- section heading;
- paragraph block;
- bullet list;
- numbered list;
- simple table;
- image block;
- image grid;
- caption;
- page break;
- header/footer.

### Fallback behavior

If the format analysis requests an unsupported feature:

1. preserve the feature request in `uncertainties` or warnings;
2. use the nearest supported primitive;
3. continue rendering;
4. show a non-blocking warning to the user.

The renderer must never trust arbitrary AI-generated Python, HTML, XML, or code. AI output is data only.

## 12. Safety, privacy, and security requirements

- Secrets belong only in environment variables or deployment secret managers.
- `.env`, service-role keys, generated files, and uploaded user documents must not be committed.
- Validate file extension, MIME type, file size, and image decoding.
- Sanitize user-visible filenames.
- Use random storage paths rather than predictable public filenames.
- Prefer signed URLs with short expiry for downloads.
- Apply ownership checks at both API and database/storage layers.
- Do not log full event details, document content, photographs, or API keys.
- Add rate limiting or a simple generation quota before public deployment.
- Do not claim that generated text is verified by AI. The user remains responsible for confirming the final report.
- Display a notice that AI drafts must be reviewed before submission.

## 13. Testing strategy

### 13.1 Unit tests

- PDF text extraction;
- DOCX structure extraction;
- format specification validation;
- event schema validation;
- no-invention prompt input construction;
- image ordering;
- layout rule selection;
- DOCX generation with a minimal fixture;
- error mapping.

### 13.2 Integration tests

- authenticated user creates a format profile;
- format analysis saves valid JSON;
- event and photo records are associated with the correct user;
- content generation returns validated sections;
- rendering stores DOCX and PDF paths;
- another user cannot read the first user’s records.

### 13.3 End-to-end demo test

Use one fixed fixture:

```text
Event: Department seminar
Format: two-page academic reference PDF
Photos: three valid sample images
Expected: report draft, editable DOCX, readable PDF, history entry
```

### 13.4 Manual QA checklist

- sign-up and login;
- invalid login;
- refresh while signed in;
- unsupported reference file;
- oversized reference file;
- empty text format description;
- missing required event title;
- three-photo upload;
- photo removal and reordering;
- generation success;
- generation failure and retry;
- editing generated text;
- DOCX download;
- PDF download;
- report history reopen;
- delete confirmation;
- unauthorized record access;
- mobile-width layout;
- empty states and loading states.

## 14. Milestones and implementation order

### Milestone 0 — repository and conventions

Owner: Akshansh  
Support: Nishkarsh, Sumedha

Deliverables:

- GitHub repository;
- branch naming convention;
- `.gitignore`;
- `.env.example`;
- initial README;
- frontend/backend folders;
- issue list and task ownership.

### Milestone 1 — skeleton application

Owner: Akshansh

Deliverables:

- Next.js app booting locally;
- FastAPI health endpoint;
- frontend-to-backend connectivity;
- Supabase project variables documented;
- basic authenticated route plan.

### Milestone 2 — authentication and persistence

Owner: Akshansh

Deliverables:

- sign-up/sign-in;
- profiles table;
- initial migrations;
- RLS policies;
- protected dashboard.

### Milestone 3 — format input and analysis

Owner: Akshansh  
Small task: Sumedha adds sample format fixtures and extraction tests.

Deliverables:

- PDF/DOCX/text input;
- extraction service;
- format schema;
- AI adapter;
- validated saved format profile;
- review screen.

### Milestone 4 — event and photo workflow

Owner: Akshansh  
Small task: Nishkarsh implements form validation and upload feedback.

Deliverables:

- event form;
- event persistence;
- multiple photo upload;
- ordering and captions;
- storage paths.

### Milestone 5 — content generation

Owner: Akshansh

Deliverables:

- structured prompt;
- validated report content JSON;
- retry and error handling;
- user review/edit screen.

### Milestone 6 — document generation

Owner: Akshansh  
Small task: Sumedha adds rendering fixtures and output checklist.

Deliverables:

- dynamic DOCX renderer;
- photo grid;
- basic tables and styles;
- LibreOffice PDF conversion;
- output storage and downloads.

### Milestone 7 — history and hardening

Owner: Akshansh  
Support: Nishkarsh documentation, Sumedha QA.

Deliverables:

- report history;
- retryable failures;
- ownership checks;
- security review;
- end-to-end demo;
- final README and presentation material.

## 15. Team Git workflow

The repository shall use:

- `main` for integrated, reviewable code;
- `feature/<short-name>` for feature work;
- `fix/<short-name>` for bug fixes;
- pull requests for merges;
- meaningful commit messages;
- no secrets or generated output in Git.

Suggested task flow:

1. Akshansh creates a GitHub Issue with scope and acceptance criteria.
2. The issue is assigned to one teammate.
3. The teammate clones the repository and creates a branch.
4. The teammate completes the bounded task locally.
5. The teammate commits and pushes once the task is complete.
6. The teammate opens a pull request.
7. Akshansh checks the acceptance criteria and runs the relevant test.
8. Akshansh merges the pull request.

The team should not rewrite commit authorship or use another person’s credentials. Each commit should represent the person who made that change.

## 16. Bounded teammate task cards

These tasks are intentionally small or medium. Each should be independently assignable and finishable in about one hour after the base interfaces exist.

### Nishkarsh task card N-01: event form validation

**Goal:** Add client-side validation to the existing event form.  
**Files:** frontend event form components and validation helper.  
**Requirements:** title, date, department, venue, objectives, activities, and outcomes must show clear errors when required.  
**Acceptance:** invalid submission is blocked, errors are visible, valid data reaches the existing API call, and no backend files are changed.

### Nishkarsh task card N-02: upload feedback

**Goal:** Improve photo/reference upload UX.  
**Requirements:** show selected filenames, invalid extension, oversized file, upload state, success, and failure.  
**Acceptance:** user can remove a selected file before submission and receives a readable message for each failure state.

### Nishkarsh task card N-03: README walkthrough

**Goal:** Document local setup and the five-minute demo.  
**Requirements:** prerequisites, environment variables, frontend command, backend command, Supabase setup summary, and demo steps.  
**Acceptance:** a teammate can start the project by following the README without oral instructions.

### Sumedha task card S-01: format extraction fixtures

**Goal:** Add small sample files and tests for PDF/DOCX extraction.  
**Requirements:** one simple PDF, one simple DOCX, expected section names, and tests for page/paragraph extraction.  
**Acceptance:** tests pass locally and fixtures contain no private data.

### Sumedha task card S-02: renderer QA checklist

**Goal:** Create a manual checklist for DOCX/PDF output.  
**Requirements:** title, headings, margins, images, captions, page breaks, file opening, and missing-fact behavior.  
**Acceptance:** checklist is stored in `docs/testing.md` and can be run against one generated report.

### Sumedha task card S-03: API tests

**Goal:** Add tests for invalid input and ownership boundaries.  
**Requirements:** invalid file type, missing event title, malformed format JSON, and unauthorized report access.  
**Acceptance:** tests fail for the wrong behavior and pass for the implemented behavior.

## 17. Definition of done

A feature is done only when:

- the acceptance criteria are met;
- code or documentation is on a feature branch;
- tests or manual verification are recorded;
- no secret or personal data is committed;
- the pull request explains what changed and how it was tested;
- Akshansh reviewed the change;
- the change is merged into `main`;
- the README or API contract is updated if behavior changed.

## 18. Risks and mitigations

### Risk: free-tier model or quotas change

Mitigation: use a server-side model adapter, environment-configured model name, request limits, and a documented verification step before demo day.

### Risk: AI invents event facts

Mitigation: structured input, explicit no-invention instructions, schema validation, visible review, and a final user confirmation step.

### Risk: arbitrary reference layouts are too complex

Mitigation: support a documented set of layout primitives and provide graceful fallback warnings.

### Risk: LibreOffice unavailable on deployment host

Mitigation: verify the target host early; if necessary, use a deployment image/container that includes LibreOffice or keep DOCX generation as the primary export and document the PDF limitation.

### Risk: large files exhaust storage or request limits

Mitigation: configure file-size limits, compress or resize images, use signed URLs, and clean temporary conversion files.

### Risk: frontend and backend contracts drift

Mitigation: document API schemas, use typed response models, and test one end-to-end path after every major milestone.

## 19. Demo script

The final demonstration should use a prepared, non-sensitive sample:

1. Sign in as the professor.
2. Upload a reference PDF or enter a format description.
3. Show the detected sections and style summary.
4. Enter the event facts.
5. Upload three photographs.
6. Generate the report.
7. Point out that the generated sections use supplied facts.
8. Edit one paragraph.
9. Render DOCX and PDF.
10. Open the PDF and show the editable DOCX.
11. Reopen the report from history.
12. Briefly show the GitHub repository, branches, pull requests, tests, and team ownership.

## 20. Open decisions before implementation

These decisions must be recorded in GitHub Issues or the project documentation before the relevant milestone:

- final Gemini model available on the free tier at implementation time;
- exact application file-size and photo-count limits;
- exact Supabase storage bucket names;
- final report content JSON schema;
- whether browser preview is HTML-based or generated-file-based;
- deployment host that supports LibreOffice or the selected PDF strategy;
- whether email verification is enabled for the demo;
- final deletion and retention behavior for uploaded files.

## 21. Release checklist

- [ ] No secrets committed.
- [ ] `.env.example` is complete and contains placeholders only.
- [ ] Supabase RLS policies are enabled and tested.
- [ ] Gemini free-tier model and quotas verified from official documentation/console.
- [ ] Backend handles invalid AI JSON.
- [ ] Backend refuses to invent missing facts by prompt and validation design.
- [ ] PDF and DOCX fixtures render successfully.
- [ ] LibreOffice conversion works in the deployment environment.
- [ ] Upload size and type limits are enforced.
- [ ] User ownership is tested.
- [ ] Report history works.
- [ ] README setup works from a clean clone.
- [ ] End-to-end demo completed.
- [ ] Each team member’s merged contribution is documented accurately.

