"""
Linking a user's WhatsApp number.

The user types their number in Visualize, gets a one-time code, and sends "VERIFY <code>" to the
shared Visualize number (a wa.me link pre-fills it). Receiving that message from the same number
proves ownership, records opt-in, and opens the 24h window — no approved template required.
"""
import hashlib
import hmac
import secrets
from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import Optional
from urllib.parse import quote

from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.user import User
from app.models.whatsapp import PhoneVerification
from app.services.whatsapp.client import business_display_number, normalize_phone

CODE_TTL = timedelta(minutes=15)
MAX_ATTEMPTS = 5


class LinkError(ValueError):
    pass


@dataclass
class PendingLink:
    phone_e164: str
    code: str
    expires_at: datetime
    wa_link: Optional[str]


def _hash_code(code: str) -> str:
    return hmac.new(settings.SECRET_KEY.encode(), code.encode(), hashlib.sha256).hexdigest()


def start_link(db: Session, user: User, raw_phone: str) -> PendingLink:
    phone = normalize_phone(raw_phone)
    if not phone:
        raise LinkError("Enter a valid mobile number with country code, e.g. +91 98765 43210")

    taken = db.query(User).filter(
        User.phone_e164 == phone, User.phone_verified_at.isnot(None), User.id != user.id
    ).first()
    if taken:
        raise LinkError("This number is already linked to another Visualize user")

    db.query(PhoneVerification).filter(PhoneVerification.user_id == user.id).delete()
    code = f"{secrets.randbelow(1_000_000):06d}"
    expires_at = datetime.utcnow() + CODE_TTL
    db.add(PhoneVerification(user_id=user.id, phone_e164=phone, code_hash=_hash_code(code), expires_at=expires_at))
    db.commit()

    number = business_display_number()
    link = f"https://wa.me/{number}?text={quote(f'VERIFY {code}')}" if number else None
    return PendingLink(phone_e164=phone, code=code, expires_at=expires_at, wa_link=link)


def pending_for(db: Session, user: User) -> Optional[PhoneVerification]:
    return (
        db.query(PhoneVerification)
        .filter(PhoneVerification.user_id == user.id, PhoneVerification.expires_at > datetime.utcnow())
        .first()
    )


def confirm_from_whatsapp(db: Session, from_phone: str, code: str) -> Optional[User]:
    """Match an inbound 'VERIFY <code>' against pending links for that sender. Returns the linked user."""
    candidates = (
        db.query(PhoneVerification)
        .filter(PhoneVerification.phone_e164 == from_phone, PhoneVerification.expires_at > datetime.utcnow())
        .all()
    )
    for pv in candidates:
        if pv.attempts >= MAX_ATTEMPTS:
            continue
        if hmac.compare_digest(pv.code_hash, _hash_code(code)):
            user = db.get(User, pv.user_id)
            if not user:
                continue
            now = datetime.utcnow()
            user.phone_e164 = from_phone
            user.phone_verified_at = now
            user.whatsapp_opt_in_at = now
            db.query(PhoneVerification).filter(PhoneVerification.user_id == user.id).delete()
            db.commit()
            return user
        pv.attempts += 1
    db.commit()
    return None


def unlink(db: Session, user: User) -> None:
    user.phone_e164 = None
    user.phone_verified_at = None
    user.whatsapp_opt_in_at = None
    db.query(PhoneVerification).filter(PhoneVerification.user_id == user.id).delete()
    db.commit()


def linked_user(db: Session, phone_e164: str) -> Optional[User]:
    return db.query(User).filter(User.phone_e164 == phone_e164, User.phone_verified_at.isnot(None)).first()
