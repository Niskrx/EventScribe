from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import FileResponse

from app.auth import get_request_user_id
from app.config import Settings, get_settings
from app.schemas.reports import ReportContent, ReportResponse
from app.services.ai.gemini import GeminiAdapter, GeminiError
from pathlib import Path

from app.services.local_event_store import event_response, get_event, list_event_photos
from app.services.local_format_store import get_local_profile_record
from app.services.local_report_store import (
    fail_report,
    finish_report,
    get_event_report,
    get_report,
    list_reports,
    delete_report,
    report_response,
    set_pdf_path,
    start_report,
    set_docx_path,
    update_report_content,
)
from app.services.rendering.docx_renderer import render_docx
from app.services.rendering.pdf_converter import PdfConversionError, convert_docx_to_pdf

router = APIRouter(prefix="/api", tags=["reports"])
PROMPT_VERSION = "format-report-v1"


@router.post("/events/{event_id}/generate", response_model=ReportResponse)
async def generate_event_report(
    event_id: UUID,
    user_id: str = Depends(get_request_user_id),
    settings: Settings = Depends(get_settings),
) -> ReportResponse:
    event = get_event(event_id, user_id)
    if event is None:
        raise HTTPException(status_code=404, detail="Event not found.")
    if event.format_profile_id is None:
        raise HTTPException(status_code=422, detail="An analyzed format profile is required before report generation.")

    profile = get_local_profile_record(event.format_profile_id, user_id)
    if profile is None or profile.format_spec is None or profile.analysis_status != "ready":
        raise HTTPException(status_code=422, detail="The selected format profile must be analyzed before report generation.")

    report = start_report(event.id, user_id, settings.gemini_model, PROMPT_VERSION)
    try:
        content = await GeminiAdapter(settings).generate_report_content(event_response(event).model_dump(mode="json"), profile.format_spec)
    except GeminiError as exc:
        fail_report(report, exc.message)
        status_code = 503 if exc.code in {"AI_NOT_CONFIGURED", "AI_UNAVAILABLE", "AI_QUOTA_EXCEEDED"} else 502
        raise HTTPException(status_code=status_code, detail=exc.message) from exc

    return finish_report(report, content)


@router.get("/events/{event_id}/report", response_model=ReportResponse)
async def read_event_report(event_id: UUID, user_id: str = Depends(get_request_user_id)) -> ReportResponse:
    report = get_event_report(event_id, user_id)
    if report is None:
        raise HTTPException(status_code=404, detail="Report not found.")
    return report_response(report)


@router.get("/reports", response_model=list[ReportResponse])
async def read_report_history(user_id: str = Depends(get_request_user_id)) -> list[ReportResponse]:
    return list_reports(user_id)


@router.get("/reports/{report_id}", response_model=ReportResponse)
async def read_report(report_id: UUID, user_id: str = Depends(get_request_user_id)) -> ReportResponse:
    report = get_report(report_id, user_id)
    if report is None:
        raise HTTPException(status_code=404, detail="Report not found.")
    return report_response(report)


@router.post("/reports/{report_id}/retry", response_model=ReportResponse)
async def retry_report(
    report_id: UUID,
    user_id: str = Depends(get_request_user_id),
    settings: Settings = Depends(get_settings),
) -> ReportResponse:
    report = get_report(report_id, user_id)
    if report is None:
        raise HTTPException(status_code=404, detail="Report not found.")
    return await generate_event_report(report.event_id, user_id, settings)


