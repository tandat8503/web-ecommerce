"""
Công cụ tính thuế chính xác bằng Python
Tránh để LLM tính toán (hallucination)
"""
import json
import logging
from typing import Dict, Any, Optional
from services.legal.constants import (
    LUONG_CO_SO,
    BAO_HIEM,
    GIAM_TRU_BAN_THAN,
    GIAM_TRU_PHU_THUOC,
    BIEU_THUE_LUY_TIEN,
    LUONG_TOI_THIEU_VUNG,
    VAT_RATE_STANDARD,
    VAT_RATE_REDUCED,
    CORPORATE_TAX_RATE_STANDARD
)

logger = logging.getLogger(__name__)


class TaxCalculator:
    """Class xử lý tính toán thuế TNCN và Bảo hiểm"""

    def calculate_insurance(self, gross_salary: float, region: int = 1) -> Dict[str, float]:
        """
        Tính các khoản bảo hiểm bắt buộc (BHXH, BHYT, BHTN)
        Có áp dụng mức trần (Capping) theo luật Việt Nam
        
        Args:
            gross_salary: Lương gross (VNĐ/tháng)
            region: Vùng lương tối thiểu (1-4), mặc định Vùng 1
        
        Returns:
            Dict chứa các khoản bảo hiểm
        """
        # 1. Mức lương cơ sở đóng BHXH, BHYT tối đa = 20 lần lương cơ sở
        cap_bhxh_bhyt = 20 * LUONG_CO_SO
        base_bhxh_bhyt = min(gross_salary, cap_bhxh_bhyt)

        # 2. Mức lương đóng BHTN tối đa = 20 lần lương tối thiểu vùng
        # Mặc định Vùng 1 nếu không xác định
        region_min_wage = LUONG_TOI_THIEU_VUNG.get(region, 4_960_000)
        cap_bhtn = 20 * region_min_wage
        base_bhtn = min(gross_salary, cap_bhtn)

        bhxh = base_bhxh_bhyt * BAO_HIEM["BHXH"]
        bhyt = base_bhxh_bhyt * BAO_HIEM["BHYT"]
        bhtn = base_bhtn * BAO_HIEM["BHTN"]
        
        total_insurance = bhxh + bhyt + bhtn
        
        return {
            "BHXH": bhxh,
            "BHYT": bhyt,
            "BHTN": bhtn,
            "total": total_insurance,
            "base_bhxh_bhyt": base_bhxh_bhyt,
            "base_bhtn": base_bhtn,
            "cap_bhxh_bhyt": cap_bhxh_bhyt,
            "cap_bhtn": cap_bhtn
        }

    def calculate_pit(self, gross_salary: float, dependents: int = 0, region: int = 1) -> Dict[str, Any]:
        """
        Tính thuế TNCN cuối cùng
        
        Args:
            gross_salary: Lương gross (VNĐ/tháng)
            dependents: Số người phụ thuộc
            region: Vùng lương tối thiểu (1-4), mặc định Vùng 1
        
        Returns:
            Dict chứa chi tiết tính thuế
        """
        # Bước 1: Tính bảo hiểm
        insurance = self.calculate_insurance(gross_salary, region)
        
        # Bước 2: Tính thu nhập chịu thuế (Taxable Income)
        # Thu nhập tính thuế = Tổng thu nhập - Các khoản miễn giảm (BH + Bản thân + Phụ thuộc)
        total_deductions = insurance["total"] + GIAM_TRU_BAN_THAN + (dependents * GIAM_TRU_PHU_THUOC)
        taxable_income = gross_salary - total_deductions
        
        # Nếu thu nhập tính thuế <= 0 thì không phải đóng thuế
        if taxable_income <= 0:
            return {
                "gross_salary": gross_salary,
                "insurance": insurance,
                "deductions": {
                    "self": GIAM_TRU_BAN_THAN,
                    "dependents": dependents * GIAM_TRU_PHU_THUOC,
                    "total": total_deductions
                },
                "taxable_income": 0,
                "tax_amount": 0,
                "net_salary": gross_salary - insurance["total"]
            }

        # Bước 3: Tính thuế theo biểu lũy tiến từng phần
        tax_amount = 0
        for range_max, rate, subtract in BIEU_THUE_LUY_TIEN:
            if taxable_income <= range_max:
                tax_amount = (taxable_income * rate) - subtract
                break
        
        # Đảm bảo thuế không âm (logic an toàn)
        tax_amount = max(0, tax_amount)

        return {
            "gross_salary": gross_salary,
            "insurance": insurance,
            "deductions": {
                "self": GIAM_TRU_BAN_THAN,
                "dependents": dependents * GIAM_TRU_PHU_THUOC,
                "total_deductions_amount": total_deductions
            },
            "taxable_income": taxable_income,
            "tax_amount": tax_amount,
            "net_salary": gross_salary - insurance["total"] - tax_amount
        }


