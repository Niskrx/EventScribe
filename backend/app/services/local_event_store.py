from dataclasses import dataclass, field
from datetime import date, time
from pathlib import Path
from typing import Any
from uuid import UUID, uuid4

from app.schemas.events import EventResponse, PhotoResponse


LOCAL_STORAGE_ROOT = Path(__file__).resolve().parents[2] / ".local_storage"


@dataclass
class LocalEvent:
    id: UUID
    user_id: str
    title: str
    event_date: date
    start_time: time | None
    end_time: time | None
    department: str
    venue: str
    coordinator: str
    guest: str | None
    participants: dict[str, Any] | None
    objectives: str
    activities: str
    outcomes: str
    additional_facts: str | None
    format_profile_id: UUID | None
    status: str = "draft"
    photos: list[UUID] = field(default_factory=list)


@dataclass
class LocalPhoto:
    id: UUID
    event_id: UUID
    user_id: str
    storage_path: str
    original_filename: str
    mime_type: str
    size_bytes: int
    sort_order: int
    caption: str | None


_events: dict[UUID, LocalEvent] = {}
_photos: dict[UUID, LocalPhoto] = {}


def event_response(event: LocalEvent) -> EventResponse:
    return EventResponse(
        id=event.id,
        user_id=event.user_id,
        title=event.title,
        event_date=event.event_date,
        start_time=event.start_time,
        end_time=event.end_time,
        department=event.department,
        venue=event.venue,
        coordinator=event.coordinator,
        guest=event.guest,
        participants=event.participants,
        objectives=event.objectives,
        activities=event.activities,
        outcomes=event.outcomes,
        additional_facts=event.additional_facts,
        format_profile_id=event.format_profile_id,
        status=event.status,
    )


def photo_response(photo: LocalPhoto) -> PhotoResponse:
    return PhotoResponse(
        id=photo.id,
        event_id=photo.event_id,
        user_id=photo.user_id,
        storage_path=photo.storage_path,
        original_filename=photo.original_filename,
        mime_type=photo.mime_type,
        size_bytes=photo.size_bytes,
        sort_order=photo.sort_order,
        caption=photo.caption,
    )


def create_event(user_id: str, data: dict[str, Any]) -> EventResponse:
    event = LocalEvent(id=uuid4(), user_id=user_id, **data)
    _events[event.id] = event
    return event_response(event)


def get_event(event_id: UUID, user_id: str) -> LocalEvent | None:
    event = _events.get(event_id)
    if event is None or event.user_id != user_id:
        return None
    return event


def update_event(event: LocalEvent, data: dict[str, Any]) -> EventResponse:
    for key, value in data.items():
        setattr(event, key, value)
    return event_response(event)


def delete_event(event: LocalEvent) -> None:
    for photo_id in event.photos:
        photo = _photos.pop(photo_id, None)
        if photo:
            (LOCAL_STORAGE_ROOT / photo.storage_path).unlink(missing_ok=True)
    _events.pop(event.id, None)


def add_photo(
    event: LocalEvent,
    *,
    data: bytes,
    original_filename: str,
    mime_type: str,
    caption: str | None,
) -> PhotoResponse:
    photo_id = uuid4()
    relative_path = Path(event.user_id) / "events" / str(event.id) / "photos" / f"{photo_id}-{Path(original_filename).name}"
    absolute_path = LOCAL_STORAGE_ROOT / relative_path
    absolute_path.parent.mkdir(parents=True, exist_ok=True)
    absolute_path.write_bytes(data)
    photo = LocalPhoto(
        id=photo_id,
        event_id=event.id,
        user_id=event.user_id,
        storage_path=str(relative_path),
        original_filename=Path(original_filename).name,
        mime_type=mime_type,
        size_bytes=len(data),
        sort_order=len(event.photos),
        caption=caption.strip() if caption else None,
    )
    _photos[photo.id] = photo
    event.photos.append(photo.id)
    return photo_response(photo)


def get_photo(photo_id: UUID, event: LocalEvent) -> LocalPhoto | None:
    photo = _photos.get(photo_id)
    if photo is None or photo.event_id != event.id or photo.user_id != event.user_id:
        return None
    return photo


def list_event_photos(event: LocalEvent) -> list[LocalPhoto]:
    return [_photos[photo_id] for photo_id in event.photos if photo_id in _photos]


def reorder_photos(event: LocalEvent, ordered_photo_ids: list[UUID]) -> list[PhotoResponse]:
    if set(ordered_photo_ids) != set(event.photos) or len(ordered_photo_ids) != len(event.photos):
        raise ValueError("The photo order must include every photo exactly once.")
    event.photos = ordered_photo_ids
    for index, photo_id in enumerate(event.photos):
        _photos[photo_id].sort_order = index
    return [photo_response(_photos[photo_id]) for photo_id in event.photos]


def delete_photo(photo: LocalPhoto, event: LocalEvent) -> None:
    (LOCAL_STORAGE_ROOT / photo.storage_path).unlink(missing_ok=True)
    _photos.pop(photo.id, None)
    event.photos = [photo_id for photo_id in event.photos if photo_id != photo.id]
    for index, photo_id in enumerate(event.photos):
        _photos[photo_id].sort_order = index
