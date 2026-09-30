"""Handling of Meta webhook payloads: inbound messages and delivery statuses."""
import logging
import re
from datetime import datetime
from typing import Optional

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.organization import Organization
from app.models.whatsapp import WhatsAppMessage
from app.services.whatsapp import entry_bot, linking
from app.services.whatsapp.client import WhatsAppClient, WhatsAppError, normalize_phone

logger = logging.getLogger(__name__)

VERIFY_RE = re.compile(r"^\s*verify\s*(\d{6})\s*$", re.IGNORECASE)
STOP_WORDS = {"stop", "unsubscribe", "stop all"}
START_WORDS = {"start", "subscribe", "unstop"}

# Delivery status only moves forward (a late "delivered" must not overwrite "read")
_STATUS_RANK = {"sent": 1, "delivered": 2, "read": 3, "failed": 4}


def handle_webhook(db: Session, payload: dict) -> None:
    for entry in payload.get("entry", []):
        for change in entry.get("changes", []):
            value = change.get("value", {})
            for status in value.get("statuses", []):
                _apply_status(db, status)
            for message in value.get("messages", []):
                _handle_message(db, message)


def _apply_status(db: Session, status: dict) -> None:
    msg = db.query(WhatsAppMessage).filter(WhatsAppMessage.wa_message_id == status.get("id")).first()
    new = status.get("status")
    if not msg or new not in _STATUS_RANK:
        return
    if _STATUS_RANK[new] >= _STATUS_RANK.get(msg.status, 0):
        msg.status = new
        if new == "failed":
            errors = status.get("errors") or [{}]
            msg.error = errors[0].get("title") or errors[0].get("message")
        db.commit()


def _message_text(message: dict) -> str:
    kind = message.get("type")
    if kind == "text":
        return message.get("text", {}).get("body", "")
    if kind == "button":
        return message.get("button", {}).get("text", "")
    if kind == "interactive":
        inter = message.get("interactive", {})
        reply = inter.get("button_reply") or inter.get("list_reply") or {}
        # Our buttons/rows carry the command in their id (titles are for display and may be truncated)
        return reply.get("id") or reply.get("title", "")
    return ""


def _handle_message(db: Session, message: dict) -> None:
    wamid = message.get("id")
    phone = normalize_phone("+" + str(message.get("from", "")))
    if not wamid or not phone:
        return
    text = _message_text(message)
    user = linking.linked_user(db, phone)

    # Log first; the unique wamid makes webhook retries no-ops
    try:
        db.add(WhatsAppMessage(
            org_id=user.org_id if user else None,
            user_id=user.id if user else None,
            direction="in",
            wa_message_id=wamid,
            phone_e164=phone,
            message_type=message.get("type", "unknown"),
            # Don't keep verification codes in the log
            body="VERIFY ******" if VERIFY_RE.match(text) else text[:4000],
            status="received",
        ))
        db.commit()
    except IntegrityError:
        db.rollback()
        logger.info("Duplicate WhatsApp message %s ignored", wamid)
        return

    client = WhatsAppClient(db)
    client.mark_read(wamid)
    reply = _reply_for(db, phone, text, user)
    if reply:
        linked = linking.linked_user(db, phone)
        ctx = {"org_id": linked.org_id if linked else None, "user_id": linked.id if linked else None}
        try:
            if isinstance(reply, entry_bot.BotReply) and reply.list_rows:
                client.send_list(phone, reply.text, reply.list_button, reply.list_rows, **ctx)
            elif isinstance(reply, entry_bot.BotReply) and reply.buttons:
                client.send_buttons(phone, reply.text, reply.buttons, **ctx)
            else:
                client.send_text(phone, reply.text if isinstance(reply, entry_bot.BotReply) else reply, **ctx)
        except WhatsAppError:
            pass  # already logged as failed


def _reply_for(db: Session, phone: str, text: str, user) -> Optional["str | entry_bot.BotReply"]:
    verify = VERIFY_RE.match(text)
    if verify:
        linked = linking.confirm_from_whatsapp(db, phone, verify.group(1))
        if not linked:
            return "That code didn't match or has expired. Generate a new one in Visualize → Settings → Account."
        org = db.get(Organization, linked.org_id)
        return (
            f"✅ Connected! This number is now linked to {linked.name}"
            f"{f' at {org.name}' if org else ''} on Visualize.\n\n"
            "Reply STOP anytime to pause WhatsApp messages."
        )

    word = entry_bot.normalize_command(text)
    if user and word in STOP_WORDS:
        user.whatsapp_opt_in_at = None
        db.commit()
        return "You won't receive WhatsApp messages from Visualize anymore. Reply START to turn them back on."
    if user and word in START_WORDS and not user.whatsapp_opt_in_at:
        user.whatsapp_opt_in_at = datetime.utcnow()
        db.commit()
        return "WhatsApp messages from Visualize are back on. ✅ Reply *start* to fill in today's entries."

    if not user:
        return (
            "This number isn't linked to a Visualize account yet. "
            "Open Visualize → Settings → Account → WhatsApp to connect it."
        )
    if not user.whatsapp_opt_in_at:
        return "WhatsApp messages from Visualize are paused. Reply START to turn them back on."
    return entry_bot.handle(db, user, text)
