from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from uuid import UUID, uuid4

from app.schemas.formats import ExtractedFormatInput, FormatProfileResponse, FormatSourceType


LOCAL_STORAGE_ROOT = Path(__file__).resolve().parents[2] / ".local_storage"


@dataclass
class LocalFormatProfile:
    id: UUID
    user_id: str
    name: str
    source_type: FormatSourceType
    source_storage_path: str | None
    extracted: ExtractedFormatInput
    created_at: datetime


_profiles: dict[UUID, LocalFormatProfile] = {}


def create_local_profile(
    *,
    user_id: str,
    name: str,
    source_type: FormatSourceType,
    extracted: ExtractedFormatInput,
    source_bytes: bytes | None = None,
    filename: str | None = None,
) -> FormatProfileResponse:
    profile_id = uuid4()
    storage_path = None

    if source_bytes is not None and filename:
        relative_path = Path(user_id) / "formats" / f"{profile_id}-{Path(filename).name}"
        absolute_path = LOCAL_STORAGE_ROOT / relative_path
        absolute_path.parent.mkdir(parents=True, exist_ok=True)
        absolute_path.write_bytes(source_bytes)
        storage_path = str(relative_path)

    profile = LocalFormatProfile(
        id=profile_id,
        user_id=user_id,
        name=name,
        source_type=source_type,
        source_storage_path=storage_path,
        extracted=extracted,
        created_at=datetime.now(timezone.utc),
    )
    _profiles[profile_id] = profile
    return FormatProfileResponse(
        id=profile.id,
        user_id=profile.user_id,
        name=profile.name,
        source_type=profile.source_type,
        source_storage_path=profile.source_storage_path,
        extracted=profile.extracted,
        created_at=profile.created_at,
    )


def get_local_profile(profile_id: UUID, user_id: str) -> FormatProfileResponse | None:
    profile = _profiles.get(profile_id)
    if profile is None or profile.user_id != user_id:
        return None
    return FormatProfileResponse(
        id=profile.id,
        user_id=profile.user_id,
        name=profile.name,
        source_type=profile.source_type,
        source_storage_path=profile.source_storage_path,
        extracted=profile.extracted,
        created_at=profile.created_at,
    )
