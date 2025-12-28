"""
Integration patch for ImprovedLegalAssistant into app.py
Apply this to integrate Legal AI into the main application
"""

# ============================================================================
# STEP 1: Add to lifespan function (around line 110-128)
# ============================================================================

# ADD AFTER LINE 125 (after LLM client verification):
"""
        # Initialize ImprovedLegalAssistant (global instance for Admin)
        try:
            from services.legal.improved_legal_service import ImprovedLegalAssistant
            app.state.improved_legal_assistant = ImprovedLegalAssistant()
            logger.info("✅ ImprovedLegalAssistant initialized successfully")
        except Exception as e:
            logger.error(f"❌ Failed to initialize ImprovedLegalAssistant: {e}")
            app.state.improved_legal_assistant = None
"""

# ============================================================================
# STEP 2: Add LegalRequest model (after ChatRequest, around line 60)
# ============================================================================

"""
class LegalRequest(BaseModel):
    \"\"\"Request model for legal consultation endpoint\"\"\"
    query: str = Field(..., description=\"Legal question or tax calculation query\", max_length=500)
    region: int = Field(default=1, description=\"Region code for tax calculation (1-4)\", ge=1, le=4)
    use_cache: bool = Field(default=True, description=\"Whether to use cached responses\")
    session_id: Optional[str] = Field(None, description=\"Session ID for tracking\")


class LegalResponse(BaseModel):
    \"\"\"Response model for legal consultation\"\"\"
    success: bool = Field(..., description=\"Whether the request was successful\")
    response: str = Field(..., description=\"Legal consultation answer\")
    intent: str = Field(..., description=\"Detected intent: CALCULATION or LEGAL_SEARCH\")
    cache_stats: Optional[Dict[str, Any]] = Field(None, description=\"Cache statistics\")
    session_id: Optional[str] = Field(None, description=\"Session ID\")
"""

# ============================================================================
# STEP 3: Add /legal/consult endpoint (add after /chat endpoint, around line 300)
# ============================================================================

"""
@app.post(\"/legal/consult\", response_model=LegalResponse)
async def legal_consult(request: LegalRequest):
    \"\"\"
    Legal consultation endpoint for Admin
    
    Supports:
    - Legal document queries (e.g., \"Điều kiện thành lập công ty?\")
    - Tax calculations (e.g., \"Lương 50 triệu đóng thuế bao nhiêu?\")
    
    Features:
    - Hallucination prevention (no fabricated laws)
    - Response caching (10x faster for repeated queries)
    - Query sanitization (prevent prompt injection)
    
    Args:
        request: Legal consultation request
        
    Returns:
        Legal consultation response with answer and cache stats
    \"\"\"
    try:
        logger.info(f\"Legal consultation request: {request.query[:100]}...\")
        
        # Get ImprovedLegalAssistant instance
        if not hasattr(app.state, 'improved_legal_assistant') or app.state.improved_legal_assistant is None:
            raise HTTPException(
                status_code=503,
                detail=\"Legal Assistant service not available. Please check server logs.\"
            )
        
        assistant = app.state.improved_legal_assistant
        
        # Generate session_id if not provided
        session_id = request.session_id or str(uuid.uuid4())
        
        # Process query
        response_text = await assistant.process_query(
            query=request.query,
            region=request.region,
            use_cache=request.use_cache
        )
        
        # Detect intent (simple heuristic)
        intent = \"CALCULATION\" if any(kw in request.query.lower() for kw in [\"tính\", \"thuế\", \"lương\", \"đóng\"]) else \"LEGAL_SEARCH\"
        
        # Get cache statistics
        cache_stats = assistant.get_cache_stats() if request.use_cache else None
        
        logger.info(f\"Legal consultation completed. Intent: {intent}, Cache hit rate: {cache_stats.get('hit_rate', 0):.2%}\" if cache_stats else f\"Legal consultation completed. Intent: {intent}\")
        
        return LegalResponse(
            success=True,
            response=response_text,
            intent=intent,
            cache_stats=cache_stats,
            session_id=session_id
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f\"Error in legal consultation: {e}\", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f\"Legal consultation failed: {str(e)}\"
        )


@app.get(\"/legal/cache/stats\")
async def get_legal_cache_stats():
    \"\"\"
    Get Legal Assistant cache statistics
    
    Returns cache performance metrics for monitoring
    \"\"\"
    try:
        if not hasattr(app.state, 'improved_legal_assistant') or app.state.improved_legal_assistant is None:
            raise HTTPException(status_code=503, detail=\"Legal Assistant not available\")
        
        assistant = app.state.improved_legal_assistant
        stats = assistant.get_cache_stats()
        
        return {
            \"success\": True,
            \"stats\": stats,
            \"timestamp\": datetime.now().isoformat()
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f\"Error getting cache stats: {e}\")
        raise HTTPException(status_code=500, detail=str(e))


@app.post(\"/legal/cache/clear\")
async def clear_legal_cache():
    \"\"\"
    Clear Legal Assistant cache
    
    Use this to force fresh responses or free up memory
    \"\"\"
    try:
        if not hasattr(app.state, 'improved_legal_assistant') or app.state.improved_legal_assistant is None:
            raise HTTPException(status_code=503, detail=\"Legal Assistant not available\")
        
        assistant = app.state.improved_legal_assistant
        assistant.clear_cache()
        
        logger.info(\"Legal Assistant cache cleared\")
        
        return {
            \"success\": True,
            \"message\": \"Cache cleared successfully\",
            \"timestamp\": datetime.now().isoformat()
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f\"Error clearing cache: {e}\")
        raise HTTPException(status_code=500, detail=str(e))
"""

# ============================================================================
# STEP 4: Update /chat endpoint to use ImprovedLegalAssistant for admin legal queries
# ============================================================================

# MODIFY the admin branch in /chat endpoint (around line 258-280):
"""
        else:
            # Admin queries - check if it's a legal query
            query_lower = request.message.lower()
            legal_keywords = [\"luật\", \"nghị định\", \"thông tư\", \"điều\", \"khoản\", \"thuế\", \"tính thuế\", \"công ty\", \"doanh nghiệp\"]
            is_legal_query = any(keyword in query_lower for keyword in legal_keywords)
            
            if is_legal_query and hasattr(app.state, 'improved_legal_assistant') and app.state.improved_legal_assistant:
                # Use ImprovedLegalAssistant for legal queries
                try:
                    assistant = app.state.improved_legal_assistant
                    legal_response = await assistant.process_query(
                        query=request.message,
                        region=1,
                        use_cache=True
                    )
                    
                    return ChatResponse(
                        success=True,
                        response={\"text\": legal_response, \"type\": \"text\"},
                        agent_type=\"improved_legal_assistant\",
                        data={\"cache_stats\": assistant.get_cache_stats()},
                        session_id=context.get(\"session_id\")
                    )
                except Exception as e:
                    logger.error(f\"ImprovedLegalAssistant failed, falling back to orchestrator: {e}\")
                    # Fall through to orchestrator
            
            # Use orchestrator for other admin queries
            result = await orchestrator.process_request(
                user_message=request.message,
                user_type=request.user_type,
                context=context
            )
            # ... rest of orchestrator handling
"""

print(\"Integration instructions created successfully!\")
print(\"\\nTo apply these changes:\")
print(\"1. Open ai/app.py\")
print(\"2. Follow the STEP-by-STEP instructions above\")
print(\"3. Add the code snippets at the specified locations\")
print(\"4. Restart the AI server: python app.py\")
