from datetime import datetime
from typing import Any, Literal
from uuid import UUID

from pydantic import BaseModel, Field


FormatSourceType = Literal["pdf", "docx", "text"]


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
    extracted: ExtractedFormatInput
    created_at: datetime
