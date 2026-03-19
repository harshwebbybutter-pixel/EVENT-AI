from fastapi import APIRouter, HTTPException
from app.schemas.ai_setup import AISetupRequest, AISetupResponse
from app.services.ai_setup_service import orchestrate_ai_setup
import traceback

router = APIRouter()


@router.post("", response_model=AISetupResponse)
async def create_ai_setup(request: AISetupRequest):
    try:
        result_data = await orchestrate_ai_setup(request.prompt, request.org_id)
        return AISetupResponse(success=True, data=result_data)
    except Exception as e:
        # Print the FULL traceback to your terminal so you can see exactly what failed
        print("\n========== AI SETUP ERROR ==========")
        traceback.print_exc()
        print("====================================\n")
        raise HTTPException(status_code=500, detail=f"AI Setup Pipeline failed: {str(e)}")
