import json
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from uuid import UUID, uuid4

from app.schemas.format_spec import FormatSpecification
from app.schemas.formats import ExtractedFormatInput, FormatProfileResponse, FormatSourceType
from app.services.supabase_rest import SupabaseRest, enabled, encode_json

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
    format_spec: FormatSpecification | None = None
    analysis_status: str = "pending"
    analysis_error: str | None = None


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

    if enabled():
        if source_bytes is not None and filename:
            storage_path = str(Path(user_id) / "formats" / f"{profile_id}-{Path(filename).name}")
            SupabaseRest().upload(storage_path, source_bytes, "application/octet-stream")
        row = SupabaseRest().insert(
            "format_profiles",
            {
                "id": str(profile_id),
                "user_id": user_id,
                "name": name,
                "source_type": source_type,
                "source_storage_path": storage_path,
                "source_description": encode_json(extracted.model_dump(mode="json")),
            },
        )
        return _response_from_row(row)

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
        format_spec=profile.format_spec,
        analysis_status=profile.analysis_status,
        analysis_error=profile.analysis_error,
    )


def get_local_profile_record(profile_id: UUID, user_id: str) -> LocalFormatProfile | None:
    if enabled():
        rows = SupabaseRest().select("format_profiles", filters={"id": str(profile_id), "user_id": user_id})
        return _profile_from_row(rows[0]) if rows else None
    profile = _profiles.get(profile_id)
    if profile is None or profile.user_id != user_id:
        return None
    return profile


def mark_local_profile_analysis(
    profile: LocalFormatProfile,
    *,
    format_spec: FormatSpecification | None = None,
    error: str | None = None,
) -> FormatProfileResponse:
    if enabled():
        row = SupabaseRest().update(
            "format_profiles",
            filters={"id": str(profile.id), "user_id": profile.user_id},
            values={
                "format_spec": format_spec.model_dump(mode="json") if format_spec else None,
                "analysis_error": error,
                "analysis_status": "ready" if format_spec is not None else "failed",
            },
        )
        updated = _profile_from_row(row)
        return _response_from_profile(updated)
    profile.format_spec = format_spec
    profile.analysis_error = error
    profile.analysis_status = "ready" if format_spec is not None else "failed"
    return FormatProfileResponse(
        id=profile.id,
        user_id=profile.user_id,
        name=profile.name,
        source_type=profile.source_type,
        source_storage_path=profile.source_storage_path,
        extracted=profile.extracted,
        created_at=profile.created_at,
        format_spec=profile.format_spec,
        analysis_status=profile.analysis_status,
        analysis_error=profile.analysis_error,
    )


def get_local_profile(profile_id: UUID, user_id: str) -> FormatProfileResponse | None:
    if enabled():
        rows = SupabaseRest().select("format_profiles", filters={"id": str(profile_id), "user_id": user_id})
        return _response_from_row(rows[0]) if rows else None
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
        format_spec=profile.format_spec,
        analysis_status=profile.analysis_status,
        analysis_error=profile.analysis_error,
    )


def _profile_from_row(row: dict) -> LocalFormatProfile:
    source_description = row.get("source_description") or "{}"
    try:
        extracted = ExtractedFormatInput.model_validate(json.loads(source_description))
    except (TypeError, ValueError, json.JSONDecodeError):
        extracted = ExtractedFormatInput(source_type=row["source_type"])
    format_spec = row.get("format_spec")
    return LocalFormatProfile(
        id=UUID(str(row["id"])),
        user_id=row["user_id"],
        name=row["name"],
        source_type=row["source_type"],
        source_storage_path=row.get("source_storage_path"),
        extracted=extracted,
        created_at=datetime.fromisoformat(row["created_at"].replace("Z", "+00:00")),
        format_spec=FormatSpecification.model_validate(format_spec) if format_spec else None,
        analysis_status=row.get("analysis_status", "pending"),
        analysis_error=row.get("analysis_error"),
    )


def _response_from_profile(profile: LocalFormatProfile) -> FormatProfileResponse:
    return FormatProfileResponse(
        id=profile.id,
        user_id=profile.user_id,
        name=profile.name,
        source_type=profile.source_type,
        source_storage_path=profile.source_storage_path,
        extracted=profile.extracted,
        created_at=profile.created_at,
        format_spec=profile.format_spec,
        analysis_status=profile.analysis_status,
        analysis_error=profile.analysis_error,
    )


def _response_from_row(row: dict) -> FormatProfileResponse:
    return _response_from_profile(_profile_from_row(row))
