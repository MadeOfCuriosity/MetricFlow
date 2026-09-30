"""Admins choose which rooms they're asked about on WhatsApp

Revision ID: 028
Revises: 027
Create Date: 2026-09-30

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB


revision: str = "028"
down_revision: Union[str, None] = "027"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # {"room_ids": [...], "org_wide": bool} — admins only; room admins use user_room_assignments.whatsapp_entry
    op.add_column("users", sa.Column("whatsapp_scope", JSONB(), nullable=True))


def downgrade() -> None:
    op.drop_column("users", "whatsapp_scope")
