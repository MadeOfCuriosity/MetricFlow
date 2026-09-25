"""Add period_start_date to data_fields (anchor for weekly/monthly periods)

Revision ID: 023
Revises: 022
Create Date: 2026-09-25

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "023"
down_revision: Union[str, None] = "022"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("data_fields", sa.Column("period_start_date", sa.Date(), nullable=True))


def downgrade() -> None:
    op.drop_column("data_fields", "period_start_date")
