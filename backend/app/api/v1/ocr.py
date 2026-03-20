# backend/app/api/v1/ocr.py
import logging
import time
import base64
import httpx
from fastapi import APIRouter, UploadFile, File, HTTPException, Request, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.api.deps import get_current_user, CurrentUser
from app.models.audit_log import AuditLog
from app.core.config import settings
import uuid

logger = logging.getLogger(__name__)
router = APIRouter()

ALLOWED_TYPES = {
    "application/pdf": "pdf",
    "image/jpeg": "image",
    "image/png": "image",
    "image/jpg": "image",
    "image/webp": "image",
}

MAX_FILE_SIZE_MB = 10


async def extract_with_mistral(file_bytes: bytes, mime_type: str, filename: str) -> str:
    """Send file to Mistral dedicated OCR endpoint and return extracted text."""
    logger.info(f"[OCR] Sending '{filename}' ({mime_type}) to Mistral OCR endpoint")

    b64_data = base64.standard_b64encode(file_bytes).decode("utf-8")

    # Mistral OCR uses a dedicated /v1/ocr endpoint with document/image blocks
    if mime_type == "application/pdf":
        document_block = {
            "type": "document_url",
            "document_url": f"data:{mime_type};base64,{b64_data}",
        }
    else:
        document_block = {
            "type": "image_url",
            "image_url": f"data:{mime_type};base64,{b64_data}",
        }

    payload = {
        "model": "mistral-ocr-latest",
        "document": document_block,
    }

    async with httpx.AsyncClient(timeout=60.0) as client:
        response = await client.post(
            "https://api.mistral.ai/v1/ocr",
            headers={
                "Authorization": f"Bearer {settings.MISTRAL_API_KEY}",
                "Content-Type": "application/json",
            },
            json=payload,
        )

        if response.status_code != 200:
            logger.error(f"[OCR] Mistral API error {response.status_code}: {response.text}")
            raise HTTPException(
                status_code=502,
                detail=f"Mistral OCR API error: {response.status_code} - {response.text[:300]}",
            )

        result = response.json()

        # Mistral OCR returns pages array with markdown content
        pages = result.get("pages", [])
        extracted = "\n\n".join(page.get("markdown", "") for page in pages).strip()

        logger.info(f"[OCR] Extracted {len(extracted)} chars from '{filename}' ({len(pages)} pages)")
        return extracted


@router.post("")
async def ocr_extract(
    request: Request,
    file: UploadFile = File(...),
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Upload a PDF or image → Mistral OCR extracts text → returns as prompt string.
    Logs every attempt (success + failure) to audit_logs.
    """
    start_time = time.time()
    filename = file.filename or "unknown"
    mime_type = file.content_type or ""

    logger.info(
        f"[OCR] Request from user={current_user.id} org={current_user.org_id} "
        f"file='{filename}' mime='{mime_type}'"
    )

    # ── Validation ────────────────────────────────────────────────────────────
    if mime_type not in ALLOWED_TYPES:
        logger.warning(f"[OCR] Rejected unsupported file type '{mime_type}' from user={current_user.id}")
        await _write_audit(db, current_user, request, action="ocr.rejected",
            details={"reason": "unsupported_type", "mime_type": mime_type, "filename": filename})
        raise HTTPException(status_code=400,
            detail=f"Unsupported file type '{mime_type}'. Allowed: PDF, JPG, PNG, WEBP.")

    file_bytes = await file.read()
    file_size_mb = len(file_bytes) / (1024 * 1024)

    if file_size_mb > MAX_FILE_SIZE_MB:
        logger.warning(f"[OCR] Rejected oversized file {file_size_mb:.1f}MB from user={current_user.id}")
        await _write_audit(db, current_user, request, action="ocr.rejected",
            details={"reason": "file_too_large", "size_mb": round(file_size_mb, 2), "filename": filename})
        raise HTTPException(status_code=413,
            detail=f"File too large ({file_size_mb:.1f} MB). Maximum is {MAX_FILE_SIZE_MB} MB.")

    if not settings.MISTRAL_API_KEY:
        logger.error("[OCR] MISTRAL_API_KEY is not set in .env")
        raise HTTPException(status_code=500, detail="OCR service not configured. Set MISTRAL_API_KEY in .env")

    # ── OCR Extraction ────────────────────────────────────────────────────────
    try:
        extracted_text = await extract_with_mistral(file_bytes, mime_type, filename)
    except HTTPException:
        await _write_audit(db, current_user, request, action="ocr.failed",
            details={"filename": filename, "mime_type": mime_type, "size_mb": round(file_size_mb, 2)})
        raise
    except Exception as e:
        logger.exception(f"[OCR] Unexpected error for file '{filename}': {e}")
        await _write_audit(db, current_user, request, action="ocr.failed",
            details={"filename": filename, "error": str(e)})
        raise HTTPException(status_code=500, detail=f"OCR extraction failed: {str(e)}")

    elapsed = round(time.time() - start_time, 2)
    char_count = len(extracted_text)

    logger.info(
        f"[OCR] ✅ Success — file='{filename}' chars={char_count} "
        f"size={file_size_mb:.2f}MB elapsed={elapsed}s user={current_user.id}"
    )

    # ── Audit Log ─────────────────────────────────────────────────────────────
    await _write_audit(db, current_user, request, action="ocr.success",
        details={
            "filename": filename,
            "mime_type": mime_type,
            "size_mb": round(file_size_mb, 2),
            "chars_extracted": char_count,
            "elapsed_seconds": elapsed,
        })

    return {
        "success": True,
        "filename": filename,
        "extracted_text": extracted_text,
        "chars_extracted": char_count,
        "elapsed_seconds": elapsed,
    }


async def _write_audit(db: AsyncSession, current_user: CurrentUser, request: Request,
                       action: str, details: dict):
    """Helper to write an audit log entry."""
    try:
        entry = AuditLog(
            id=uuid.uuid4(),
            org_id=current_user.org_id,
            user_id=current_user.id,
            action=action,
            entity_type="ocr",
            details=details,
            ip_address=request.client.host if request.client else None,
            user_agent=request.headers.get("user-agent"),
        )
        db.add(entry)
        await db.commit()
    except Exception as e:
        logger.error(f"[OCR] Failed to write audit log: {e}")
