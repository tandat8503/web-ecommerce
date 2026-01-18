
from abc import ABC, abstractmethod
from typing import Any, Dict, List, Optional
from app.core.llm import client as llm_client
from app.core.logger import get_logger

logger = get_logger(__name__)

class BaseAgent(ABC):
    """Base class for Agents."""
    
    def __init__(self, name: str):
        self.name = name
        self.llm = llm_client
        
    @abstractmethod
    async def run(self, input_message: str, context: Optional[Dict] = None) -> Dict[str, Any]:
        """Run the agent logic."""
        pass
        
    async def generate(self, prompt: str) -> str:
        return await self.llm.generate(prompt)
