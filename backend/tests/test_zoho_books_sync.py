"""Zoho Books sync accuracy: statuses, currency, trailing window, empty days."""

from datetime import date, datetime, timedelta

import pytest
from cryptography.fernet import Fernet

import app.core.encryption as encryption
from app.core.config import settings
from app.core.encryption import encrypt_value
from app.models import Organization, User
from app.models.data_field import DataField
from app.models.data_field_entry import DataFieldEntry
from app.models.integration import Integration
from app.models.integration_field_mapping import IntegrationFieldMapping
from app.models.sync_log import SyncLog
from app.services.connectors import zoho_books as zb
from app.services.connectors.zoho_books import ZohoBooksConnector
from app.services.sync_service import SyncService, RESYNC_WINDOW_DAYS

TODAY = date.today()
D = lambda n: TODAY - timedelta(days=n)  # noqa: E731


@pytest.fixture(autouse=True)
def setup_env(monkeypatch):
    monkeypatch.setattr(settings, "ENCRYPTION_KEY", Fernet.generate_key().decode())
    monkeypatch.setattr(encryption, "_fernet", None)
    monkeypatch.setattr(ZohoBooksConnector, "refresh_auth", lambda self: True)
    monkeypatch.setattr(zb.time, "sleep", lambda s: None)
    zb._DETAIL_CACHE.clear()
    yield
    encryption._fernet = None


class Resp:
    def __init__(self, payload, status_code=200):
        self._payload, self.status_code, self.text, self.headers = payload, status_code, "", {}

    def json(self):
        return self._payload


def fake_zoho(monkeypatch, handler):
    """Route every Zoho GET through handler(path, params) -> Resp. Returns the call log."""
    calls = []

    class Client:
        def __init__(self, *a, **k):
            pass

        def __enter__(self):
            return self

        def __exit__(self, *exc):
            return False

        def get(self, url, headers=None, params=None):
            path = url.split("/books/v3/", 1)[1]
            calls.append(path)
            return handler(path, params or {})

    monkeypatch.setattr(zb.httpx, "Client", Client)
    return calls


def page(key, records, more=False):
    return Resp({"code": 0, key: records, "page_context": {"has_more_page": more}})


@pytest.fixture
def org(client, test_org_data, db_session):
    assert client.post("/api/auth/register-org", json=test_org_data).status_code == 201
    return db_session.query(Organization).first()


def make_source(db, org, config, aggregation="sum", field_name="total", name="Revenue"):
    integration = Integration(
        org_id=org.id, provider="zoho_books", display_name=f"Zoho Books — {name}", status="connected",
        config={"zoho_org_id": "1", **config}, sync_schedule="manual",
        access_token_encrypted=encrypt_value("a"), refresh_token_encrypted=encrypt_value("r"),
        token_expires_at=datetime.utcnow() + timedelta(hours=1),
    )
    field = DataField(org_id=org.id, name=name, variable_name=name.lower().replace(" ", "_"), entry_interval="daily")
    db.add_all([integration, field])
    db.flush()
    db.add(IntegrationFieldMapping(
        integration_id=integration.id, data_field_id=field.id,
        external_field_name=field_name, aggregation=aggregation,
    ))
    db.commit()
    return integration, field


def entries(db, field):
    db.expire_all()
    return {e.date: e for e in db.query(DataFieldEntry).filter(DataFieldEntry.data_field_id == field.id)}


INVOICES = [
    {"invoice_id": "1", "date": D(1).isoformat(), "status": "paid", "total": 1000.0, "exchange_rate": 1.0},
    {"invoice_id": "2", "date": D(1).isoformat(), "status": "draft", "total": 177000.0, "exchange_rate": 1.0},
    {"invoice_id": "3", "date": D(1).isoformat(), "status": "void", "total": 59000.0, "exchange_rate": 1.0},
    {"invoice_id": "4", "date": D(3).isoformat(), "status": "overdue", "total": 800.0, "exchange_rate": 110.0},
]


def test_drafts_voids_excluded_and_currency_converted(monkeypatch, org, db_session):
    fake_zoho(monkeypatch, lambda path, p: page("invoices", INVOICES))
    integration, _ = make_source(db_session, org, {"module": "invoices"})

    rows = {r["date"]: r for r in ZohoBooksConnector(integration, db_session).fetch_data(D(5), TODAY)}
    assert rows[D(1)]["total__sum"] == 1000.0          # draft + void left out
    assert rows[D(1)]["__record_count"] == 1
    assert rows[D(3)]["total__sum"] == 800.0 * 110.0    # EUR invoice in base currency


def test_base_currency_field_preferred():
    rec = {"amount": 50.0, "bcy_amount": 4500.0, "exchange_rate": 99.0, "reminders_sent": 2}
    out = zb.to_base_currency(rec)
    assert out["amount"] == 4500.0
    assert out["reminders_sent"] == 2  # not a money field


