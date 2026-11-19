from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from uuid import UUID, uuid4

from app.schemas.reports import ReportContent, ReportResponse
from app.services.supabase_rest import SupabaseRest, enabled


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
    if enabled():
        rows = SupabaseRest().select("reports", filters={"id": str(report_id), "user_id": user_id})
        return _report_from_row(rows[0]) if rows else None
    report = _reports.get(report_id)
    if report is None or report.user_id != user_id:
        return None
    return report


def get_event_report(event_id: UUID, user_id: str) -> LocalReport | None:
    if enabled():
        rows = SupabaseRest().select("reports", filters={"event_id": str(event_id), "user_id": user_id}, order="created_at.desc")
        return _report_from_row(rows[0]) if rows else None
    for report in reversed(list(_reports.values())):
        if report.event_id == event_id and report.user_id == user_id:
            return report
    return None


def list_reports(user_id: str) -> list[ReportResponse]:
    if enabled():
        rows = SupabaseRest().select("reports", filters={"user_id": user_id}, order="created_at.desc")
        return [report_response(_report_from_row(row)) for row in rows]
    reports = [report for report in _reports.values() if report.user_id == user_id]
    reports.sort(key=lambda report: report.created_at, reverse=True)
    return [report_response(report) for report in reports]


def start_report(event_id: UUID, user_id: str, model: str | None, prompt_version: str) -> LocalReport:
    existing = get_event_report(event_id, user_id)
    if existing is not None:
        if enabled():
            row = SupabaseRest().update(
                "reports",
                filters={"id": str(existing.id), "user_id": user_id},
                values={"status": "generating", "last_error": None, "generation_model": model, "prompt_version": prompt_version},
            )
            return _report_from_row(row)
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
    if enabled():
        row = SupabaseRest().insert(
            "reports",
            {
                "id": str(report.id),
                "event_id": str(event_id),
                "user_id": user_id,
                "status": "generating",
                "generation_model": model,
                "prompt_version": prompt_version,
            },
        )
        return _report_from_row(row)
    _reports[report.id] = report
    return report


def finish_report(report: LocalReport, content: ReportContent) -> ReportResponse:
    if enabled():
        row = SupabaseRest().update(
            "reports",
            filters={"id": str(report.id), "user_id": report.user_id},
            values={
                "content_json": content.model_dump(mode="json"),
                "content_version": report.content_version + (1 if report.content_json is not None else 0),
                "status": "ready",
                "last_error": None,
            },
        )
        return report_response(_report_from_row(row))
    if report.content_json is not None:
        report.content_version += 1
    report.content_json = content
    report.status = "ready"
    report.last_error = None
    return report_response(report)


def fail_report(report: LocalReport, error: str) -> ReportResponse:
    if enabled():
        row = SupabaseRest().update(
            "reports", filters={"id": str(report.id), "user_id": report.user_id}, values={"status": "failed", "last_error": error}
        )
        return report_response(_report_from_row(row))
    report.status = "failed"
    report.last_error = error
    return report_response(report)


def update_report_content(report: LocalReport, content: ReportContent) -> ReportResponse:
    if enabled():
        row = SupabaseRest().update(
            "reports",
            filters={"id": str(report.id), "user_id": report.user_id},
            values={"content_json": content.model_dump(mode="json"), "content_version": report.content_version + 1, "status": "draft", "last_error": None},
        )
        return report_response(_report_from_row(row))
    report.content_version += 1
    report.content_json = content
    report.status = "draft"
    report.last_error = None
    return report_response(report)


def set_docx_path(report: LocalReport, storage_path: str) -> ReportResponse:
    if enabled():
        SupabaseRest().upload(storage_path, (Path(__file__).resolve().parents[2] / ".local_storage" / storage_path).read_bytes(), "application/vnd.openxmlformats-officedocument.wordprocessingml.document")
        row = SupabaseRest().update(
            "reports", filters={"id": str(report.id), "user_id": report.user_id}, values={"docx_storage_path": storage_path, "status": "ready", "last_error": None}
        )
        return report_response(_report_from_row(row))
    report.docx_storage_path = storage_path
    report.status = "ready"
    report.last_error = None
    return report_response(report)


def set_pdf_path(report: LocalReport, storage_path: str) -> ReportResponse:
    if enabled():
        SupabaseRest().upload(storage_path, (Path(__file__).resolve().parents[2] / ".local_storage" / storage_path).read_bytes(), "application/pdf")
        row = SupabaseRest().update(
            "reports", filters={"id": str(report.id), "user_id": report.user_id}, values={"pdf_storage_path": storage_path, "status": "ready", "last_error": None}
        )
        return report_response(_report_from_row(row))
    report.pdf_storage_path = storage_path
    report.status = "ready"
    report.last_error = None
    return report_response(report)


def delete_report(report: LocalReport, storage_root) -> None:
    if enabled():
        client = SupabaseRest()
        for storage_path in (report.docx_storage_path, report.pdf_storage_path):
            if storage_path:
                client.remove_object(storage_path)
        client.delete("reports", filters={"id": str(report.id), "user_id": report.user_id})
        return
    for storage_path in (report.docx_storage_path, report.pdf_storage_path):
        if storage_path:
            path = (storage_root / storage_path).resolve()
            root = storage_root.resolve()
            if root in path.parents and path.exists():
                path.unlink()
    _reports.pop(report.id, None)


def _report_from_row(row: dict) -> LocalReport:
    content = row.get("content_json")
    return LocalReport(
        id=UUID(str(row["id"])),
        event_id=UUID(str(row["event_id"])),
        user_id=row["user_id"],
        content_json=ReportContent.model_validate(content) if content else None,
        content_version=row.get("content_version", 1),
        status=row.get("status", "draft"),
        generation_model=row.get("generation_model"),
        prompt_version=row.get("prompt_version"),
        last_error=row.get("last_error"),
        docx_storage_path=row.get("docx_storage_path"),
        pdf_storage_path=row.get("pdf_storage_path"),
        created_at=datetime.fromisoformat(row["created_at"].replace("Z", "+00:00")),
    )
