
from fastapi import APIRouter, HTTPException
from app.models.chat import ChatRequest, ChatResponse
from app.services.chatbot_service import chatbot_service
from app.core.logger import get_logger

logger = get_logger(__name__)
router = APIRouter()

@router.post("/chat", response_model=ChatResponse)
async def chat_endpoint(request: ChatRequest):
    try:
        logger.info("="*80)
        logger.info("[CHAT REQUEST] User message received")
        logger.info(f"  Query: {request.message}")
        logger.info(f"  Role: {request.role or 'user'}")
        logger.info(f"  Session ID: {request.session_id}")
        logger.info(f"  Has history: {bool(request.history)}")
        logger.info(f"  Has image: {bool(request.image_data)}")
        if request.image_data:
            logger.info(f"  Image size: {len(request.image_data)} bytes")
        logger.info("="*80)
        
        # Build context with image_data if provided
        context = {
            "history": request.history,
            "role": request.role or "user",
            "session_id": request.session_id
        }
        if request.image_data:
            context["image_data"] = request.image_data
        
        result = await chatbot_service.process_message(
            user_message=request.message,
            context=context
        )
        # Determine 'type' based on action
        action = result.get("action", "")
        response_type = "chitchat"
        if action in ["product_search", "product_detail", "price_inquiry", "follow_up"]:
            response_type = "product"
        elif action in ["legal_search", "tax_calculation"]:
            response_type = "legal"
            
        # Extract products if available
        products = []
        data = result.get("data", {})
        if data and isinstance(data, dict) and "products" in data:
            products = data["products"]
            
        citations = [] # Placeholder for now
            
        return ChatResponse(
            type=response_type,
            answer=result["response"],
            products=products,
            citations=citations,
            action=action, # Keep for debug/legacy
            data=data      # Keep for debug/legacy
        )
    except Exception as e:
        logger.error(f"Chat error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
