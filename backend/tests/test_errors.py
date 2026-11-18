from fastapi import APIRouter
from fastapi.testclient import TestClient

from app.main import app

router = APIRouter(prefix="/test-errors")


@router.get("/items/{item_id}")
def read_item(item_id: int) -> dict[str, int]:
    return {"item_id": item_id}


app.include_router(router)
client = TestClient(app)


def test_validation_errors_use_consistent_shape() -> None:
    response = client.get("/test-errors/items/not-an-integer")

    assert response.status_code == 422
    assert response.json()["error"]["code"] == "VALIDATION_ERROR"
    assert "fields" in response.json()["error"]["details"]
