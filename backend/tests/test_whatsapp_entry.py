"""Data entry over WhatsApp: flow, quick format, log, pending, scope (admins, room admins, sub-rooms)."""
from datetime import date, datetime, timedelta

import pytest

from app.models import DataField, DataFieldEntry, User
from app.models.user_room_assignment import UserRoomAssignment
from app.services.whatsapp.entry_bot import bar, parse_number
from tests.test_whatsapp import _auth, _inbound, _post_webhook, wa  # noqa: F401  (wa fixture)

ADMIN_PHONE = "918848800001"
REP_PHONE = "918848800002"


def _link(db_session, user: User, digits: str):
    user.phone_e164 = "+" + digits
    user.phone_verified_at = datetime.utcnow()
    user.whatsapp_opt_in_at = datetime.utcnow()
    db_session.commit()


def _reply_payload(text_or_id: str, digits: str, wamid: str) -> dict:
    """List/button taps arrive as interactive replies carrying our id."""
    if text_or_id.startswith("pick "):
        return {"entry": [{"changes": [{"value": {"messages": [{
            "from": digits, "id": wamid, "type": "interactive",
            "interactive": {"type": "list_reply", "list_reply": {"id": text_or_id, "title": "x"}},
        }]}}]}]}
    return _inbound(digits, text_or_id, wamid)


class Chat:
    """Send messages as a phone and read back the bot's latest reply."""

    def __init__(self, client, sent, digits):
        self.client, self.sent, self.digits, self.n = client, sent, digits, 0

    def say(self, text: str) -> dict:
        self.n += 1
        before = len(self.sent)
        _post_webhook(self.client, _reply_payload(text, self.digits, f"wamid.{self.digits}.{self.n}"))
        replies = [m for m in self.sent[before:] if m.get("type") in ("text", "interactive")]
        assert replies, f"no reply to {text!r}"
        return replies[-1]

    @staticmethod
    def text(msg: dict) -> str:
        return msg["text"]["body"] if msg["type"] == "text" else msg["interactive"]["body"]["text"]

    @staticmethod
    def buttons(msg: dict) -> list[str]:
        if msg["type"] != "interactive" or msg["interactive"]["type"] != "button":
            return []
        return [b["reply"]["title"] for b in msg["interactive"]["action"]["buttons"]]

    @staticmethod
    def rows(msg: dict) -> list[str]:
        if msg["type"] != "interactive" or msg["interactive"]["type"] != "list":
            return []
        return [r["title"] for s in msg["interactive"]["action"]["sections"] for r in s["rows"]]


@pytest.fixture
def org(client, db_session, test_org_data, wa):
    headers = _auth(client, test_org_data)
    client.put("/api/whatsapp/org", json={"enabled": True}, headers=headers)
    sales = client.post("/api/rooms", json={"name": "Sales"}, headers=headers).json()
    hr = client.post("/api/rooms", json={"name": "HR"}, headers=headers).json()
    north = client.post("/api/rooms", json={"name": "North", "parent_room_id": sales["id"]}, headers=headers).json()
    for name, room, interval in [
        ("Deals Closed", sales, "daily"), ("Leads Received", sales, "daily"),
        ("North Calls", north, "daily"), ("Headcount", hr, "daily"),
        ("Employee Count", hr, "custom"),
    ]:
        client.post("/api/data-fields", json={"name": name, "room_ids": [room["id"]], "unit": "#",
                                              "entry_interval": interval}, headers=headers)
    client.post("/api/data-fields", json={"name": "Office Rent", "unit": "₹"}, headers=headers)  # org-wide
    admin = db_session.query(User).filter(User.email == test_org_data["admin_email"]).first()
    _link(db_session, admin, ADMIN_PHONE)
    return {"headers": headers, "sales": sales, "hr": hr, "north": north, "admin": admin}


def _values(db_session) -> dict[str, tuple[float, str]]:
    rows = db_session.query(DataField.name, DataFieldEntry.value, DataFieldEntry.source).join(
        DataFieldEntry, DataFieldEntry.data_field_id == DataField.id
    ).all()
    return {name: (value, source) for name, value, source in rows}


