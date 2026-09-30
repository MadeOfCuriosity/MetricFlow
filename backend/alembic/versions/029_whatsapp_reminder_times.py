"""Org-level WhatsApp reminder times (org time zone, "HH:MM"; NULL = off)

Revision ID: 029
Revises: 028
Create Date: 2026-09-30

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "029"
down_revision: Union[str, None] = "028"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("organizations", sa.Column("whatsapp_reminder_time", sa.String(5), nullable=True))
    op.add_column("organizations", sa.Column("whatsapp_nudge_time", sa.String(5), nullable=True))


def downgrade() -> None:
    op.drop_column("organizations", "whatsapp_nudge_time")
    op.drop_column("organizations", "whatsapp_reminder_time")
