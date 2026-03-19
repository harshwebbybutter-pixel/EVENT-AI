import httpx
import json
from app.core.config import settings

async def call_llm(system_prompt: str, user_message: str) -> str:
    """
    Calls the Groq-powered LLM using an OpenAI-compatible interface.
    """
    async with httpx.AsyncClient(timeout=60.0) as client:
        # We use the base URL from settings. 
        # If your LLM_BASE_URL is 'https://api.groq.com/openai/v1', 
        # this will correctly call /chat/completions.
        url = f"{settings.LLM_BASE_URL}/chat/completions"
        print(f"DEBUG: Using API Key starting with: {settings.GROQ_API_KEY[:10]}...")
        headers = {
            "Authorization": f"Bearer {settings.GROQ_API_KEY}",
            "Content-Type": "application/json"
        }
        
        payload = {
            "model": settings.LLM_MODEL_NAME,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_message}
            ],
            "temperature": 0.3,
            "max_tokens": 4000, # Increased for complex event JSON
            "response_format": {"type": "json_object"}
        }

        response = await client.post(
            url,
            headers=headers,
            json=payload
        )
        
        # This will now catch the error and provide more detail if it fails
        response.raise_for_status()
        
        result = response.json()
        return result["choices"][0]["message"]["content"]