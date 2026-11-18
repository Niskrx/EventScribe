import json
from pathlib import Path
from uuid import uuid4

from fastapi.testclient import TestClient

from app.main import app
from app.schemas.reports import ReportContent
from app.services.local_report_store import finish_report, start_report

client = TestClient(app)
FIXTURES = Path(__file__).resolve().parents[2] / "fixtures"


def assert_safe_http_error(response, status_code: int) -> dict:
    assert response.status_code == status_code
    body = response.json()
    assert set(body) == {"error"}
    assert body["error"]["code"] in {"VALIDATION_ERROR", "HTTP_ERROR"}
    assert body["error"]["message"]
    serialized = response.text.lower()
    assert "traceback" not in serialized
    assert "secret" not in serialized
    assert "/users/" not in serialized
    return body


def test_empty_format_description_is_rejected() -> None:
    response = client.post(
        "/api/formats/text",
        json={"name": "Invalid format", "description": "   "},
    )

    body = assert_safe_http_error(response, 422)
    assert body["error"]["code"] in {"VALIDATION_ERROR", "HTTP_ERROR"}


def test_unsupported_format_file_type_is_rejected() -> None:
    response = client.post(
        "/api/formats/file",
        data={"name": "Text notes"},
        files={"file": ("format.txt", b"Use an invented summary.", "text/plain")},
    )

    body = assert_safe_http_error(response, 415)
    assert body["error"]["message"]


def test_empty_format_name_is_rejected() -> None:
    response = client.post(
        "/api/formats/text",
        json={"name": "", "description": "Use summary and outcomes sections."},
    )

    assert_safe_http_error(response, 422)


def test_event_missing_required_field_is_rejected() -> None:
    payload = {
        "event_date": "2026-11-18",
        "department": "Department of Computer Applications",
        "venue": "Northstar University Innovation Hall",
        "coordinator": "Alex Rivera",
        "objectives": "Demonstrate fictional projects.",
        "activities": "Presentations and discussion.",
        "outcomes": "Participants exchanged ideas.",
    }

    assert_safe_http_error(client.post("/api/events", json=payload), 422)


def test_event_with_invalid_date_is_rejected() -> None:
    payload = {
        "title": "Invalid Date Showcase",
        "event_date": "2026-02-30",
        "department": "Department of Computer Applications",
        "venue": "Northstar University",
        "coordinator": "Alex Rivera",
        "objectives": "Test invalid date handling.",
        "activities": "Submit a malformed date.",
        "outcomes": "No report should be created.",
    }

    assert_safe_http_error(client.post("/api/events", json=payload), 422)


def test_invalid_photo_signature_is_rejected() -> None:
    event_payload = {
        "title": "Photo Negative Test",
        "event_date": "2026-11-18",
        "department": "Department of Computer Applications",
        "venue": "Northstar University",
        "coordinator": "Alex Rivera",
        "objectives": "Verify photo validation.",
        "activities": "Attempt an invalid image upload.",
        "outcomes": "The invalid image is rejected.",
    }
    event_id = client.post("/api/events", json=event_payload).json()["id"]

    response = client.post(
        f"/api/events/{event_id}/photos",
        files={"file": ("fake.png", b"not a png", "image/png")},
    )

    body = assert_safe_http_error(response, 422)
    assert body["error"]["message"] == "The uploaded file is not a valid photograph."


def test_event_report_generation_prerequisite_is_reported() -> None:
    payload = {
        "title": "Unformatted Showcase",
        "event_date": "2026-11-18",
        "department": "Department of Computer Applications",
        "venue": "Northstar University",
        "coordinator": "Alex Rivera",
        "objectives": "Test missing format handling.",
        "activities": "Create an event without a format profile.",
        "outcomes": "A clear prerequisite error is returned.",
    }
    event_id = client.post("/api/events", json=payload).json()["id"]

    response = client.post(f"/api/events/{event_id}/generate")

    body = assert_safe_http_error(response, 422)
    assert body["error"]["message"] == "An analyzed format profile is required before report generation."


def test_missing_report_access_and_invalid_download_are_rejected() -> None:
    missing_id = uuid4()

    read_response = client.get(f"/api/reports/{missing_id}")
    assert_safe_http_error(read_response, 404)

    event_id = client.post(
        "/api/events",
        json={
            "title": "Download Negative Test",
            "event_date": "2026-11-18",
            "department": "Department of Computer Applications",
            "venue": "Northstar University",
            "coordinator": "Alex Rivera",
            "objectives": "Verify download validation.",
            "activities": "Request an unsupported file type.",
            "outcomes": "The unsupported download is rejected.",
        },
    ).json()["id"]

    download_response = client.get(f"/api/events/{event_id}/report")
    assert_safe_http_error(download_response, 404)

    report = start_report(uuid4(), "local-dev-user", None, "test")
    finish_report(
        report,
        ReportContent.model_validate(
            {
                "title": "Download Format Test",
                "sections": [{"key": "summary", "title": "Summary", "blocks": [{"text": "A finished report."}]}],
            }
        ),
    )

    invalid_download = client.get(f"/api/reports/{report.id}/download/txt")
    assert_safe_http_error(invalid_download, 400)


def test_empty_report_edit_and_pdf_before_docx_are_rejected() -> None:
    report = start_report(uuid4(), "local-dev-user", None, "test")
    finish_report(
        report,
        ReportContent.model_validate(
            {
                "title": "Negative Report",
                "sections": [{"key": "summary", "title": "Summary", "blocks": [{"text": "Initial content."}]}],
            }
        ),
    )

    edit_response = client.patch(
        f"/api/reports/{report.id}/content",
        json={"schema_version": "1.0", "title": "Empty Content", "sections": []},
    )
    assert_safe_http_error(edit_response, 422)

    pdf_response = client.post(f"/api/reports/{report.id}/convert-pdf")
    assert_safe_http_error(pdf_response, 422)


