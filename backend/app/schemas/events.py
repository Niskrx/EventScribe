from datetime import date, time
from typing import Any, Literal
from uuid import UUID

from pydantic import BaseModel, Field


class EventCreateRequest(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    event_date: date
    start_time: time | None = None
    end_time: time | None = None
    department: str = Field(min_length=1, max_length=160)
    venue: str = Field(min_length=1, max_length=240)
    coordinator: str = Field(min_length=1, max_length=160)
    guest: str | None = Field(default=None, max_length=200)
    participants: dict[str, Any] | None = None
    objectives: str = Field(min_length=1, max_length=10_000)
    activities: str = Field(min_length=1, max_length=20_000)
    outcomes: str = Field(min_length=1, max_length=10_000)
    additional_facts: str | None = Field(default=None, max_length=20_000)
    format_profile_id: UUID | None = None


class EventUpdateRequest(EventCreateRequest):
    pass


class EventResponse(EventCreateRequest):
    id: UUID
    user_id: str
    status: Literal["draft", "ready"] = "draft"


class PhotoResponse(BaseModel):
    id: UUID
    event_id: UUID
    user_id: str
    storage_path: str
    original_filename: str
    mime_type: str
    size_bytes: int
    sort_order: int
    caption: str | None = None
