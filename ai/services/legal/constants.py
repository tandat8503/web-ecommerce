"""
Hằng số pháp luật và thuế Việt Nam
Các giá trị này được cập nhật theo quy định hiện hành
Cập nhật: 01/07/2024
"""

# =============================================================================
# THUẾ THU NHẬP CÁ NHÂN (TNCN)
# =============================================================================

# Lương cơ sở (cập nhật theo quy định hiện hành)
LUONG_CO_SO = 2_340_000  # VNĐ/tháng (cập nhật 01/07/2024)

# Giảm trừ bản thân
GIAM_TRU_BAN_THAN = 11_000_000  # VNĐ/tháng

# Giảm trừ người phụ thuộc
GIAM_TRU_PHU_THUOC = 4_400_000  # VNĐ/tháng/người

# Mức lương tối thiểu vùng (Dùng để tính trần BHTN)
# Áp dụng từ 01/07/2024 theo Nghị định 74/2024/NĐ-CP
LUONG_TOI_THIEU_VUNG = {
    1: 4_960_000,  # Vùng I (HN, HCM...)
    2: 4_410_000,  # Vùng II
    3: 3_860_000,  # Vùng III
    4: 3_450_000   # Vùng IV
}

# Biểu thuế lũy tiến từng phần (Cách tính rút gọn)
# Cấu trúc: (Mức thu nhập tính thuế đến mức này, Thuế suất, Số trừ đi)
# Đơn vị: VNĐ
# Công thức: Thuế = (Thu nhập tính thuế × Thuế suất) - Số trừ
BIEU_THUE_LUY_TIEN = [
    (5_000_000, 0.05, 0),               # Bậc 1: Đến 5 tr
    (10_000_000, 0.10, 250_000),        # Bậc 2: Trên 5 tr đến 10 tr
    (18_000_000, 0.15, 750_000),        # Bậc 3: Trên 10 tr đến 18 tr
    (32_000_000, 0.20, 1_650_000),      # Bậc 4: Trên 18 tr đến 32 tr
    (52_000_000, 0.25, 3_250_000),      # Bậc 5: Trên 32 tr đến 52 tr
    (80_000_000, 0.30, 5_850_000),      # Bậc 6: Trên 52 tr đến 80 tr
    (float('inf'), 0.35, 9_850_000)     # Bậc 7: Trên 80 tr
]

# Bậc thuế TNCN (giữ lại để tương thích, nhưng nên dùng BIEU_THUE_LUY_TIEN)
INCOME_TAX_BRACKETS = [
    {"min": 0, "max": 5_000_000, "rate": 0.05},      # Bậc 1: Đến 5 triệu
    {"min": 5_000_000, "max": 10_000_000, "rate": 0.10},  # Bậc 2: Trên 5 đến 10 triệu
    {"min": 10_000_000, "max": 18_000_000, "rate": 0.15},  # Bậc 3: Trên 10 đến 18 triệu
    {"min": 18_000_000, "max": 32_000_000, "rate": 0.20},  # Bậc 4: Trên 18 đến 32 triệu
    {"min": 32_000_000, "max": 52_000_000, "rate": 0.25},  # Bậc 5: Trên 32 đến 52 triệu
    {"min": 52_000_000, "max": 80_000_000, "rate": 0.30},  # Bậc 6: Trên 52 đến 80 triệu
    {"min": 80_000_000, "max": float("inf"), "rate": 0.35},  # Bậc 7: Trên 80 triệu
]

# =============================================================================
# THUẾ GIÁ TRỊ GIA TĂNG (GTGT)
# =============================================================================

# Thuế suất GTGT (cập nhật theo Nghị định giảm thuế)
VAT_RATE_STANDARD = 0.10  # 10% (mặc định)
VAT_RATE_REDUCED = 0.08   # 8% (theo Nghị định giảm thuế 2024)
VAT_RATE_ZERO = 0.00      # 0% (một số hàng hóa, dịch vụ)

# =============================================================================
# THUẾ THU NHẬP DOANH NGHIỆP (TNDN)
# =============================================================================

# Thuế suất TNDN
CORPORATE_TAX_RATE_STANDARD = 0.20  # 20% (mặc định)
CORPORATE_TAX_RATE_PREFERRED = 0.15  # 15% (doanh nghiệp ưu đãi)
CORPORATE_TAX_RATE_SPECIAL = 0.10   # 10% (doanh nghiệp đặc biệt ưu đãi)

# Ngưỡng doanh thu (VNĐ/năm)
REVENUE_THRESHOLD_SMALL = 3_000_000_000  # 3 tỷ
REVENUE_THRESHOLD_MEDIUM = 10_000_000_000  # 10 tỷ

# =============================================================================
# BẢO HIỂM XÃ HỘI (BHXH)
# =============================================================================

# Tỷ lệ bảo hiểm (Người lao động đóng)
BAO_HIEM = {
    "BHXH": 0.08,   # 8%
    "BHYT": 0.015,  # 1.5%
    "BHTN": 0.01    # 1%
}

# Tỷ lệ đóng BHXH (tính trên lương đóng BHXH) - Giữ lại để tương thích
SOCIAL_INSURANCE_RATE_EMPLOYEE = BAO_HIEM["BHXH"]   # 8% (người lao động)
SOCIAL_INSURANCE_RATE_EMPLOYER = 0.175  # 17.5% (người sử dụng lao động)

# Tỷ lệ đóng BHYT
HEALTH_INSURANCE_RATE_EMPLOYEE = BAO_HIEM["BHYT"]  # 1.5% (người lao động)
HEALTH_INSURANCE_RATE_EMPLOYER = 0.03  # 3% (người sử dụng lao động)

# Tỷ lệ đóng BHTN
UNEMPLOYMENT_INSURANCE_RATE_EMPLOYEE = BAO_HIEM["BHTN"]  # 1% (người lao động)
UNEMPLOYMENT_INSURANCE_RATE_EMPLOYER = 0.01  # 1% (người sử dụng lao động)

# Mức lương đóng BHXH/BHYT tối đa = 20 lần lương cơ sở
MAX_SALARY_FOR_INSURANCE = 20 * LUONG_CO_SO  # 20 lần lương cơ sở

# =============================================================================
# THUẾ MÔN BÀI
# =============================================================================

# Mức thuế môn bài theo vốn điều lệ/doanh thu
BUSINESS_LICENSE_TAX = {
    "over_10_billion": 3_000_000,      # Trên 10 tỷ
    "5_to_10_billion": 2_000_000,      # Từ 5 đến 10 tỷ
    "2_to_5_billion": 1_000_000,      # Từ 2 đến 5 tỷ
    "under_2_billion": 1_000_000,     # Dưới 2 tỷ
    "individual": 1_000_000,           # Cá nhân
    "branch": 1_000_000                # Chi nhánh
}

# =============================================================================
# CÁC HẰNG SỐ KHÁC
# =============================================================================

# Số ngày làm việc trong tháng (trung bình)
WORKING_DAYS_PER_MONTH = 22

# Số giờ làm việc trong tuần
WORKING_HOURS_PER_WEEK = 40

