"""Scheduled WhatsApp reminders: times, who gets them, once a day, only when something is due."""
from app.core.timezones import org_now
from app.models import Organization
from app.services.whatsapp.client import WhatsAppClient
from app.services.whatsapp.reminders import send_org_reminders
from tests.test_whatsapp_entry import ADMIN_PHONE, Chat, org  # noqa: F401  (org fixture)
from tests.test_whatsapp import wa  # noqa: F401  (wa fixture)

TZ = "Asia/Kolkata"


def _setup(client, db_session, org, **times):
    resp = client.put("/api/whatsapp/org", json={"timezone": TZ, **times}, headers=org["headers"])
    assert resp.status_code == 200, resp.text
    db_session.expire_all()
    return db_session.query(Organization).filter(Organization.id == org["admin"].org_id).first()


def _at(hour: int, minute: int = 0):
    return org_now(TZ).replace(hour=hour, minute=minute, second=0, microsecond=0)


def _templates(sent: list) -> list[tuple[str, list[str]]]:
    return [
        (m["template"]["name"], [p["text"] for p in m["template"]["components"][0]["parameters"]])
        for m in sent if m.get("type") == "template"
    ]


def _choose_hr(client, org):
    client.put("/api/whatsapp/me/scope", json={"room_ids": [org["hr"]["id"]], "org_wide": False}, headers=org["headers"])


def test_times_are_validated_and_cleared(client, db_session, org, wa):
    resp = client.put("/api/whatsapp/org", json={"reminder_time": "9:5"}, headers=org["headers"])
    assert resp.status_code == 400
    o = _setup(client, db_session, org, reminder_time="09:30", nudge_time="18:00")
    assert (o.whatsapp_reminder_time, o.whatsapp_nudge_time) == ("09:30", "18:00")
    status = client.get("/api/whatsapp/status", headers=org["headers"]).json()
    assert (status["reminder_time"], status["nudge_time"]) == ("09:30", "18:00")
    # Leaving a key out keeps it; null turns it off
    o = _setup(client, db_session, org, nudge_time=None)
    assert (o.whatsapp_reminder_time, o.whatsapp_nudge_time) == ("09:30", None)


def test_reminder_once_a_day_after_the_time(client, db_session, org, wa):
    _choose_hr(client, org)
    o = _setup(client, db_session, org, reminder_time="09:00")
    wa.clear()
    wa_client = WhatsAppClient(db_session)

    assert send_org_reminders(db_session, o, wa_client, now=_at(8, 59)) == 0
    assert send_org_reminders(db_session, o, wa_client, now=_at(9, 0)) == 1
    assert _templates(wa) == [("entry_reminder", [org["admin"].name.split(" ")[0], "1", "HR"])]
    # Later ticks the same day don't repeat it
    assert send_org_reminders(db_session, o, wa_client, now=_at(11, 0)) == 0


def test_nudge_only_while_something_is_missing(client, db_session, org, wa):
    _choose_hr(client, org)
    o = _setup(client, db_session, org, nudge_time="18:00")
    chat = Chat(client, wa, ADMIN_PHONE)
    chat.say("headcount 12")
    chat.say("save")
    wa.clear()
    # HR's only scheduled field is done (Employee Count is no-schedule, never due)
    assert send_org_reminders(db_session, o, WhatsAppClient(db_session), now=_at(18, 30)) == 0
    assert _templates(wa) == []


def test_nudge_counts_missing_of_total(client, db_session, org, wa):
    client.put("/api/whatsapp/me/scope", json={"room_ids": [org["sales"]["id"]]}, headers=org["headers"])
    o = _setup(client, db_session, org, nudge_time="18:00")
    chat = Chat(client, wa, ADMIN_PHONE)
    chat.say("deals 4")
    chat.say("save")
    wa.clear()
    assert send_org_reminders(db_session, o, WhatsAppClient(db_session), now=_at(19, 0)) == 1
    name, params = _templates(wa)[0]
    assert name == "entry_nudge" and params[:2] == ["2", "3"] and "North" in params[2]


def test_skips_people_without_an_explicit_scope_or_opt_in(client, db_session, org, wa):
    o = _setup(client, db_session, org, reminder_time="09:00")
    wa.clear()
    # Admin who never chose "Ask me about": entry on demand only, never reminded
    assert send_org_reminders(db_session, o, WhatsAppClient(db_session), now=_at(10, 0)) == 0

    _choose_hr(client, org)
    org["admin"].whatsapp_opt_in_at = None  # sent STOP
    db_session.commit()
    assert send_org_reminders(db_session, o, WhatsAppClient(db_session), now=_at(10, 0)) == 0
    assert _templates(wa) == []
