from pydantic import BaseModel, field_validator
from typing import Optional
from datetime import datetime


class TicketBase(BaseModel):
    name: str
    description: Optional[str] = None
    user_type: str = "attendee"
    price: float = 0.0
    currency: str = "INR"
    total_quantity: Optional[int] = None
    sale_start: Optional[datetime] = None
    sale_end: Optional[datetime] = None
    ai_generated: bool = False
    ai_rationale: Optional[str] = None

    @field_validator("currency", mode="before")
    @classmethod
    def force_inr(cls, v):
        # Always override to INR regardless of what the AI returns
        return "INR"


class TicketCreate(TicketBase):
    event_id: str


class TicketRead(TicketBase):
    id: str
    event_id: str

    class Config:
        from_attributes = True
