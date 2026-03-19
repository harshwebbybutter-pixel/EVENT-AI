import uuid
from sqlalchemy import Column, String, Text, Boolean, Integer, DateTime, ForeignKey, DECIMAL
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base

class Ticket(Base):
    __tablename__ = "tickets"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    event_id = Column(UUID(as_uuid=True), ForeignKey("events.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(255), nullable=False)
    description = Column(Text)
    user_type = Column(String(100), default="attendee")
    price = Column(DECIMAL(10, 2), nullable=False, default=0)
    currency = Column(String(3), default="INR")
    total_quantity = Column(Integer)
    sold_count = Column(Integer, default=0)
    sale_start = Column(DateTime(timezone=True))
    sale_end = Column(DateTime(timezone=True))
    is_active = Column(Boolean, default=True)
    sort_order = Column(Integer, default=0)
    form_id = Column(UUID(as_uuid=True), ForeignKey("registration_forms.id"))
    ai_generated = Column(Boolean, default=False)
    ai_rationale = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    event = relationship("Event", back_populates="tickets")
    registration_link = relationship("RegistrationLink", back_populates="ticket")