@router.delete("/reports/{report_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_report(report_id: UUID, user_id: str = Depends(get_request_user_id)) -> None:
    report = get_report(report_id, user_id)
    if report is None:
        raise HTTPException(status_code=404, detail="Report not found.")
    storage_root = Path(__file__).resolve().parents[2] / ".local_storage"
    delete_report(report, storage_root)


@router.patch("/reports/{report_id}/content", response_model=ReportResponse)
async def edit_report_content(
    report_id: UUID,
    content: ReportContent,
    user_id: str = Depends(get_request_user_id),
) -> ReportResponse:
    report = get_report(report_id, user_id)
    if report is None:
        raise HTTPException(status_code=404, detail="Report not found.")
    if not content.sections:
        raise HTTPException(status_code=422, detail="A report must contain at least one section.")
    return update_report_content(report, content)


@router.post("/reports/{report_id}/render", response_model=ReportResponse)
async def render_report_docx(
    report_id: UUID,
    user_id: str = Depends(get_request_user_id),
) -> ReportResponse:
    report = get_report(report_id, user_id)
    if report is None:
        raise HTTPException(status_code=404, detail="Report not found.")
    if report.content_json is None:
        raise HTTPException(status_code=422, detail="Report content must be generated before rendering.")

    event = get_event(report.event_id, user_id)
    if event is None or event.format_profile_id is None:
        raise HTTPException(status_code=422, detail="The event format profile is required before rendering.")
    profile = get_local_profile_record(event.format_profile_id, user_id)
    if profile is None or profile.format_spec is None:
        raise HTTPException(status_code=422, detail="The event format profile must be analyzed before rendering.")

    try:
        data = render_docx(report.content_json, profile.format_spec, list_event_photos(event), Path(__file__).resolve().parents[2] / ".local_storage")
        relative_path = Path(user_id) / "reports" / f"{report.id}.docx"
        output_path = Path(__file__).resolve().parents[2] / ".local_storage" / relative_path
        output_path.parent.mkdir(parents=True, exist_ok=True)
        output_path.write_bytes(data)
    except Exception as exc:
        report.last_error = "The DOCX report could not be rendered."
        raise HTTPException(status_code=500, detail=report.last_error) from exc

    return set_docx_path(report, str(relative_path))


@router.post("/reports/{report_id}/convert-pdf", response_model=ReportResponse)
async def convert_report_pdf(
    report_id: UUID,
    user_id: str = Depends(get_request_user_id),
) -> ReportResponse:
    report = get_report(report_id, user_id)
    if report is None:
        raise HTTPException(status_code=404, detail="Report not found.")
    if not report.docx_storage_path:
        raise HTTPException(status_code=422, detail="Render the DOCX before converting it to PDF.")

    storage_root = Path(__file__).resolve().parents[2] / ".local_storage"
    docx_path = storage_root / report.docx_storage_path
    try:
        pdf_path = convert_docx_to_pdf(docx_path, docx_path.parent)
    except PdfConversionError as exc:
        report.last_error = str(exc)
        raise HTTPException(status_code=503, detail=str(exc)) from exc

    return set_pdf_path(report, str(pdf_path.relative_to(storage_root)))


@router.get("/reports/{report_id}/download/{file_type}")
async def download_report_file(
    report_id: UUID,
    file_type: str,
    user_id: str = Depends(get_request_user_id),
) -> FileResponse:
    report = get_report(report_id, user_id)
    if report is None:
        raise HTTPException(status_code=404, detail="Report not found.")
    if file_type not in {"docx", "pdf"}:
        raise HTTPException(status_code=400, detail="Only DOCX and PDF downloads are supported.")

    storage_path = report.docx_storage_path if file_type == "docx" else report.pdf_storage_path
    if not storage_path:
        raise HTTPException(status_code=404, detail=f"{file_type.upper()} file is not ready.")

    storage_root = (Path(__file__).resolve().parents[2] / ".local_storage").resolve()
    file_path = (storage_root / storage_path).resolve()
    if storage_root not in file_path.parents or not file_path.exists():
        raise HTTPException(status_code=404, detail="Report file not found.")

    media_type = "application/vnd.openxmlformats-officedocument.wordprocessingml.document" if file_type == "docx" else "application/pdf"
    return FileResponse(file_path, media_type=media_type, filename=f"event-report.{file_type}")
