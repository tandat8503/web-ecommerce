#!/usr/bin/env python3
"""
Content Moderation Service
Uses Gemini Pro to detect inappropriate content
"""

import logging
import json
from typing import Dict, Any, List, Optional
from shared.llm_client import LLMClientFactory

logger = logging.getLogger(__name__)


class ModerationService:
    """Service for content moderation using Gemini Pro"""
    
    def __init__(self):
        self.llm_client = LLMClientFactory.create_client()
        self.violation_types = [
            "profanity",  # Từ ngữ thô tục
            "spam",  # Spam, quảng cáo
            "harassment",  # Tấn công cá nhân
            "irrelevant",  # Không liên quan đến sản phẩm
            "hate_speech",  # Ngôn từ thù ghét
            "sexual_content",  # Nội dung khiêu dâm
            "violence",  # Bạo lực
        ]
    
    async def moderate_content(
        self,
        content: str,
        content_type: str = "comment",
        product_id: Optional[int] = None,
        user_id: Optional[int] = None
    ) -> Dict[str, Any]:
        """
        Moderate content and return moderation results
        
        Returns:
        {
            "success": bool,
            "is_appropriate": bool,
            "violations": List[str],
            "severity": "low|medium|high",
            "confidence": float (0.0 to 1.0),
            "suggested_action": "approve|review|reject",
            "explanation": str,
            "moderated_content": str
        }
        """
        try:
            if not content or len(content.strip()) < 3:
                return {
                    "success": True,
                    "is_appropriate": False,
                    "violations": ["too_short"],
                    "severity": "low",
                    "confidence": 1.0,
                    "suggested_action": "reject",
                    "explanation": "Content is too short",
                    "moderated_content": content
                }
            
            # Use Gemini Pro for moderation
            if self.llm_client:
                result = await self._moderate_with_gemini(content, content_type)
            else:
                # Fallback to rule-based moderation
                result = await self._moderate_with_rules(content)
            
            return result
            
        except Exception as e:
            logger.error(f"Error in moderate_content: {e}")
            return {
                "success": False,
                "error": str(e),
                "is_appropriate": True,  # Default to allow
                "violations": [],
                "confidence": 0.0,
                "suggested_action": "review",
                "explanation": f"Moderation error: {str(e)}",
                "moderated_content": content
            }
    
    async def _moderate_with_gemini(
        self,
        content: str,
        content_type: str
    ) -> Dict[str, Any]:
        """Moderate content using Gemini Pro"""
        
        system_instruction = f"""
You are a content moderation expert for an e-commerce platform in Vietnam.

Task: Analyze the following {content_type} and determine if it's appropriate.

Check for violations:
- profanity: Vulgar, offensive language (Vietnamese or English)
- spam: Advertising, promotional content, repeated text
- harassment: Personal attacks, insults, threats
- irrelevant: Off-topic, not related to product review
- hate_speech: Discriminatory language based on race, gender, religion
- sexual_content: Inappropriate sexual content
- violence: Violent or graphic content

Respond in JSON format:
{{
    "is_appropriate": true/false,
    "violations": ["violation_type1", "violation_type2"],
    "severity": "low|medium|high",
    "confidence": 0.95,
    "explanation": "Brief explanation in Vietnamese"
}}

Be strict but fair. Vietnamese slang is okay if not offensive.
"""
        
        prompt = f"""
Content to moderate ({content_type}):
\"\"\"{content}\"\"\"

Analyze and respond in JSON format.
"""
        
        try:
            response = await self.llm_client.generate_simple(
                prompt=prompt,
                system_instruction=system_instruction,
                temperature=0.3,
                max_tokens=500,
                model="gemini-1.5-pro"
            )
            
            if response.get("success"):
                # Parse JSON from response
                content_text = response.get("content", "{}")
                if "```json" in content_text:
                    content_text = content_text.split("```json")[1].split("```")[0]
                elif "```" in content_text:
                    content_text = content_text.split("```")[1].split("```")[0]
                
                result = json.loads(content_text.strip())
                
                # Determine suggested action
                if not result.get("is_appropriate", True):
                    severity = result.get("severity", "low")
                    if severity == "high":
                        suggested_action = "reject"
                    elif severity == "medium":
                        suggested_action = "review"
                    else:
                        suggested_action = "approve"
                else:
                    suggested_action = "approve"
                
                return {
                    "success": True,
                    "is_appropriate": result.get("is_appropriate", True),
                    "violations": result.get("violations", []),
                    "severity": result.get("severity", "low"),
                    "confidence": result.get("confidence", 0.8),
                    "suggested_action": suggested_action,
                    "explanation": result.get("explanation", ""),
                    "moderated_content": content
                }
            else:
                return await self._moderate_with_rules(content)
                
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse Gemini response: {e}")
            return await self._moderate_with_rules(content)
    
    async def _moderate_with_rules(self, content: str) -> Dict[str, Any]:
        """Fallback rule-based moderation"""
        
        content_lower = content.lower()
        violations = []
        
        # Vietnamese profanity check (basic)
        profanity_words = [
            "địt", "đụ", "lồn", "cặc", "đéo", "vãi", "đmm", "vcl", "cmm",
            "fuck", "shit", "damn", "ass", "bitch"
        ]
        
        for word in profanity_words:
            if word in content_lower:
                violations.append("profanity")
                break
        
        # Spam detection
        if content.count("http") > 2 or content.count("www") > 1:
            violations.append("spam")
        
        # Repeated characters
        if any(char * 5 in content for char in "!?@#$%"):
            violations.append("spam")
        
        is_appropriate = len(violations) == 0
        severity = "high" if "profanity" in violations else "low"
        
        return {
            "success": True,
            "is_appropriate": is_appropriate,
            "violations": violations,
            "severity": severity,
            "confidence": 0.7,
            "suggested_action": "reject" if not is_appropriate else "approve",
            "explanation": f"Phát hiện vi phạm: {', '.join(violations)}" if violations else "Nội dung phù hợp",
            "moderated_content": content
        }