def test_gl_revenue_filters_status_converts_and_shares_cache(monkeypatch, org, db_session):
    stubs = [
        {"invoice_id": "10", "date": D(2).isoformat(), "status": "paid", "last_modified_time": "t1"},
        {"invoice_id": "11", "date": D(2).isoformat(), "status": "void", "last_modified_time": "t1"},
    ]
    detail = {"invoice": {"exchange_rate": 90.0, "line_items": [
        {"account_id": "smm", "item_total": 100.0, "quantity": 1},
        {"account_id": "pm", "item_total": 40.0, "quantity": 1},
    ]}}

    def handler(path, p):
        return page("invoices", stubs) if path == "invoices" else Resp({"code": 0, **detail})

    calls = fake_zoho(monkeypatch, handler)
    smm, _ = make_source(db_session, org, {"module": "gl_revenue", "gl_account_id": "smm"}, field_name="item_total", name="SMM")
    pm, _ = make_source(db_session, org, {"module": "gl_revenue", "gl_account_id": "pm"}, field_name="item_total", name="PM")

    [row] = ZohoBooksConnector(smm, db_session).fetch_data(D(5), TODAY)
    assert row["item_total__sum"] == 100.0 * 90.0
    [row] = ZohoBooksConnector(pm, db_session).fetch_data(D(5), TODAY)
    assert row["item_total__sum"] == 40.0 * 90.0
    # The void invoice is never read, and the second source reuses the first's detail
    assert calls.count("invoices/10") == 1
    assert "invoices/11" not in calls


def test_sync_fills_empty_days_and_keeps_manual_values(monkeypatch, org, db_session):
    fake_zoho(monkeypatch, lambda path, p: page("invoices", INVOICES))
    integration, field = make_source(db_session, org, {"module": "invoices"})
    user = db_session.query(User).first()
    # A hand-entered value on a day Zoho has no invoices, and one on a day it does
    db_session.add_all([
        DataFieldEntry(org_id=org.id, data_field_id=field.id, date=D(2), value=555.0, entered_by=user.id, source="web"),
        DataFieldEntry(org_id=org.id, data_field_id=field.id, date=D(1), value=9.0, entered_by=user.id, source="whatsapp"),
        # A stale synced value from an invoice that was since deleted
        DataFieldEntry(org_id=org.id, data_field_id=field.id, date=D(4), value=321.0, entered_by=None, source=None),
    ])
    db_session.commit()

    log = SyncService.execute_sync(db_session, integration.id, start_date=D(5), end_date=TODAY)
    assert log.status == "success", log.error_details
    got = entries(db_session, field)
    assert got[D(1)].value == 1000.0 and got[D(1)].source == "integration"   # Zoho replaces the manual value
    assert got[D(2)].value == 555.0 and got[D(2)].source == "web"            # empty day: manual value kept
    assert got[D(3)].value == 88000.0
    assert got[D(4)].value == 0.0                                            # deleted invoice cleared
    assert got[D(5)].value == 0.0 and got[TODAY].value == 0.0
    assert "Replaced 1 value" in log.summary


def test_average_mapping_clears_empty_days_instead_of_zero(monkeypatch, org, db_session):
    fake_zoho(monkeypatch, lambda path, p: page("invoices", INVOICES))
    integration, field = make_source(db_session, org, {"module": "invoices"}, aggregation="avg")
    db_session.add(DataFieldEntry(org_id=org.id, data_field_id=field.id, date=D(4), value=10.0, source="integration"))
    db_session.commit()

    SyncService.execute_sync(db_session, integration.id, start_date=D(5), end_date=TODAY)
    got = entries(db_session, field)
    assert D(4) not in got and D(5) not in got
    assert got[D(1)].value == 1000.0


def test_truncated_fetch_is_partial_and_does_not_zero_fill(monkeypatch, org, db_session):
    monkeypatch.setattr(zb, "MAX_LIST_PAGES", 1)
    fake_zoho(monkeypatch, lambda path, p: page("invoices", INVOICES, more=True))
    integration, field = make_source(db_session, org, {"module": "invoices"})
    db_session.add(DataFieldEntry(org_id=org.id, data_field_id=field.id, date=D(4), value=321.0, source="integration"))
    db_session.commit()

    log = SyncService.execute_sync(db_session, integration.id, start_date=D(5), end_date=TODAY)
    assert log.status == "partial"
    assert entries(db_session, field)[D(4)].value == 321.0
    db_session.refresh(integration)
    assert integration.status == "connected" and "later days may be missing" in integration.error_message


