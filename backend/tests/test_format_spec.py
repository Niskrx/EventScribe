import json

import httpx
import pytest
from fastapi.testclient import TestClient

from app.config import Settings
from app.main import app
from app.schemas.format_spec import FormatSpecification
from app.schemas.formats import ExtractedFormatInput
from app.services.ai.gemini import GeminiAdapter, GeminiError

client = TestClient(app)


def sample_specification() -> dict:
    return {
        "schema_version": "1.0",
        "source_type": "text",
        "document_title_rule": "Use the event title.",
        "sections": [
            {"key": "introduction", "title": "Introduction", "order": 1, "required": True, "content_type": "paragraphs", "heading_level": 1},
            {"key": "outcomes", "title": "Outcomes", "order": 2, "required": True, "content_type": "paragraphs", "heading_level": 1},
        ],
        "style": {},
        "images": {},
        "tables": [],
        "uncertainties": [],
    }


def test_format_specification_orders_sections() -> None:
    specification = FormatSpecification.model_validate(sample_specification())

    assert [section.key for section in specification.ordered_sections()] == ["introduction", "outcomes"]


def test_gemini_adapter_is_safe_when_not_configured() -> None:
    adapter = GeminiAdapter(Settings())
    extracted = ExtractedFormatInput(source_type="text", text="Use a title page.")

    with pytest.raises(GeminiError, match="not configured"):
        import asyncio

        asyncio.run(adapter.analyze_format(extracted))


def test_gemini_adapter_validates_structured_response() -> None:
    response_body = {"candidates": [{"content": {"parts": [{"text": json.dumps(sample_specification())}]}}]}

    async def handler(request: httpx.Request) -> httpx.Response:
        assert request.url.path.endswith(":generateContent")
        assert request.headers["x-goog-api-key"] == "test-key"
        return httpx.Response(200, json=response_body)

    async def run() -> FormatSpecification:
        async with httpx.AsyncClient(transport=httpx.MockTransport(handler)) as http_client:
            adapter = GeminiAdapter(Settings(gemini_api_key="test-key", gemini_model="test-model"), http_client)
            return await adapter.analyze_format(ExtractedFormatInput(source_type="text", text="Use a title page."))

    import asyncio

    result = asyncio.run(run())
    assert result.source_type == "text"
    assert result.sections[0].key == "introduction"


def test_analyze_endpoint_reports_missing_ai_configuration() -> None:
    create_response = client.post(
        "/api/formats/text",
        json={"name": "Needs analysis", "description": "Use a title page."},
    )
    profile_id = create_response.json()["id"]

    response = client.post(f"/api/formats/{profile_id}/analyze")

    assert response.status_code == 503
    assert response.json()["error"]["code"] == "HTTP_ERROR"
