import qrcode
import uuid
import os
from app.core.config import settings


def generate_short_code() -> str:
    """Generate an 8-character short code for the registration link."""
    return uuid.uuid4().hex[:8]


def generate_registration_url(short_code: str) -> str:
    """
    Build the full public registration URL (points to frontend).
    e.g. http://localhost:3000/r/ce8b7c17
    """
    return f"{settings.APP_BASE_URL}/r/{short_code}"


def generate_qr_code(url: str, short_code: str) -> str:
    """
    Generate a QR code PNG for the registration URL.
    Saves to: backend/uploads/{short_code}.png
    Serves at: {BACKEND_URL}/static/qr/{short_code}.png
    """
    os.makedirs(settings.STORAGE_PATH, exist_ok=True)

    file_name = f"{short_code}.png"
    output_path = os.path.join(settings.STORAGE_PATH, file_name)

    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_H,
        box_size=10,
        border=4,
    )
    qr.add_data(url)
    qr.make(fit=True)

    img = qr.make_image(fill_color="#1B4F72", back_color="white")
    img.save(output_path)

    # QR image served by backend, registration link served by frontend
    return f"{settings.BACKEND_URL}/static/qr/{file_name}"
