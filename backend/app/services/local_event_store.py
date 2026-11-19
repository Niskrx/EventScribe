from dataclasses import dataclass, field
from datetime import date, time
from pathlib import Path
from typing import Any
from uuid import UUID, uuid4

from app.schemas.events import EventResponse, PhotoResponse
from app.services.supabase_rest import SupabaseRest, enabled

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
    if enabled():
        event_id = uuid4()
        values = {key: value.isoformat() if hasattr(value, "isoformat") else value for key, value in data.items()}
        row = SupabaseRest().insert("events", {"id": str(event_id), "user_id": user_id, **values})
        return event_response(_event_from_row(row))
    event = LocalEvent(id=uuid4(), user_id=user_id, **data)
    _events[event.id] = event
    return event_response(event)


def get_event(event_id: UUID, user_id: str) -> LocalEvent | None:
    if enabled():
        rows = SupabaseRest().select("events", filters={"id": str(event_id), "user_id": user_id})
        return _event_from_row(rows[0]) if rows else None
    event = _events.get(event_id)
    if event is None or event.user_id != user_id:
        return None
    return event


def update_event(event: LocalEvent, data: dict[str, Any]) -> EventResponse:
    if enabled():
        values = {key: value.isoformat() if hasattr(value, "isoformat") else value for key, value in data.items()}
        row = SupabaseRest().update("events", filters={"id": str(event.id), "user_id": event.user_id}, values=values)
        return event_response(_event_from_row(row))
    for key, value in data.items():
        setattr(event, key, value)
    return event_response(event)


def delete_event(event: LocalEvent) -> None:
    if enabled():
        SupabaseRest().delete("events", filters={"id": str(event.id), "user_id": event.user_id})
        return
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
    if enabled():
        photo_id = uuid4()
        relative_path = Path(event.user_id) / "events" / str(event.id) / "photos" / f"{photo_id}-{Path(original_filename).name}"
        storage_path = str(relative_path)
        client = SupabaseRest()
        client.upload(storage_path, data, mime_type)
        row = client.insert(
            "event_photos",
            {
                "id": str(photo_id),
                "event_id": str(event.id),
                "user_id": event.user_id,
                "storage_path": storage_path,
                "original_filename": Path(original_filename).name,
                "mime_type": mime_type,
                "size_bytes": len(data),
                "sort_order": len(event.photos),
                "caption": caption.strip() if caption else None,
            },
        )
        return photo_response(_photo_from_row(row))
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
    if enabled():
        rows = SupabaseRest().select(
            "event_photos", filters={"id": str(photo_id), "event_id": str(event.id), "user_id": event.user_id}
        )
        if not rows:
            return None
        photo = _photo_from_row(rows[0])
        local_path = LOCAL_STORAGE_ROOT / photo.storage_path
        if not local_path.exists():
            local_path.parent.mkdir(parents=True, exist_ok=True)
            local_path.write_bytes(SupabaseRest().download(photo.storage_path))
        return photo
    photo = _photos.get(photo_id)
    if photo is None or photo.event_id != event.id or photo.user_id != event.user_id:
        return None
    return photo


def list_event_photos(event: LocalEvent) -> list[LocalPhoto]:
    if enabled():
        rows = SupabaseRest().select("event_photos", filters={"event_id": str(event.id), "user_id": event.user_id}, order="sort_order.asc")
        photos = [_photo_from_row(row) for row in rows]
        client = SupabaseRest()
        for photo in photos:
            local_path = LOCAL_STORAGE_ROOT / photo.storage_path
            if not local_path.exists():
                local_path.parent.mkdir(parents=True, exist_ok=True)
                local_path.write_bytes(client.download(photo.storage_path))
        event.photos = [photo.id for photo in photos]
        return photos
    return [_photos[photo_id] for photo_id in event.photos if photo_id in _photos]


def reorder_photos(event: LocalEvent, ordered_photo_ids: list[UUID]) -> list[PhotoResponse]:
    if enabled():
        current = list_event_photos(event)
        if {photo.id for photo in current} != set(ordered_photo_ids) or len(ordered_photo_ids) != len(current):
            raise ValueError("The photo order must include every photo exactly once.")
        client = SupabaseRest()
        for index, photo_id in enumerate(ordered_photo_ids):
            client.update("event_photos", filters={"id": str(photo_id), "event_id": str(event.id), "user_id": event.user_id}, values={"sort_order": index})
        return [photo_response(next(photo for photo in current if photo.id == photo_id)) for photo_id in ordered_photo_ids]
    if set(ordered_photo_ids) != set(event.photos) or len(ordered_photo_ids) != len(event.photos):
        raise ValueError("The photo order must include every photo exactly once.")
    event.photos = ordered_photo_ids
    for index, photo_id in enumerate(event.photos):
        _photos[photo_id].sort_order = index
    return [photo_response(_photos[photo_id]) for photo_id in event.photos]


def delete_photo(photo: LocalPhoto, event: LocalEvent) -> None:
    if enabled():
        client = SupabaseRest()
        client.delete("event_photos", filters={"id": str(photo.id), "event_id": str(event.id), "user_id": event.user_id})
        client.remove_object(photo.storage_path)
        return
    (LOCAL_STORAGE_ROOT / photo.storage_path).unlink(missing_ok=True)
    _photos.pop(photo.id, None)
    event.photos = [photo_id for photo_id in event.photos if photo_id != photo.id]
    for index, photo_id in enumerate(event.photos):
        _photos[photo_id].sort_order = index


def _event_from_row(row: dict[str, Any]) -> LocalEvent:
    return LocalEvent(
        id=UUID(str(row["id"])),
        user_id=row["user_id"],
        title=row["title"],
        event_date=date.fromisoformat(row["event_date"]),
        start_time=time.fromisoformat(row["start_time"]) if row.get("start_time") else None,
        end_time=time.fromisoformat(row["end_time"]) if row.get("end_time") else None,
        department=row["department"],
        venue=row["venue"],
        coordinator=row["coordinator"],
        guest=row.get("guest"),
        participants=row.get("participants"),
        objectives=row["objectives"],
        activities=row["activities"],
        outcomes=row["outcomes"],
        additional_facts=row.get("additional_facts"),
        format_profile_id=UUID(str(row["format_profile_id"])) if row.get("format_profile_id") else None,
        status=row.get("status", "draft"),
    )


def _photo_from_row(row: dict[str, Any]) -> LocalPhoto:
    return LocalPhoto(
        id=UUID(str(row["id"])),
        event_id=UUID(str(row["event_id"])),
        user_id=row["user_id"],
        storage_path=row["storage_path"],
        original_filename=row["original_filename"],
        mime_type=row["mime_type"],
        size_bytes=row["size_bytes"],
        sort_order=row["sort_order"],
        caption=row.get("caption"),
    )
