from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from uuid import UUID

from app.database import get_db
from app.schemas import AISetupData, EventPublishResponse, RegistrationLinkData
from app.models import Event, Ticket, RegistrationForm, EmailTemplate, RegistrationLink, AuditLog
from app.services.qr_service import generate_short_code, generate_registration_url, generate_qr_code
from app.api.deps import get_current_user, CurrentUser
from app.middleware.tenant import set_tenant_context  # FIXED: was app.api.tenant

router = APIRouter()


@router.post("", response_model=dict)
async def save_ai_event_setup(
    request: Request,
    setup_data: AISetupData,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    org_id: UUID = Depends(set_tenant_context)
):
    try:
        settings_data = setup_data.event.settings
        if hasattr(settings_data, "model_dump"):
            settings_data = settings_data.model_dump()

        new_event = Event(
            org_id=org_id,
            created_by=current_user.id,
            **setup_data.event.model_dump(exclude={"settings", "ai_confidence"}),
            settings=settings_data,
            ai_generated=True,
            ai_confidence=getattr(setup_data.event, "ai_confidence", 0.0),
            status="draft"
        )
        db.add(new_event)
        await db.flush()

        for ticket_data in setup_data.tickets:
            new_ticket = Ticket(
                event_id=new_event.id,
                **ticket_data.model_dump()
            )
            db.add(new_ticket)

        form_schema = getattr(setup_data.form, "schema_", getattr(setup_data.form, "schema", {}))
        if hasattr(form_schema, "model_dump"):
            form_schema = form_schema.model_dump()

        new_form = RegistrationForm(
            event_id=new_event.id,
            name=setup_data.form.name,
            user_type=setup_data.form.user_type,
            schema=form_schema,
            ai_generated=True
        )
        db.add(new_form)

        new_email = EmailTemplate(
            event_id=new_event.id,
            template_type="registration_welcome",
            name="Welcome Email",
            subject=setup_data.confirmation_email.subject,
            body_html=setup_data.confirmation_email.body_html,
            ai_generated=True
        )
        db.add(new_email)

        audit_entry = AuditLog(
            org_id=org_id,
            event_id=new_event.id,
            user_id=current_user.id,
            action="event.created",
            entity_type="event",
            entity_id=new_event.id,
            details={"source": "ai_wizard", "status": "draft"},
            ip_address=request.client.host if request.client else None,
            user_agent=request.headers.get("user-agent")
        )
        db.add(audit_entry)

        await db.commit()
        await db.refresh(new_event)

        return {"event_id": str(new_event.id), "status": new_event.status}

    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to save event setup: {str(e)}")


@router.post("/{event_id}/publish", response_model=EventPublishResponse)
async def publish_event(
    event_id: UUID,
    db: AsyncSession = Depends(get_db),
    org_id: UUID = Depends(set_tenant_context)
):
    result = await db.execute(select(Event).where(Event.id == event_id))
    event = result.scalar_one_or_none()

    if not event:
        raise HTTPException(status_code=404, detail="Event not found or access denied")
    if event.status == "published":
        raise HTTPException(status_code=400, detail="Event is already published")

    try:
        short_code = generate_short_code()
        full_url = generate_registration_url(short_code)
        qr_url = generate_qr_code(full_url, short_code)

        new_link = RegistrationLink(
            event_id=event.id,
            short_code=short_code,
            full_url=full_url,
            qr_code_url=qr_url
        )
        db.add(new_link)

        event.status = "published"
        event.registration_open = True

        await db.commit()

        return EventPublishResponse(
            event_id=event.id,
            status=event.status,
            registration_link=RegistrationLinkData(
                url=full_url,
                short_code=short_code,
                qr_code_url=qr_url
            )
        )
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to publish event: {str(e)}")


@router.get("/{event_id}")
async def get_event(
    event_id: UUID,
    db: AsyncSession = Depends(get_db),
    org_id: UUID = Depends(set_tenant_context)
):
    query = select(Event).where(Event.id == event_id).options(
        selectinload(Event.tickets),
        selectinload(Event.registration_forms),
        selectinload(Event.email_templates),
        selectinload(Event.registration_links)
    )
    result = await db.execute(query)
    event = result.scalar_one_or_none()

    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    return event
