from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
from uuid import UUID

from .ticket import TicketBase
from .event import EventBase


class FormField(BaseModel):
    field_id: str
    label: str
    type: str
    placeholder: Optional[str] = None
    required: bool = False
    options: Optional[List[str]] = None
    options_source: Optional[str] = None
    validation: Optional[Dict[str, Any]] = None
    is_unique_identifier: Optional[bool] = False
    ai_generated: Optional[bool] = False
    sort_order: int


class FormPage(BaseModel):
    page_number: int
    title: str
    description: Optional[str] = None
    fields: List[FormField]


class FormSchema(BaseModel):
    pages: List[FormPage]


class RegistrationFormBase(BaseModel):
    name: str
    user_type: str = "attendee"
    schema_: FormSchema = Field(alias="schema")


class ConfirmationEmailBase(BaseModel):
    subject: str
    body_html: str


class AISetupRequest(BaseModel):
    prompt: str
    org_id: UUID


class AISetupData(BaseModel):
    event: EventBase
    tickets: List[TicketBase]
    form: RegistrationFormBase
    confirmation_email: ConfirmationEmailBase


class AISetupResponse(BaseModel):
    success: bool
    data: AISetupData
