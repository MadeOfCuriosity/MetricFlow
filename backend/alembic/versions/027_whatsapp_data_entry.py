"""WhatsApp data entry: per-room opt-in, entry source, chat sessions

Revision ID: 027
Revises: 026
Create Date: 2026-09-30

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID, JSONB


revision: str = "027"
down_revision: Union[str, None] = "026"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "user_room_assignments",
        sa.Column("whatsapp_entry", sa.Boolean(), nullable=False, server_default=sa.text("false")),
    )
    # Where a value came from: web | whatsapp | import | integration (NULL = web, for older rows)
    op.add_column("data_field_entries", sa.Column("source", sa.String(20), nullable=True))

    op.create_table(
        "whatsapp_sessions",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True),
        sa.Column("org_id", UUID(as_uuid=True), sa.ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False),
        sa.Column("mode", sa.String(20), nullable=False),
        sa.Column("state", JSONB(), nullable=False),
        sa.Column("expires_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")),
    )


def downgrade() -> None:
    op.drop_table("whatsapp_sessions")
    op.drop_column("data_field_entries", "source")
    op.drop_column("user_room_assignments", "whatsapp_entry")
