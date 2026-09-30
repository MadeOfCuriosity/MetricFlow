"""Tests for the guided Zoho Books setup (shared sign-in, batch sources)."""

from datetime import date, datetime, timedelta

import pytest
from cryptography.fernet import Fernet

import app.core.encryption as encryption
from app.core.config import settings
from app.core.encryption import encrypt_value, decrypt_value
from app.models import Organization
from app.models.data_field import DataField
from app.models.integration import Integration
from app.models.integration_field_mapping import IntegrationFieldMapping
from app.services.connectors import zoho_books as zb_module
from app.services.connectors.zoho_books import ZohoBooksConnector
from app.services.sync_service import SyncService
from app.services.zoho_books_setup_service import ZohoBooksSetupService


@pytest.fixture(autouse=True)
def encryption_key(monkeypatch):
    monkeypatch.setattr(settings, "ENCRYPTION_KEY", Fernet.generate_key().decode())
    monkeypatch.setattr(encryption, "_fernet", None)
    yield
    encryption._fernet = None


@pytest.fixture
def admin(client, test_org_data, db_session):
    resp = client.post("/api/auth/register-org", json=test_org_data)
    assert resp.status_code == 201
    headers = {"Authorization": f"Bearer {resp.json()['access_token']}"}
    org = db_session.query(Organization).first()
    return headers, org


def make_zoho(db, org, config=None, refresh="refresh-1", status="connected", name="Zoho Books"):
    integration = Integration(
        org_id=org.id,
        provider="zoho_books",
        display_name=name,
        status=status,
        config=config or {},
        sync_schedule="manual",
        access_token_encrypted=encrypt_value("access-1"),
        refresh_token_encrypted=encrypt_value(refresh),
        token_expires_at=datetime.utcnow() + timedelta(hours=1),
    )
    db.add(integration)
    db.commit()
    db.refresh(integration)
    return integration


def invoices_and_expenses():
    return {
        "org_id": "60015296311",
        "sync_schedule": "manual",
        "sources": [
            {
                "module": "invoices",
                "display_name": "Zoho Books · Invoices",
                "mappings": [
                    {"external_field_name": "total", "aggregation": "sum", "new_field_name": "Revenue"},
                    {"external_field_name": "total", "aggregation": "count", "new_field_name": "Invoices Raised"},
                ],
            },
            {
                "module": "expenses",
                "display_name": "Zoho Books · Expenses",
                "mappings": [
                    {"external_field_name": "total", "aggregation": "sum", "new_field_name": "Expenses"},
                ],
            },
        ],
    }


def test_sources_share_one_sign_in(client, admin, db_session):
    headers, org = admin
    bare = make_zoho(db_session, org)

    resp = client.post(f"/api/integrations/{bare.id}/zoho-books/sources", json=invoices_and_expenses(), headers=headers)
    assert resp.status_code == 201, resp.text
    created = resp.json()["integrations"]
    assert [c["display_name"] for c in created] == ["Zoho Books · Invoices", "Zoho Books · Expenses"]

    # The bare sign-in row becomes the first source instead of lingering
    assert created[0]["id"] == str(bare.id)
    rows = db_session.query(Integration).filter(Integration.org_id == org.id).all()
    assert len(rows) == 2
    for row in rows:
        assert row.status == "connected"
        assert decrypt_value(row.refresh_token_encrypted) == "refresh-1"
        assert row.config["zoho_org_id"] == "60015296311"
    assert {r.config["module"] for r in rows} == {"invoices", "expenses"}

    names = sorted(f.name for f in db_session.query(DataField).filter(DataField.org_id == org.id))
    assert names == ["Expenses", "Invoices Raised", "Revenue"]
    assert db_session.query(IntegrationFieldMapping).count() == 3


def test_adding_later_keeps_existing_source(client, admin, db_session):
    headers, org = admin
    invoices = make_zoho(db_session, org, config={"module": "invoices", "zoho_org_id": "60015296311"}, name="Invoices")

    body = invoices_and_expenses()
    body["sources"] = body["sources"][1:]  # expenses only
    resp = client.post(f"/api/integrations/{invoices.id}/zoho-books/sources", json=body, headers=headers)
    assert resp.status_code == 201, resp.text
    db_session.refresh(invoices)
    assert invoices.config["module"] == "invoices"
    assert db_session.query(Integration).count() == 2


def test_duplicate_source_rejected(client, admin, db_session):
    headers, org = admin
    invoices = make_zoho(db_session, org, config={"module": "invoices", "zoho_org_id": "60015296311"}, name="Invoices")

    body = invoices_and_expenses()
    resp = client.post(f"/api/integrations/{invoices.id}/zoho-books/sources", json=body, headers=headers)
    assert resp.status_code == 409
    assert "already syncing" in resp.json()["detail"]
    assert db_session.query(Integration).count() == 1
    assert db_session.query(DataField).count() == 0


def test_field_used_twice_rolls_back(client, admin, db_session):
    headers, org = admin
    bare = make_zoho(db_session, org)

    body = invoices_and_expenses()
    body["sources"][1]["mappings"][0]["new_field_name"] = "revenue"  # same field as invoices
    resp = client.post(f"/api/integrations/{bare.id}/zoho-books/sources", json=body, headers=headers)
    assert resp.status_code == 400
    db_session.expire_all()
    assert db_session.query(DataField).count() == 0
    assert db_session.query(Integration).count() == 1
    assert not db_session.get(Integration, bare.id).config.get("module")


