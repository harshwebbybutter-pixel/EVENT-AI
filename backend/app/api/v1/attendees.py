# backend/app/api/v1/attendees.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from sqlalchemy import update
from pydantic import BaseModel
from uuid import UUID, uuid4
from typing import Dict, Any
from datetime import datetime

from app.database import get_db
from app.models import Event, RegistrationLink, RegistrationForm

router = APIRouter()


class RegistrationRequest(BaseModel):
    event_id: UUID
    ticket_id: UUID
    full_name: str
    email: str
    answers: Dict[str, Any]


@router.get("/events/{short_code}")
async def get_public_event(short_code: str, db: AsyncSession = Depends(get_db)):
    """Fetch event + full form schema for the public registration page."""

    # 1. Find the registration link
    link_result = await db.execute(
        select(RegistrationLink).where(RegistrationLink.short_code == short_code)
    )
    link = link_result.scalar_one_or_none()
    if not link:
        raise HTTPException(status_code=404, detail="Registration link not found")

    # 2. Fetch event with tickets + registration forms
    event_result = await db.execute(
        select(Event)
        .where(Event.id == link.event_id)
        .options(
            selectinload(Event.tickets),
            selectinload(Event.registration_forms),
        )
    )
    event = event_result.scalar_one_or_none()

    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    if event.status != "published":
        raise HTTPException(status_code=404, detail="Event is not open for registration")

    # 3. Build tickets list
    tickets = [
        {
            "id": str(t.id),
            "name": t.name,
            "price": float(t.price) if t.price is not None else 0.0,
            "type": t.user_type,
            "currency": "INR",
            "total_quantity": getattr(t, "total_quantity", None),
        }
        for t in event.tickets
    ]

    # 4. Extract ALL fields from registration_forms.schema (pages → fields)
    fields = []
    form = event.registration_forms[0] if event.registration_forms else None
    if form and isinstance(form.schema, dict):
        for page in form.schema.get("pages", []):
            for field in page.get("fields", []):
                field_type = field.get("type", "text")
                # Normalize to valid HTML input types
                type_map = {
                    "phone": "tel",
                    "dropdown": "select",
                    "textarea": "textarea",
                    "checkbox": "checkbox",
                    "date": "date",
                    "number": "number",
                    "email": "email",
                    "file": "file",
                }
                field_type = type_map.get(field_type, "text")

                fields.append({
                    "id": field.get("field_id") or field.get("id"),
                    "label": field.get("label", ""),
                    "type": field_type,
                    "placeholder": field.get("placeholder", ""),
                    "required": field.get("required", False),
                    "options": field.get("options"),
                    "sort_order": field.get("sort_order", 0),
                })

        fields.sort(key=lambda f: f.get("sort_order", 0))

    return {
        "id": str(event.id),
        "form_id": str(form.id) if form else None,
        "name": event.name,
        "description": event.description or "",
        "date": str(event.start_date) if event.start_date else None,
        "end_date": str(event.end_date) if event.end_date else None,
        "location": f"{event.city or ''}, {event.country or ''}".strip(", ") or "TBA",
        "venue": event.venue_name or "",
        "tickets": tickets,
        "form_fields": fields,
    }


@router.post("/register")
async def register_attendee(data: RegistrationRequest, db: AsyncSession = Depends(get_db)):
    """Save registration response into registration_forms.submissions — no separate table needed."""

    # 1. Verify event exists and is published
    event = await db.get(Event, data.event_id)
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    if event.status != "published":
        raise HTTPException(status_code=400, detail="Event is not open for registration")

    # 2. Find the registration form for this event
    form_result = await db.execute(
        select(RegistrationForm).where(RegistrationForm.event_id == data.event_id)
    )
    form = form_result.scalar_one_or_none()
    if not form:
        raise HTTPException(status_code=404, detail="Registration form not found for this event")

    # 3. Build the submission entry
    submission = {
        "id": str(uuid4()),
        "ticket_id": str(data.ticket_id),
        "full_name": data.full_name,
        "email": data.email,
        "answers": data.answers,
        "submitted_at": datetime.utcnow().isoformat(),
    }

    # 4. Append to existing submissions list
    current_submissions = form.submissions or []
    updated_submissions = current_submissions + [submission]

    # 5. Save back to DB using JSONB update
    await db.execute(
        update(RegistrationForm)
        .where(RegistrationForm.id == form.id)
        .values(submissions=updated_submissions)
    )
    await db.commit()

    return {
        "status": "success",
        "message": "Registration complete!",
        "submission_id": submission["id"],
    }
