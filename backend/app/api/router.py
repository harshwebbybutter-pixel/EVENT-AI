from fastapi import APIRouter
from app.api.v1 import ai_setup, events, auth, attendees, ocr

api_router = APIRouter()

# Private organizer routes (JWT protected)
api_router.include_router(auth.router,      prefix="/auth",      tags=["Authentication"])
api_router.include_router(events.router,    prefix="/events",    tags=["Events"])
api_router.include_router(ai_setup.router,  prefix="/ai-setup",  tags=["AI Setup"])
api_router.include_router(ocr.router,       prefix="/ocr",       tags=["OCR"])

# Public attendee routes (no auth required)
api_router.include_router(attendees.router, prefix="/public",    tags=["Public Registration"])
