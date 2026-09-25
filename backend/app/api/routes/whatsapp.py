"""WhatsApp integration: Meta webhook, org settings, and per-user phone linking."""
import hashlib
import hmac
import json
import logging
from datetime import datetime
from typing import Optional
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from fastapi.responses import PlainTextResponse
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.api.deps import get_current_user_org, get_db, require_admin_org
from app.core.config import settings
from app.core.rate_limit import limiter, public_limiter
from app.models import Organization, User
from app.services.whatsapp import linking
from app.services.whatsapp.client import business_display_number
from app.services.whatsapp.inbound import handle_webhook

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/whatsapp", tags=["WhatsApp"])


# ---------- Meta webhook (public) ----------

@router.get("/webhook", response_class=PlainTextResponse)
def verify_webhook(
    mode: str = Query("", alias="hub.mode"),
    token: str = Query("", alias="hub.verify_token"),
    challenge: str = Query("", alias="hub.challenge"),
):
    """Meta's one-time subscription check: echo the challenge when the verify token matches."""
    if mode == "subscribe" and settings.WHATSAPP_VERIFY_TOKEN and hmac.compare_digest(
        token, settings.WHATSAPP_VERIFY_TOKEN
    ):
        return challenge
    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Verification failed")


def _valid_signature(body: bytes, header: str) -> bool:
    if not settings.WHATSAPP_APP_SECRET:
        # Only tolerated in local development
        return settings.ENVIRONMENT != "production"
    expected = "sha256=" + hmac.new(settings.WHATSAPP_APP_SECRET.encode(), body, hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, header or "")


@router.post("/webhook", status_code=200)
@public_limiter.limit("1200/minute")
async def receive_webhook(request: Request, db: Session = Depends(get_db)):
    """Inbound messages and delivery statuses. Verified via X-Hub-Signature-256."""
    body = await request.body()
    if not _valid_signature(body, request.headers.get("X-Hub-Signature-256", "")):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Invalid signature")
    try:
        payload = json.loads(body or b"{}")
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid JSON")
    try:
        handle_webhook(db, payload)
    except Exception:
        # Always 200 so Meta doesn't retry forever on a bug; the error is in the logs
        logger.exception("WhatsApp webhook handling failed")
    return {"status": "ok"}


# ---------- Status & org settings ----------

class PendingLinkOut(BaseModel):
    phone_e164: str
    expires_at: datetime
    code: Optional[str] = None
    wa_link: Optional[str] = None


class MyWhatsAppOut(BaseModel):
    phone_e164: Optional[str] = None
    verified: bool = False
    opted_in: bool = False
    pending: Optional[PendingLinkOut] = None


class WhatsAppStatusOut(BaseModel):
    configured: bool  # server has Cloud API credentials
    org_enabled: bool
    timezone: Optional[str] = None
    business_number: Optional[str] = None
    me: MyWhatsAppOut


def _me(db: Session, user: User) -> MyWhatsAppOut:
    pending = linking.pending_for(db, user)
    return MyWhatsAppOut(
        phone_e164=user.phone_e164 if user.phone_verified_at else None,
        verified=bool(user.phone_verified_at),
        opted_in=bool(user.whatsapp_opt_in_at),
        pending=PendingLinkOut(phone_e164=pending.phone_e164, expires_at=pending.expires_at) if pending else None,
    )


@router.get("/status", response_model=WhatsAppStatusOut)
def get_status(user_org: tuple[User, Organization] = Depends(get_current_user_org), db: Session = Depends(get_db)):
    user, org = user_org
    return WhatsAppStatusOut(
        configured=settings.whatsapp_configured,
        org_enabled=org.whatsapp_enabled,
        timezone=org.timezone,
        business_number=business_display_number(),
        me=_me(db, user),
    )


class OrgWhatsAppUpdate(BaseModel):
    enabled: Optional[bool] = None
    timezone: Optional[str] = Field(None, max_length=64)


@router.put("/org", response_model=WhatsAppStatusOut)
def update_org_settings(
    data: OrgWhatsAppUpdate,
    admin_org: tuple[User, Organization] = Depends(require_admin_org),
    db: Session = Depends(get_db),
):
    user, org = admin_org
    if data.timezone is not None:
        try:
            ZoneInfo(data.timezone)
        except (ZoneInfoNotFoundError, ValueError):
            raise HTTPException(status_code=400, detail="Unknown time zone")
        org.timezone = data.timezone
    if data.enabled is not None:
        if data.enabled and not settings.whatsapp_configured:
            raise HTTPException(status_code=400, detail="WhatsApp isn't configured on this server yet")
        org.whatsapp_enabled = data.enabled
    db.commit()
    return get_status((user, org), db)


# ---------- Linking the current user's number ----------

class StartLinkIn(BaseModel):
    phone: str = Field(..., min_length=6, max_length=32)


@router.post("/link", response_model=PendingLinkOut)
@limiter.limit("10/hour")
def start_link(
    request: Request,
    data: StartLinkIn,
    user_org: tuple[User, Organization] = Depends(get_current_user_org),
    db: Session = Depends(get_db),
):
    """Create a one-time code; the user sends 'VERIFY <code>' from that number to finish linking."""
    user, org = user_org
    if not settings.whatsapp_configured or not org.whatsapp_enabled:
        raise HTTPException(status_code=400, detail="WhatsApp isn't enabled for your organization")
    try:
        pending = linking.start_link(db, user, data.phone)
    except linking.LinkError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return PendingLinkOut(
        phone_e164=pending.phone_e164, expires_at=pending.expires_at, code=pending.code, wa_link=pending.wa_link
    )


@router.delete("/link", response_model=MyWhatsAppOut)
def unlink(user_org: tuple[User, Organization] = Depends(get_current_user_org), db: Session = Depends(get_db)):
    user, _ = user_org
    linking.unlink(db, user)
    return _me(db, user)
