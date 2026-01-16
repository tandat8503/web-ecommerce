
import google.generativeai as genai
from app.core.config import settings
from app.core.logger import get_logger

logger = get_logger(__name__)

class LLMClient:
    def __init__(self):
        if settings.GEMINI_API_KEY:
            genai.configure(api_key=settings.GEMINI_API_KEY)
            self.model = genai.GenerativeModel(settings.GEMINI_MODEL)
        else:
            logger.warning("No Gemini API key found")
            self.model = None

    async def generate(self, prompt: str, temperature: float = None) -> str:
        if not self.model: return "Server config error: No API Key."
        
        try:
            config = genai.GenerationConfig(
                temperature=temperature or settings.LLM_TEMPERATURE,
                max_output_tokens=settings.LLM_MAX_TOKENS
            )
            response = await self.model.generate_content_async(prompt, generation_config=config)
            
            # Debug logging
            if hasattr(response, 'candidates') and response.candidates:
                finish_reason = response.candidates[0].finish_reason
                logger.info(f"LLM Finish Reason: {finish_reason}")
                if finish_reason != 1:  # 1 = STOP (normal completion)
                    logger.warning(f"LLM finished with reason: {finish_reason} (not STOP)")
            
            return response.text
        except Exception as e:
            logger.error(f"LLM generate error: {e}")
            return f"Error: {e}"

client = LLMClient()
