import json
from pathlib import Path
from typing import Any

import pytest
from pydantic import ValidationError

from app.schemas.events import EventCreateRequest
from app.schemas.format_spec import FormatSpecification

FIXTURES = Path(__file__).resolve().parents[2] / "fixtures"
EVENT_FIXTURES = FIXTURES / "sample-events"
FORMAT_FIXTURES = FIXTURES / "sample-formats"


def load_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def test_valid_event_fixture_matches_the_public_contract() -> None:
    payload = load_json(EVENT_FIXTURES / "innovation-showcase-2026.json")
    event = EventCreateRequest.model_validate(payload)

    assert event.title == "Innovation Showcase 2026"
    assert event.department == "Department of Computer Applications"
    assert event.format_profile_id is None


def test_missing_required_event_fixture_is_rejected() -> None:
    payload = load_json(EVENT_FIXTURES / "missing-required-fields.json")

    with pytest.raises(ValidationError) as exc_info:
        EventCreateRequest.model_validate(payload)

    missing_fields = {error["loc"][0] for error in exc_info.value.errors()}
    assert missing_fields == {"title", "objectives"}


def test_valid_format_fixture_matches_the_public_contract() -> None:
    payload = load_json(FORMAT_FIXTURES / "annual-academic-event-format.json")
    specification = FormatSpecification.model_validate(payload)

    assert [section.key for section in specification.ordered_sections()] == [
        "overview",
        "activities",
        "outcomes",
    ]
    assert specification.images.mode == "grid"
    assert specification.images.columns == 2
    assert specification.tables[0].name == "Attendance summary"


def test_missing_image_format_fixture_is_valid_and_explains_absent_asset() -> None:
    payload = load_json(FORMAT_FIXTURES / "missing-image-format.json")
    specification = FormatSpecification.model_validate(payload)

    assert specification.images.captions is True
    assert specification.images.mode == "single"
    assert any("No photograph asset" in note for note in specification.uncertainties)


def test_malformed_format_fixture_is_rejected_without_network_access() -> None:
    payload = load_json(FORMAT_FIXTURES / "malformed-format.json")

    with pytest.raises(ValidationError):
        FormatSpecification.model_validate(payload)


@pytest.mark.parametrize(
    "path",
    [
        EVENT_FIXTURES / "innovation-showcase-2026.json",
        EVENT_FIXTURES / "missing-required-fields.json",
        FORMAT_FIXTURES / "annual-academic-event-format.json",
        FORMAT_FIXTURES / "malformed-format.json",
        FORMAT_FIXTURES / "missing-image-format.json",
    ],
)
def test_fixtures_are_small_deterministic_and_free_of_secret_markers(path: Path) -> None:
    first = path.read_text(encoding="utf-8")
    second = path.read_text(encoding="utf-8")
    lowered = first.lower()

    assert first == second
    assert path.stat().st_size < 5_000
    for marker in ("api_key", "password", "secret", "bearer ", "private_key"):
        assert marker not in lowered
