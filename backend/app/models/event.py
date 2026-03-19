import uuid
from sqlalchemy import Column, String, Text, Boolean, Integer, Float, DateTime, Time, Date, ForeignKey
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base

class Event(Base):
    __tablename__ = "events"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    org_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=False)
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    
    name = Column(String(500), nullable=False)
    slug = Column(String(200), unique=True, nullable=False)
    description = Column(Text)
    event_type = Column(String(100))
    
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    start_time = Column(Time)
    end_time = Column(Time)
    timezone = Column(String(50), default="Asia/Kolkata")
    
    venue_name = Column(String(500))
    venue_address = Column(Text)
    city = Column(String(100))
    state = Column(String(100))
    country = Column(String(100), default="India")
    
    status = Column(String(20), default="draft")
    published_at = Column(DateTime(timezone=True))
    
    registration_open = Column(Boolean, default=False)
    reg_start_date = Column(DateTime(timezone=True))
    reg_end_date = Column(DateTime(timezone=True))
    max_attendees = Column(Integer)
    custom_domain = Column(String(255))
    
    ai_generated = Column(Boolean, default=False)
    ai_prompt = Column(Text)
    ai_confidence = Column(Float)
    
    settings = Column(JSONB, default={})
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    organization = relationship("Organization", back_populates="events")
    creator = relationship("User", back_populates="events_created")
    tickets = relationship("Ticket", back_populates="event", cascade="all, delete-orphan")
    registration_forms = relationship("RegistrationForm", back_populates="event", cascade="all, delete-orphan")
    email_templates = relationship("EmailTemplate", back_populates="event", cascade="all, delete-orphan")
    registration_links = relationship("RegistrationLink", back_populates="event", cascade="all, delete-orphan")