# Image QA fixtures

No binary images are committed. Tests generate a tiny valid PNG in memory when image embedding is required.

For missing-asset QA, use `backend/tests/test_rendering_qa.py`. It uploads a generated PNG, deletes the stored file, and verifies that rendering still succeeds without embedding a missing image. `../sample-formats/missing-image-format.json` documents the expected format configuration for that scenario.

The current format specification has no per-image asset path, so an intentionally missing format-level image reference can only be simulated through event photograph storage.
