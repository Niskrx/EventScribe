from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from app.auth import create_guest_session
from app.config import Settings, get_settings

router = APIRouter(prefix="/api/guest", tags=["guest"])


class GuestSessionResponse(BaseModel):
    token: str


@router.post("/session", response_model=GuestSessionResponse, status_code=status.HTTP_201_CREATED)
async def create_guest_workspace_session(settings: Settings = Depends(get_settings)) -> GuestSessionResponse:
    if not settings.allow_guest_access:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Guest workspace access is disabled. Configure Supabase authentication first.",
        )
    return GuestSessionResponse(token=create_guest_session())
