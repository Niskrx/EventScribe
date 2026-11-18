import shutil
import subprocess
from pathlib import Path


class PdfConversionError(RuntimeError):
    pass


def find_libreoffice() -> str | None:
    return shutil.which("soffice") or shutil.which("libreoffice")


def convert_docx_to_pdf(docx_path: Path, output_dir: Path) -> Path:
    binary = find_libreoffice()
    if binary is None:
        raise PdfConversionError("LibreOffice is not available on this server.")
    if not docx_path.exists():
        raise PdfConversionError("The DOCX file does not exist.")

    output_dir.mkdir(parents=True, exist_ok=True)
    result = subprocess.run(
        [binary, "--headless", "--convert-to", "pdf", "--outdir", str(output_dir), str(docx_path)],
        capture_output=True,
        text=True,
        timeout=120,
        check=False,
    )
    pdf_path = output_dir / f"{docx_path.stem}.pdf"
    if result.returncode != 0 or not pdf_path.exists():
        raise PdfConversionError("LibreOffice could not convert the DOCX file to PDF.")
    return pdf_path
