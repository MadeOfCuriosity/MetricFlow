"""Add unit and direction to kpi_definitions

Revision ID: 025
Revises: 024
Create Date: 2026-09-26

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "025"
down_revision: Union[str, None] = "024"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("kpi_definitions", sa.Column("unit", sa.String(length=20), nullable=True))
    op.add_column("kpi_definitions", sa.Column("direction", sa.String(length=4), nullable=True))


def downgrade() -> None:
    op.drop_column("kpi_definitions", "direction")
    op.drop_column("kpi_definitions", "unit")
