from dataclasses import dataclass

import httpx
from fastapi import Depends, Header, HTTPException, status

from app.config import Settings, get_settings


@dataclass(frozen=True)
class CurrentUser:
    id: str
    email: str | None = None


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
    settings: Settings = Depends(get_settings),
) -> str:
    """Use Supabase identity in configured environments and a clearly local-only user otherwise."""
    if authorization:
        user = await get_current_user(authorization=authorization, settings=settings)
        return user.id
    if settings.environment == "development":
        return x_eventscribe_user or "local-dev-user"
    raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication is required.")
