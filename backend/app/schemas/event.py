from pydantic import BaseModel
from typing import Optional, Dict, Any
from datetime import date
from uuid import UUID

from .registration_link import RegistrationLinkData


class EventBase(BaseModel):
    name: str
    slug: str
    description: Optional[str] = None
    event_type: str
    start_date: date
    end_date: date
    venue_name: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    country: str = "India"
    timezone: str = "Asia/Kolkata"
    max_attendees: Optional[int] = None
    settings: Dict[str, Any] = {}


class EventCreate(EventBase):
    organization_id: UUID


class EventUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    venue_name: Optional[str] = None
    max_attendees: Optional[int] = None
    settings: Optional[Dict[str, Any]] = None


class EventRead(EventBase):
    id: UUID
    organization_id: UUID
    status: str
    ai_confidence: Optional[float] = None

    class Config:
        from_attributes = True


class EventPublishResponse(BaseModel):
    event_id: UUID
    status: str
    registration_link: RegistrationLinkData

class RegistrationLinkData(BaseModel):
    url: str
    short_code: str
    qr_code_url: str

# This is the main EventPublish schema your route is looking for [cite: 699-709]
class EventPublish(BaseModel):
    event_id: UUID
    status: str
    registration_link: RegistrationLinkData