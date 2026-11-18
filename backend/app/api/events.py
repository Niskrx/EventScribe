from uuid import UUID

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status

from app.auth import get_request_user_id
from app.config import Settings, get_settings
from app.schemas.events import EventCreateRequest, EventResponse, EventUpdateRequest, PhotoResponse
from app.services.local_event_store import (
    add_photo,
    create_event,
    delete_event,
    event_response,
    delete_photo,
    get_event,
    get_photo,
    photo_response,
    reorder_photos,
    update_event,
)

router = APIRouter(prefix="/api/events", tags=["events"])

ALLOWED_PHOTO_TYPES = {"image/jpeg", "image/png", "image/webp"}
PHOTO_SIGNATURES = {
    "image/jpeg": lambda data: data.startswith(b"\xff\xd8\xff"),
    "image/png": lambda data: data.startswith(b"\x89PNG\r\n\x1a\n"),
    "image/webp": lambda data: data.startswith(b"RIFF") and data[8:12] == b"WEBP",
}


def _max_photo_bytes(settings: Settings) -> int:
    return settings.max_photo_file_mb * 1024 * 1024


def _owned_event_or_404(event_id: UUID, user_id: str):
    event = get_event(event_id, user_id)
    if event is None:
        raise HTTPException(status_code=404, detail="Event not found.")
    return event


@router.post("", response_model=EventResponse, status_code=status.HTTP_201_CREATED)
async def create_event_draft(
    request: EventCreateRequest,
    user_id: str = Depends(get_request_user_id),
) -> EventResponse:
    return create_event(user_id, request.model_dump())


@router.get("/{event_id}", response_model=EventResponse)
async def read_event(event_id: UUID, user_id: str = Depends(get_request_user_id)) -> EventResponse:
    return event_response(_owned_event_or_404(event_id, user_id))


@router.patch("/{event_id}", response_model=EventResponse)
async def edit_event(
    event_id: UUID,
    request: EventUpdateRequest,
    user_id: str = Depends(get_request_user_id),
) -> EventResponse:
    event = _owned_event_or_404(event_id, user_id)
    return update_event(event, request.model_dump())


@router.delete("/{event_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_event(event_id: UUID, user_id: str = Depends(get_request_user_id)) -> None:
    event = _owned_event_or_404(event_id, user_id)
    delete_event(event)


@router.post("/{event_id}/photos", response_model=PhotoResponse, status_code=status.HTTP_201_CREATED)
async def upload_event_photo(
    event_id: UUID,
    file: UploadFile = File(...),
    caption: str | None = Form(default=None, max_length=500),
    user_id: str = Depends(get_request_user_id),
    settings: Settings = Depends(get_settings),
) -> PhotoResponse:
    event = _owned_event_or_404(event_id, user_id)
    if len(event.photos) >= settings.max_photos_per_event:
        raise HTTPException(status_code=413, detail=f"An event can contain at most {settings.max_photos_per_event} photos.")
    if file.content_type not in ALLOWED_PHOTO_TYPES:
        raise HTTPException(status_code=415, detail="Only JPEG, PNG, and WebP photographs are supported.")

    data = await file.read(_max_photo_bytes(settings) + 1)
    if len(data) > _max_photo_bytes(settings):
        raise HTTPException(status_code=413, detail=f"Photographs must be smaller than {settings.max_photo_file_mb} MB.")
    if not PHOTO_SIGNATURES[file.content_type](data):
        raise HTTPException(status_code=422, detail="The uploaded file is not a valid photograph.")
    return add_photo(event, data=data, original_filename=file.filename or "photo", mime_type=file.content_type, caption=caption)


@router.patch("/{event_id}/photos/order", response_model=list[PhotoResponse])
async def reorder_event_photos(
    event_id: UUID,
    photo_ids: list[UUID],
    user_id: str = Depends(get_request_user_id),
) -> list[PhotoResponse]:
    event = _owned_event_or_404(event_id, user_id)
    try:
        return reorder_photos(event, photo_ids)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc


@router.delete("/{event_id}/photos/{photo_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_event_photo(
    event_id: UUID,
    photo_id: UUID,
    user_id: str = Depends(get_request_user_id),
) -> None:
    event = _owned_event_or_404(event_id, user_id)
    photo = get_photo(photo_id, event)
    if photo is None:
        raise HTTPException(status_code=404, detail="Photo not found.")
    delete_photo(photo, event)