def test_field_fed_by_another_integration_rejected(client, admin, db_session):
    headers, org = admin
    invoices = make_zoho(db_session, org, config={"module": "invoices", "zoho_org_id": "60015296311"}, name="Invoices")
    revenue = DataField(org_id=org.id, name="Revenue", variable_name="revenue", entry_interval="daily")
    db_session.add(revenue)
    db_session.flush()
    db_session.add(IntegrationFieldMapping(
        integration_id=invoices.id, data_field_id=revenue.id, external_field_name="total", aggregation="sum",
    ))
    db_session.commit()

    body = invoices_and_expenses()
    body["sources"] = [body["sources"][1]]
    body["sources"][0]["mappings"][0] = {"external_field_name": "total", "aggregation": "sum", "data_field_id": str(revenue.id)}
    resp = client.post(f"/api/integrations/{invoices.id}/zoho-books/sources", json=body, headers=headers)
    assert resp.status_code == 409
    assert "already filled by" in resp.json()["detail"]


def test_gl_source_needs_account(client, admin, db_session):
    headers, org = admin
    bare = make_zoho(db_session, org)
    body = {
        "org_id": "1",
        "sync_schedule": "manual",
        "sources": [{
            "module": "gl_expense",
            "display_name": "Salaries",
            "mappings": [{"external_field_name": "amount", "aggregation": "sum", "new_field_name": "Payroll"}],
        }],
    }
    resp = client.post(f"/api/integrations/{bare.id}/zoho-books/sources", json=body, headers=headers)
    assert resp.status_code == 400

    body["sources"][0]["gl_account_id"] = "1877271000001490007"
    resp = client.post(f"/api/integrations/{bare.id}/zoho-books/sources", json=body, headers=headers)
    assert resp.status_code == 201, resp.text
    assert resp.json()["integrations"][0]["config"]["gl_account_id"] == "1877271000001490007"


def test_signed_out_integration_rejected(client, admin, db_session):
    headers, org = admin
    pending = make_zoho(db_session, org, status="pending_auth")
    pending.refresh_token_encrypted = None
    db_session.commit()
    resp = client.post(f"/api/integrations/{pending.id}/zoho-books/sources", json=invoices_and_expenses(), headers=headers)
    assert resp.status_code == 400


def test_new_sign_in_is_shared_with_siblings(admin, db_session):
    _, org = admin
    fresh = make_zoho(db_session, org, config={"module": "invoices"}, refresh="refresh-new")
    sibling = make_zoho(db_session, org, config={"module": "expenses"}, refresh="refresh-old", status="error")
    other = make_zoho(db_session, org, config={"module": "bills"}, refresh="another-account")

    updated = ZohoBooksSetupService.share_new_tokens(db_session, fresh, "refresh-old")
    assert updated == 1
    db_session.refresh(sibling)
    db_session.refresh(other)
    assert decrypt_value(sibling.refresh_token_encrypted) == "refresh-new"
    assert sibling.status == "connected"
    assert decrypt_value(other.refresh_token_encrypted) == "another-account"


# --- Connector: min/max aggregation and preview ---

class FakeResponse:
    status_code = 200

    def __init__(self, payload):
        self._payload = payload

    def raise_for_status(self):
        pass

    def json(self):
        return self._payload


class FakeClient:
    def __init__(self, *args, **kwargs):
        pass

    def __enter__(self):
        return self

    def __exit__(self, *exc):
        return False

    def get(self, url, headers=None, params=None):
        today = date.today().isoformat()
        return FakeResponse({
            "code": 0,
            "invoices": [
                {"invoice_id": "1", "date": today, "total": 100.0, "status": "paid"},
                {"invoice_id": "2", "date": today, "total": 250.0, "status": "sent"},
            ],
            "page_context": {"has_more_page": False},
        })


def test_min_max_are_computed(monkeypatch, admin, db_session):
    _, org = admin
    monkeypatch.setattr(zb_module.httpx, "Client", FakeClient)
    integration = make_zoho(db_session, org, config={"module": "invoices", "zoho_org_id": "1"})

    rows = ZohoBooksConnector(integration, db_session).fetch_data(date.today(), date.today())
    assert len(rows) == 1
    row = rows[0]
    assert SyncService._extract_value(row, "total", "sum") == 350.0
    assert SyncService._extract_value(row, "total", "min") == 100.0
    assert SyncService._extract_value(row, "total", "max") == 250.0
    assert SyncService._extract_value(row, "total", "count") == 2.0


def test_preview_returns_daily_numbers_only(monkeypatch, client, admin, db_session):
    headers, org = admin
    monkeypatch.setattr(zb_module.httpx, "Client", FakeClient)
    bare = make_zoho(db_session, org)

    resp = client.get(
        f"/api/integrations/{bare.id}/zoho-books/preview",
        params={"org_id": "1", "module": "invoices"},
        headers=headers,
    )
    assert resp.status_code == 200, resp.text
    [row] = resp.json()["rows"]
    assert row["date"] == date.today().isoformat()
    assert row["total__sum"] == 350.0
    assert row["__record_count"] == 2
    assert "_records" not in row

    gl = client.get(
        f"/api/integrations/{bare.id}/zoho-books/preview",
        params={"org_id": "1", "module": "gl_revenue"},
        headers=headers,
    )
    assert gl.status_code == 400


def test_oauth_return_uses_first_frontend_origin(monkeypatch):
    from app.api.routes import integrations as routes
    monkeypatch.setattr(settings, "FRONTEND_URL", "https://visualize.example.com, https://main.amplifyapp.com")
    assert routes._frontend_base() == "https://visualize.example.com"
