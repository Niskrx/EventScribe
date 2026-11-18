from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status

from app.auth import get_request_user_id
from app.config import Settings, get_settings
from app.schemas.reports import ReportContent, ReportResponse
from app.services.ai.gemini import GeminiAdapter, GeminiError
from app.services.local_event_store import event_response, get_event
from app.services.local_format_store import get_local_profile_record
from app.services.local_report_store import (
    fail_report,
    finish_report,
    get_event_report,
    get_report,
    report_response,
    start_report,
    update_report_content,
)

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


@router.get("/reports/{report_id}", response_model=ReportResponse)
async def read_report(report_id: UUID, user_id: str = Depends(get_request_user_id)) -> ReportResponse:
    report = get_report(report_id, user_id)
    if report is None:
        raise HTTPException(status_code=404, detail="Report not found.")
    return report_response(report)


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
