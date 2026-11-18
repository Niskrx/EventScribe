import base64
import json
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

FIXTURES = Path(__file__).resolve().parents[2] / "fixtures"
STORAGE_ROOT = Path(__file__).resolve().parents[1] / ".local_storage"
PNG_1X1 = base64.b64decode(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII="
)


def auth(user: str) -> dict[str, str]:
    return {"X-EventScribe-User": user}


def load_format_specification() -> FormatSpecification:
    path = FIXTURES / "sample-formats" / "annual-academic-event-format.json"
    return FormatSpecification.model_validate_json(path.read_text(encoding="utf-8"))


def create_analyzed_profile(user: str):
    response = client.post(
        "/api/formats/text",
        json={
            "name": "QA rendering format",
            "description": "Use overview, activities, and outcomes sections from the fixture.",
        },
        headers=auth(user),
    )
    assert response.status_code == 201
    profile = get_local_profile_record(UUID(response.json()["id"]), user)
    assert profile is not None
    mark_local_profile_analysis(profile, format_spec=load_format_specification())
    return profile


def create_event(user: str, profile_id: UUID) -> str:
    payload = json.loads(
        (FIXTURES / "sample-events" / "innovation-showcase-2026.json").read_text(encoding="utf-8")
    )
    payload["format_profile_id"] = str(profile_id)
    response = client.post("/api/events", json=payload, headers=auth(user))
    assert response.status_code == 201
    return response.json()["id"]


def create_finished_report(user: str, event_id: str):
    report = start_report(UUID(event_id), user, "qa-test-model", "qa-rendering-v1")
    finish_report(
        report,
        ReportContent.model_validate(
            {
                "schema_version": "1.0",
                "title": "Innovation Showcase 2026",
                "sections": [
                    {
                        "key": "overview",
                        "title": "Event Overview",
                        "blocks": [
                            {
                                "kind": "paragraph",
                                "text": "Fictional students demonstrated projects at Northstar University.",
                            }
                        ],
                    },
                    {
                        "key": "activities",
                        "title": "Activities",
                        "blocks": [
                            {
                                "kind": "bullet",
                                "items": ["Project demonstrations", "Moderated panel"],
                            }
                        ],
                    },
                    {
                        "key": "outcomes",
                        "title": "Outcomes",
                        "blocks": [
                            {
                                "kind": "paragraph",
                                "text": "Participants exchanged ideas and identified collaboration opportunities.",
                            }
                        ],
                    },
                ],
                "missing_facts": [],
            }
        ),
    )
    return report


def upload_photo(user: str, event_id: str, caption: str) -> dict:
    response = client.post(
        f"/api/events/{event_id}/photos",
        files={"file": ("qa-photo.png", PNG_1X1, "image/png")},
        data={"caption": caption},
        headers=auth(user),
    )
    assert response.status_code == 201
    return response.json()


def render_report(user: str, report_id: UUID) -> dict:
    response = client.post(f"/api/reports/{report_id}/render", headers=auth(user))
    assert response.status_code == 200, response.text
    return response.json()


def test_rendered_docx_has_title_sections_styles_and_photo_caption() -> None:
    user = "qa-rendering-structure"
    profile = create_analyzed_profile(user)
    event_id = create_event(user, profile.id)
    report = create_finished_report(user, event_id)
    upload_photo(user, event_id, "Opening panel")

    rendered = render_report(user, report.id)
    output_path = STORAGE_ROOT / rendered["docx_storage_path"]
    assert output_path.exists()
    assert output_path.suffix == ".docx"

    document = Document(output_path)
    paragraphs = [paragraph.text for paragraph in document.paragraphs]
    headings = [paragraph.text for paragraph in document.paragraphs if paragraph.style.name.startswith("Heading")]

    assert "Innovation Showcase 2026" in paragraphs
    assert headings == ["Event Overview", "Activities", "Outcomes", "Photographs"]
    assert "Project demonstrations" in paragraphs
    assert "Moderated panel" in paragraphs
    assert any(paragraph.style.name == "List Bullet" for paragraph in document.paragraphs)

    assert len(document.inline_shapes) == 1
    table_cell_text = "\n".join(paragraph.text for paragraph in document.tables[0].cell(0, 0).paragraphs)
    assert "Opening panel" in table_cell_text

    normal = document.styles["Normal"]
    assert normal.font.name == "Arial"
    assert normal.font.size.pt == 11
    section = document.sections[0]
    assert round(section.top_margin.cm, 2) == 2.54
    assert round(section.left_margin.cm, 2) == 2.54


def test_docx_download_has_expected_content_type_filename_and_body() -> None:
    user = "qa-rendering-download"
    profile = create_analyzed_profile(user)
    event_id = create_event(user, profile.id)
    report = create_finished_report(user, event_id)
    render_report(user, report.id)

    response = client.get(f"/api/reports/{report.id}/download/docx", headers=auth(user))

    assert response.status_code == 200
    assert response.headers["content-type"] == (
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    )
    assert "event-report.docx" in response.headers["content-disposition"]
    assert response.content.startswith(b"PK")
    assert len(response.content) > 0


def test_missing_photo_file_is_omitted_without_failing_render() -> None:
    user = "qa-rendering-missing-photo"
    profile = create_analyzed_profile(user)
    event_id = create_event(user, profile.id)
    report = create_finished_report(user, event_id)
    photo = upload_photo(user, event_id, "Intentionally removed photograph")
    photo_path = STORAGE_ROOT / photo["storage_path"]
    assert photo_path.exists()
    photo_path.unlink()

    rendered = render_report(user, report.id)
    document = Document(STORAGE_ROOT / rendered["docx_storage_path"])

    assert len(document.inline_shapes) == 0
    assert "Innovation Showcase 2026" in [paragraph.text for paragraph in document.paragraphs]
