from uuid import uuid4

from fastapi.testclient import TestClient

from app.main import app
from app.schemas.reports import ReportContent
from app.services.local_report_store import finish_report, start_report

client = TestClient(app)


def make_report():
    report = start_report(uuid4(), "history-user", None, "test")
    finish_report(
        report,
        ReportContent.model_validate(
            {
                "title": "History Report",
                "sections": [{"key": "summary", "title": "Summary", "blocks": [{"text": "Saved content."}]}],
            }
        ),
    )
    return report


def test_report_history_is_user_scoped() -> None:
    report = make_report()

    own = client.get("/api/reports", headers={"X-EventScribe-User": "history-user"})
    other = client.get("/api/reports", headers={"X-EventScribe-User": "other-user"})

    assert own.status_code == 200
    assert any(item["id"] == str(report.id) for item in own.json())
    assert other.status_code == 200
    assert all(item["id"] != str(report.id) for item in other.json())


def test_report_delete_removes_history_record() -> None:
    report = make_report()

    response = client.delete(f"/api/reports/{report.id}", headers={"X-EventScribe-User": "history-user"})

    assert response.status_code == 204
    assert client.get(f"/api/reports/{report.id}", headers={"X-EventScribe-User": "history-user"}).status_code == 404
