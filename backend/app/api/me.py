from fastapi import APIRouter, Depends

from app.auth import CurrentUser, get_current_user

router = APIRouter(prefix="/api", tags=["authentication"])


@router.get("/me")
async def get_me(current_user: CurrentUser = Depends(get_current_user)) -> dict[str, str | None]:
    return {"id": current_user.id, "email": current_user.email}
