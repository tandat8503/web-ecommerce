"""
Complete Legal AI Integration for app.py
This file contains all the code needed to integrate ImprovedLegalAssistant

USAGE:
1. Copy the code snippets below
2. Paste them into app.py at the specified locations
3. Restart the server
"""

# ============================================================================
# CODE SNIPPET 1: Add after existing imports (around line 48)
# ============================================================================

CODE_SNIPPET_1_IMPORTS = """
# Legal AI imports
from services.legal.improved_legal_service import ImprovedLegalAssistant
"""

# ============================================================================
# CODE SNIPPET 2: Add new request/response models (after ChatRequest, around line 60)
# ============================================================================

CODE_SNIPPET_2_MODELS = """
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
# CODE SNIPPET 3: Modify lifespan function (replace lines 110-128)
# ============================================================================

CODE_SNIPPET_3_LIFESPAN = """
@asynccontextmanager
async def lifespan(app: FastAPI):
    \"\"\"Application lifespan manager\"\"\"
    logger.info(\"Starting web-ecommerce AI system...\")
    
    try:
        # Initialize database connection pool
        await init_pool()
        logger.info(\"Database connection pool initialized\")
        
        # Verify LLM client
        llm_config = get_llm_config()
        if llm_config.gemini_api_key:
            logger.info(\"Gemini Pro client configured\")
        else:
            logger.warning(\"No LLM API key configured - some features may not work\")
        
        # ✅ NEW: Initialize ImprovedLegalAssistant (global instance for Admin)
        try:
            app.state.improved_legal_assistant = ImprovedLegalAssistant()
            logger.info(\"✅ ImprovedLegalAssistant initialized successfully\")
        except Exception as e:
            logger.error(f\"❌ Failed to initialize ImprovedLegalAssistant: {e}\")
            app.state.improved_legal_assistant = None
        
        logger.info(\"AI system startup completed successfully\")
        
        yield
        
    except Exception as e:
        logger.error(f\"Error during startup: {e}\")
        raise
    finally:
        # Cleanup
        logger.info(\"Shutting down AI system...\")
        
        # Clear Legal Assistant cache
        if hasattr(app.state, 'improved_legal_assistant') and app.state.improved_legal_assistant:
            try:
                app.state.improved_legal_assistant.clear_cache()
                logger.info(\"Legal Assistant cache cleared\")
            except:
                pass
        
        await close_pool()
        logger.info(\"AI system shutdown completed\")
"""

# ============================================================================
# CODE SNIPPET 4: Add new endpoints (add after /chat endpoint, around line 300)
# ============================================================================

CODE_SNIPPET_4_ENDPOINTS = """
@app.post(\"/legal/consult\", response_model=LegalResponse)
async def legal_consult(request: LegalRequest):
    \"\"\"
    Legal consultation endpoint for Admin
    
    Supports:
    - Legal document queries (e.g., \"Điều kiện thành lập công ty?\")
    - Tax calculations (e.g., \"Lương 50 triệu đóng thuế bao nhiêu?\")
    
    Features:
    - ✅ Hallucination prevention (no fabricated laws)
    - ✅ Response caching (10x faster for repeated queries)
    - ✅ Query sanitization (prevent prompt injection)
    - ✅ 1,487 legal documents embedded
    
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
# INTEGRATION CHECKLIST
# ============================================================================

INTEGRATION_CHECKLIST = """
INTEGRATION CHECKLIST:
======================

[ ] 1. Add CODE_SNIPPET_1_IMPORTS after line 48 in app.py
[ ] 2. Add CODE_SNIPPET_2_MODELS after line 60 in app.py  
[ ] 3. Replace lifespan function (lines 110-138) with CODE_SNIPPET_3_LIFESPAN
[ ] 4. Add CODE_SNIPPET_4_ENDPOINTS after /chat endpoint (around line 300)
[ ] 5. Restart AI server: python app.py
[ ] 6. Test endpoints:
    - POST /legal/consult
    - GET /legal/cache/stats
    - POST /legal/cache/clear
[ ] 7. Monitor logs for "✅ ImprovedLegalAssistant initialized successfully"

TESTING:
========

# Test 1: Legal consultation
curl -X POST http://localhost:8000/legal/consult \\
  -H "Content-Type: application/json" \\
  -d '{
    "query": "Điều kiện thành lập công ty TNHH?",
    "region": 1,
    "use_cache": true
  }'

# Test 2: Tax calculation
curl -X POST http://localhost:8000/legal/consult \\
  -H "Content-Type: application/json" \\
  -d '{
    "query": "Lương 50 triệu đóng thuế bao nhiêu?",
    "region": 1
  }'

# Test 3: Cache stats
curl http://localhost:8000/legal/cache/stats

# Test 4: Clear cache
curl -X POST http://localhost:8000/legal/cache/clear

EXPECTED RESULTS:
=================

✅ Legal consultation returns detailed answer with citations
✅ Tax calculation returns breakdown with all deductions
✅ Cache stats show hit rate improving over time
✅ Second identical query is 10x faster (cache hit)
"""

if __name__ == "__main__":
    print("=" * 80)
    print("LEGAL AI INTEGRATION CODE")
    print("=" * 80)
    print()
    print("This file contains all code snippets needed to integrate")
    print("ImprovedLegalAssistant into app.py")
    print()
    print("Follow the integration checklist below:")
    print()
    print(INTEGRATION_CHECKLIST)
    print()
    print("=" * 80)
    print("CODE SNIPPETS READY TO COPY")
    print("=" * 80)
