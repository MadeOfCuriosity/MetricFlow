#!/usr/bin/env python3
"""Recompute stored KPI values from existing data-field entries.

KPIs created before this backfill existed have no values for data entered
before they were created. Run once after deploying:

    python -m scripts.backfill_kpi_values            # every org
    python -m scripts.backfill_kpi_values --org-id <uuid>
"""

import argparse
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.database import SessionLocal
from app.models import KPIDefinition
from app.services.entry_service import EntryService


def main():
    parser = argparse.ArgumentParser(description="Backfill KPI values from data-field entries.")
    parser.add_argument("--org-id", default=None, help="Only backfill this organization")
    args = parser.parse_args()

    db = SessionLocal()
    try:
        query = db.query(KPIDefinition)
        if args.org_id:
            query = query.filter(KPIDefinition.org_id == args.org_id)

        for kpi in query.all():
            count = EntryService.backfill_kpi(db, kpi.org_id, None, kpi)
            db.commit()
            print(f"{kpi.org_id}  {kpi.name}: {count} dates")
    finally:
        db.close()


if __name__ == "__main__":
    main()
