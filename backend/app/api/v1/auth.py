from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel, EmailStr
import uuid, re
from passlib.context import CryptContext

from app.database import get_db
from app.models.user import User
from app.models.organization import Organization
from app.core.security import create_access_token

router = APIRouter()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


# ── Schemas ────────────────────────────────────────────────────────────────────

class SignupRequest(BaseModel):
    full_name: str
    email: EmailStr
    password: str
    org_name: str          # "My Company" or personal name — becomes their tenant


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


# ── Helpers ────────────────────────────────────────────────────────────────────

def make_slug(name: str) -> str:
    """Turn 'My Awesome Org' → 'my-awesome-org-a1b2'"""
    base = re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")
    return f"{base}-{uuid.uuid4().hex[:6]}"


def token_response(user: User):
    token = create_access_token(
        data={"sub": str(user.id), "org_id": str(user.org_id)}
    )
    return {
        "access_token": token,
        "token_type": "bearer",
        "org_id": str(user.org_id),
        "user": {
            "id": str(user.id),
            "full_name": user.full_name,
            "email": user.email,
            "role": user.role,
        },
    }


# ── Routes ─────────────────────────────────────────────────────────────────────

@router.post("/signup")
async def signup(body: SignupRequest, db: AsyncSession = Depends(get_db)):
    """
    Anyone can call this. Creates a new Organization + Owner user in one step.
    Each signup = a completely isolated tenant in the database.
    """
    # 1. Check email not already taken
    existing = await db.execute(select(User).where(User.email == body.email))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email already registered.")

    # 2. Create the Organization (their private tenant)
    org = Organization(
        id=uuid.uuid4(),
        name=body.org_name,
        slug=make_slug(body.org_name),
        email=body.email,
    )
    db.add(org)
    await db.flush()   # get org.id before creating user

    # 3. Create the User as owner of that org
    user = User(
        id=uuid.uuid4(),
        org_id=org.id,
        email=body.email,
        full_name=body.full_name,
        password_hash=pwd_context.hash(body.password),
        role="owner",
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)

    return token_response(user)


@router.post("/login")
async def login(body: LoginRequest, db: AsyncSession = Depends(get_db)):
    """Real email + password login. Works for any organizer."""
    result = await db.execute(select(User).where(User.email == body.email))
    user = result.scalar_one_or_none()

    if not user or not pwd_context.verify(body.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password.")

    return token_response(user)
