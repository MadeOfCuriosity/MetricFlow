"""run_exclusive: single-runner guard for scheduled jobs."""
from app.core.job_lock import _lock_key, run_exclusive
from tests.conftest import engine as sqlite_engine


def test_lock_key_is_stable_and_distinct():
    assert _lock_key("whatsapp_reminders") == _lock_key("whatsapp_reminders")
    assert _lock_key("whatsapp_reminders") != _lock_key("integration_sync")
    assert -(2**63) <= _lock_key("x") < 2**63


def test_sqlite_always_runs():
    with run_exclusive("anything", engine=sqlite_engine) as acquired:
        assert acquired is True
