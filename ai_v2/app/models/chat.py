
from pydantic import BaseModel
from typing import Optional, Dict, Any, List

class ChatRequest(BaseModel):
    message: str
    session_id: Optional[str] = None
    history: Optional[str] = ""
    role: Optional[str] = "user" # "user" (customer) or "admin"
    image_data: Optional[str] = None # Base64 encoded image for visual search


class ChatResponse(BaseModel):
    type: str # product | legal | chitchat
    answer: str
    products: Optional[List[Dict[str, Any]]] = []
    citations: Optional[List[Dict[str, Any]]] = []
    # Legacy fields for backward compatibility if needed, but User requested standardization
    # We can keep 'action' and 'data' as hidden or remove them if frontend strictly follows new schema.
    # User request implies replacing structure. But to be safe, I'll map them.
    action: Optional[str] = None 
    data: Optional[Dict[str, Any]] = None
