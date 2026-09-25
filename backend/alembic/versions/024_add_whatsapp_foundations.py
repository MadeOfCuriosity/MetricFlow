"""WhatsApp foundations: user phone, org timezone/toggle, message log, phone verification

Revision ID: 024
Revises: 023
Create Date: 2026-09-25

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID


revision: str = "024"
down_revision: Union[str, None] = "023"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("users", sa.Column("phone_e164", sa.String(20), nullable=True))
    op.add_column("users", sa.Column("phone_verified_at", sa.DateTime(), nullable=True))
    op.add_column("users", sa.Column("whatsapp_opt_in_at", sa.DateTime(), nullable=True))
    op.create_index("ix_users_phone_e164", "users", ["phone_e164"])

    op.add_column("organizations", sa.Column("timezone", sa.String(64), nullable=True))
    op.add_column(
        "organizations",
        sa.Column("whatsapp_enabled", sa.Boolean(), nullable=False, server_default=sa.text("false")),
    )

    op.create_table(
        "whatsapp_messages",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("org_id", UUID(as_uuid=True), sa.ForeignKey("organizations.id", ondelete="CASCADE"), nullable=True),
        sa.Column("user_id", UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("direction", sa.String(10), nullable=False),
        sa.Column("wa_message_id", sa.String(128), nullable=True, unique=True),
        sa.Column("phone_e164", sa.String(20), nullable=False),
        sa.Column("message_type", sa.String(30), nullable=False),
        sa.Column("template_name", sa.String(100), nullable=True),
        sa.Column("body", sa.Text(), nullable=True),
        sa.Column("status", sa.String(20), nullable=False),
        sa.Column("error", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")),
    )
    op.create_index("ix_whatsapp_messages_org_created", "whatsapp_messages", ["org_id", "created_at"])
    op.create_index("ix_whatsapp_messages_phone", "whatsapp_messages", ["phone_e164"])

    op.create_table(
        "phone_verifications",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("phone_e164", sa.String(20), nullable=False),
        sa.Column("code_hash", sa.String(128), nullable=False),
        sa.Column("attempts", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("expires_at", sa.DateTime(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")),
    )
    op.create_index("ix_phone_verifications_user_id", "phone_verifications", ["user_id"])


def downgrade() -> None:
    op.drop_index("ix_phone_verifications_user_id", table_name="phone_verifications")
    op.drop_table("phone_verifications")
    op.drop_index("ix_whatsapp_messages_phone", table_name="whatsapp_messages")
    op.drop_index("ix_whatsapp_messages_org_created", table_name="whatsapp_messages")
    op.drop_table("whatsapp_messages")
    op.drop_column("organizations", "whatsapp_enabled")
    op.drop_column("organizations", "timezone")
    op.drop_index("ix_users_phone_e164", table_name="users")
    op.drop_column("users", "whatsapp_opt_in_at")
    op.drop_column("users", "phone_verified_at")
    op.drop_column("users", "phone_e164")
