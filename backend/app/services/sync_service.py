import logging
from collections import defaultdict
from datetime import date, datetime, timedelta
from uuid import UUID

from sqlalchemy.orm import Session

from app.models.integration import Integration
from app.models.integration_field_mapping import IntegrationFieldMapping
from app.models.sync_log import SyncLog
from app.models.data_field import DataField
from app.models.data_field_entry import DataFieldEntry
from app.services.connectors import get_connector
from app.services.entry_service import EntryService

logger = logging.getLogger(__name__)

# Map schedule strings to timedelta intervals
SCHEDULE_INTERVALS = {
    "1h": timedelta(hours=1),
    "6h": timedelta(hours=6),
    "12h": timedelta(hours=12),
    "24h": timedelta(hours=24),
}

# First sync of a new integration (history beyond this runs as a background resync)
INITIAL_SYNC_DAYS = 30
# Providers with complete days re-check this many days every sync
RESYNC_WINDOW_DAYS = 45
# Long ranges are fetched in periods of this many days
SYNC_CHUNK_DAYS = 31
# After a failed scheduled sync, wait at most this long before retrying
FAILED_SYNC_RETRY = timedelta(minutes=30)


class SyncService:
    """Orchestrates data syncing from external sources into DataFieldEntry."""

    @staticmethod
    def cleanup_stale_sync_logs(db: Session, timeout_minutes: int = 60) -> int:
        """Mark sync logs stuck in 'running' for too long as 'failed'."""
        cutoff = datetime.utcnow() - timedelta(minutes=timeout_minutes)
        count = db.query(SyncLog).filter(
            SyncLog.status == "running",
            SyncLog.started_at < cutoff,
        ).update({
            "status": "failed",
            "completed_at": datetime.utcnow(),
            "summary": "Sync timed out (process may have crashed)",
        })
        if count > 0:
            db.commit()
            logger.warning(f"Cleaned up {count} stale sync log(s)")
        return count

    @staticmethod
    def sync_range(integration: Integration, reports_complete_days: bool) -> tuple[date, date]:
        """
        Default range for a sync. Providers whose days are complete (Zoho Books)
        re-check a trailing window every time, so back-dated entries, edits and
        deletions are picked up; others continue from the last sync.
        """
        today = date.today()
        if not integration.last_synced_at:
            return today - timedelta(days=INITIAL_SYNC_DAYS - 1), today
        start = integration.last_synced_at.date() - timedelta(days=1)
        if reports_complete_days:
            start = min(start, today - timedelta(days=RESYNC_WINDOW_DAYS - 1))
        return start, today

    @staticmethod
    def _chunks(start: date, end: date, days: int):
        while start <= end:
            chunk_end = min(end, start + timedelta(days=days - 1))
            yield start, chunk_end
            start = chunk_end + timedelta(days=1)

    @staticmethod
    def _is_synced_entry(entry: DataFieldEntry) -> bool:
        """Written by a sync (tagged, or untagged with no user from before tagging)."""
        return entry.source == "integration" or (entry.source is None and entry.entered_by is None)

    @staticmethod
    def execute_sync(
        db: Session,
        integration_id: UUID,
        triggered_by: UUID | None = None,
        trigger_type: str = "manual",
        start_date: date | None = None,
        end_date: date | None = None,
    ) -> SyncLog:
        """
        Main sync logic:
        1. Clean up stale sync logs; skip if this integration is already syncing
        2. Create SyncLog(status=running)
        3. Instantiate connector and refresh auth
        4. Fetch data period by period
        5. Upsert into DataFieldEntry (and fill empty days where the provider allows)
        6. Recalculate affected KPIs
        7. Update logs and integration
        """
        # Clean up any stale sync logs from previous crashed runs
        SyncService.cleanup_stale_sync_logs(db)

        integration = db.query(Integration).filter(
            Integration.id == integration_id,
        ).first()

        if not integration:
            raise ValueError(f"Integration {integration_id} not found")

        # Two runs on one integration would race on the same entries
        running = db.query(SyncLog).filter(
            SyncLog.integration_id == integration.id,
            SyncLog.status == "running",
        ).first()
        if running:
            return running

        # Create sync log
        sync_log = SyncLog(
            integration_id=integration.id,
            status="running",
            trigger_type=trigger_type,
            triggered_by=triggered_by,
            started_at=datetime.utcnow(),
        )
        db.add(sync_log)
        db.commit()
        db.refresh(sync_log)

        # Get active field mappings
        mappings = db.query(IntegrationFieldMapping).filter(
            IntegrationFieldMapping.integration_id == integration.id,
            IntegrationFieldMapping.is_active == True,
        ).all()

        if not mappings:
            sync_log.status = "failed"
            sync_log.completed_at = datetime.utcnow()
            sync_log.summary = "No active field mappings configured"
            db.commit()
            return sync_log

        try:
            # Instantiate connector
            connector = get_connector(integration, db)
            complete_days = getattr(connector, "reports_complete_days", False)

            # Refresh auth
            auth_ok = connector.refresh_auth()
            if not auth_ok:
                sync_log.status = "failed"
                sync_log.completed_at = datetime.utcnow()
                sync_log.summary = "Authentication failed. Please reconnect."
                integration.status = "error"
                integration.error_message = "Authentication failed"
                db.commit()
                return sync_log

            # Empty days only mean "0" for daily fields; weekly/monthly ones hold one value per period
            daily_field_ids = {
                f.id for f in db.query(DataField).filter(
                    DataField.id.in_([m.data_field_id for m in mappings]),
                    DataField.entry_interval == "daily",
                )
            }

            default_start, default_end = SyncService.sync_range(integration, complete_days)
            start_date = start_date or default_start
            end_date = end_date or default_end

            rows_fetched = 0
            rows_written = 0
            rows_skipped = 0
            manual_replaced = 0
            errors: list[str] = []
            warnings: list[str] = []
            dates_touched: set[date] = set()
            kpis_recalculated = 0

            # Long ranges (history) go a month at a time so per-fetch caps apply per month
            chunk_days = SYNC_CHUNK_DAYS if complete_days else (end_date - start_date).days + 1
            for chunk_start, chunk_end in SyncService._chunks(start_date, end_date, chunk_days):
                raw_data = connector.fetch_data(chunk_start, chunk_end)
                chunk_warnings = list(getattr(connector, "warnings", []) or [])
                warnings.extend(chunk_warnings)
                rows_fetched += len(raw_data)

                affected_dates_fields: dict[date, set[UUID]] = defaultdict(set)
                dates_with_data: set[date] = set()

                for row in raw_data:
                    row_date = row.get("date")
                    if not isinstance(row_date, date):
                        rows_skipped += 1
                        continue
                    dates_with_data.add(row_date)

                    for mapping in mappings:
                        try:
                            value = SyncService._extract_value(
                                row, mapping.external_field_name, mapping.aggregation
                            )
                            if value is None:
                                rows_skipped += 1
                                continue

                            existing = db.query(DataFieldEntry).filter(
                                DataFieldEntry.org_id == integration.org_id,
                                DataFieldEntry.data_field_id == mapping.data_field_id,
                                DataFieldEntry.date == row_date,
                            ).first()

                            if existing:
                                if not SyncService._is_synced_entry(existing) and existing.value != value:
                                    manual_replaced += 1
                                existing.value = value
                                existing.entered_by = None  # Mark as synced (not manual)
                                existing.source = "integration"
                            else:
                                db.add(DataFieldEntry(
                                    org_id=integration.org_id,
                                    data_field_id=mapping.data_field_id,
                                    date=row_date,
                                    value=value,
                                    entered_by=None,
                                    source="integration",
                                ))

                            db.flush()
                            rows_written += 1
                            affected_dates_fields[row_date].add(mapping.data_field_id)

                        except Exception as e:
                            errors.append(
                                f"Row {row_date}, field {mapping.external_field_name}: {str(e)}"
                            )

                # Days with no records: a total of 0 (sum/count), or no value
                # (avg/min/max). Only when the fetch was complete, and never
                # over a value someone entered by hand.
                if complete_days and not chunk_warnings:
                    day = chunk_start
                    while day <= chunk_end:
                        if day not in dates_with_data:
                            for mapping in mappings:
                                if mapping.data_field_id not in daily_field_ids:
                                    continue
                                existing = db.query(DataFieldEntry).filter(
                                    DataFieldEntry.org_id == integration.org_id,
                                    DataFieldEntry.data_field_id == mapping.data_field_id,
                                    DataFieldEntry.date == day,
                                ).first()
                                if existing and not SyncService._is_synced_entry(existing):
                                    continue
                                if mapping.aggregation in ("sum", "count"):
                                    if existing and existing.value == 0:
                                        continue
                                    if existing:
                                        existing.value = 0.0
                                        existing.source = "integration"
                                    else:
                                        db.add(DataFieldEntry(
                                            org_id=integration.org_id,
                                            data_field_id=mapping.data_field_id,
                                            date=day,
                                            value=0.0,
                                            entered_by=None,
                                            source="integration",
                                        ))
                                elif existing:
                                    db.delete(existing)
                                else:
                                    continue
                                db.flush()
                                affected_dates_fields[day].add(mapping.data_field_id)
                        day += timedelta(days=1)

                # Recalculate affected KPIs for each date
                for entry_date, field_ids in affected_dates_fields.items():
                    try:
                        kpis_recalculated += EntryService._recalculate_kpis(
                            db, integration.org_id, triggered_by, entry_date, field_ids
                        )
                    except Exception as e:
                        errors.append(f"KPI recalc for {entry_date}: {str(e)}")

                dates_touched.update(affected_dates_fields.keys())
                db.commit()

            # Update sync log
            sync_log.rows_fetched = rows_fetched
            sync_log.rows_written = rows_written
            sync_log.rows_skipped = rows_skipped
            details = errors + warnings
            sync_log.errors_count = len(errors)
            sync_log.error_details = details if details else None
            sync_log.status = "success" if not details else "partial"
            sync_log.completed_at = datetime.utcnow()
            summary = (
                f"Synced {start_date:%d %b %Y} to {end_date:%d %b %Y}: {rows_written} values "
                f"across {len(dates_touched)} days. {kpis_recalculated} KPIs recalculated."
            )
            if manual_replaced:
                summary += f" Replaced {manual_replaced} values that were entered by hand."
            if warnings:
                summary += " Some days may be incomplete: " + warnings[0]
            sync_log.summary = summary

            # Update integration; a partial sync stays connected but says why
            integration.last_synced_at = datetime.utcnow()
            integration.status = "connected"
            integration.error_message = (warnings[0] if warnings else errors[0] if errors else None)
            SyncService._update_next_sync(integration)
            db.commit()

            return sync_log

        except Exception as e:
            db.rollback()
            logger.error(f"Sync failed for integration {integration_id}: {e}", exc_info=True)
            sync_log.status = "failed"
            sync_log.completed_at = datetime.utcnow()
            sync_log.errors_count = 1
            sync_log.error_details = [str(e)]
            sync_log.summary = f"Sync failed: {str(e)}"
            integration.status = "error"
            integration.error_message = str(e)[:500]
            db.commit()
            return sync_log

    @staticmethod
    def _extract_value(row: dict, field_name: str, aggregation: str) -> float | None:
        """Extract a value from a data row based on field name and aggregation type."""
        if aggregation == "direct":
            val = row.get(field_name)
            if isinstance(val, (int, float)):
                return float(val)
            return None

        if aggregation == "count":
            # Use pre-computed record count
            return float(row.get("__record_count", 0))

        # For sum/avg/min/max — use pre-computed aggregations from CRM connectors
        agg_key = f"{field_name}__{aggregation}"
        val = row.get(agg_key)
        if isinstance(val, (int, float)):
            return float(val)

        return None

    @staticmethod
    def _update_next_sync(integration: Integration) -> None:
        """Calculate and set the next sync time based on schedule."""
        interval = SCHEDULE_INTERVALS.get(integration.sync_schedule)
        if interval:
            integration.next_sync_at = datetime.utcnow() + interval
        else:
            integration.next_sync_at = None

    # --- Scheduling (database-driven) ---
    # Each integration's next run lives in integrations.next_sync_at. One
    # process (see app.core.scheduler) runs whatever is due every minute, one
    # at a time, so restarts lose nothing, changes made in any worker take
    # effect, and syncs never run twice in parallel or hit a provider at once.

    @staticmethod
    def schedule_next(integration: Integration, delay: timedelta = timedelta(0)) -> None:
        """Set when the next scheduled sync runs (none for manual). Caller commits."""
        interval = SCHEDULE_INTERVALS.get(integration.sync_schedule)
        integration.next_sync_at = datetime.utcnow() + interval + delay if interval else None

    @staticmethod
    def request_history_sync(integration: Integration, days: int) -> None:
        """Queue a re-sync of the last `days` days for the next scheduler tick. Caller commits."""
        config = dict(integration.config or {})
        config["pending_history_days"] = int(days)
        integration.config = config

    @staticmethod
    def _clear_history_request(db: Session, integration: Integration) -> None:
        config = dict(integration.config or {})
        config.pop("pending_history_days", None)
        integration.config = config
        db.commit()

    @staticmethod
    def run_due_syncs(db: Session) -> int:
        """Run every due scheduled sync and queued history re-sync, one at a time."""
        SyncService.cleanup_stale_sync_logs(db)
        now = datetime.utcnow()
        candidates = db.query(Integration).filter(
            Integration.status.in_(("connected", "error")),
        ).order_by(Integration.next_sync_at.asc()).all()

        due: list[tuple[UUID, int | None]] = []
        for integration in candidates:
            history_days = (integration.config or {}).get("pending_history_days")
            if history_days:
                due.append((integration.id, int(history_days)))
            elif integration.sync_schedule != "manual" and (
                integration.next_sync_at is None or integration.next_sync_at <= now
            ):
                due.append((integration.id, None))

        ran = 0
        for integration_id, history_days in due:
            integration = db.query(Integration).filter(Integration.id == integration_id).first()
            if not integration:
                continue
            started = datetime.utcnow()
            try:
                if history_days:
                    SyncService._clear_history_request(db, integration)
                    log = SyncService.execute_sync(
                        db, integration_id, trigger_type="scheduled",
                        start_date=date.today() - timedelta(days=history_days - 1),
                        end_date=date.today(),
                    )
                else:
                    log = SyncService.execute_sync(db, integration_id, trigger_type="scheduled")
            except Exception as e:
                logger.error(f"Scheduled sync crashed for {integration_id}: {e}", exc_info=True)
                db.rollback()
                continue

            integration = db.query(Integration).filter(Integration.id == integration_id).first()
            if not integration:
                continue
            if log.started_at < started:
                # Another sync (e.g. "Sync now") was already running; try again next tick
                if history_days:
                    SyncService.request_history_sync(integration, history_days)
                    db.commit()
                continue
            ran += 1
            if log.status == "failed":
                # Back off instead of retrying every minute (e.g. while rate-limited)
                interval = SCHEDULE_INTERVALS.get(integration.sync_schedule, FAILED_SYNC_RETRY)
                integration.next_sync_at = datetime.utcnow() + min(interval, FAILED_SYNC_RETRY)
                db.commit()
        return ran
