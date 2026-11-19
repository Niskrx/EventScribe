import asyncio
import json

import httpx
from fastapi.testclient import TestClient

from app.config import Settings, get_settings
from app.main import app
from app.schemas.format_spec import FormatSpecification
from app.services.ai.gemini import GeminiAdapter
from app.services.local_format_store import mark_local_profile_analysis

client = TestClient(app)

EVENT_PAYLOAD = {
    "title": "Research Seminar",
    "event_date": "2026-11-18",
    "department": "Computer Science",
    "venue": "Seminar Hall",
    "coordinator": "Akshansh",
    "objectives": "Discuss responsible AI research.",
    "activities": "Talk and question-and-answer session.",
    "outcomes": "Participants reviewed responsible research practices.",
}

SPECIFICATION = FormatSpecification.model_validate(
    {
        "source_type": "text",
        "sections": [
            {"key": "introduction", "title": "Introduction", "order": 1},
            {"key": "outcomes", "title": "Outcomes", "order": 2},
        ],
    }
)


def sample_content() -> dict:
    return {
        "schema_version": "1.0",
        "title": "Research Seminar",
        "sections": [
            {"key": "introduction", "title": "Introduction", "blocks": [{"kind": "paragraph", "text": "The seminar discussed responsible AI research."}]},
            {"key": "outcomes", "title": "Outcomes", "blocks": [{"kind": "paragraph", "text": "Participants reviewed responsible research practices."}]},
        ],
        "missing_facts": [],
    }


def test_report_adapter_returns_validated_content() -> None:
    response_body = {"candidates": [{"content": {"parts": [{"text": json.dumps(sample_content())}]}}]}

    async def handler(request: httpx.Request) -> httpx.Response:
        assert request.url.path.endswith(":generateContent")
        return httpx.Response(200, json=response_body)

    async def run():
        async with httpx.AsyncClient(transport=httpx.MockTransport(handler)) as http_client:
            adapter = GeminiAdapter(Settings(gemini_api_key="test-key", gemini_model="test-model"), http_client)
            return await adapter.generate_report_content(
                {"title": "Research Seminar"},
                SPECIFICATION,
            )

    content = asyncio.run(run())
    assert content.title == "Research Seminar"
    assert [section.key for section in content.sections] == ["introduction", "outcomes"]


def test_report_adapter_restores_reference_order_and_titles() -> None:
    reversed_content = sample_content()
    reversed_content["sections"] = list(reversed(reversed_content["sections"]))
    reversed_content["sections"][0]["title"] = "Different model title"
    response_body = {"candidates": [{"content": {"parts": [{"text": json.dumps(reversed_content)}]}}]}

    async def handler(_request: httpx.Request) -> httpx.Response:
        return httpx.Response(200, json=response_body)

    async def run():
        async with httpx.AsyncClient(transport=httpx.MockTransport(handler)) as http_client:
            adapter = GeminiAdapter(Settings(gemini_api_key="test-key", gemini_model="test-model"), http_client)
            return await adapter.generate_report_content(EVENT_PAYLOAD, SPECIFICATION)

    content = asyncio.run(run())
    assert [(section.key, section.title) for section in content.sections] == [
        ("introduction", "Introduction"),
        ("outcomes", "Outcomes"),
    ]


def test_generation_requires_analyzed_format_and_reports_missing_ai_config(monkeypatch) -> None:
    monkeypatch.setitem(app.dependency_overrides, get_settings, lambda: Settings(gemini_api_key=None, gemini_model=None))
    profile_response = client.post(
        "/api/formats/text",
        json={"name": "Seminar format", "description": "Use introduction and outcomes sections."},
    )
    profile_id = profile_response.json()["id"]
    from uuid import UUID

    from app.services.local_format_store import get_local_profile_record

    profile = get_local_profile_record(UUID(profile_id), "local-dev-user")
    assert profile is not None
    mark_local_profile_analysis(profile, format_spec=SPECIFICATION)

    event_payload = {**EVENT_PAYLOAD, "format_profile_id": str(profile.id)}
    event_response = client.post("/api/events", json=event_payload)
    event_id = event_response.json()["id"]

    response = client.post(f"/api/events/{event_id}/generate")

    assert response.status_code == 503
    assert response.json()["error"]["code"] == "HTTP_ERROR"
    saved_report = client.get(f"/api/events/{event_id}/report")
    assert saved_report.status_code == 200
    assert saved_report.json()["status"] == "failed"
