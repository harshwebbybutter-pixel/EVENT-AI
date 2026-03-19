from pydantic import BaseModel
from typing import Optional

class RegistrationLinkData(BaseModel):
    url: str
    short_code: str
    qr_code_url: Optional[str] = None