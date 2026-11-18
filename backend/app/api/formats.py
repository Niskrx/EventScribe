from uuid import UUID

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status

from app.auth import get_request_user_id
from app.config import Settings, get_settings
from app.schemas.formats import FormatProfileResponse, TextFormatRequest
from app.services.extraction.service import extract_reference, extract_text_description, source_type_for_upload
from app.services.local_format_store import create_local_profile, get_local_profile

router = APIRouter(prefix="/api/formats", tags=["formats"])


def _max_bytes(settings: Settings) -> int:
    return settings.max_reference_file_mb * 1024 * 1024


@router.post("/text", response_model=FormatProfileResponse, status_code=status.HTTP_201_CREATED)
async def create_text_format(
    request: TextFormatRequest,
    user_id: str = Depends(get_request_user_id),
) -> FormatProfileResponse:
    try:
        extracted = extract_text_description(request.description)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    return create_local_profile(user_id=user_id, name=request.name, source_type="text", extracted=extracted)


@router.post("/file", response_model=FormatProfileResponse, status_code=status.HTTP_201_CREATED)
async def create_file_format(
    name: str = Form(..., min_length=1, max_length=120),
    file: UploadFile = File(...),
    user_id: str = Depends(get_request_user_id),
    settings: Settings = Depends(get_settings),
) -> FormatProfileResponse:
    clean_name = name.strip()
    if not clean_name:
        raise HTTPException(status_code=422, detail="The format name cannot be empty.")
    filename = file.filename or "reference"
    try:
        source_type = source_type_for_upload(filename, file.content_type)
    except ValueError as exc:
        raise HTTPException(status_code=415, detail=str(exc)) from exc

    data = await file.read(_max_bytes(settings) + 1)
    if len(data) > _max_bytes(settings):
        raise HTTPException(status_code=413, detail=f"Reference files must be smaller than {settings.max_reference_file_mb} MB.")

    try:
        extracted = extract_reference(data, source_type, filename)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=422, detail="The reference file could not be extracted.") from exc

    return create_local_profile(
        user_id=user_id,
        name=clean_name,
        source_type=source_type,
        extracted=extracted,
        source_bytes=data,
        filename=filename,
    )


@router.get("/{profile_id}", response_model=FormatProfileResponse)
async def read_format_profile(
    profile_id: UUID,
    user_id: str = Depends(get_request_user_id),
) -> FormatProfileResponse:
    profile = get_local_profile(profile_id, user_id)
    if profile is None:
        raise HTTPException(status_code=404, detail="Format profile not found.")
    return profile
