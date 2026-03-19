import json

def parse_json_safely(response_text: str) -> dict:
    """Safely extracts and parses JSON from the LLM response."""
    try:
        return json.loads(response_text)
    except json.JSONDecodeError:
        # Fallback logic could go here if the LLM hallucinated markdown
        return {}

def extract_array_safely(parsed_data: dict, key: str = "fields") -> list:
    """Handles cases where LLM wraps arrays in an object."""
    if isinstance(parsed_data, list):
        return parsed_data
    return parsed_data.get(key, [])