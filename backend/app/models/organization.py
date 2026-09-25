import uuid
from datetime import datetime

from sqlalchemy import Boolean, Column, String, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.core.database import Base


class Organization(Base):
    __tablename__ = "organizations"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    industry = Column(String(100), nullable=True)
    website = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    # IANA zone (e.g. "Asia/Kolkata"); decides what "today" means for entries and WhatsApp
    timezone = Column(String(64), nullable=True)
    whatsapp_enabled = Column(Boolean, nullable=False, default=False, server_default="false")

    # Active plan — mirrored from the latest active Subscription so entitlements
    # can be checked without a join on every request.
    plan_code = Column(String(50), nullable=True)
    plan_status = Column(String(30), nullable=True)  # active | past_due | cancelled | trialing | None
    plan_current_end = Column(DateTime, nullable=True)

    # Relationships
    users = relationship("User", back_populates="organization", cascade="all, delete-orphan")
    kpi_definitions = relationship("KPIDefinition", back_populates="organization", cascade="all, delete-orphan")
    data_entries = relationship("DataEntry", back_populates="organization", cascade="all, delete-orphan")
    insights = relationship("Insight", back_populates="organization", cascade="all, delete-orphan")
    rooms = relationship("Room", back_populates="organization", cascade="all, delete-orphan")
    data_fields = relationship("DataField", back_populates="organization", cascade="all, delete-orphan")
    data_field_entries = relationship("DataFieldEntry", back_populates="organization", cascade="all, delete-orphan")
    integrations = relationship("Integration", back_populates="organization", cascade="all, delete-orphan")
    subscriptions = relationship("Subscription", back_populates="organization", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Organization {self.name}>"
