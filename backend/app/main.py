import json
import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.api.router import api_router
from app.core.config import settings

app = FastAPI(
    title="Evenuefy 2.0 API",
    description="Backend API for Evenuefy Event Management Platform",
    version="2.0.0",
)

# Parse CORS origins from settings
try:
    origins = json.loads(settings.CORS_ORIGINS)
except Exception:
    origins = [settings.CORS_ORIGINS]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve uploaded QR code images at /static/qr/<filename>
uploads_path = os.path.join(os.path.dirname(__file__), "..", settings.STORAGE_PATH)
os.makedirs(uploads_path, exist_ok=True)
app.mount("/static/qr", StaticFiles(directory=uploads_path), name="static-qr")


@app.get("/health", tags=["Health"])
async def health_check():
    return {"status": "online", "version": "2.0.0"}


app.include_router(api_router, prefix="/api/v1")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