# Hàm wrapper để tương thích với code cũ
def calculate_personal_income_tax(
    gross_salary: float,
    dependents: int = 0,
    insurance_salary: Optional[float] = None,
    region: int = 1
) -> Dict[str, Any]:
    """
    Tính thuế thu nhập cá nhân (TNCN) từ lương Gross
    Wrapper function để tương thích với code cũ
    
    Args:
        gross_salary: Lương gross (VNĐ/tháng)
        dependents: Số người phụ thuộc
        insurance_salary: DEPRECATED - không sử dụng nữa, dùng region thay thế
        region: Vùng lương tối thiểu (1-4), mặc định Vùng 1
    
    Returns:
        Dict chứa chi tiết tính thuế
    """
    calculator = TaxCalculator()
    result = calculator.calculate_pit(gross_salary, dependents, region)
    
    # Format lại để tương thích với code cũ
    return {
        "gross_salary": result["gross_salary"],
        "total_deduction": result["deductions"]["self"] + result["deductions"]["dependents"],
        "total_insurance": result["insurance"]["total"],
        "taxable_income": result["taxable_income"],
        "tax_amount": result["tax_amount"],
        "net_salary": result["net_salary"],
        "breakdown": {
            "personal_deduction": result["deductions"]["self"],
            "dependent_deduction": result["deductions"]["dependents"],
            "social_insurance": result["insurance"]["BHXH"],
            "health_insurance": result["insurance"]["BHYT"],
            "unemployment_insurance": result["insurance"]["BHTN"]
        }
    }


def calculate_corporate_tax(
    revenue: float,
    expenses: float,
    tax_rate: Optional[float] = None
) -> Dict[str, Any]:
    """
    Tính thuế thu nhập doanh nghiệp (TNDN)
    
    Args:
        revenue: Doanh thu (VNĐ/năm)
        expenses: Chi phí được trừ (VNĐ/năm)
        tax_rate: Thuế suất (nếu None, dùng mặc định 20%)
    
    Returns:
        Dict chứa chi tiết tính thuế
    """
    try:
        if tax_rate is None:
            tax_rate = CORPORATE_TAX_RATE_STANDARD
        
        # Thu nhập chịu thuế = Doanh thu - Chi phí
        taxable_income = revenue - expenses
        
        if taxable_income <= 0:
            return {
                "revenue": revenue,
                "expenses": expenses,
                "taxable_income": 0,
                "tax_amount": 0,
                "tax_rate": tax_rate,
                "message": "Doanh nghiệp không có thu nhập chịu thuế"
            }
        
        # Thuế TNDN = Thu nhập chịu thuế × Thuế suất
        tax_amount = taxable_income * tax_rate
        
        return {
            "revenue": revenue,
            "expenses": expenses,
            "taxable_income": taxable_income,
            "tax_amount": tax_amount,
            "tax_rate": tax_rate,
            "effective_rate": (tax_amount / revenue * 100) if revenue > 0 else 0
        }
    
    except Exception as e:
        logger.error(f"Error calculating corporate tax: {e}", exc_info=True)
        raise


def calculate_vat(
    amount: float,
    rate: Optional[float] = None,
    is_inclusive: bool = False
) -> Dict[str, Any]:
    """
    Tính thuế giá trị gia tăng (GTGT)
    
    Args:
        amount: Số tiền
        rate: Thuế suất (nếu None, dùng mặc định 10%)
        is_inclusive: True nếu amount đã bao gồm VAT, False nếu chưa
    
    Returns:
        Dict chứa VAT và giá trị
    """
    try:
        if rate is None:
            rate = VAT_RATE_STANDARD
        
        if is_inclusive:
            # amount đã bao gồm VAT
            # VAT = amount × rate / (1 + rate)
            vat_amount = amount * rate / (1 + rate)
            amount_excluding_vat = amount - vat_amount
        else:
            # amount chưa bao gồm VAT
            vat_amount = amount * rate
            amount_excluding_vat = amount
        
        amount_including_vat = amount_excluding_vat + vat_amount
        
        return {
            "amount_excluding_vat": amount_excluding_vat,
            "vat_amount": vat_amount,
            "amount_including_vat": amount_including_vat,
            "vat_rate": rate
        }
    
    except Exception as e:
        logger.error(f"Error calculating VAT: {e}", exc_info=True)
        raise


