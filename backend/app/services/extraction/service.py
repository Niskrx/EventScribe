from io import BytesIO
from pathlib import PurePosixPath

import fitz
from docx import Document

from app.schemas.formats import ExtractedFormatInput, FormatSourceType


SUPPORTED_TYPES: dict[str, FormatSourceType] = {
    "application/pdf": "pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
}
SUPPORTED_EXTENSIONS: dict[str, FormatSourceType] = {".pdf": "pdf", ".docx": "docx"}


def source_type_for_upload(filename: str, content_type: str | None) -> FormatSourceType:
    extension = PurePosixPath(filename).suffix.lower()
    source_type = SUPPORTED_TYPES.get(content_type or "") or SUPPORTED_EXTENSIONS.get(extension)
    if source_type is None:
        raise ValueError("Only PDF and DOCX reference files are supported.")
    return source_type


def extract_text_description(description: str) -> ExtractedFormatInput:
    clean_description = description.strip()
    if not clean_description:
        raise ValueError("The format description cannot be empty.")
    return ExtractedFormatInput(
        source_type="text",
        text=clean_description,
        paragraphs=[clean_description],
    )


def extract_pdf(data: bytes, filename: str | None = None) -> ExtractedFormatInput:
    with fitz.open(stream=data, filetype="pdf") as document:
        pages = [page.get_text("text").strip() for page in document]
        text = "\n\n".join(page for page in pages if page)
        return ExtractedFormatInput(
            source_type="pdf",
            source_filename=filename,
            text=text,
            page_count=document.page_count,
            paragraphs=[paragraph.strip() for paragraph in text.split("\n\n") if paragraph.strip()],
            metadata=document.metadata or {},
        )


def extract_docx(data: bytes, filename: str | None = None) -> ExtractedFormatInput:
    document = Document(BytesIO(data))
    paragraphs = [paragraph.text.strip() for paragraph in document.paragraphs if paragraph.text.strip()]
    headings = [
        paragraph.text.strip()
        for paragraph in document.paragraphs
        if paragraph.text.strip() and paragraph.style.name.lower().startswith("heading")
    ]
    return ExtractedFormatInput(
        source_type="docx",
        source_filename=filename,
        text="\n\n".join(paragraphs),
        headings=headings,
        paragraphs=paragraphs,
        table_count=len(document.tables),
        metadata={"paragraph_count": len(paragraphs)},
    )


def extract_reference(data: bytes, source_type: FormatSourceType, filename: str | None = None) -> ExtractedFormatInput:
    if not data:
        raise ValueError("The reference file cannot be empty.")
    if source_type == "pdf":
        return extract_pdf(data, filename)
    if source_type == "docx":
        return extract_docx(data, filename)
    raise ValueError("Text references must use the text format endpoint.")
