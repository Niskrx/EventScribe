import secrets
from dataclasses import dataclass
from uuid import uuid4

import httpx
from fastapi import Depends, Header, HTTPException, status

from app.config import Settings, get_settings


@dataclass(frozen=True)
class CurrentUser:
    id: str
    email: str | None = None


_guest_sessions: dict[str, str] = {}


def create_guest_session() -> str:
    token = secrets.token_urlsafe(32)
    _guest_sessions[token] = f"guest-{uuid4()}"
    return token


def get_guest_user_id(token: str | None) -> str | None:
    if not token:
        return None
    return _guest_sessions.get(token)


async def get_current_user(
    authorization: str | None = Header(default=None),
    settings: Settings = Depends(get_settings),
) -> CurrentUser:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication is required.")

    if not settings.supabase_url or not settings.supabase_anon_key:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Authentication is not configured.")

    token = authorization.split(" ", 1)[1].strip()
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication is required.")

    try:
        async with httpx.AsyncClient(timeout=5) as client:
            response = await client.get(
                f"{settings.supabase_url.rstrip('/')}/auth/v1/user",
                headers={"apikey": settings.supabase_anon_key, "Authorization": f"Bearer {token}"},
            )
    except httpx.HTTPError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Authentication service is unavailable.") from exc

    if response.status_code != 200:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid authentication token.")

    payload = response.json()
    user_id = payload.get("id")
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid authentication response.")

    return CurrentUser(id=user_id, email=payload.get("email"))


async def get_request_user_id(
    authorization: str | None = Header(default=None),
    x_eventscribe_user: str | None = Header(default=None),
    x_eventscribe_guest: str | None = Header(default=None),
    settings: Settings = Depends(get_settings),
) -> str:
    """Use Supabase identity, or an explicitly enabled backend guest session."""
    if authorization:
        user = await get_current_user(authorization=authorization, settings=settings)
        return user.id
    if settings.allow_guest_access:
        guest_user_id = get_guest_user_id(x_eventscribe_guest)
        if guest_user_id:
            return guest_user_id
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="A valid guest workspace session is required.")
    if settings.environment == "development":
        return x_eventscribe_user or "local-dev-user"
    raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication is required.")
