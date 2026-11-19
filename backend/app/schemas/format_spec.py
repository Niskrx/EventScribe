from typing import Literal

from pydantic import BaseModel, Field

from app.schemas.common import FormatSourceType


class PageMargins(BaseModel):
    top_cm: float = Field(default=2.54, ge=0)
    right_cm: float = Field(default=2.54, ge=0)
    bottom_cm: float = Field(default=2.54, ge=0)
    left_cm: float = Field(default=2.54, ge=0)


class StyleSpecification(BaseModel):
    font_family: str = "Times New Roman"
    body_font_size_pt: float = Field(default=12, gt=0, le=96)
    heading_alignment: Literal["left", "center", "right", "justify"] = "left"
    body_alignment: Literal["left", "center", "right", "justify"] = "justify"
    line_spacing: float = Field(default=1.15, gt=0, le=4)
    margins: PageMargins = Field(default_factory=PageMargins)
    page_width_mm: float = Field(default=210, gt=50, le=1000)
    page_height_mm: float = Field(default=297, gt=50, le=1500)


class SectionSpecification(BaseModel):
    key: str = Field(min_length=1, max_length=80, pattern=r"^[a-z0-9_]+$")
    title: str = Field(min_length=1, max_length=160)
    order: int = Field(ge=1)
    required: bool = True
    content_type: Literal["paragraphs", "bullets", "numbered_list", "table"] = "paragraphs"
    heading_level: int = Field(default=1, ge=1, le=6)


class ImageSpecification(BaseModel):
    mode: Literal["grid", "single", "inline", "appendix"] = "grid"
    columns: int = Field(default=2, ge=1, le=4)
    captions: bool = False


class TableSpecification(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    columns: list[str] = Field(default_factory=list, max_length=20)


class FormatSpecification(BaseModel):
    schema_version: Literal["1.0"] = "1.0"
    source_type: FormatSourceType
    document_title_rule: str = "Use the event title as the document title."
    sections: list[SectionSpecification] = Field(min_length=1, max_length=50)
    style: StyleSpecification = Field(default_factory=StyleSpecification)
    images: ImageSpecification = Field(default_factory=ImageSpecification)
    tables: list[TableSpecification] = Field(default_factory=list, max_length=20)
    uncertainties: list[str] = Field(default_factory=list, max_length=50)

    def ordered_sections(self) -> list[SectionSpecification]:
        return sorted(self.sections, key=lambda section: section.order)
