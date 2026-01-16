
from fastmcp import FastMCP
from typing import Annotated, Optional, Dict, Any, List
from app.services.legal_vector_service import get_legal_vector_service
from app.core.logger import get_logger
from app.core.llm import client as llm_client
from app.core.prompts import LEGAL_CONSULTANT_RAG_PROMPT

logger = get_logger(__name__)

mcp = FastMCP("legal_domain")

# --- IMPLEMENTATION ---
async def consult_legal_documents_impl(query: str, doc_type: str = None) -> str:
    service = get_legal_vector_service()
    results = service.search(query=query, top_k=5, doc_type=doc_type)
    
    if not results:
        return "Xin lỗi, không tìm thấy văn bản pháp luật liên quan."
        
    # Build Context
    context_text = ""
    for r in results:
        meta = r.get("metadata", {})
        context_text += f"\n---\nNguồn: {meta.get('doc_name')} - {meta.get('article_title')}\nNội dung: {r.get('text')}\n"
        
    # Rag Generation
    prompt = LEGAL_CONSULTANT_RAG_PROMPT.format(
        context=context_text,
        user_query=query
    )
    
    return await llm_client.generate(prompt)

async def calculate_pit_impl(gross_salary: float, dependents: int = 0) -> str:
    """Simple PIT Calculator (2025 rule estimate)"""
    # Constants
    BASE_SALARY = 1800000 
    REGION_MIN = 4680000 # Region I
    SELF_DEDUCTION = 11000000
    DEPENDENT_DEDUCTION = 4400000
    
    # Insurance (10.5% capped)
    insurance_base = min(gross_salary, 20 * BASE_SALARY)
    bhxh = insurance_base * 0.08
    bhyt = insurance_base * 0.015
    bhtn_base = min(gross_salary, 20 * REGION_MIN)
    bhtn = bhtn_base * 0.01
    total_insurance = bhxh + bhyt + bhtn
    
    # Taxable
    total_deduction = SELF_DEDUCTION + (dependents * DEPENDENT_DEDUCTION) + total_insurance
    taxable_income = max(0, gross_salary - total_deduction)
    
    # Progressive Tax
    tax = 0
    income = taxable_income / 1000000 
    
    if income <= 5: tax = income * 0.05
    elif income <= 10: tax = income * 0.10 - 0.25
    elif income <= 18: tax = income * 0.15 - 0.75
    elif income <= 32: tax = income * 0.20 - 1.65
    elif income <= 52: tax = income * 0.25 - 3.25
    elif income <= 80: tax = income * 0.30 - 5.85
    else: tax = income * 0.35 - 9.85
    
    tax_amount = max(0, tax * 1000000)
    net_salary = gross_salary - total_insurance - tax_amount
    
    return f"""
    Kết quả tính thuế thu nhập cá nhân (PIT):
    - Lương Gross: {gross_salary:,.0f} VND
    - Người phụ thuộc: {dependents}
    - Bảo hiểm (10.5%): {total_insurance:,.0f} VND
    - Bậc thuế: Thu nhập tính thuế {taxable_income:,.0f} VND
    
    => Thuế TNCN phải nộp: {tax_amount:,.0f} VND
    => Lương Net thực nhận: {net_salary:,.0f} VND
    """

async def calculate_corporate_tax_impl(revenue: float, expenses: float) -> str:
    """Simple Corporate Income Tax (CIT) Calculator (Standard 20%)"""
    profit = revenue - expenses
    if profit <= 0:
        return f"""
        Kết quả tính thuế Thu nhập doanh nghiệp (CIT):
        - Doanh thu: {revenue:,.0f} VND
        - Chi phí: {expenses:,.0f} VND
        - Lợi nhuận: {profit:,.0f} VND
        
        => Doanh nghiệp không phát sinh thuế TNDN (Lỗ hoặc hòa vốn).
        """
        
    tax_rate = 0.20 # 20% standard
    tax_amount = profit * tax_rate
    
    return f"""
    Kết quả tính thuế Thu nhập doanh nghiệp (CIT):
    - Doanh thu: {revenue:,.0f} VND
    - Chi phí: {expenses:,.0f} VND
    - Lợi nhuận trước thuế: {profit:,.0f} VND
    - Thuế suất phổ thông: 20%
    
    => Thuế TNDN phải nộp: {tax_amount:,.0f} VND
    => Lợi nhuận sau thuế: {profit - tax_amount:,.0f} VND
    """

async def calculate_vat_impl(revenue: float) -> str:
    """Simple VAT Calculator (Method: Direct or Deduction assumed standard output 10%)"""
    # Assuming user asks 'How much VAT for this revenue?' based on standard 10%
    vat_rate = 0.10
    vat_amount = revenue * vat_rate
    
    return f"""
    Kết quả tính thuế Giá trị gia tăng (VAT):
    - Giá trị hàng hóa/Doanh thu: {revenue:,.0f} VND
    - Thuế suất VAT (phổ thông): 10%
    
    => Tiền thuế VAT: {vat_amount:,.0f} VND
    => Tổng thanh toán: {revenue + vat_amount:,.0f} VND
    """

# --- MCP TOOLS ---
@mcp.tool(description="Consult Vietnamese legal documents (Laws, Decrees) using RAG")
async def consult_legal_documents(
    query: Annotated[str, "Legal question"],
    doc_type: Annotated[Optional[str], "Filter by doc type"] = None
) -> str:
    return await consult_legal_documents_impl(query, doc_type)

@mcp.tool(description="Calculate Personal Income Tax (VN) - Thuế TNCN")
async def calculate_pit(
    gross_salary: Annotated[float, "Gross salary (VND)"],
    dependents: Annotated[int, "Number of dependents"] = 0
) -> str:
    return await calculate_pit_impl(gross_salary, dependents)

@mcp.tool(description="Calculate Corporate Income Tax (VP) - Thuế TNDN")
async def calculate_corporate_tax(
    revenue: Annotated[float, "Total Revenue"],
    expenses: Annotated[float, "Total Expenses"]
) -> str:
    return await calculate_corporate_tax_impl(revenue, expenses)

@mcp.tool(description="Calculate VAT - Thuế GTGT")
async def calculate_vat(
    revenue: Annotated[float, "Revenue or Price"]
) -> str:
    return await calculate_vat_impl(revenue)
