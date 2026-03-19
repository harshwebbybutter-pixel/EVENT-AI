from uuid import UUID
from typing import List, Dict, Any
from app.ai.graph import build_ai_setup_graph


def map_ai_fields(raw_fields: Any) -> List[Dict[str, Any]]:
    """Normalizes AI-generated form fields to match the FormField schema."""
    if isinstance(raw_fields, dict):
        raw_fields = [raw_fields]
    elif not isinstance(raw_fields, list):
        raw_fields = []

    cleaned_fields = []
    for i, field in enumerate(raw_fields):
        cleaned_fields.append({
            "field_id": str(field.get("field_id") or field.get("id") or f"field_{i}"),
            "label":    str(field.get("label") or field.get("name") or "New Field"),
            "type":     str(field.get("type") or "text"),
            "required": bool(field.get("required", False)),
            "placeholder": str(field.get("placeholder", "")),
            "options":  field.get("options") if isinstance(field.get("options"), list) else [],
            "ai_generated": True,
            "sort_order": int(field.get("sort_order") or (i + 1)),
        })
    return cleaned_fields


async def orchestrate_ai_setup(prompt: str, org_id: UUID) -> dict:
    """
    Runs the LangGraph AI pipeline and returns a schema-compliant dict.
    """
    ai_graph = build_ai_setup_graph()

    initial_state = {
        "user_prompt": prompt,
        "org_id": str(org_id),
        "parsed_intent": {},
        "event_data": {},
        "tickets_data": [],
        "form_data": {},
        "email_data": {},
        "confidence": 0.0,
        "errors": [],
    }

    # Run the graph
    final_state = await ai_graph.ainvoke(initial_state)

    print("DEBUG final_state keys:", list(final_state.keys()))
    print("DEBUG event_data:", final_state.get("event_data"))
    print("DEBUG tickets_data:", final_state.get("tickets_data"))
    print("DEBUG form_data:", final_state.get("form_data"))
    print("DEBUG email_data:", final_state.get("email_data"))
    print("DEBUG errors:", final_state.get("errors"))

    # 1. Event
    event_data = final_state.get("event_data", {})
    event_data["ai_confidence"] = final_state.get("confidence", 0.0)

    # 2. Form — graph.py already builds the full form_data dict with pages+fields
    #    Extract fields from it and re-normalise to be safe
    raw_form = final_state.get("form_data", {})

    if isinstance(raw_form, dict) and "schema" in raw_form:
        # Graph returned a fully structured form — extract fields from first page
        pages = raw_form.get("schema", {}).get("pages", [])
        raw_fields = pages[0].get("fields", []) if pages else []
    elif isinstance(raw_form, list):
        # Graph returned a flat list of fields directly
        raw_fields = raw_form
    else:
        raw_fields = []

    safe_fields = map_ai_fields(raw_fields)

    structured_form = {
        "name": f"Registration for {event_data.get('name', 'Event')}",
        "user_type": "attendee",
        "schema": {
            "pages": [
                {
                    "page_number": 1,
                    "title": "General Information",
                    "fields": safe_fields,
                }
            ]
        },
    }

    # 3. Tickets
    tickets = final_state.get("tickets_data", [])
    if isinstance(tickets, dict):
        # Sometimes LLM wraps array in an object
        tickets = tickets.get("tickets", [])

    # 4. Email
    email_data = final_state.get("email_data", {})
    if not isinstance(email_data, dict):
        email_data = {}
    if "subject" not in email_data:
        email_data["subject"] = f"Your registration for {event_data.get('name', 'the event')}"
    if "body_html" not in email_data:
        email_data["body_html"] = "<p>Thank you for registering!</p>"

    return {
        "event": event_data,
        "tickets": tickets,
        "form": structured_form,
        "confirmation_email": email_data,
    }
