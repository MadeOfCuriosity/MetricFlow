"""WhatsApp foundations: phone verification (OTP), message log, and webhook processing."""
import hashlib
import hmac
import logging
import re
import secrets
from datetime import datetime, timedelta
from typing import Optional
from uuid import UUID

from sqlalchemy.orm import Session

from app.core.config import settings
from app.models import User
from app.models.whatsapp import PhoneVerification, WhatsAppMessage
from app.services.whatsapp.client import WhatsAppError, get_client

logger = logging.getLogger(__name__)

OTP_TTL = timedelta(minutes=10)
OTP_MAX_ATTEMPTS = 5
OTP_MAX_SENDS_PER_HOUR = 5
E164_RE = re.compile(r"^\+[1-9]\d{7,14}$")
STOP_WORDS = {"stop", "unsubscribe", "stop all"}
START_WORDS = {"start", "subscribe"}
STATUS_RANK = {"sent": 1, "delivered": 2, "read": 3}


class PhoneVerificationError(ValueError):
    """User-facing problem with a phone number or code."""


# ---------- helpers ----------

def normalize_phone(raw: str) -> str:
    """'+91 98765-43210' / '0091 9876543210' -> '+919876543210'. Country code is required."""
    s = re.sub(r"[\s\-().]", "", raw or "")
    if s.startswith("00"):
        s = "+" + s[2:]
    if not E164_RE.match(s):
        raise PhoneVerificationError("Enter the number with its country code, e.g. +91 98765 43210")
    return s


def _hash_code(user_id: UUID, code: str) -> str:
    return hmac.new(settings.SECRET_KEY.encode(), f"{user_id}:{code}".encode(), hashlib.sha256).hexdigest()


def verify_signature(body: bytes, header: Optional[str]) -> bool:
    """Meta signs webhook bodies with the app secret: X-Hub-Signature-256: sha256=<hex>."""
    if not settings.WHATSAPP_APP_SECRET or not header or not header.startswith("sha256="):
        return False
    expected = hmac.new(settings.WHATSAPP_APP_SECRET.encode(), body, hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, header[len("sha256="):])


def log_message(
    db: Session,
    *,
    direction: str,
    phone_e164: str,
    message_type: str,
    status: str,
    wa_message_id: Optional[str] = None,
    user: Optional[User] = None,
    template_name: Optional[str] = None,
    body: Optional[str] = None,
    error: Optional[str] = None,
) -> WhatsAppMessage:
    msg = WhatsAppMessage(
        direction=direction,
        phone_e164=phone_e164,
        message_type=message_type,
        status=status,
        wa_message_id=wa_message_id,
        user_id=user.id if user else None,
        org_id=user.org_id if user else None,
        template_name=template_name,
        body=body,
        error=error,
    )
    db.add(msg)
    return msg


def send_text(db: Session, user: Optional[User], phone_e164: str, text: str) -> Optional[str]:
    """Send + log a free-form reply. Failures are logged, not raised (used for webhook replies)."""
    client = get_client()
    if not client.configured:
        return None
    try:
        wamid = client.send_text(phone_e164, text)
        log_message(db, direction="out", phone_e164=phone_e164, message_type="text", status="sent",
                    wa_message_id=wamid, user=user, body=text)
        return wamid
    except WhatsAppError as e:
        log_message(db, direction="out", phone_e164=phone_e164, message_type="text", status="failed",
                    user=user, body=text, error=str(e))
        return None


# ---------- phone verification ----------

def start_phone_verification(db: Session, user: User, raw_phone: str) -> str:
    """Send a WhatsApp OTP to the number. Returns the normalized number."""
    phone = normalize_phone(raw_phone)

    taken = db.query(User).filter(
        User.phone_e164 == phone, User.phone_verified_at.isnot(None), User.id != user.id
    ).first()
    if taken:
        raise PhoneVerificationError("This number is already linked to another Visualize account")

    recent = db.query(PhoneVerification).filter(
        PhoneVerification.user_id == user.id,
        PhoneVerification.created_at >= datetime.utcnow() - timedelta(hours=1),
    ).count()
    if recent >= OTP_MAX_SENDS_PER_HOUR:
        raise PhoneVerificationError("Too many codes requested. Try again in an hour.")

    client = get_client()
    if not client.configured:
        raise PhoneVerificationError("WhatsApp isn't set up on this server yet")

    code = f"{secrets.randbelow(10**6):06d}"
    try:
        wamid = client.send_otp(phone, code)
    except WhatsAppError as e:
        log_message(db, direction="out", phone_e164=phone, message_type="template", status="failed",
                    user=user, template_name=settings.WHATSAPP_OTP_TEMPLATE, error=str(e))
        db.commit()
        raise PhoneVerificationError(f"Couldn't send the code: {e}") from e

    # Keep only the newest pending code (older ones stay for the hourly rate limit, but are expired)
    db.query(PhoneVerification).filter(
        PhoneVerification.user_id == user.id, PhoneVerification.expires_at > datetime.utcnow()
    ).update({PhoneVerification.expires_at: datetime.utcnow()})
    db.add(PhoneVerification(
        user_id=user.id,
        phone_e164=phone,
        code_hash=_hash_code(user.id, code),
        expires_at=datetime.utcnow() + OTP_TTL,
    ))
    log_message(db, direction="out", phone_e164=phone, message_type="template", status="sent",
                wa_message_id=wamid, user=user, template_name=settings.WHATSAPP_OTP_TEMPLATE)  # code not stored
    db.commit()
    return phone


