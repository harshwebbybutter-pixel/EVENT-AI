import uuid
from sqlalchemy import Column, String, Text, Boolean, Integer, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base

class RegistrationLink(Base):
    __tablename__ = "registration_links"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    event_id = Column(UUID(as_uuid=True), ForeignKey("events.id", ondelete="CASCADE"), nullable=False)
    ticket_id = Column(UUID(as_uuid=True), ForeignKey("tickets.id"))
    short_code = Column(String(20), unique=True, nullable=False)
    full_url = Column(Text, nullable=False)
    qr_code_url = Column(Text)
    utm_source = Column(String(100))
    utm_medium = Column(String(100))
    utm_campaign = Column(String(100))
    expires_at = Column(DateTime(timezone=True))
    is_active = Column(Boolean, default=True)
    click_count = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    event = relationship("Event", back_populates="registration_links")
    ticket = relationship("Ticket", back_populates="registration_link")