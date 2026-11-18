# EventScribe Backend

The FastAPI backend contains the server-side foundation for authentication checks, format extraction, Gemini integration, structured-output validation, event/photo APIs, deterministic DOCX rendering, LibreOffice PDF conversion, storage operations, and report history APIs.

## Run locally

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

Open `http://localhost:8000/api/health` to check the service.

Run tests with:

```bash
pytest
```

The backend owns all provider secrets and must validate every AI response before using it.
