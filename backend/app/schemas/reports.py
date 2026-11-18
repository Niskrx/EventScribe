from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field


class ReportBlock(BaseModel):
    kind: Literal["paragraph", "bullet", "numbered"] = "paragraph"
    text: str = ""
    items: list[str] = Field(default_factory=list, max_length=50)


class ReportSection(BaseModel):
    key: str = Field(min_length=1, max_length=80)
    title: str = Field(min_length=1, max_length=160)
    blocks: list[ReportBlock] = Field(min_length=1, max_length=50)
    needs_review: bool = False
    review_notes: list[str] = Field(default_factory=list, max_length=20)


class ReportContent(BaseModel):
    schema_version: Literal["1.0"] = "1.0"
    title: str = Field(min_length=1, max_length=240)
    sections: list[ReportSection] = Field(min_length=1, max_length=50)
    missing_facts: list[str] = Field(default_factory=list, max_length=50)


class ReportResponse(BaseModel):
    id: UUID
    event_id: UUID
    user_id: str
    content_json: ReportContent | None = None
    content_version: int = 1
    status: Literal["draft", "generating", "ready", "failed"] = "draft"
    generation_model: str | None = None
    prompt_version: str | None = None
    last_error: str | None = None
    docx_storage_path: str | None = None
    pdf_storage_path: str | None = None
    created_at: datetime
