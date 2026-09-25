"""WhatsApp foundations: webhook verification/signature, phone linking via inbound VERIFY, STOP/START."""
import hashlib
import hmac
import json

import pytest

from app.core.config import settings
from app.models import User
from app.models.whatsapp import WhatsAppMessage

APP_SECRET = "test-app-secret"


@pytest.fixture
def wa(monkeypatch):
    """Configure WhatsApp and capture outbound API calls instead of hitting Meta."""
    monkeypatch.setattr(settings, "WHATSAPP_PHONE_NUMBER_ID", "123")
    monkeypatch.setattr(settings, "WHATSAPP_ACCESS_TOKEN", "token")
    monkeypatch.setattr(settings, "WHATSAPP_APP_SECRET", APP_SECRET)
    monkeypatch.setattr(settings, "WHATSAPP_VERIFY_TOKEN", "verify-me")
    monkeypatch.setattr(settings, "WHATSAPP_DISPLAY_NUMBER", "918848827741")
    sent = []

    class Resp:
        def __init__(self, data):
            self._data, self.status_code, self.content = data, 200, b"x"

        def json(self):
            return self._data

    def fake_post(url, json=None, headers=None, timeout=None):
        sent.append(json)
        return Resp({"messages": [{"id": f"wamid.out{len(sent)}"}]})

    monkeypatch.setattr("app.services.whatsapp.client.httpx.post", fake_post)
    return sent


def _auth(client, test_org_data):
    resp = client.post("/api/auth/register-org", json=test_org_data)
    assert resp.status_code == 201
    return {"Authorization": f"Bearer {resp.json()['access_token']}"}


def _post_webhook(client, payload, secret=APP_SECRET):
    body = json.dumps(payload).encode()
    sig = "sha256=" + hmac.new(secret.encode(), body, hashlib.sha256).hexdigest()
    return client.post("/api/whatsapp/webhook", content=body, headers={"X-Hub-Signature-256": sig, "Content-Type": "application/json"})


def _inbound(from_digits, text, wamid):
    return {"entry": [{"changes": [{"value": {"messages": [
        {"from": from_digits, "id": wamid, "type": "text", "text": {"body": text}}
    ]}}]}]}


def _texts(sent):
    return [m["text"]["body"] for m in sent if m.get("type") == "text"]


def test_webhook_verification_handshake(client, wa):
    ok = client.get("/api/whatsapp/webhook", params={"hub.mode": "subscribe", "hub.verify_token": "verify-me", "hub.challenge": "42"})
    assert ok.status_code == 200 and ok.text == "42"
    bad = client.get("/api/whatsapp/webhook", params={"hub.mode": "subscribe", "hub.verify_token": "nope", "hub.challenge": "42"})
    assert bad.status_code == 403


def test_webhook_rejects_bad_signature(client, wa):
    resp = _post_webhook(client, _inbound("918848827741", "hi", "wamid.x"), secret="wrong")
    assert resp.status_code == 403


def test_link_phone_via_inbound_verify(client, db_session, test_org_data, wa):
    headers = _auth(client, test_org_data)

    # Org must enable WhatsApp first
    assert client.post("/api/whatsapp/link", json={"phone": "+91 88488 27741"}, headers=headers).status_code == 400
    assert client.put("/api/whatsapp/org", json={"enabled": True, "timezone": "Asia/Kolkata"}, headers=headers).status_code == 200

    start = client.post("/api/whatsapp/link", json={"phone": "088488 27741"}, headers=headers)
    assert start.status_code == 200, start.text
    body = start.json()
    assert body["phone_e164"] == "+918848827741"
    assert body["wa_link"] == f"https://wa.me/918848827741?text=VERIFY%20{body['code']}"

    # Wrong code from the right number doesn't link
    _post_webhook(client, _inbound("918848827741", "VERIFY 000000", "wamid.a"))
    assert client.get("/api/whatsapp/status", headers=headers).json()["me"]["verified"] is False

    # Right code from a different number doesn't link either
    _post_webhook(client, _inbound("919999999999", f"VERIFY {body['code']}", "wamid.b"))
    assert client.get("/api/whatsapp/status", headers=headers).json()["me"]["verified"] is False

    # Right code from the right number links, opts in, and replies
    _post_webhook(client, _inbound("918848827741", f"verify {body['code']}", "wamid.c"))
    status = client.get("/api/whatsapp/status", headers=headers).json()
    assert status["me"] == {"phone_e164": "+918848827741", "verified": True, "opted_in": True, "pending": None}
    assert status["timezone"] == "Asia/Kolkata"
    assert "Connected" in _texts(wa)[-1]

    # The code itself is never stored in the message log
    assert all("VERIFY 0" not in (m.body or "") and body["code"] not in (m.body or "") for m in db_session.query(WhatsAppMessage).all())


def test_duplicate_webhook_delivery_is_ignored(client, test_org_data, wa):
    _auth(client, test_org_data)
    _post_webhook(client, _inbound("918848827741", "hello", "wamid.dup"))
    _post_webhook(client, _inbound("918848827741", "hello", "wamid.dup"))
    assert len(_texts(wa)) == 1  # one "not linked yet" reply, not two


def test_stop_and_start(client, db_session, test_org_data, wa):
    headers = _auth(client, test_org_data)
    client.put("/api/whatsapp/org", json={"enabled": True}, headers=headers)
    code = client.post("/api/whatsapp/link", json={"phone": "+918848827741"}, headers=headers).json()["code"]
    _post_webhook(client, _inbound("918848827741", f"VERIFY {code}", "wamid.1"))

    _post_webhook(client, _inbound("918848827741", "STOP", "wamid.2"))
    assert client.get("/api/whatsapp/status", headers=headers).json()["me"]["opted_in"] is False
    _post_webhook(client, _inbound("918848827741", "start", "wamid.3"))
    assert client.get("/api/whatsapp/status", headers=headers).json()["me"]["opted_in"] is True

    # Unlink clears everything
    me = client.delete("/api/whatsapp/link", headers=headers).json()
    assert me == {"phone_e164": None, "verified": False, "opted_in": False, "pending": None}


def test_number_cannot_be_linked_to_two_users(client, db_session, test_org_data, wa):
    headers = _auth(client, test_org_data)
    client.put("/api/whatsapp/org", json={"enabled": True}, headers=headers)
    other = db_session.query(User).first()
    from datetime import datetime
    ghost = User(org_id=other.org_id, email="x@y.z", name="Ghost", role="room_admin", role_label="R",
                 phone_e164="+918848827741", phone_verified_at=datetime.utcnow())
    db_session.add(ghost)
    db_session.commit()
    resp = client.post("/api/whatsapp/link", json={"phone": "+918848827741"}, headers=headers)
    assert resp.status_code == 400 and "already linked" in resp.json()["detail"]


def test_delivery_status_only_moves_forward(client, db_session, test_org_data, wa):
    _auth(client, test_org_data)
    db_session.add(WhatsAppMessage(direction="out", wa_message_id="wamid.s", phone_e164="+1", message_type="text", status="sent"))
    db_session.commit()
    for st in ["read", "delivered"]:
        _post_webhook(client, {"entry": [{"changes": [{"value": {"statuses": [{"id": "wamid.s", "status": st}]}}]}]})
    db_session.expire_all()
    assert db_session.query(WhatsAppMessage).filter_by(wa_message_id="wamid.s").one().status == "read"


def test_bad_timezone_rejected(client, test_org_data, wa):
    headers = _auth(client, test_org_data)
    assert client.put("/api/whatsapp/org", json={"timezone": "Mars/Base"}, headers=headers).status_code == 400