def format_tax_result(result: Dict[str, Any], result_type: str = "personal_income") -> str:
    """
    Format kết quả tính thuế thành chuỗi dễ đọc
    
    Args:
        result: Kết quả từ các hàm tính thuế
        result_type: Loại thuế (personal_income, corporate, vat)
    
    Returns:
        Chuỗi mô tả kết quả
    """
    try:
        if result_type == "personal_income":
            # Hỗ trợ cả cấu trúc cũ (breakdown) và mới (insurance, deductions)
            if "insurance" in result:
                # Cấu trúc mới từ TaxCalculator
                insurance = result.get("insurance", {})
                deductions = result.get("deductions", {})
                
                text = f"""
📊 KẾT QUẢ TÍNH THUẾ THU NHẬP CÁ NHÂN

💰 Lương Gross: {result['gross_salary']:,.0f} VNĐ/tháng

🏥 Các khoản bảo hiểm:
   - BHXH (8% trên {insurance.get('base_bhxh_bhyt', 0):,.0f}): {insurance.get('BHXH', 0):,.0f} VNĐ
   - BHYT (1.5% trên {insurance.get('base_bhxh_bhyt', 0):,.0f}): {insurance.get('BHYT', 0):,.0f} VNĐ
   - BHTN (1% trên {insurance.get('base_bhtn', 0):,.0f}): {insurance.get('BHTN', 0):,.0f} VNĐ
   - Tổng bảo hiểm: {insurance.get('total', 0):,.0f} VNĐ

📉 Các khoản giảm trừ:
   - Giảm trừ bản thân: {deductions.get('self', 0):,.0f} VNĐ
   - Giảm trừ người phụ thuộc: {deductions.get('dependents', 0):,.0f} VNĐ
   - Tổng giảm trừ: {deductions.get('total_deductions_amount', 0):,.0f} VNĐ

📋 Thu nhập chịu thuế: {result.get('taxable_income', 0):,.0f} VNĐ

💸 Thuế TNCN phải nộp: {result.get('tax_amount', 0):,.0f} VNĐ/tháng

✅ Lương Net (Thực nhận): {result.get('net_salary', 0):,.0f} VNĐ/tháng
"""
            else:
                # Cấu trúc cũ (tương thích ngược)
                breakdown = result.get("breakdown", {})
                tax_breakdown = result.get("tax_breakdown", [])
                
                text = f"""
📊 KẾT QUẢ TÍNH THUẾ THU NHẬP CÁ NHÂN

💰 Lương Gross: {result['gross_salary']:,.0f} VNĐ/tháng

📉 Các khoản giảm trừ:
   - Giảm trừ bản thân: {breakdown.get('personal_deduction', 0):,.0f} VNĐ
   - Giảm trừ người phụ thuộc: {breakdown.get('dependent_deduction', 0):,.0f} VNĐ
   - Tổng giảm trừ: {result.get('total_deduction', 0):,.0f} VNĐ

🏥 Các khoản đóng BHXH:
   - BHXH (8%): {breakdown.get('social_insurance', 0):,.0f} VNĐ
   - BHYT (1.5%): {breakdown.get('health_insurance', 0):,.0f} VNĐ
   - BHTN (1%): {breakdown.get('unemployment_insurance', 0):,.0f} VNĐ
   - Tổng BHXH: {result.get('total_insurance', 0):,.0f} VNĐ

📋 Thu nhập chịu thuế: {result.get('taxable_income', 0):,.0f} VNĐ

💸 Thuế TNCN phải nộp: {result.get('tax_amount', 0):,.0f} VNĐ/tháng
"""
                
                if tax_breakdown:
                    text += "\n📊 Chi tiết tính thuế theo bậc:\n"
                    for bracket in tax_breakdown:
                        text += f"   {bracket['bracket']}: {bracket['range']} ({bracket['rate']}) → {bracket['tax']:,.0f} VNĐ\n"
                
                text += f"\n✅ Lương Net: {result.get('net_salary', 0):,.0f} VNĐ/tháng"
            
            return text.strip()
        
        elif result_type == "corporate":
            return f"""
📊 KẾT QUẢ TÍNH THUẾ THU NHẬP DOANH NGHIỆP

💰 Doanh thu: {result['revenue']:,.0f} VNĐ/năm
📉 Chi phí: {result['expenses']:,.0f} VNĐ/năm
📋 Thu nhập chịu thuế: {result['taxable_income']:,.0f} VNĐ/năm
📊 Thuế suất: {result['tax_rate'] * 100:.0f}%
💸 Thuế TNDN phải nộp: {result['tax_amount']:,.0f} VNĐ/năm
📈 Tỷ lệ thuế thực tế: {result['effective_rate']:.2f}%
"""
        
        elif result_type == "vat":
            return f"""
📊 KẾT QUẢ TÍNH THUẾ GTGT

💰 Giá chưa VAT: {result['amount_excluding_vat']:,.0f} VNĐ
📊 Thuế suất: {result['vat_rate'] * 100:.0f}%
💸 Thuế GTGT: {result['vat_amount']:,.0f} VNĐ
✅ Tổng giá đã bao gồm VAT: {result['amount_including_vat']:,.0f} VNĐ
"""
        
        else:
            return json.dumps(result, ensure_ascii=False, indent=2)
    
    except Exception as e:
        logger.error(f"Error formatting tax result: {e}", exc_info=True)
        return json.dumps(result, ensure_ascii=False, indent=2)

