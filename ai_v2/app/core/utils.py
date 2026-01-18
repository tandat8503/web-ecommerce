import json
import re
from typing import Any, Dict

def extract_json_object(text: str) -> Dict[str, Any]:
    """
    Robustly extract the first valid JSON object from a string.
    Handles markdown code blocks (```json ... ```) and raw JSON.
    """
    if not text:
        return {}
        
    # Remove markdown code blocks
    text = text.replace("```json", "").replace("```", "").strip()
    
    # Try direct parse
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass
        
    # Try finding the first pair of curly braces
    # This regex attempts to find the outermost matching braces
    # It's a non-recursive approximation but works for most LLM outputs
    try:
        match = re.search(r'(\{.*\})', text, re.DOTALL)
        if match:
            return json.loads(match.group(1))
    except (json.JSONDecodeError, AttributeError):
        pass
        
    # Fallback: aggressive search for start and end
    try:
        start = text.find('{')
        end = text.rfind('}')
        if start != -1 and end != -1 and end > start:
            return json.loads(text[start:end+1])
    except json.JSONDecodeError:
        pass
        
    return {}
