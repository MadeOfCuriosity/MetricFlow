import logging
from datetime import datetime, timedelta

from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.jobstores.memory import MemoryJobStore
from sqlalchemy import text

logger = logging.getLogger(__name__)

scheduler = BackgroundScheduler(
    jobstores={"default": MemoryJobStore()},
    job_defaults={"coalesce": True, "max_instances": 1},
)

# Production runs several uvicorn workers, each with this scheduler. Only the
# worker holding this Postgres advisory lock runs syncs; if it dies, the lock
# is released with its connection and another worker takes over.
SYNC_LOCK_KEY = 815_001
TICK_SECONDS = 60

_lock_conn = None
_is_owner = False


def _release_lock() -> None:
    global _lock_conn, _is_owner
    _is_owner = False
    if _lock_conn is not None:
        try:
            _lock_conn.close()
        except Exception:
            pass
        _lock_conn = None


def _hold_sync_lock() -> bool:
    """True if this process is the one that runs syncs (acquiring the lock if free)."""
    global _lock_conn, _is_owner
    from app.core.database import engine

    if engine.dialect.name != "postgresql":
        return True  # single-process setups (SQLite dev/tests)
    try:
        if _lock_conn is None:
            _lock_conn = engine.connect()
        if _is_owner:
            _lock_conn.execute(text("SELECT 1"))  # the lock lives as long as this connection
        else:
            _is_owner = bool(_lock_conn.execute(
                text("SELECT pg_try_advisory_lock(:key)"), {"key": SYNC_LOCK_KEY},
            ).scalar())
            if _is_owner:
                logger.info("This worker now runs integration syncs")
        _lock_conn.commit()
    except Exception as e:
        logger.warning(f"Lost the integration sync lock connection: {e}")
        _release_lock()
    return _is_owner


def _tick() -> None:
    if not _hold_sync_lock():
        return
    from app.core.database import SessionLocal
    from app.services.sync_service import SyncService

    db = SessionLocal()
    try:
        SyncService.run_due_syncs(db)
    except Exception as e:
        logger.error(f"Integration sync tick failed: {e}", exc_info=True)
    finally:
        db.close()


def run_jobs_once() -> dict:
    """
    One pass of every scheduled job, for an external cron (see settings.CPU_ONLY_DURING_REQUESTS).
    Each job takes its own short-lived lock, so overlapping calls skip instead of doubling up.
    """
    from app.core.database import SessionLocal
    from app.core.job_lock import run_exclusive
    from app.services.sync_service import SyncService
    from app.services.whatsapp.reminders import send_due_reminders

    result = {"syncs": None, "reminders": "ok"}
    with run_exclusive("integration_syncs") as acquired:
        if acquired:
            db = SessionLocal()
            try:
                result["syncs"] = SyncService.run_due_syncs(db)
            except Exception as e:
                logger.error(f"Integration sync tick failed: {e}", exc_info=True)
                result["syncs"] = "failed"
            finally:
                db.close()
        else:
            result["syncs"] = "busy"
    try:
        send_due_reminders()
    except Exception:
        logger.exception("WhatsApp reminders tick failed")
        result["reminders"] = "failed"
    return result


def start_scheduler():
    """Start the scheduler; every minute it runs whatever integration syncs are due."""
    from app.core.config import settings

    if settings.CPU_ONLY_DURING_REQUESTS:
        logger.info("Scheduler off: jobs run when the external cron calls /api/internal/tick")
        return
    scheduler.add_job(
        _tick,
        "interval",
        seconds=TICK_SECONDS,
        id="integration_sync_tick",
        next_run_time=datetime.now().astimezone() + timedelta(seconds=30),
        replace_existing=True,
    )
    from app.services.whatsapp.reminders import send_due_reminders

    # Runs in every worker; send_due_reminders takes its own lock so only one sends
    scheduler.add_job(
        send_due_reminders,
        "interval",
        minutes=5,
        id="whatsapp_reminders",
        next_run_time=datetime.now().astimezone() + timedelta(seconds=45),
        replace_existing=True,
    )
    scheduler.start()
    logger.info("APScheduler started for integration syncs and WhatsApp reminders")


def shutdown_scheduler():
    """Gracefully shut down the scheduler."""
    if scheduler.running:
        scheduler.shutdown(wait=False)
        logger.info("APScheduler shut down")
    _release_lock()
