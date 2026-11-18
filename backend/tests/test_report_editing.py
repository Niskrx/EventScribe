from fastapi.testclient import TestClient

from app.main import app
from app.schemas.reports import ReportContent
from app.services.local_report_store import finish_report, start_report
from uuid import UUID, uuid4


client = TestClient(app)


def sample_content() -> ReportContent:
    return ReportContent.model_validate(
        {
            "title": "Seminar Report",
            "sections": [
                {
                    "key": "introduction",
                    "title": "Introduction",
                    "blocks": [{"kind": "paragraph", "text": "Original paragraph."}],
                    "needs_review": True,
                    "review_notes": ["Confirm the guest name."],
                }
            ],
            "missing_facts": ["guest"],
        }
    )


def test_report_content_can_be_saved_as_an_edit() -> None:
    event_id = uuid4()
    report = start_report(event_id, "local-dev-user", None, "test")
    finish_report(report, sample_content())

    edited = sample_content()
    edited.sections[0].blocks[0].text = "Edited paragraph."
    response = client.patch(f"/api/reports/{report.id}/content", json=edited.model_dump(mode="json"))

    assert response.status_code == 200
    assert response.json()["status"] == "draft"
    assert response.json()["content_version"] == 2
    assert response.json()["content_json"]["sections"][0]["blocks"][0]["text"] == "Edited paragraph."


def test_report_edit_is_user_scoped() -> None:
    report = start_report(uuid4(), "local-dev-user", None, "test")
    finish_report(report, sample_content())

    response = client.patch(
        f"/api/reports/{report.id}/content",
        headers={"X-EventScribe-User": "different-user"},
        json=sample_content().model_dump(mode="json"),
    )

    assert response.status_code == 404