def test_parse_number_and_bar():
    assert parse_number("12") == 12
    assert parse_number("1,200") == 1200
    assert parse_number("₹2,40,000") == 240000
    assert parse_number("12.5") == 12.5
    assert parse_number("10k") == 10_000
    assert parse_number("5L") == 500_000
    assert parse_number("2.4 cr") == 24_000_000
    assert parse_number("-3") == -3
    assert parse_number("twelve") is None
    assert parse_number("12 apples") is None
    assert bar(0, 4) == "▱" * 10 and bar(2, 4) == "▰" * 5 + "▱" * 5 and bar(4, 4) == "▰" * 10


def test_hi_shows_menu_list(client, org, wa):
    reply = Chat(client, wa, ADMIN_PHONE).say("Hi")
    assert "Tap *Menu*" in Chat.text(reply)
    assert Chat.rows(reply) == ["📝 Start", "⏳ Pending", "⚡ Log", "📊 Status", "💡 Insights", "📄 Generate report"]


def test_commands_ignore_whatsapp_formatting(client, org, wa):
    chat = Chat(client, wa, ADMIN_PHONE)
    assert Chat.rows(chat.say("*log*")) == ["Employee Count"]
    chat.say("cancel")
    assert "Today" in Chat.text(chat.say(" _Status_ "))
    assert "coming soon" in Chat.text(chat.say("Insights"))
    assert "coming soon" in Chat.text(chat.say("generate report"))


def test_start_saves_each_answer_immediately(client, db_session, org, wa):
    chat = Chat(client, wa, ADMIN_PHONE)
    first = chat.say("start")
    # admin with no chosen scope: everything scheduled, never the no-schedule "Employee Count"
    assert "5 to fill" in Chat.text(first) and "Employee Count" not in Chat.text(first)
    assert "1/5" in Chat.text(first) and "Organization-wide" in Chat.text(first)
    assert Chat.buttons(first) == ["Skip", "Stop"]

    second = chat.say("1,200")
    assert "✓ Saved" in Chat.text(second) and "*1,200*" in Chat.text(second) and "2/5" in Chat.text(second)
    assert len(_values(db_session)) == 1  # saved right away
    assert Chat.buttons(second) == ["Skip", "Back", "Stop"]

    assert "Skipped" in Chat.text(chat.say("skip"))
    back = Chat.text(chat.say("back"))  # back to the skipped question (no value yet)
    assert "2/5" in back
    for v in ["40", "7", "3"]:
        chat.say(v)
    done = Chat.text(chat.say("9"))
    assert "*Done* · 5 saved" in done and "everything for today" in done
    assert {s for _, s in _values(db_session).values()} == {"whatsapp"}
    assert "All caught up" in Chat.text(chat.say("start"))


def test_back_overwrites_a_saved_answer(client, db_session, org, wa):
    chat = Chat(client, wa, ADMIN_PHONE)
    chat.say("start")
    chat.say("5")
    assert "Currently *5*" in Chat.text(chat.say("back"))
    chat.say("8")
    assert sorted(v for v, _ in _values(db_session).values()) == [8]


def test_stop_keeps_what_was_entered(client, db_session, org, wa):
    chat = Chat(client, wa, ADMIN_PHONE)
    chat.say("start")
    chat.say("5")
    chat.say("6")
    stopped = chat.say("cancel")  # e.g. an old Stop/Cancel button tapped later
    assert "*Stopped* · 2 saved" in Chat.text(stopped) and "3 left" in Chat.text(stopped)
    assert Chat.buttons(stopped) == ["Continue"]
    assert len(_values(db_session)) == 2
    # Continue picks up only what's left
    assert "3 to fill" in Chat.text(chat.say("start"))


def test_invalid_answer_reasks(client, org, wa):
    chat = Chat(client, wa, ADMIN_PHONE)
    chat.say("start")
    reply = Chat.text(chat.say("lots"))
    assert "doesn't look like a number" in reply and "1/5" in reply


def test_log_no_schedule_field_from_list(client, db_session, org, wa):
    chat = Chat(client, wa, ADMIN_PHONE)
    menu = chat.say("log")
    assert Chat.rows(menu) == ["Employee Count"]
    question = Chat.text(chat.say("pick 1"))
    assert "*Employee Count*" in question
    assert "1 saved" in Chat.text(chat.say("42"))
    assert _values(db_session) == {"Employee Count": (42, "whatsapp")}


