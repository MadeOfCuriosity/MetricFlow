import uuid
from datetime import datetime

from sqlalchemy import Column, String, Text, DateTime, Integer, ForeignKey, Index
from sqlalchemy.dialects.postgresql import UUID

from app.core.database import Base


class WhatsAppMessage(Base):
    """Every WhatsApp message sent or received, with its delivery status (audit + dedupe)."""
    __tablename__ = "whatsapp_messages"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    org_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    direction = Column(String(10), nullable=False)  # "out" | "in"
    wa_message_id = Column(String(128), nullable=True, unique=True)  # Meta's wamid
    phone_e164 = Column(String(20), nullable=False)
    message_type = Column(String(30), nullable=False)  # text | template | interactive | ...
    template_name = Column(String(100), nullable=True)
    body = Column(Text, nullable=True)  # text content (OTP codes are never stored)
    status = Column(String(20), nullable=False)  # sent | delivered | read | failed | received
    error = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    __table_args__ = (
        Index("ix_whatsapp_messages_org_created", "org_id", "created_at"),
        Index("ix_whatsapp_messages_phone", "phone_e164"),
    )


class PhoneVerification(Base):
    """Pending WhatsApp OTP for linking a phone number to a user."""
    __tablename__ = "phone_verifications"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    phone_e164 = Column(String(20), nullable=False)
    code_hash = Column(String(128), nullable=False)
    attempts = Column(Integer, nullable=False, default=0)
    expires_at = Column(DateTime, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
