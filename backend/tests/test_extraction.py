from io import BytesIO

import fitz
from docx import Document
from fastapi.testclient import TestClient

from app.main import app
from app.services.extraction.service import extract_docx, extract_pdf, extract_text_description


client = TestClient(app)


def test_text_description_is_normalized() -> None:
    extracted = extract_text_description("  Use a title page and numbered sections.  ")

    assert extracted.source_type == "text"
    assert extracted.text == "Use a title page and numbered sections."
    assert extracted.paragraphs == ["Use a title page and numbered sections."]


def test_pdf_text_is_extracted() -> None:
    document = fitz.open()
    page = document.new_page()
    page.insert_text((72, 72), "Academic Event Report")
    data = document.tobytes()
    document.close()

    extracted = extract_pdf(data, "reference.pdf")

    assert extracted.source_type == "pdf"
    assert extracted.page_count == 1
    assert "Academic Event Report" in extracted.text


def test_docx_headings_and_tables_are_extracted() -> None:
    document = Document()
    document.add_heading("Event Report", level=1)
    document.add_paragraph("The report body.")
    document.add_table(rows=1, cols=2)
    buffer = BytesIO()
    document.save(buffer)

    extracted = extract_docx(buffer.getvalue(), "reference.docx")

    assert extracted.source_type == "docx"
    assert extracted.headings == ["Event Report"]
    assert extracted.table_count == 1


def test_text_format_endpoint_uses_local_development_user() -> None:
    response = client.post(
        "/api/formats/text",
        json={"name": "Academic format", "description": "Use a title page and a conclusion."},
    )

    assert response.status_code == 201
    payload = response.json()
    assert payload["user_id"] == "local-dev-user"
    assert payload["source_type"] == "text"
    assert payload["analysis_status"] == "pending"


def test_file_format_endpoint_rejects_unsupported_file_type() -> None:
    response = client.post(
        "/api/formats/file",
        data={"name": "Unsupported"},
        files={"file": ("notes.txt", b"not a supported reference", "text/plain")},
    )

    assert response.status_code == 415
    assert response.json()["error"]["code"] == "HTTP_ERROR"
