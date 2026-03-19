# backend/app/api/deps.py
from fastapi import Depends, HTTPException, Security
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import jwt
from pydantic import BaseModel
from uuid import UUID
from app.core.config import settings
from app.core.security import ALGORITHM

security = HTTPBearer()

class CurrentUser(BaseModel):
    id: UUID
    org_id: UUID

async def get_current_user(credentials: HTTPAuthorizationCredentials = Security(security)) -> CurrentUser:
    """
    This is the core dependency for ALL protected routes.
    It decodes the REAL token and extracts the Org ID for RLS.
    """
    token = credentials.credentials
    try:
        # 1. Verify the token signature using your secret key
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[ALGORITHM])
        
        # 2. Extract the actual IDs we stored during developer-login
        user_id: str = payload.get("sub")
        org_id: str = payload.get("org_id")
        
        if user_id is None or org_id is None:
            raise HTTPException(status_code=401, detail="Invalid token: Missing IDs")
            
        return CurrentUser(id=UUID(user_id), org_id=UUID(org_id))
        
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired session token")