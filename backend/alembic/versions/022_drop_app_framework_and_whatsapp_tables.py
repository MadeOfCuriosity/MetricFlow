"""Drop app framework and WhatsApp Notifier tables

Revision ID: 022
Revises: 021
Create Date: 2026-09-18

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "022"
down_revision: Union[str, None] = "021"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("DROP TABLE IF EXISTS whatsapp_send_logs CASCADE")
    op.execute("DROP TABLE IF EXISTS whatsapp_suppressions CASCADE")
    op.execute("DROP TABLE IF EXISTS whatsapp_recipients CASCADE")
    op.execute("DROP TABLE IF EXISTS app_run_records CASCADE")
    op.execute("DROP TABLE IF EXISTS org_app_installations CASCADE")


def downgrade() -> None:
    pass
