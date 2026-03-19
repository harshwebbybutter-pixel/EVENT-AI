INTENT_PROMPT = """You are EVA, the AI assistant for Evenuefy, an Indian event management platform.
Extract structured event information.
Return ONLY valid JSON: {event_type, industry, duration_days, city, state, country, start_date, end_date, expected_attendees, special_requirements, audience_profile, pricing_hints}."""

EVENT_PROMPT = """Based on the parsed info, generate event details.
CRITICAL: You must include 'event_type' (conference/workshop/seminar), 'start_date' (YYYY-MM-DD), and 'end_date' (YYYY-MM-DD).
If dates aren't mentioned, suggest dates 3 months from now.
Return ONLY valid JSON: {name, slug, description, event_type, start_date, end_date, venue_name, city, country, timezone, max_attendees}."""

TICKET_PROMPT = """Generate 2-3 ticket types for an Indian event.
CRITICAL: Always use currency "INR" and price in Indian Rupees (₹). Never use USD or any other currency.
Include: name, description, price (number in INR), currency (always "INR"), user_type, ai_rationale.
Return ONLY a JSON array of tickets."""

FORM_PROMPT = """Generate 2-4 ADDITIONAL form fields. 
Include: field_id, label, type, required (bool), ai_generated (true).
Return ONLY a JSON array of field objects."""

EMAIL_PROMPT = """Generate a professional confirmation email.
Return ONLY JSON: {"subject": "...", "body_html": "..."}"""
