from pathlib import PurePosixPath


BUCKET_NAME = "eventscribe-files"


def user_storage_path(user_id: str, category: str, filename: str) -> str:
    """Return a storage path whose first segment is the authenticated user ID."""
    safe_name = PurePosixPath(filename).name
    if not safe_name or not safe_name.strip("."):
        raise ValueError("A valid filename is required.")
    return str(PurePosixPath(user_id) / category / safe_name)
