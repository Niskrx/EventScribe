import json
from typing import Any

import httpx

from app.config import Settings
from app.schemas.format_spec import FormatSpecification
from app.schemas.formats import ExtractedFormatInput
from app.schemas.reports import ReportContent


class GeminiError(RuntimeError):
    def __init__(self, code: str, message: str, *, retryable: bool = False) -> None:
        super().__init__(message)
        self.code = code
        self.message = message
        self.retryable = retryable


def build_format_analysis_prompt(extracted: ExtractedFormatInput) -> str:
    source = {
        "source_type": extracted.source_type,
        "filename": extracted.source_filename,
        "page_count": extracted.page_count,
        "headings": extracted.headings,
        "paragraphs": extracted.paragraphs[:80],
        "table_count": extracted.table_count,
        "metadata": extracted.metadata,
        "text": extracted.text[:30_000],
    }
    return (
        "Analyze this academic report format and return only JSON matching the supplied schema. "
        "Infer common academic layout rules from the evidence. Do not invent details that are not "
        "observable; put uncertain observations in uncertainties. Keep sections in document order. "
        "The output will be used as data by a deterministic document renderer.\n\n"
        f"Extracted reference:\n{json.dumps(source, ensure_ascii=False)}"
    )


class GeminiAdapter:
    def __init__(self, settings: Settings, client: httpx.AsyncClient | None = None) -> None:
        self.settings = settings
        self.client = client

    async def analyze_format(self, extracted: ExtractedFormatInput) -> FormatSpecification:
        prompt = build_format_analysis_prompt(extracted)
        raw_json = await self.generate_json(prompt, FormatSpecification.model_json_schema())
        try:
            specification = FormatSpecification.model_validate_json(raw_json)
        except ValueError as exc:
            raise GeminiError("INVALID_MODEL_OUTPUT", "Gemini returned JSON that did not match the format schema.") from exc

        if specification.source_type != extracted.source_type:
            raise GeminiError("INVALID_MODEL_OUTPUT", "Gemini returned a mismatched source type.")
        return specification

    async def generate_report_content(self, event_facts: dict, specification: FormatSpecification) -> ReportContent:
        prompt = build_report_content_prompt(event_facts, specification)
        raw_json = await self.generate_json(prompt, ReportContent.model_json_schema())
        try:
            content = ReportContent.model_validate_json(raw_json)
        except ValueError as exc:
            raise GeminiError("INVALID_MODEL_OUTPUT", "Gemini returned JSON that did not match the report schema.") from exc

        expected_keys = {section.key for section in specification.sections}
        actual_keys = {section.key for section in content.sections}
        if expected_keys != actual_keys:
            raise GeminiError("INVALID_MODEL_OUTPUT", "Gemini returned report sections that do not match the approved format.")
        return content

    async def generate_json(self, prompt: str, schema: dict[str, Any]) -> str:
        if not self.settings.gemini_api_key or not self.settings.gemini_model:
            raise GeminiError("AI_NOT_CONFIGURED", "Gemini is not configured for this environment.")

        endpoint = (
            f"{self.settings.gemini_api_base_url.rstrip('/')}/models/"
            f"{self.settings.gemini_model}:generateContent"
        )
        payload = {
            "contents": [{"role": "user", "parts": [{"text": prompt}]}],
            "generationConfig": {
                "temperature": 0.1,
                "responseMimeType": "application/json",
                "responseJsonSchema": schema,
            },
        }
        headers = {"x-goog-api-key": self.settings.gemini_api_key}

        try:
            if self.client is None:
                async with httpx.AsyncClient(timeout=45) as client:
                    response = await client.post(endpoint, headers=headers, json=payload)
            else:
                response = await self.client.post(endpoint, headers=headers, json=payload)
        except httpx.HTTPError as exc:
            raise GeminiError("AI_UNAVAILABLE", "Gemini could not be reached.", retryable=True) from exc

        if response.status_code == 429:
            raise GeminiError("AI_QUOTA_EXCEEDED", "Gemini free-tier quota or rate limit was reached.", retryable=True)
        if response.status_code in {500, 502, 503, 504}:
            raise GeminiError("AI_UNAVAILABLE", "Gemini is temporarily unavailable.", retryable=True)
        if response.status_code >= 400:
            raise GeminiError("AI_REQUEST_FAILED", "Gemini rejected the format-analysis request.")

        try:
            payload = response.json()
            return payload["candidates"][0]["content"]["parts"][0]["text"]
        except (KeyError, IndexError, TypeError, ValueError) as exc:
            raise GeminiError("INVALID_MODEL_OUTPUT", "Gemini returned no usable structured output.") from exc


def build_report_content_prompt(event_facts: dict, specification: FormatSpecification) -> str:
    return (
        "Write a professional academic event report using only the verified event facts below. "
        "Do not invent names, dates, attendance numbers, quotes, activities, awards, outcomes, or "
        "other facts. If a requested detail is absent, leave it out and add a concise review note "
        "or include it in missing_facts. Return only JSON matching the report content schema. "
        "Use the exact section keys and titles from the approved format specification.\n\n"
        f"Verified event facts:\n{json.dumps(event_facts, ensure_ascii=False, default=str)}\n\n"
        f"Approved format specification:\n{specification.model_dump_json()}"
    )
