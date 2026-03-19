import json
from typing import TypedDict
from langgraph.graph import StateGraph, START, END
from app.ai.llm import call_llm
from app.ai.prompts import INTENT_PROMPT, EVENT_PROMPT, TICKET_PROMPT, FORM_PROMPT, EMAIL_PROMPT
from app.ai.parsers import parse_json_safely, extract_array_safely
from app.ai.event_templates import BASE_FORM_FIELDS

class AISetupState(TypedDict):
    user_prompt: str
    org_id: str
    parsed_intent: dict
    event_data: dict
    tickets_data: list
    form_data: dict
    email_data: dict
    confidence: float
    errors: list

async def parse_intent(state: AISetupState) -> AISetupState:
    response = await call_llm(INTENT_PROMPT, state["user_prompt"])
    parsed = parse_json_safely(response)
    state["parsed_intent"] = parsed
    state["confidence"] = 0.85 # Simplified heuristic
    return state

async def generate_event(state: AISetupState) -> AISetupState:
    response = await call_llm(EVENT_PROMPT, json.dumps(state["parsed_intent"]))
    state["event_data"] = parse_json_safely(response)
    return state

async def generate_tickets(state: AISetupState) -> AISetupState:
    context = {"intent": state["parsed_intent"], "event": state["event_data"]}
    response = await call_llm(TICKET_PROMPT, json.dumps(context))
    parsed = parse_json_safely(response)
    state["tickets_data"] = extract_array_safely(parsed, "tickets")
    return state

async def generate_form(state: AISetupState) -> AISetupState:
    response = await call_llm(FORM_PROMPT, json.dumps(state["parsed_intent"]))
    ai_fields = extract_array_safely(parse_json_safely(response), "fields")
    
    all_fields = BASE_FORM_FIELDS + ai_fields
    for i, field in enumerate(all_fields):
        field["sort_order"] = i + 1
        
    state["form_data"] = {
        "name": "Event Attendee Form",
        "user_type": "attendee",
        "schema": {"pages": [{"page_number": 1, "title": "Registration Details", "fields": all_fields}]}
    }
    return state

async def generate_email(state: AISetupState) -> AISetupState:
    response = await call_llm(EMAIL_PROMPT, json.dumps(state["event_data"]))
    state["email_data"] = parse_json_safely(response)
    return state

# --- NEW SECURITY NODE ---
async def validate_output(state: AISetupState) -> AISetupState:
    """
    Step 6: Validate all generated data before returning. [cite: 1355-1356]
    """
    errors = []
    
    # Validate event
    event = state.get("event_data", {})
    if not event.get("name"):
        errors.append("Event name is missing")
    if not event.get("start_date") or not event.get("end_date"):
        errors.append("Event dates are missing")
        
    # Validate tickets
    tickets = state.get("tickets_data", [])
    if not tickets or len(tickets) < 1:
        errors.append("At least one ticket type is required")
        
    # Validate form
    form = state.get("form_data", {})
    fields = form.get("schema", {}).get("pages", [{}])[0].get("fields", [])
    if len(fields) < 4:
        errors.append("Form must have at least 4 fields")
        
    state["errors"] = errors
    return state

# --- BUILD THE GRAPH ---
def build_ai_setup_graph():
    graph = StateGraph(AISetupState)
    
    # 1. Add all nodes
    graph.add_node("parse_intent", parse_intent)
    graph.add_node("generate_event", generate_event)
    graph.add_node("generate_tickets", generate_tickets)
    graph.add_node("generate_form", generate_form)
    graph.add_node("generate_email", generate_email)
    graph.add_node("validate_output", validate_output) # Added validation node [cite: 1357]
    
    # 2. Define the strict pipeline flow
    graph.add_edge(START, "parse_intent")
    graph.add_edge("parse_intent", "generate_event")
    graph.add_edge("generate_event", "generate_tickets")
    graph.add_edge("generate_tickets", "generate_form")
    graph.add_edge("generate_form", "generate_email")
    
    # Route email to validation, then validation to the end [cite: 1357]
    graph.add_edge("generate_email", "validate_output")
    graph.add_edge("validate_output", END) 
    
    return graph.compile()