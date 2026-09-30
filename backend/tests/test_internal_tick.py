"""External cron tick: hidden without a secret, guarded by it, runs the jobs."""
from app.core.config import settings


def test_tick_requires_configured_secret(client, monkeypatch):
    monkeypatch.setattr(settings, "CRON_SECRET", None)
    assert client.post("/api/internal/tick").status_code == 404


def test_tick_checks_secret_and_runs_jobs(client, monkeypatch):
    monkeypatch.setattr(settings, "CRON_SECRET", "s3cret")
    assert client.post("/api/internal/tick", headers={"X-Cron-Secret": "nope"}).status_code == 403
    calls = []
    monkeypatch.setattr("app.api.routes.internal.run_jobs_once", lambda: calls.append(1) or {"syncs": 0})
    resp = client.post("/api/internal/tick", headers={"X-Cron-Secret": "s3cret"})
    assert resp.status_code == 200 and resp.json() == {"syncs": 0} and calls == [1]


def test_run_jobs_once_runs_on_empty_db(db_session, monkeypatch):
    from app.core import scheduler

    monkeypatch.setattr("app.core.database.SessionLocal", lambda: db_session)
    monkeypatch.setattr(db_session, "close", lambda: None)
    assert scheduler.run_jobs_once() == {"syncs": 0, "reminders": "ok"}

