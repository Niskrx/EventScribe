from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_me_requires_bearer_token() -> None:
    response = client.get("/api/me")

    assert response.status_code == 401
    assert response.json()["error"]["code"] == "HTTP_ERROR"
