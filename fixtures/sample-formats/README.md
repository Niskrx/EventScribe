# Fictional format fixtures

These JSON files contain deterministic, invented academic-report-format examples.

- `annual-academic-event-format.json`: valid `FormatSpecification` with section, style, image, and table settings.
- `malformed-format.json`: readable JSON that intentionally violates the format schema (empty `sections`, invalid style and image values, and a non-list `tables` field). It must be rejected by `FormatSpecification`.
- `missing-image-format.json`: valid format specification that requests a photograph gallery while providing no photograph asset. The current schema has no format-level asset path; missing-photo behavior is exercised by uploading a photograph and removing its stored file in `backend/tests/test_rendering_qa.py`.

No credentials, personal records, or private documents are included. Tests validate these files against the public Pydantic schemas without network access or a live model.
