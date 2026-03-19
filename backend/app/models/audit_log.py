# backend/app/models/audit_log.py
from sqlalchemy import Column, String, Text, ForeignKey, DateTime, func
from sqlalchemy.dialects.postgresql import UUID, INET, JSONB
import uuid
from app.database import Base # Adjust import based on where your Base is defined

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    org_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=False)
    event_id = Column(UUID(as_uuid=True), ForeignKey("events.id"))
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    
    action = Column(String(100), nullable=False) # e.g., 'event.created' [cite: 445-446]
    entity_type = Column(String(50), nullable=False) # e.g., 'event' [cite: 449-450]
    entity_id = Column(UUID(as_uuid=True)) # The ID of the thing that was changed [cite: 454]
    
    details = Column(JSONB, default={}) # Stores what exactly changed [cite: 455-456]
    ip_address = Column(INET) # The user's IP address [cite: 458]
    user_agent = Column(Text) # The user's browser [cite: 459]
    
    created_at = Column(DateTime(timezone=True), server_default=func.now()) # [cite: 460]