def confirm_phone_verification(db: Session, user: User, code: str) -> str:
    """Check the OTP; on success link the number and record WhatsApp opt-in."""
    pending = db.query(PhoneVerification).filter(
        PhoneVerification.user_id == user.id,
        PhoneVerification.expires_at > datetime.utcnow(),
    ).order_by(PhoneVerification.created_at.desc()).first()
    if not pending:
        raise PhoneVerificationError("Code expired. Send a new one.")
    if pending.attempts >= OTP_MAX_ATTEMPTS:
        raise PhoneVerificationError("Too many wrong attempts. Send a new code.")

    if not hmac.compare_digest(pending.code_hash, _hash_code(user.id, (code or "").strip())):
        pending.attempts += 1
        db.commit()
        left = OTP_MAX_ATTEMPTS - pending.attempts
        raise PhoneVerificationError(f"Wrong code. {left} attempt{'s' if left != 1 else ''} left." if left else "Too many wrong attempts. Send a new code.")

    now = datetime.utcnow()
    user.phone_e164 = pending.phone_e164
    user.phone_verified_at = now
    user.whatsapp_opt_in_at = now
    pending.expires_at = now  # consume
    db.commit()
    return user.phone_e164


def remove_phone(db: Session, user: User) -> None:
    user.phone_e164 = None
    user.phone_verified_at = None
    user.whatsapp_opt_in_at = None
    db.commit()


# ---------- webhook ----------

def _user_for_phone(db: Session, phone_e164: str) -> Optional[User]:
    return db.query(User).filter(User.phone_e164 == phone_e164, User.phone_verified_at.isnot(None)).first()


def handle_webhook(db: Session, payload: dict) -> None:
    """Process a Meta webhook payload: delivery statuses and inbound messages."""
    for entry in payload.get("entry", []):
        for change in entry.get("changes", []):
            value = change.get("value") or {}
            for status in value.get("statuses", []):
                _apply_status(db, status)
            for message in value.get("messages", []):
                _handle_inbound(db, message)
    db.commit()


def _apply_status(db: Session, status: dict) -> None:
    msg = db.query(WhatsAppMessage).filter(WhatsAppMessage.wa_message_id == status.get("id")).first()
    if not msg:
        return
    new = status.get("status")
    if new == "failed":
        msg.status = "failed"
        errors = status.get("errors") or [{}]
        msg.error = errors[0].get("title") or errors[0].get("message") or "failed"
    elif STATUS_RANK.get(new, 0) > STATUS_RANK.get(msg.status, 0):  # never go backwards (read -> delivered)
        msg.status = new


def _handle_inbound(db: Session, message: dict) -> None:
    wamid = message.get("id")
    if wamid and db.query(WhatsAppMessage.id).filter(WhatsAppMessage.wa_message_id == wamid).first():
        return  # Meta retries: already processed

    phone = "+" + str(message.get("from", "")).lstrip("+")
    user = _user_for_phone(db, phone)
    mtype = message.get("type", "unknown")
    text = (message.get("text") or {}).get("body") if mtype == "text" else None
    log_message(db, direction="in", phone_e164=phone, message_type=mtype, status="received",
                wa_message_id=wamid, user=user, body=text)
    db.flush()

    command = (text or "").strip().lower()
    if not user:
        send_text(db, None, phone,
                  "This number isn't linked to a Visualize account. Add it under Settings → Account → WhatsApp.")
        return
    if command in STOP_WORDS:
        user.whatsapp_opt_in_at = None
        send_text(db, user, phone, "You won't get WhatsApp messages from Visualize anymore. Reply START to turn them back on.")
        return
    if command in START_WORDS:
        user.whatsapp_opt_in_at = datetime.utcnow()
        send_text(db, user, phone, f"Welcome back, {user.name.split(' ')[0]}! WhatsApp updates are on again.")
        return
    # Phase 0: no conversations yet
    send_text(db, user, phone,
              f"Hi {user.name.split(' ')[0]}! 👋 Your number is linked to Visualize. "
              "Data entry and insights over WhatsApp are coming soon.")
