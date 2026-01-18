import json
import re
from typing import Dict, Any, List
from app.agents.base import BaseAgent
from app.core.utils import extract_json_object
from app.core.prompts import LEGAL_CONSULTANT_RAG_PROMPT
from app.mcps.legal import (
    consult_legal_documents_impl as consult_legal_documents, 
    calculate_pit_impl as calculate_pit,
    calculate_corporate_tax_impl as calculate_corporate_tax,
    calculate_vat_impl as calculate_vat
)
from app.core.logger import get_logger

logger = get_logger(__name__)

class LegalAgent(BaseAgent):
    """Agent specialized in Legal Consultation & Tax with Deterministic Tool Use."""
    
    def __init__(self):
        super().__init__("LegalAgent")

    async def run(self, input_message: str, context: Dict = None) -> Dict[str, Any]:
        msg_lower = input_message.lower()
        tool_name = "consult_legal_documents" # Default
        params = {"query": input_message}
        
        # 1. Deterministic Selection
        if re.search(r"(vat|gtgt|giá trị gia tăng)", msg_lower) and re.search(r"(thuế|tính)", msg_lower):
            tool_name = "calculate_vat"
            
        elif re.search(r"(tndn|doanh nghiệp|lợi nhuận|doanh thu)", msg_lower) and re.search(r"(thuế|tính)", msg_lower):
            tool_name = "calculate_corporate_tax"
            
        elif re.search(r"(tncn|lương|thu nhập cá nhân)", msg_lower) and re.search(r"(thuế|tính)", msg_lower):
            tool_name = "calculate_pit"
            
        # 2. Parameter Extraction (Heuristic)
        def parse_val(text):
            if not text: return 0.0
            text = text.lower().strip()
            try:
                # 10 tỷ
                if "tỷ" in text:
                     num = re.search(r"(\d+(?:[.,]\d+)?)", text)
                     if num: return float(num.group(1).replace(",", ".")) * 1_000_000_000
                # 30 triệu
                if "triệu" in text or "tr" in text:
                     num = re.search(r"(\d+(?:[.,]\d+)?)", text)
                     if num: return float(num.group(1).replace(",", ".")) * 1_000_000
                # Plain number (Assume VN format: dot=thousand, comma=decimal)
                clean_text = text.replace(".", "").replace(",", ".")
                num = re.search(r"(\d+(?:\.\d+)?)", clean_text)
                if num: return float(num.group(1))
            except: pass
            return 0.0

        if tool_name == "calculate_pit":
            params["gross_salary"] = parse_val(msg_lower)
            dep_m = re.search(r"(\d+)\s*(người|phụ thuộc|con)", msg_lower)
            if dep_m: params["dependents"] = int(dep_m.group(1))
            else: params["dependents"] = 0
            
        elif tool_name == "calculate_corporate_tax":
            # Regex for Revenue/Expenses
            # Capture number + optional unit
            money_pattern = r"(\d+(?:[.,]\d+)?\s*(?:tỷ|triệu|tr|nghìn|đ|vnđ)?)"
            
            rev_part = re.search(r"(doanh thu|thu nhập)\s*(?::|là)?\s*" + money_pattern, msg_lower)
            if rev_part: params["revenue"] = parse_val(rev_part.group(2))
            else: params["revenue"] = parse_val(msg_lower) # Fallback?
            
            exp_part = re.search(r"(chi phí|chi tiêu)\s*(?::|là)?\s*" + money_pattern, msg_lower)
            if exp_part: params["expenses"] = parse_val(exp_part.group(2))
            else: params["expenses"] = 0.0
            
        elif tool_name == "calculate_vat":
             params["revenue"] = parse_val(msg_lower)

        logger.info(f"[LegalAgent] Action: {tool_name} | Params: {params}")

        # 3. Execute
        result_text = ""
        
        try:
            if tool_name == "consult_legal_documents":
                # Check for "Not Found" condition BEFORE LLM
                context_docs = await consult_legal_documents(query=params.get("query"))
                
                # OPTIMIZATION: Aggressive check for "No Hit" to skip LLM
                # If length is small (< 500 chars), it likely contains no real content or just a "not found" message
                if not context_docs or len(context_docs.strip()) < 500 or "không tìm thấy" in context_docs.lower():
                    result_text = (
                        "Chào bạn, hiện tại hệ thống chưa tìm thấy văn bản luật cụ thể nào phù hợp trong cơ sở dữ liệu hiện có "
                        "(ví dụ: Luật Bảo vệ quyền lợi người tiêu dùng, Luật Thương mại...).\n\n"
                        "Để mình hỗ trợ chính xác hơn, bạn có thể cung cấp thêm:\n"
                        "- Bạn cần tư vấn cho trường hợp B2C (khách lẻ) hay B2B (doanh nghiệp)?\n"
                        "- Sản phẩm là hàng nhập khẩu hay sản xuất trong nước?\n\n"
                        "Hoặc nếu bạn có tên văn bản cụ thể, hãy cho mình biết nhé!"
                    )
                else:
                    # Truncate Context to reduce Latency 
                    params["context"] = context_docs[:2000] 
                    result_text = await self._synthesize_rag(input_message, params["context"])
            
            elif tool_name == "calculate_pit":
                result_text = await calculate_pit(gross_salary=params.get("gross_salary",0), dependents=params.get("dependents",0))
                
            elif tool_name == "calculate_corporate_tax":
                result_text = await calculate_corporate_tax(revenue=params.get("revenue",0), expenses=params.get("expenses",0))
                
            elif tool_name == "calculate_vat":
                result_text = await calculate_vat(revenue=params.get("revenue",0))
                
        except Exception as e:
            result_text = f"Lỗi xử lý: {str(e)}"

        return {
            "status": "success",
            "tool_used": tool_name,
            "agent_response": result_text,
            "data": {}
        }

    async def _synthesize_rag(self, query: str, context: str) -> str:
        prompt = LEGAL_CONSULTANT_RAG_PROMPT.format(
            context=context,
            user_query=query
        )
        return await self.generate(prompt)
