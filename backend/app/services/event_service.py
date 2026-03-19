from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from uuid import UUID

from app.schemas.ai_setup import AISetupData
from app.models import Event, Ticket, RegistrationForm, EmailTemplate, RegistrationLink
from app.services.qr_service import generate_qr_code
from app.services.link_service import generate_short_code, generate_registration_url

async def save_ai_generated_event(db: AsyncSession, setup_data: AISetupData, org_id: UUID, user_id: UUID):
    """Saves all generated event data into Postgres."""
    new_event = Event(
        org_id=org_id,
        created_by=user_id,
        **setup_data.event.model_dump(exclude={"settings", "ai_confidence"}),
        settings=setup_data.event.settings.model_dump(),
        ai_generated=True,
        ai_confidence=setup_data.event.ai_confidence,
        status="draft"
    )
    db.add(new_event)
    await db.flush() 

    for ticket_data in setup_data.tickets:
        db.add(Ticket(event_id=new_event.id, **ticket_data.model_dump()))

    db.add(RegistrationForm(
        event_id=new_event.id,
        name=setup_data.form.name,
        user_type=setup_data.form.user_type,
        schema=setup_data.form.schema_.model_dump(),
        ai_generated=True
    ))

    db.add(EmailTemplate(
        event_id=new_event.id,
        template_type="registration_welcome",
        name="Welcome Email",
        subject=setup_data.confirmation_email.subject,
        body_html=setup_data.confirmation_email.body_html,
        ai_generated=True
    ))

    await db.commit()
    return new_event.id, new_event.status

async def publish_event_logic(db: AsyncSession, event_id: UUID) -> dict:
    """Handles the publishing state change and URL/QR generation."""
    result = await db.execute(select(Event).where(Event.id == event_id))
    event = result.scalar_one_or_none()

    if not event:
        raise ValueError("Event not found")
    if event.status == "published":
        raise ValueError("Event is already published")

    short_code = generate_short_code()
    full_url = generate_registration_url(short_code)
    qr_url = generate_qr_code(full_url, short_code)

    db.add(RegistrationLink(
        event_id=event.id,
        short_code=short_code,
        full_url=full_url,
        qr_code_url=qr_url
    ))

    event.status = "published"
    event.registration_open = True
    await db.commit()

    return {
        "event_id": event.id,
        "status": event.status,
        "registration_link": {
            "url": full_url,
            "short_code": short_code,
            "qr_code_url": qr_url
        }
    }