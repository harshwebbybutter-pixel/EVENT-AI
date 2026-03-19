import uuid
from app.config import settings

def generate_short_code() -> str:
    """Generate an 8-character alphanumeric short code."""
    return uuid.uuid4().hex[:8]

def generate_registration_url(short_code: str) -> str:
    """Build the full registration URL."""
    return f"{settings.APP_BASE_URL}/r/{short_code}"