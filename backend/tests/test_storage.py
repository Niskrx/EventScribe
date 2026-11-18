import pytest

from app.storage import user_storage_path


def test_user_storage_path_is_user_scoped() -> None:
    assert user_storage_path("user-123", "references", "sample.pdf") == "user-123/references/sample.pdf"


def test_user_storage_path_drops_parent_directories() -> None:
    assert user_storage_path("user-123", "photos", "../photo.png") == "user-123/photos/photo.png"


def test_user_storage_path_rejects_empty_filename() -> None:
    with pytest.raises(ValueError):
        user_storage_path("user-123", "photos", "...")
