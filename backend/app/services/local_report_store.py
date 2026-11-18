from dataclasses import dataclass
from datetime import datetime, timezone
from uuid import UUID, uuid4

from app.schemas.reports import ReportContent, ReportResponse


@dataclass
class LocalReport:
    id: UUID
    event_id: UUID
    user_id: str
    content_json: ReportContent | None
    content_version: int
    status: str
    generation_model: str | None
    prompt_version: str | None
    last_error: str | None
    docx_storage_path: str | None
    pdf_storage_path: str | None
    created_at: datetime


_reports: dict[UUID, LocalReport] = {}


def report_response(report: LocalReport) -> ReportResponse:
    return ReportResponse(
        id=report.id,
        event_id=report.event_id,
        user_id=report.user_id,
        content_json=report.content_json,
        content_version=report.content_version,
        status=report.status,
        generation_model=report.generation_model,
        prompt_version=report.prompt_version,
        last_error=report.last_error,
        docx_storage_path=report.docx_storage_path,
        pdf_storage_path=report.pdf_storage_path,
        created_at=report.created_at,
    )


def get_report(report_id: UUID, user_id: str) -> LocalReport | None:
    report = _reports.get(report_id)
    if report is None or report.user_id != user_id:
        return None
    return report


def get_event_report(event_id: UUID, user_id: str) -> LocalReport | None:
    for report in reversed(list(_reports.values())):
        if report.event_id == event_id and report.user_id == user_id:
            return report
    return None


def start_report(event_id: UUID, user_id: str, model: str | None, prompt_version: str) -> LocalReport:
    existing = get_event_report(event_id, user_id)
    if existing is not None:
        existing.status = "generating"
        existing.last_error = None
        existing.generation_model = model
        existing.prompt_version = prompt_version
        return existing

    report = LocalReport(
        id=uuid4(),
        event_id=event_id,
        user_id=user_id,
        content_json=None,
        content_version=1,
        status="generating",
        generation_model=model,
        prompt_version=prompt_version,
        last_error=None,
        docx_storage_path=None,
        pdf_storage_path=None,
        created_at=datetime.now(timezone.utc),
    )
    _reports[report.id] = report
    return report


def finish_report(report: LocalReport, content: ReportContent) -> ReportResponse:
    if report.content_json is not None:
        report.content_version += 1
    report.content_json = content
    report.status = "ready"
    report.last_error = None
    return report_response(report)


def fail_report(report: LocalReport, error: str) -> ReportResponse:
    report.status = "failed"
    report.last_error = error
    return report_response(report)


def update_report_content(report: LocalReport, content: ReportContent) -> ReportResponse:
    report.content_version += 1
    report.content_json = content
    report.status = "draft"
    report.last_error = None
    return report_response(report)


def set_docx_path(report: LocalReport, storage_path: str) -> ReportResponse:
    report.docx_storage_path = storage_path
    report.status = "ready"
    report.last_error = None
    return report_response(report)


def set_pdf_path(report: LocalReport, storage_path: str) -> ReportResponse:
    report.pdf_storage_path = storage_path
    report.status = "ready"
    report.last_error = None
    return report_response(report)
