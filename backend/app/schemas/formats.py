from datetime import datetime
from typing import Any, Literal
from uuid import UUID

from pydantic import BaseModel, Field

from app.schemas.common import FormatSourceType
from app.schemas.format_spec import FormatSpecification


class TextFormatRequest(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    description: str = Field(min_length=1, max_length=20_000)


class ExtractedFormatInput(BaseModel):
    source_type: FormatSourceType
    source_filename: str | None = None
    text: str = ""
    page_count: int | None = Field(default=None, ge=1)
    headings: list[str] = Field(default_factory=list)
    paragraphs: list[str] = Field(default_factory=list)
    table_count: int = Field(default=0, ge=0)
    metadata: dict[str, Any] = Field(default_factory=dict)


class FormatProfileResponse(BaseModel):
    id: UUID
    user_id: str
    name: str
    source_type: FormatSourceType
    source_storage_path: str | None = None
    analysis_status: Literal["pending", "ready", "failed"] = "pending"
    format_spec: FormatSpecification | None = None
    analysis_error: str | None = None
    extracted: ExtractedFormatInput
    created_at: datetime
