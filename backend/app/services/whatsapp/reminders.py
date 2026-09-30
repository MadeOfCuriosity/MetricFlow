"""
Scheduled WhatsApp reminders (business-initiated, so they use approved templates).

Each org can set two times in its own time zone (both off until set):
  - reminder ("HH:MM"): "Hi {{1}}, {{2}} entries are due today for {{3}}." [Start]
  - nudge    ("HH:MM"): "{{1}} of {{2}} entries for {{3}} are still missing today." [Start]

Every few minutes, once the org's local time has passed a time, each eligible person gets that
message at most once per local day, and only if something is still due. Eligible = verified,
opted-in phone and an explicit scope (room admins with WhatsApp rooms, admins who chose
"Ask me about"). Any attempt, even a failed one, counts for the day so a rejected template
isn't retried every tick.
"""
import logging
import re
from datetime import datetime, time, timezone
from typing import Optional
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.job_lock import run_exclusive
from app.core.timezones import org_now
from app.models import Organization, User
from app.models.whatsapp import WhatsAppMessage
from app.services.whatsapp import entry_bot
from app.services.whatsapp.client import WhatsAppClient, WhatsAppError

logger = logging.getLogger(__name__)

_TIME_RE = re.compile(r"^([01]\d|2[0-3]):([0-5]\d)$")


def parse_time(value: Optional[str]) -> Optional[time]:
    """'09:30' -> time(9, 30); None/'' -> None; raises ValueError otherwise."""
    if not value:
        return None
    m = _TIME_RE.match(value.strip())
    if not m:
        raise ValueError("Use 24-hour HH:MM, e.g. 09:30")
    return time(int(m.group(1)), int(m.group(2)))


def _local_midnight_utc(tz_name: Optional[str], local_now: datetime) -> datetime:
    """Start of the org's local day as naive UTC (how whatsapp_messages.created_at is stored)."""
    midnight = datetime.combine(local_now.date(), time.min)
    try:
        zone = ZoneInfo(tz_name) if tz_name else None
    except ZoneInfoNotFoundError:
        zone = None
    aware = midnight.replace(tzinfo=zone) if zone else midnight.astimezone()
    return aware.astimezone(timezone.utc).replace(tzinfo=None)


def _rooms_label(items: list[dict]) -> str:
    rooms = list(dict.fromkeys(i["room"] for i in items))
    return ", ".join(rooms[:3]) + (f" +{len(rooms) - 3} more" if len(rooms) > 3 else "")


def _already_sent(db: Session, user: User, template: str, since_utc: datetime) -> bool:
    return db.query(WhatsAppMessage.id).filter(
        WhatsAppMessage.user_id == user.id,
        WhatsAppMessage.direction == "out",
        WhatsAppMessage.template_name == template,
        WhatsAppMessage.created_at >= since_utc,
    ).first() is not None


def _eligible_users(db: Session, org: Organization) -> list[User]:
    return db.query(User).filter(
        User.org_id == org.id,
        User.phone_e164.isnot(None),
        User.phone_verified_at.isnot(None),
        User.whatsapp_opt_in_at.isnot(None),
    ).all()


def send_org_reminders(db: Session, org: Organization, client: WhatsAppClient,
                       now: Optional[datetime] = None) -> int:
    """Send whatever is due for one org right now. Returns the number of messages attempted."""
    local_now = now or org_now(org.timezone)
    since = _local_midnight_utc(org.timezone, local_now)
    kinds = []
    for kind, value, template in (
        ("reminder", org.whatsapp_reminder_time, settings.WHATSAPP_REMINDER_TEMPLATE),
        ("nudge", org.whatsapp_nudge_time, settings.WHATSAPP_NUDGE_TEMPLATE),
    ):
        try:
            at = parse_time(value)
        except ValueError:
            continue
        if at and local_now.time() >= at:
            kinds.append((kind, template))
    if not kinds:
        return 0

    sent = 0
    for user in _eligible_users(db, org):
        scope = entry_bot.entry_scope(db, user)
        if not scope.explicit or (not scope.org_wide and not scope.rooms):
            continue
        pending_kinds = [(k, t) for k, t in kinds if not _already_sent(db, user, t, since)]
        if not pending_kinds:
            continue
        items = entry_bot._today_items(db, user, org, scope, include_done=True)
        missing = [i for i in items if not i["done"]]
        if not missing:
            continue
        for kind, template in pending_kinds:
            if kind == "reminder":
                params = [entry_bot._first(user), str(len(missing)), _rooms_label(missing)]
                body = f"Reminder: {len(missing)} entries due today ({params[2]})"
            else:
                params = [str(len(missing)), str(len(items)), _rooms_label(missing)]
                body = f"Nudge: {len(missing)} of {len(items)} still missing ({params[2]})"
            try:
                client.send_template(user.phone_e164, template, params, log_body=body,
                                     org_id=org.id, user_id=user.id)
            except WhatsAppError as e:
                logger.warning("WhatsApp %s to user %s failed: %s", kind, user.id, e)
            sent += 1
    return sent


def send_due_reminders() -> None:
    """Scheduler entry point: runs in one process only."""
    if not settings.whatsapp_configured:
        return
    from app.core.database import SessionLocal

    with run_exclusive("whatsapp_reminders") as acquired:
        if not acquired:
            return
        db = SessionLocal()
        try:
            client = WhatsAppClient(db)
            orgs = db.query(Organization).filter(
                Organization.whatsapp_enabled.is_(True),
                (Organization.whatsapp_reminder_time.isnot(None)) | (Organization.whatsapp_nudge_time.isnot(None)),
            ).all()
            for org in orgs:
                try:
                    send_org_reminders(db, org, client)
                except Exception:
                    db.rollback()
                    logger.exception("WhatsApp reminders failed for org %s", org.id)
        finally:
            db.close()
