"""Backfill KPI values from existing data-field entries

KPIs were only calculated when a field value was saved, so a KPI created
after its data was entered had no values. This fills them in once; new
KPIs are backfilled by the app (EntryService.backfill_kpi).

Uses plain table constructs rather than ORM models so it keeps working as
the models change.

Revision ID: 026
Revises: 025
Create Date: 2026-09-28

"""
import uuid
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

from app.services.calculation_service import CalculationService


revision: str = "026"
down_revision: Union[str, None] = "025"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


kpi_definitions = sa.table(
    "kpi_definitions",
    sa.column("id"), sa.column("org_id"), sa.column("formula"),
)
kpi_data_fields = sa.table(
    "kpi_data_fields",
    sa.column("kpi_id"), sa.column("data_field_id"), sa.column("variable_name"),
)
data_field_entries = sa.table(
    "data_field_entries",
    sa.column("org_id"), sa.column("data_field_id"), sa.column("date"), sa.column("value"),
)
room_kpi_assignments = sa.table(
    "room_kpi_assignments",
    sa.column("kpi_id"), sa.column("room_id"),
)
data_entries = sa.table(
    "data_entries",
    sa.column("id"), sa.column("org_id"), sa.column("kpi_id"), sa.column("room_id"),
    sa.column("date"), sa.column("values", sa.JSON), sa.column("calculated_value"),
    sa.column("entered_by"), sa.column("created_at"),
)


def upgrade() -> None:
    conn = op.get_bind()

    links_by_kpi: dict = {}
    for link in conn.execute(sa.select(kpi_data_fields)):
        links_by_kpi.setdefault(link.kpi_id, []).append(link)

    rooms_by_kpi: dict = {}
    for ra in conn.execute(sa.select(room_kpi_assignments)):
        rooms_by_kpi.setdefault(ra.kpi_id, []).append(ra.room_id)

    for kpi in conn.execute(sa.select(kpi_definitions)).fetchall():
        links = links_by_kpi.get(kpi.id)
        if not links:
            continue

        variable_by_field = {link.data_field_id: link.variable_name for link in links}
        values_by_date: dict = {}
        for fe in conn.execute(
            sa.select(data_field_entries).where(
                data_field_entries.c.org_id == kpi.org_id,
                data_field_entries.c.data_field_id.in_(list(variable_by_field)),
            )
        ):
            values_by_date.setdefault(fe.date, {})[variable_by_field[fe.data_field_id]] = fe.value

        existing = {
            (row.date, row.room_id): row.id
            for row in conn.execute(
                sa.select(data_entries.c.id, data_entries.c.date, data_entries.c.room_id)
                .where(data_entries.c.kpi_id == kpi.id)
            )
        }

        for entry_date, values in values_by_date.items():
            if len(values) < len(links):
                continue
            result = CalculationService.calculate(kpi.formula, values)
            if not result.success:
                continue

            for room_id in rooms_by_kpi.get(kpi.id) or [None]:
                entry_id = existing.get((entry_date, room_id))
                if entry_id:
                    conn.execute(
                        data_entries.update()
                        .where(data_entries.c.id == entry_id)
                        .values(values=values, calculated_value=result.value)
                    )
                else:
                    conn.execute(data_entries.insert().values(
                        id=uuid.uuid4(),
                        org_id=kpi.org_id,
                        kpi_id=kpi.id,
                        room_id=room_id,
                        date=entry_date,
                        values=values,
                        calculated_value=result.value,
                        entered_by=None,
                        created_at=sa.func.now(),
                    ))


def downgrade() -> None:
    # Data-only migration; the backfilled values are indistinguishable from
    # calculated ones and are left in place.
    pass