def test_quick_format_includes_no_schedule_fields(client, db_session, org, wa):
    chat = Chat(client, wa, ADMIN_PHONE)
    summary = Chat.text(chat.say("deals 12, employee count 1,500"))
    assert "Deals Closed — *12*" in summary and "Employee Count — *1,500*" in summary
    chat.say("save")
    assert {k: v for k, (v, _) in _values(db_session).items()} == {"Deals Closed": 12, "Employee Count": 1500}
    assert "couldn't match" in Chat.text(chat.say("unicorns 3"))


def test_pending_saves_to_the_missed_day(client, db_session, org, wa):
    field = db_session.query(DataField).filter(DataField.name == "Headcount").first()
    field.created_at = datetime.combine(date.today() - timedelta(days=2), datetime.min.time())
    db_session.commit()

    chat = Chat(client, wa, ADMIN_PHONE)
    first = Chat.text(chat.say("pending"))
    assert "Missed entries" in first and "Headcount" in first
    reply = first
    while "*Done*" not in reply:
        reply = Chat.text(chat.say("9"))
    dates = {d for (d,) in db_session.query(DataFieldEntry.date).filter(DataFieldEntry.data_field_id == field.id)}
    assert dates == {date.today() - timedelta(days=1), date.today() - timedelta(days=2)}


def test_admin_scope_limits_what_is_asked(client, org, wa):
    resp = client.put("/api/whatsapp/me/scope", json={"room_ids": [org["hr"]["id"]], "org_wide": True}, headers=org["headers"])
    assert resp.status_code == 200, resp.text
    assert resp.json()["scope"]["org_wide"] is True
    chat = Chat(client, wa, ADMIN_PHONE)
    first = Chat.text(chat.say("start"))
    assert "2 to fill" in first and "HR" in first and "Organization-wide" in first and "Sales" not in first

    # Admins can still quick-log any field outside their scope
    assert "Deals Closed — *3*" in Chat.text(chat.say("deals 3"))


def test_room_admin_scope_includes_subrooms_only(client, db_session, org, wa):
    rep = User(org_id=org["admin"].org_id, email="rep@x.com", name="Chloe Rep", role="room_admin", role_label="Rep")
    db_session.add(rep)
    db_session.commit()
    _link(db_session, rep, REP_PHONE)
    chat = Chat(client, wa, REP_PHONE)

    db_session.add(UserRoomAssignment(user_id=rep.id, room_id=org["sales"]["id"], whatsapp_entry=False))
    db_session.commit()
    assert "isn't on for you" in Chat.text(chat.say("start"))

    resp = client.put(
        f"/api/users/{rep.id}/rooms",
        json={"room_ids": [org["sales"]["id"]], "whatsapp_room_ids": [org["sales"]["id"]]},
        headers=org["headers"],
    )
    assert resp.status_code == 200, resp.text
    assert resp.json()["assigned_rooms"][0]["whatsapp_entry"] is True
    assert resp.json()["whatsapp_linked"] is True

    first = Chat.text(chat.say("start"))
    assert "3 to fill" in first and "North" in first  # Sales + its sub-room
    assert "Headcount" not in first and "Organization-wide" not in first
    chat.say("cancel")
    # A room admin can't quick-log outside their rooms
    assert "couldn't match" in Chat.text(chat.say("headcount 5"))

    # Re-assigning rooms without whatsapp_room_ids keeps the setting
    client.put(f"/api/users/{rep.id}/rooms", json={"room_ids": [org["sales"]["id"], org["hr"]["id"]]}, headers=org["headers"])
    rooms = {r["name"]: r["whatsapp_entry"] for r in client.get(f"/api/users/{rep.id}", headers=org["headers"]).json()["assigned_rooms"]}
    assert rooms == {"Sales": True, "HR": False}


def test_status(client, org, wa):
    reply = Chat(client, wa, ADMIN_PHONE).say("status")
    text = Chat.text(reply)
    assert "*0 of 5* done" in text and "Still to fill" in text
    assert "Start" in Chat.buttons(reply)
