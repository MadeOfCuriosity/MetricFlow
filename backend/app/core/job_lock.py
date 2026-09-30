"""
Run a scheduled job in only one process at a time.

Production runs several workers/instances, and each runs its own APScheduler, so a job
(e.g. "send WhatsApp reminders") fires once per process. Wrap the job body in
`run_exclusive(name)`: the first process takes a Postgres advisory lock and runs; the others
skip. Jobs should also be idempotent (e.g. "already reminded today?"), so a later duplicate
run after the lock is released does nothing.

On SQLite (tests/local) there's nothing to coordinate, so it always runs.
"""
import hashlib
import logging
from contextlib import contextmanager
from typing import Iterator

from sqlalchemy import text

logger = logging.getLogger(__name__)


def _lock_key(name: str) -> int:
    """Stable signed 64-bit key for pg advisory locks."""
    return int.from_bytes(hashlib.sha256(f"visualize-job:{name}".encode()).digest()[:8], "big", signed=True)


@contextmanager
def run_exclusive(name: str, engine=None) -> Iterator[bool]:
    """
    with run_exclusive("whatsapp_reminders") as acquired:
        if acquired:
            ...do the work...
    """
    if engine is None:
        from app.core.database import engine as default_engine
        engine = default_engine
    if engine.dialect.name != "postgresql":
        yield True
        return

    key = _lock_key(name)
    conn = engine.connect().execution_options(isolation_level="AUTOCOMMIT")
    try:
        acquired = bool(conn.execute(text("SELECT pg_try_advisory_lock(:k)"), {"k": key}).scalar())
        if not acquired:
            logger.info("Job %s already running in another process; skipping", name)
        try:
            yield acquired
        finally:
            if acquired:
                conn.execute(text("SELECT pg_advisory_unlock(:k)"), {"k": key})
    finally:
        conn.close()
