import json
from typing import Any

import httpx

from app.config import get_settings


class SupabaseRestError(RuntimeError):
    pass


def enabled() -> bool:
    settings = get_settings()
    return settings.environment.lower() not in {"development", "test"} and bool(
        settings.supabase_url and settings.supabase_service_role_key
    )


class SupabaseRest:
    def __init__(self) -> None:
        settings = get_settings()
        if not settings.supabase_url or not settings.supabase_service_role_key:
            raise SupabaseRestError("Supabase persistence is not configured.")
        self.base_url = settings.supabase_url.rstrip("/")
        self.headers = {
            "apikey": settings.supabase_service_role_key,
            "Authorization": f"Bearer {settings.supabase_service_role_key}",
            "Content-Type": "application/json",
        }

    def _request(self, method: str, url: str, **kwargs: Any) -> httpx.Response:
        request_headers = {**self.headers, **kwargs.pop("headers", {})}
        try:
            response = httpx.request(method, url, headers=request_headers, timeout=20, **kwargs)
        except httpx.HTTPError as exc:
            raise SupabaseRestError("Supabase could not be reached.") from exc
        if response.status_code >= 400:
            raise SupabaseRestError(f"Supabase request failed with status {response.status_code}.")
        return response

    def select(self, table: str, *, filters: dict[str, str], order: str | None = None) -> list[dict[str, Any]]:
        params: list[tuple[str, str]] = [(key, f"eq.{value}") for key, value in filters.items()]
        params.append(("select", "*"))
        if order:
            params.append(("order", order))
        response = self._request("GET", f"{self.base_url}/rest/v1/{table}", params=params)
        return response.json()

    def insert(self, table: str, values: dict[str, Any]) -> dict[str, Any]:
        response = self._request(
            "POST",
            f"{self.base_url}/rest/v1/{table}",
            headers={**self.headers, "Prefer": "return=representation"},
            json=values,
        )
        rows = response.json()
        if not rows:
            raise SupabaseRestError("Supabase did not return the inserted row.")
        return rows[0]

    def update(self, table: str, *, filters: dict[str, str], values: dict[str, Any]) -> dict[str, Any]:
        params = [(key, f"eq.{value}") for key, value in filters.items()]
        response = self._request(
            "PATCH",
            f"{self.base_url}/rest/v1/{table}",
            params=params,
            headers={**self.headers, "Prefer": "return=representation"},
            json=values,
        )
        rows = response.json()
        if not rows:
            raise SupabaseRestError("Supabase row was not found.")
        return rows[0]

    def delete(self, table: str, *, filters: dict[str, str]) -> None:
        params = [(key, f"eq.{value}") for key, value in filters.items()]
        self._request("DELETE", f"{self.base_url}/rest/v1/{table}", params=params)

    def upload(self, path: str, data: bytes, mime_type: str) -> None:
        self._request(
            "POST",
            f"{self.base_url}/storage/v1/object/eventscribe-files/{path}",
            headers={**self.headers, "Content-Type": mime_type, "x-upsert": "true"},
            content=data,
        )

    def download(self, path: str) -> bytes:
        response = self._request("GET", f"{self.base_url}/storage/v1/object/eventscribe-files/{path}")
        return response.content

    def remove_object(self, path: str) -> None:
        self._request("DELETE", f"{self.base_url}/storage/v1/object/eventscribe-files", json={"prefixes": [path]})


def encode_json(value: Any) -> str:
    return json.dumps(value, ensure_ascii=False, default=str)