def test_safe_fictional_fixtures_are_small_and_present() -> None:
    event_fixture = (FIXTURES / "sample-events" / "innovation-showcase-2026.json")
    format_fixture = (FIXTURES / "sample-formats" / "annual-academic-event-format.json")
    malformed_fixture = (FIXTURES / "sample-formats" / "malformed-format.json")
    missing_image_fixture = (FIXTURES / "sample-formats" / "missing-image-format.json")

    assert event_fixture.is_file()
    assert format_fixture.is_file()
    assert malformed_fixture.is_file()
    assert missing_image_fixture.is_file()
    assert event_fixture.stat().st_size < 5_000
    assert format_fixture.stat().st_size < 5_000


def test_missing_required_event_fields_fixture_is_rejected() -> None:
    payload = json.loads((FIXTURES / "sample-events" / "missing-required-fields.json").read_text(encoding="utf-8"))

    body = assert_safe_http_error(client.post("/api/events", json=payload), 422)

    missing_fields = {field["loc"][-1] for field in body["error"]["details"]["fields"]}
    assert {"title", "objectives"} <= missing_fields


def test_invalid_event_field_types_are_rejected() -> None:
    payload = {
        "title": ["not", "a", "string"],
        "event_date": 20261118,
        "department": "Department of Computer Applications",
        "venue": "Northstar University",
        "coordinator": "Alex Rivera",
        "objectives": "Test invalid field types.",
        "activities": "Submit malformed values.",
        "outcomes": "Validation fails safely.",
    }

    assert_safe_http_error(client.post("/api/events", json=payload), 422)


def test_malformed_json_request_is_rejected() -> None:
    response = client.post(
        "/api/events",
        content="{",
        headers={"Content-Type": "application/json"},
    )

    assert_safe_http_error(response, 422)


def test_empty_reference_file_is_rejected() -> None:
    response = client.post(
        "/api/formats/file",
        data={"name": "Empty reference"},
        files={"file": ("empty.pdf", b"", "application/pdf")},
    )

    body = assert_safe_http_error(response, 422)
    assert body["error"]["message"] == "The reference file cannot be empty."


def test_unreadable_pdf_and_docx_references_are_rejected() -> None:
    for filename, content_type in (
        ("broken.pdf", "application/pdf"),
        ("broken.docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"),
    ):
        response = client.post(
            "/api/formats/file",
            data={"name": "Broken reference"},
            files={"file": (filename, b"this is not a real document", content_type)},
        )

        body = assert_safe_http_error(response, 422)
        assert body["error"]["message"] == "The reference file could not be extracted."


def test_unanalyzed_format_profile_blocks_report_generation() -> None:
    profile_response = client.post(
        "/api/formats/text",
        json={"name": "Unanalyzed format", "description": "Use overview and outcomes sections."},
    )
    profile_id = profile_response.json()["id"]
    event_payload = {
        "title": "Unanalyzed Format Test",
        "event_date": "2026-11-18",
        "department": "Department of Computer Applications",
        "venue": "Northstar University",
        "coordinator": "Alex Rivera",
        "objectives": "Verify the analysis prerequisite.",
        "activities": "Create an event with a pending format.",
        "outcomes": "Generation is rejected until analysis succeeds.",
        "format_profile_id": profile_id,
    }
    event_id = client.post("/api/events", json=event_payload).json()["id"]

    body = assert_safe_http_error(client.post(f"/api/events/{event_id}/generate"), 422)
    assert body["error"]["message"] == "The selected format profile must be analyzed before report generation."


def test_report_actions_are_scoped_to_the_owner() -> None:
    report = start_report(uuid4(), "qa-report-owner", None, "test")
    finish_report(
        report,
        ReportContent.model_validate(
            {
                "title": "Ownership Test Report",
                "sections": [{"key": "summary", "title": "Summary", "blocks": [{"text": "Owner content."}]}],
            }
        ),
    )
    other_user = {"X-EventScribe-User": "qa-report-other"}
    content = {
        "schema_version": "1.0",
        "title": "Unauthorized Edit",
        "sections": [{"key": "summary", "title": "Summary", "blocks": [{"text": "Edited."}]}],
    }

    responses = [
        client.get(f"/api/reports/{report.id}", headers=other_user),
        client.patch(f"/api/reports/{report.id}/content", json=content, headers=other_user),
        client.post(f"/api/reports/{report.id}/retry", headers=other_user),
        client.post(f"/api/reports/{report.id}/render", headers=other_user),
        client.post(f"/api/reports/{report.id}/convert-pdf", headers=other_user),
        client.get(f"/api/reports/{report.id}/download/docx", headers=other_user),
        client.delete(f"/api/reports/{report.id}", headers=other_user),
    ]

    for response in responses:
        assert_safe_http_error(response, 404)


def test_nonexistent_report_actions_are_rejected() -> None:
    missing_id = uuid4()

    responses = [
        client.get(f"/api/reports/{missing_id}"),
        client.post(f"/api/reports/{missing_id}/retry"),
        client.post(f"/api/reports/{missing_id}/render"),
        client.post(f"/api/reports/{missing_id}/convert-pdf"),
        client.get(f"/api/reports/{missing_id}/download/docx"),
        client.delete(f"/api/reports/{missing_id}"),
    ]

    for response in responses:
        assert_safe_http_error(response, 404)
