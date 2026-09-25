"""Thin WhatsApp Cloud API client. Every message sent is logged to whatsapp_messages."""
import logging
import re
from typing import Optional
from uuid import UUID

import httpx
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.whatsapp import WhatsAppMessage

logger = logging.getLogger(__name__)

GRAPH_URL = "https://graph.facebook.com"

_E164_RE = re.compile(r"^\+[1-9]\d{7,14}$")


def normalize_phone(raw: str, default_country_code: str = "91") -> Optional[str]:
    """
    Best-effort E.164 normalisation: "+91 88488 27741", "08848827741", "918848827741" -> "+918848827741".
    Returns None when the result isn't a plausible E.164 number.
    """
    if not raw:
        return None
    digits = re.sub(r"[^\d+]", "", raw.strip())
    if digits.startswith("00"):
        digits = "+" + digits[2:]
    if not digits.startswith("+"):
        digits = digits.lstrip("0")
        if len(digits) == 10:  # national number without country code
            digits = default_country_code + digits
        digits = "+" + digits
    return digits if _E164_RE.match(digits) else None


class WhatsAppError(Exception):
    pass


class WhatsAppClient:
    """Sends messages from the shared Visualize number. No-ops (with a clear error) when not configured."""

    def __init__(self, db: Session):
        self.db = db

    @property
    def _messages_url(self) -> str:
        return f"{GRAPH_URL}/{settings.WHATSAPP_API_VERSION}/{settings.WHATSAPP_PHONE_NUMBER_ID}/messages"

    def _post(self, payload: dict) -> dict:
        if not settings.whatsapp_configured:
            raise WhatsAppError("WhatsApp is not configured on this server")
        resp = httpx.post(
            self._messages_url,
            json={"messaging_product": "whatsapp", **payload},
            headers={"Authorization": f"Bearer {settings.WHATSAPP_ACCESS_TOKEN}"},
            timeout=15,
        )
        data = resp.json() if resp.content else {}
        if resp.status_code >= 400:
            err = data.get("error", {})
            raise WhatsAppError(err.get("error_user_msg") or err.get("message") or f"HTTP {resp.status_code}")
        return data

    def _log(self, *, to: str, message_type: str, body: Optional[str], template: Optional[str],
             org_id: Optional[UUID], user_id: Optional[UUID], wamid: Optional[str], error: Optional[str]) -> WhatsAppMessage:
        msg = WhatsAppMessage(
            org_id=org_id,
            user_id=user_id,
            direction="out",
            wa_message_id=wamid,
            phone_e164=to,
            message_type=message_type,
            template_name=template,
            body=body,
            status="failed" if error else "sent",
            error=error,
        )
        self.db.add(msg)
        self.db.commit()
        return msg

    def _send(self, to: str, payload: dict, *, message_type: str, body: Optional[str] = None,
              template: Optional[str] = None, org_id: Optional[UUID] = None,
              user_id: Optional[UUID] = None) -> WhatsAppMessage:
        wamid, error = None, None
        try:
            data = self._post({"to": to.lstrip("+"), **payload})
            wamid = (data.get("messages") or [{}])[0].get("id")
        except (WhatsAppError, httpx.HTTPError) as e:
            error = str(e)
            logger.warning("WhatsApp send to %s failed: %s", to, error)
        msg = self._log(to=to, message_type=message_type, body=body, template=template,
                        org_id=org_id, user_id=user_id, wamid=wamid, error=error)
        if error:
            raise WhatsAppError(error)
        return msg

    def send_text(self, to: str, text: str, **ctx) -> WhatsAppMessage:
        """Free-form text. Only delivered inside the 24h window after the user last messaged us."""
        return self._send(to, {"type": "text", "text": {"body": text, "preview_url": False}},
                          message_type="text", body=text, **ctx)

    def send_template(self, to: str, name: str, params: Optional[list[str]] = None,
                      language: Optional[str] = None, *, log_body: Optional[str] = None, **ctx) -> WhatsAppMessage:
        """Pre-approved template (required to start a conversation)."""
        template: dict = {"name": name, "language": {"code": language or settings.WHATSAPP_TEMPLATE_LANGUAGE}}
        if params:
            template["components"] = [
                {"type": "body", "parameters": [{"type": "text", "text": p} for p in params]}
            ]
        return self._send(to, {"type": "template", "template": template},
                          message_type="template", template=name, body=log_body, **ctx)

    def mark_read(self, wamid: str) -> None:
        try:
            self._post({"status": "read", "message_id": wamid})
        except (WhatsAppError, httpx.HTTPError) as e:
            logger.debug("mark_read failed: %s", e)


_display_number_cache: Optional[str] = None


def business_display_number() -> Optional[str]:
    """Digits-only number users should message (for wa.me links)."""
    global _display_number_cache
    if settings.WHATSAPP_DISPLAY_NUMBER:
        return re.sub(r"\D", "", settings.WHATSAPP_DISPLAY_NUMBER)
    if _display_number_cache or not settings.whatsapp_configured:
        return _display_number_cache
    try:
        resp = httpx.get(
            f"{GRAPH_URL}/{settings.WHATSAPP_API_VERSION}/{settings.WHATSAPP_PHONE_NUMBER_ID}",
            params={"fields": "display_phone_number"},
            headers={"Authorization": f"Bearer {settings.WHATSAPP_ACCESS_TOKEN}"},
            timeout=10,
        )
        number = resp.json().get("display_phone_number")
        _display_number_cache = re.sub(r"\D", "", number) if number else None
    except httpx.HTTPError as e:
        logger.warning("Could not fetch WhatsApp display number: %s", e)
    return _display_number_cache
