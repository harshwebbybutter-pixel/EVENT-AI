# Base templates for known event types
BASE_FORM_FIELDS = [
    {"field_id": "firstName", "label": "First Name", "type": "text", "required": True},
    {"field_id": "lastName", "label": "Last Name", "type": "text", "required": True},
    {"field_id": "email", "label": "Email", "type": "email", "required": True, "is_unique_identifier": True},
    {"field_id": "contactNo", "label": "Mobile Number", "type": "phone", "required": True},
]