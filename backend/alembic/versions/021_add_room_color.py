"""Add color column to rooms

Revision ID: 021
Revises: 020
Create Date: 2026-09-12

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "021"
down_revision: Union[str, None] = "020"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("rooms", sa.Column("color", sa.String(50), nullable=True))


def downgrade() -> None:
    op.drop_column("rooms", "color")
