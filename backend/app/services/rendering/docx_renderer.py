import logging
from io import BytesIO
from pathlib import Path
from typing import Iterable

from docx import Document
from docx.enum.table import WD_CELL_VERTICAL_ALIGNMENT
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.image.exceptions import UnrecognizedImageError
from docx.shared import Cm, Inches, Mm, Pt
from PIL import Image, ImageOps

from app.schemas.format_spec import FormatSpecification
from app.schemas.reports import ReportBlock, ReportContent
from app.services.local_event_store import LocalPhoto

logger = logging.getLogger(__name__)


def _alignment(value: str) -> int:
    return {
        "left": WD_ALIGN_PARAGRAPH.LEFT,
        "center": WD_ALIGN_PARAGRAPH.CENTER,
        "right": WD_ALIGN_PARAGRAPH.RIGHT,
        "justify": WD_ALIGN_PARAGRAPH.JUSTIFY,
    }[value]


def _configure_document(document: Document, specification: FormatSpecification) -> None:
    section = document.sections[0]
    margins = specification.style.margins
    section.top_margin = Cm(margins.top_cm)
    section.right_margin = Cm(margins.right_cm)
    section.bottom_margin = Cm(margins.bottom_cm)
    section.left_margin = Cm(margins.left_cm)
    section.page_width = Mm(specification.style.page_width_mm)
    section.page_height = Mm(specification.style.page_height_mm)

    normal = document.styles["Normal"]
    normal.font.name = specification.style.font_family
    normal.font.size = Pt(specification.style.body_font_size_pt)
    normal.paragraph_format.line_spacing = specification.style.line_spacing
    normal.paragraph_format.alignment = _alignment(specification.style.body_alignment)


def _add_block(document: Document, block: ReportBlock, specification: FormatSpecification) -> None:
    if block.kind == "table":
        if not block.rows:
            return
        column_count = max(len(row) for row in block.rows)
        table = document.add_table(rows=len(block.rows), cols=column_count)
        table.style = "Table Grid"
        for row_index, row in enumerate(block.rows):
            for column_index, value in enumerate(row):
                table.cell(row_index, column_index).text = value
        return
    if block.kind == "paragraph":
        paragraph = document.add_paragraph(block.text)
        paragraph.alignment = _alignment(specification.style.body_alignment)
        return

    for item in block.items or ([block.text] if block.text else []):
        paragraph = document.add_paragraph(style="List Bullet" if block.kind == "bullet" else "List Number")
        paragraph.add_run(item)


def _add_photo_grid(document: Document, photos: Iterable[LocalPhoto], columns: int, root: Path, captions: bool) -> None:
    photos = list(photos)
    if not photos:
        return
    table = document.add_table(rows=(len(photos) + columns - 1) // columns, cols=columns)
    table.autofit = True
    for index, photo in enumerate(photos):
        cell = table.cell(index // columns, index % columns)
        cell.vertical_alignment = WD_CELL_VERTICAL_ALIGNMENT.CENTER
        image_path = root / photo.storage_path
        if image_path.exists():
            try:
                paragraph = cell.paragraphs[0]
                paragraph.alignment = WD_ALIGN_PARAGRAPH.CENTER
                image_source: str | BytesIO = str(image_path)
                # python-docx does not understand WebP even though the upload API
                # accepts it. Normalize WebP to PNG before inserting it into DOCX.
                if photo.mime_type == "image/webp" or image_path.suffix.lower() == ".webp":
                    with Image.open(image_path) as image:
                        normalized = ImageOps.exif_transpose(image)
                        if normalized.mode not in {"RGB", "RGBA"}:
                            normalized = normalized.convert("RGBA" if "A" in normalized.getbands() else "RGB")
                        image_source = BytesIO()
                        normalized.save(image_source, format="PNG")
                        image_source.seek(0)
                paragraph.add_run().add_picture(image_source, width=Inches(2.6))
            except (OSError, UnrecognizedImageError, ValueError) as exc:
                # A corrupt or partially uploaded photo must not make the whole
                # academic report unusable. The text report still renders and the
                # missing image is visible to the reviewer in the source event.
                logger.warning("Skipping photo %s during DOCX rendering: %s", photo.original_filename, exc)
        if captions and photo.caption:
            caption = cell.add_paragraph(photo.caption)
            caption.alignment = WD_ALIGN_PARAGRAPH.CENTER


def render_docx(
    content: ReportContent,
    specification: FormatSpecification,
    photos: Iterable[LocalPhoto],
    storage_root: Path,
) -> bytes:
    document = Document()
    _configure_document(document, specification)

    title = document.add_paragraph()
    title.alignment = WD_ALIGN_PARAGRAPH.CENTER
    title_run = title.add_run(content.title)
    title_run.bold = True
    title_run.font.size = Pt(max(specification.style.body_font_size_pt + 6, 18))

    for section in content.sections:
        heading = document.add_heading(section.title, level=1)
        heading.alignment = _alignment(specification.style.heading_alignment)
        for block in section.blocks:
            _add_block(document, block, specification)

    photo_list = list(photos)
    if photo_list:
        document.add_page_break()
        gallery_heading = document.add_heading("Photographs", level=1)
        gallery_heading.alignment = _alignment(specification.style.heading_alignment)
        columns = specification.images.columns if specification.images.mode == "grid" else 1
        _add_photo_grid(document, photo_list, columns, storage_root, specification.images.captions)

    from io import BytesIO

    buffer = BytesIO()
    document.save(buffer)
    return buffer.getvalue()