def test_failed_fetch_fails_the_sync_and_leaves_data(monkeypatch, org, db_session):
    fake_zoho(monkeypatch, lambda path, p: Resp({}, status_code=429))
    integration, field = make_source(db_session, org, {"module": "invoices"})
    db_session.add(DataFieldEntry(org_id=org.id, data_field_id=field.id, date=D(1), value=42.0, source="integration"))
    db_session.commit()

    log = SyncService.execute_sync(db_session, integration.id, start_date=D(5), end_date=TODAY)
    assert log.status == "failed"
    assert entries(db_session, field)[D(1)].value == 42.0


def test_trailing_window_and_long_ranges_in_chunks(monkeypatch, org, db_session):
    ranges = []

    def handler(path, p):
        ranges.append((p["date_start"], p["date_end"]))
        return page("invoices", [])

    fake_zoho(monkeypatch, handler)
    integration, _ = make_source(db_session, org, {"module": "invoices"})
    integration.last_synced_at = datetime.utcnow() - timedelta(hours=2)
    db_session.commit()

    assert SyncService.sync_range(integration, True) == (D(RESYNC_WINDOW_DAYS - 1), TODAY)
    assert SyncService.sync_range(integration, False)[0] == integration.last_synced_at.date() - timedelta(days=1)

    SyncService.execute_sync(db_session, integration.id, start_date=D(99), end_date=TODAY)
    assert len(ranges) == 4  # 100 days in 31-day periods
    assert ranges[0][0] == D(99).isoformat() and ranges[-1][1] == TODAY.isoformat()


def test_second_sync_waits_for_the_running_one(org, db_session):
    integration, _ = make_source(db_session, org, {"module": "invoices"})
    running = SyncLog(integration_id=integration.id, status="running", trigger_type="manual", started_at=datetime.utcnow())
    db_session.add(running)
    db_session.commit()
    assert SyncService.execute_sync(db_session, integration.id).id == running.id
    assert db_session.query(SyncLog).count() == 1


def test_resync_endpoint_queues_history(client, test_org_data, db_session):
    reg = client.post("/api/auth/register-org", json=test_org_data)
    headers = {"Authorization": f"Bearer {reg.json()['access_token']}"}
    org_row = db_session.query(Organization).first()
    integration, _ = make_source(db_session, org_row, {"module": "invoices"})

    resp = client.post(f"/api/integrations/{integration.id}/resync", json={"days": 365}, headers=headers)
    assert resp.status_code == 202, resp.text
    db_session.refresh(integration)
    assert integration.config["pending_history_days"] == 365


def test_due_syncs_run_once_each_and_back_off_on_failure(monkeypatch, org, db_session):
    ranges = []

    def handler(path, p):
        if p.get("organization_id") == "broken":
            return Resp({}, status_code=429)
        ranges.append((p["date_start"], p["date_end"]))
        return page("invoices", [])

    fake_zoho(monkeypatch, handler)
    due, _ = make_source(db_session, org, {"module": "invoices"}, name="Due")
    later, _ = make_source(db_session, org, {"module": "invoices"}, name="Later")
    history, _ = make_source(db_session, org, {"module": "invoices", "pending_history_days": 100}, name="History")
    broken, _ = make_source(db_session, org, {"module": "invoices", "zoho_org_id": "broken"}, name="Broken")
    manual, _ = make_source(db_session, org, {"module": "invoices"}, name="Manual")
    for i in (due, later, broken):
        i.sync_schedule = "24h"
    due.next_sync_at = datetime.utcnow() - timedelta(days=50)   # overdue (e.g. server was down)
    later.next_sync_at = datetime.utcnow() + timedelta(hours=5)
    broken.next_sync_at = None
    db_session.commit()

    assert SyncService.run_due_syncs(db_session) == 3  # due, history, broken — not later/manual
    for i in (due, later, history, broken, manual):
        db_session.refresh(i)
    assert due.last_synced_at and due.next_sync_at > datetime.utcnow() + timedelta(hours=23)
    assert later.last_synced_at is None and manual.last_synced_at is None
    assert "pending_history_days" not in history.config
    assert (D(99).isoformat(), D(69).isoformat()) in ranges  # history chunk
    # Failed sync retries in 30 minutes rather than every tick or a day later
    assert broken.status == "error"
    assert timedelta(minutes=29) < broken.next_sync_at - datetime.utcnow() <= timedelta(minutes=30)

    assert SyncService.run_due_syncs(db_session) == 0  # nothing due right after


def test_empty_days_not_filled_for_monthly_fields(monkeypatch, org, db_session):
    fake_zoho(monkeypatch, lambda path, p: page("invoices", INVOICES))
    integration, field = make_source(db_session, org, {"module": "invoices"})
    field.entry_interval = "monthly"
    db_session.commit()

    SyncService.execute_sync(db_session, integration.id, start_date=D(5), end_date=TODAY)
    assert set(entries(db_session, field)) == {D(1), D(3)}
