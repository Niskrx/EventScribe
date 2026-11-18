from pathlib import Path
from uuid import UUID

from docx import Document
from fastapi.testclient import TestClient

from app.main import app
from app.schemas.format_spec import FormatSpecification
from app.schemas.reports import ReportContent
from app.services.local_format_store import get_local_profile_record, mark_local_profile_analysis
from app.services.local_report_store import finish_report, start_report


client = TestClient(app)


def test_docx_render_endpoint_creates_editable_document() -> None:
    specification = FormatSpecification.model_validate(
        {
            "source_type": "text",
            "sections": [{"key": "summary", "title": "Summary", "order": 1}],
            "style": {"font_family": "Arial", "body_font_size_pt": 11},
        }
    )
    profile_response = client.post(
        "/api/formats/text",
        json={"name": "Rendering format", "description": "Use a summary section."},
    )
    profile = get_local_profile_record(UUID(profile_response.json()["id"]), "local-dev-user")
    assert profile is not None
    mark_local_profile_analysis(profile, format_spec=specification)

    event_response = client.post(
        "/api/events",
        json={
            "title": "Rendering Demo",
            "event_date": "2026-11-18",
            "department": "Computer Science",
            "venue": "Seminar Hall",
            "coordinator": "Akshansh",
            "objectives": "Verify document rendering.",
            "activities": "Generate a test document.",
            "outcomes": "A readable DOCX is created.",
            "format_profile_id": str(profile.id),
        },
    )
    event_id = UUID(event_response.json()["id"])
    report = start_report(event_id, "local-dev-user", None, "test")
    finish_report(
        report,
        ReportContent.model_validate(
            {
                "title": "Rendering Demo",
                "sections": [{"key": "summary", "title": "Summary", "blocks": [{"text": "A rendered paragraph."}]}],
            }
        ),
    )

    response = client.post(f"/api/reports/{report.id}/render")

    assert response.status_code == 200
    storage_path = response.json()["docx_storage_path"]
    assert storage_path.endswith(".docx")
    output_path = Path(__file__).resolve().parents[1] / ".local_storage" / storage_path
    assert output_path.exists()
    document = Document(output_path)
    assert "Rendering Demo" in "\n".join(paragraph.text for paragraph in document.paragraphs)
