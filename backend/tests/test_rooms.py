"""Tests for rooms endpoints including color tagging."""

import pytest
from fastapi import status


class TestRoomEndpoints:
    """Test room endpoints and color tag functionality."""

    def test_create_room_with_color(self, client, test_org_data):
        """Test creating a room with an optional macOS tag color."""
        # 1. Register organization and get auth token
        reg_resp = client.post("/api/auth/register-org", json=test_org_data)
        assert reg_resp.status_code == status.HTTP_201_CREATED
        token = reg_resp.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # 2. Create room with color 'blue'
        create_resp = client.post(
            "/api/rooms",
            json={
                "name": "Engineering",
                "description": "Core engineering team",
                "color": "blue",
            },
            headers=headers,
        )
        assert create_resp.status_code == status.HTTP_201_CREATED
        room = create_resp.json()
        assert room["name"] == "Engineering"
        assert room["color"] == "blue"
        room_id = room["id"]

        # 3. Create sub-room with color 'purple'
        sub_resp = client.post(
            "/api/rooms",
            json={
                "name": "Frontend",
                "parent_room_id": room_id,
                "color": "purple",
            },
            headers=headers,
        )
        assert sub_resp.status_code == status.HTTP_201_CREATED
        sub_room = sub_resp.json()
        assert sub_room["name"] == "Frontend"
        assert sub_room["color"] == "purple"
        assert sub_room["parent_room_id"] == room_id

        # 4. Get all rooms and verify colors are preserved
        list_resp = client.get("/api/rooms", headers=headers)
        assert list_resp.status_code == status.HTTP_200_OK
        rooms_list = list_resp.json()["rooms"]
        by_name = {r["name"]: r for r in rooms_list}
        assert by_name["Engineering"]["color"] == "blue"
        assert by_name["Frontend"]["color"] == "purple"

        # 5. Get room tree and verify color in tree nodes
        tree_resp = client.get("/api/rooms/tree", headers=headers)
        assert tree_resp.status_code == status.HTTP_200_OK
        tree = tree_resp.json()["rooms"]
        eng_node = next(r for r in tree if r["name"] == "Engineering")
        assert eng_node["color"] == "blue"
        frontend_node = next(r for r in eng_node["children"] if r["name"] == "Frontend")
        assert frontend_node["color"] == "purple"

        # 6. Update color of room to 'green'
        update_resp = client.put(
            f"/api/rooms/{room_id}",
            json={"color": "green"},
            headers=headers,
        )
        assert update_resp.status_code == status.HTTP_200_OK
        assert update_resp.json()["color"] == "green"

        # 7. Remove tag color (setting color to None / null)
        remove_resp = client.put(
            f"/api/rooms/{room_id}",
            json={"color": None},
            headers=headers,
        )
        assert remove_resp.status_code == status.HTTP_200_OK
        assert remove_resp.json()["color"] is None

        # Verify DB persisted the removal
        get_resp = client.get(f"/api/rooms/{room_id}", headers=headers)
        assert get_resp.status_code == status.HTTP_200_OK
        assert get_resp.json()["color"] is None

        # 8. Set color again, then update only name (color omitted) - verify color is preserved
        client.put(
            f"/api/rooms/{room_id}",
            json={"color": "blue"},
            headers=headers,
        )
        name_resp = client.put(
            f"/api/rooms/{room_id}",
            json={"name": "Engineering Core"},
            headers=headers,
        )
        assert name_resp.status_code == status.HTTP_200_OK
        assert name_resp.json()["name"] == "Engineering Core"
        assert name_resp.json()["color"] == "blue"
