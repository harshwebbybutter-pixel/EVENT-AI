# backend/app/api/tenant.py
from fastapi import Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from app.database import get_db
from app.api.deps import get_current_user, CurrentUser
from uuid import UUID

async def set_tenant_context(
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> UUID:
    """
    This is the core RLS Dependency. 
    It ensures the database session is restricted to the current user's organization.
    """
    try:
        # 1. We take the org_id from the verified JWT (current_user)
        org_id = current_user.org_id
        
        # 2. We set a session-level variable in PostgreSQL.
        # This variable 'app.current_org_id' is what your RLS policies 
        # in SQL look for to allow or deny access to rows.
        await db.execute(
            text("SELECT set_config('app.current_org_id', :org_id, false)"),
            {"org_id": str(org_id)}
        )
        
        # Return the org_id so other routes can use it if needed
        return org_id

    except Exception as e:
        # If we can't set the context, we must block the request for security
        raise HTTPException(
            status_code=500, 
            detail=f"Security Error: Could not establish tenant context. {str(e)}"
        )

def get_tenant_id(org_id: UUID = Depends(set_tenant_context)) -> UUID:
    """
    Simple helper dependency to get the org_id once the context is set.
    """
    return org_id