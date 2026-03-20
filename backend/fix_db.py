import asyncio
from app.database import engine
from sqlalchemy import text

async def fix():
    async with engine.begin() as conn:
        # Fix email_templates - add missing columns
        await conn.execute(text("ALTER TABLE email_templates ADD COLUMN IF NOT EXISTS body_text TEXT"))
        await conn.execute(text("ALTER TABLE email_templates ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true"))
        print("✅ email_templates fixed")

    print("✅ All done!")

asyncio.run(fix())
