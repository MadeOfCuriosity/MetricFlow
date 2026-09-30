from datetime import datetime
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel, Field


class RoomBasicResponse(BaseModel):
    """Basic room info for user assignments."""
    id: UUID
    name: str
    whatsapp_entry: bool = False  # this user fills in the room's data over WhatsApp

    model_config = {"from_attributes": True}


class UserWithRoomsResponse(BaseModel):
    """User response including assigned rooms."""
    id: UUID
    email: str
    name: str
    role: str
    role_label: str
    created_at: datetime
    assigned_rooms: List[RoomBasicResponse] = []
    whatsapp_linked: bool = False  # has a verified WhatsApp number

    model_config = {"from_attributes": True}


class UserListResponse(BaseModel):
    """List of users for admin management."""
    users: List[UserWithRoomsResponse]
    total: int


class UpdateUserRoomsRequest(BaseModel):
    """Request to update a user's room assignments."""
    room_ids: List[UUID] = Field(..., description="List of room IDs to assign to the user")
    whatsapp_room_ids: Optional[List[UUID]] = Field(
        default=None, description="Rooms this user fills in over WhatsApp (omit to keep current settings)"
    )


class UpdateUserRoleRequest(BaseModel):
    """Request to update a user's role."""
    role: str = Field(..., pattern="^(admin|room_admin)$", description="User role: 'admin' or 'room_admin'")
    room_ids: Optional[List[UUID]] = Field(default=None, description="Room IDs to assign (required if changing to room_admin)")
