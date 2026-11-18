from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)

EVENT_PAYLOAD = {
    "title": "Department Seminar",
    "event_date": "2026-11-18",
    "department": "Computer Science",
    "venue": "Seminar Hall",
    "coordinator": "Akshansh",
    "objectives": "Share practical research insights.",
    "activities": "Talk, question-and-answer session, and closing remarks.",
    "outcomes": "Participants learned about current research practices.",
}


def test_event_draft_can_be_created_read_and_updated() -> None:
    create_response = client.post("/api/events", json=EVENT_PAYLOAD)

    assert create_response.status_code == 201
    event_id = create_response.json()["id"]
    assert create_response.json()["status"] == "draft"

    read_response = client.get(f"/api/events/{event_id}")
    assert read_response.status_code == 200
    assert read_response.json()["title"] == "Department Seminar"

    update_response = client.patch(
        f"/api/events/{event_id}",
        json={**EVENT_PAYLOAD, "guest": "Dr. Guest"},
    )
    assert update_response.status_code == 200
    assert update_response.json()["guest"] == "Dr. Guest"


def test_photo_upload_order_and_delete() -> None:
    event_id = client.post("/api/events", json=EVENT_PAYLOAD).json()["id"]
    first = client.post(
        f"/api/events/{event_id}/photos",
        files={"file": ("first.jpg", b"\xff\xd8\xff\xe0sample", "image/jpeg")},
        data={"caption": "Opening session"},
    )
    second = client.post(
        f"/api/events/{event_id}/photos",
        files={"file": ("second.png", b"\x89PNG\r\n\x1a\nsample", "image/png")},
    )

    assert first.status_code == 201
    assert second.status_code == 201
    first_id = first.json()["id"]
    second_id = second.json()["id"]
    assert first.json()["sort_order"] == 0
    assert first.json()["caption"] == "Opening session"

    reorder = client.patch(f"/api/events/{event_id}/photos/order", json=[second_id, first_id])
    assert reorder.status_code == 200
    assert [photo["id"] for photo in reorder.json()] == [second_id, first_id]
    assert [photo["sort_order"] for photo in reorder.json()] == [0, 1]

    delete_response = client.delete(f"/api/events/{event_id}/photos/{first_id}")
    assert delete_response.status_code == 204


def test_invalid_photo_type_is_rejected() -> None:
    event_id = client.post("/api/events", json=EVENT_PAYLOAD).json()["id"]

    response = client.post(
        f"/api/events/{event_id}/photos",
        files={"file": ("notes.txt", b"not an image", "text/plain")},
    )

    assert response.status_code == 415
    assert response.json()["error"]["code"] == "HTTP_ERROR"


def test_user_cannot_read_another_user_event() -> None:
    event_id = client.post("/api/events", json=EVENT_PAYLOAD).json()["id"]

    response = client.get(f"/api/events/{event_id}", headers={"X-EventScribe-User": "different-user"})

    assert response.status_code == 404
