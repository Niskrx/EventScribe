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

Run the complete backend verification with:

```bash
python -m compileall -q app tests && pytest
```

Run linting with:

```bash
ruff check app tests
```

Runtime dependencies and test dependencies are pinned in `requirements.txt`. Keep the virtual environment local and do not commit it.

The backend owns all provider secrets and must validate every AI response before using it.

For production, use `Dockerfile` so LibreOffice is available for PDF conversion. See the repository-level `docs/DEPLOYMENT.md` before configuring a host.
