# TEMPLATE GHI KẾT QUẢ TEST - CHƯƠNG 4

## Thông tin chung

**Người thực hiện:** _______________________  
**Ngày test:** _______________________  
**Môi trường:** 
- OS: _______________________
- Browser: _______________________
- Node.js version: _______________________
- Database: _______________________

---

## 1. TEST CHỨC NĂNG

### 1.1. Xác thực và Phân quyền

| STT | Test Case | Kết quả | Ghi chú | Screenshot |
|-----|-----------|---------|---------|------------|
| TC-AUTH-01 | Đăng ký tài khoản mới | ☐ PASS ☐ FAIL | | |
| TC-AUTH-02 | Đăng ký email trùng | ☐ PASS ☐ FAIL | | |
| TC-AUTH-03 | Đăng nhập đúng | ☐ PASS ☐ FAIL | | |
| TC-AUTH-04 | Đăng nhập sai password | ☐ PASS ☐ FAIL | | |
| TC-AUTH-05 | Đăng nhập Google OAuth | ☐ PASS ☐ FAIL | | |
| TC-AUTH-06 | Phân quyền Admin | ☐ PASS ☐ FAIL | | |
| TC-AUTH-07 | Truy cập Admin | ☐ PASS ☐ FAIL | | |
| TC-AUTH-08 | Đăng xuất | ☐ PASS ☐ FAIL | | |
| TC-AUTH-09 | Quên mật khẩu | ☐ PASS ☐ FAIL | | |
| TC-AUTH-10 | Reset mật khẩu | ☐ PASS ☐ FAIL | | |

**Tổng kết:** ___ / 10 PASS

---

### 1.2. Quản lý Sản phẩm

| STT | Test Case | Kết quả | Ghi chú | Screenshot |
|-----|-----------|---------|---------|------------|
| TC-PROD-01 | Tạo sản phẩm mới | ☐ PASS ☐ FAIL | | |
| TC-PROD-02 | Upload hình ảnh | ☐ PASS ☐ FAIL | | |
| TC-PROD-03 | Đặt ảnh chính | ☐ PASS ☐ FAIL | | |
| TC-PROD-04 | Sắp xếp ảnh | ☐ PASS ☐ FAIL | | |
| TC-PROD-05 | Thêm biến thể | ☐ PASS ☐ FAIL | | |
| TC-PROD-06 | Cập nhật giá | ☐ PASS ☐ FAIL | | |
| TC-PROD-07 | Tìm kiếm full-text | ☐ PASS ☐ FAIL | | |
| TC-PROD-08 | Lọc sản phẩm | ☐ PASS ☐ FAIL | | |
| TC-PROD-09 | Xóa sản phẩm có đơn hàng | ☐ PASS ☐ FAIL | | |
| TC-PROD-10 | Deactivate sản phẩm | ☐ PASS ☐ FAIL | | |

**Tổng kết:** ___ / 10 PASS

---

### 1.3. Giỏ hàng và Thanh toán

| STT | Test Case | Kết quả | Ghi chú | Screenshot |
|-----|-----------|---------|---------|------------|
| TC-CART-01 | Thêm sản phẩm vào giỏ | ☐ PASS ☐ FAIL | | |
| TC-CART-02 | Thêm sản phẩm đã có | ☐ PASS ☐ FAIL | | |
| TC-CART-03 | Cập nhật số lượng | ☐ PASS ☐ FAIL | | |
| TC-CART-04 | Thêm vượt tồn kho | ☐ PASS ☐ FAIL | | |
| TC-CART-05 | Xóa sản phẩm | ☐ PASS ☐ FAIL | | |
| TC-CART-06 | Áp dụng mã hợp lệ | ☐ PASS ☐ FAIL | | |
| TC-CART-07 | Áp dụng mã hết hạn | ☐ PASS ☐ FAIL | | |
| TC-CART-08 | Mã không đủ điều kiện | ☐ PASS ☐ FAIL | | |
| TC-CART-09 | Tính phí ship GHN | ☐ PASS ☐ FAIL | | |
| TC-CART-10 | Thanh toán COD | ☐ PASS ☐ FAIL | | |
| TC-CART-11 | Thanh toán VNPay | ☐ PASS ☐ FAIL | | |
| TC-CART-12 | Callback VNPay | ☐ PASS ☐ FAIL | | |

**Tổng kết:** ___ / 12 PASS

---

### 1.4. Quản lý Đơn hàng

| STT | Test Case | Kết quả | Ghi chú | Screenshot |
|-----|-----------|---------|---------|------------|
| TC-ORDER-01 | Tạo đơn hàng | ☐ PASS ☐ FAIL | | |
| TC-ORDER-02 | Trừ tồn kho | ☐ PASS ☐ FAIL | | |
| TC-ORDER-03 | Xem chi tiết (owner) | ☐ PASS ☐ FAIL | | |
| TC-ORDER-04 | Xem đơn người khác | ☐ PASS ☐ FAIL | | |
| TC-ORDER-05 | Admin cập nhật status | ☐ PASS ☐ FAIL | | |
| TC-ORDER-06 | Cập nhật tracking | ☐ PASS ☐ FAIL | | |
| TC-ORDER-07 | Hủy đơn PENDING | ☐ PASS ☐ FAIL | | |
| TC-ORDER-08 | Hủy đơn CONFIRMED | ☐ PASS ☐ FAIL | | |
| TC-ORDER-09 | Hoàn tiền VNPay | ☐ PASS ☐ FAIL | | |
| TC-ORDER-10 | Đánh giá sau mua | ☐ PASS ☐ FAIL | | |

**Tổng kết:** ___ / 10 PASS

---

### 1.5. Tích hợp bên thứ ba

| STT | Test Case | Kết quả | Ghi chú | Screenshot |
|-----|-----------|---------|---------|------------|
| TC-INT-01 | Đồng bộ địa chỉ GHN | ☐ PASS ☐ FAIL | | |
| TC-INT-02 | Tính phí ship GHN | ☐ PASS ☐ FAIL | | |
| TC-INT-03 | GHN timeout | ☐ PASS ☐ FAIL | | |
| TC-INT-04 | Upload Cloudinary | ☐ PASS ☐ FAIL | | |
| TC-INT-05 | Xóa ảnh Cloudinary | ☐ PASS ☐ FAIL | | |
| TC-INT-06 | Tạo URL VNPay | ☐ PASS ☐ FAIL | | |
| TC-INT-07 | Verify callback VNPay | ☐ PASS ☐ FAIL | | |
| TC-INT-08 | Callback giả mạo | ☐ PASS ☐ FAIL | | |
| TC-INT-09 | AI Chatbot | ☐ PASS ☐ FAIL | | |
| TC-INT-10 | AI Service down | ☐ PASS ☐ FAIL | | |

**Tổng kết:** ___ / 10 PASS

---

## 2. TEST PHI CHỨC NĂNG

### 2.1. Hiệu năng

| STT | Chỉ số | Giá trị đo | Mục tiêu | Kết quả |
|-----|--------|-----------|----------|---------|
| PERF-01 | Tải trang chủ | _____ s | < 2s | ☐ ĐẠT ☐ KHÔNG ĐẠT |
| PERF-02 | Danh sách SP (50) | _____ s | < 1s | ☐ ĐẠT ☐ KHÔNG ĐẠT |
| PERF-03 | Tìm kiếm full-text | _____ s | < 0.5s | ☐ ĐẠT ☐ KHÔNG ĐẠT |
| PERF-04 | API response avg | _____ ms | < 200ms | ☐ ĐẠT ☐ KHÔNG ĐẠT |
| PERF-05 | DB query avg | _____ ms | < 100ms | ☐ ĐẠT ☐ KHÔNG ĐẠT |
| PERF-06 | Upload ảnh 2MB | _____ s | < 3s | ☐ ĐẠT ☐ KHÔNG ĐẠT |
| PERF-07 | Concurrent users | _____ users | 100 | ☐ ĐẠT ☐ KHÔNG ĐẠT |
| PERF-08 | Requests/second | _____ req/s | 200 | ☐ ĐẠT ☐ KHÔNG ĐẠT |
| PERF-09 | Memory usage | _____ MB | < 512MB | ☐ ĐẠT ☐ KHÔNG ĐẠT |
| PERF-10 | CPU usage peak | _____ % | < 70% | ☐ ĐẠT ☐ KHÔNG ĐẠT |

**Tổng kết:** ___ / 10 ĐẠT

---

### 2.2. Bảo mật

| STT | Loại tấn công | Kết quả | Ghi chú |
|-----|---------------|---------|---------|
| SEC-01 | SQL Injection | ☐ PASS ☐ FAIL | |
| SEC-02 | XSS | ☐ PASS ☐ FAIL | |
| SEC-03 | CSRF | ☐ PASS ☐ FAIL | |
| SEC-04 | Brute Force | ☐ PASS ☐ FAIL | |
| SEC-05 | JWT Manipulation | ☐ PASS ☐ FAIL | |
| SEC-06 | Expired Token | ☐ PASS ☐ FAIL | |
| SEC-07 | Unauthorized Access | ☐ PASS ☐ FAIL | |
| SEC-08 | IDOR | ☐ PASS ☐ FAIL | |
| SEC-09 | File Upload | ☐ PASS ☐ FAIL | |
| SEC-10 | Data Exposure | ☐ PASS ☐ FAIL | |

**Tổng kết:** ___ / 10 PASS

---

### 2.3. Tương thích

| STT | Platform | Version | Kết quả | Ghi chú |
|-----|----------|---------|---------|---------|
| COMPAT-01 | Chrome | _____ | ☐ PASS ☐ FAIL | |
| COMPAT-02 | Firefox | _____ | ☐ PASS ☐ FAIL | |
| COMPAT-03 | Edge | _____ | ☐ PASS ☐ FAIL | |
| COMPAT-04 | Safari macOS | _____ | ☐ PASS ☐ FAIL | |
| COMPAT-05 | Safari iOS | _____ | ☐ PASS ☐ FAIL | |
| COMPAT-06 | Chrome Android | _____ | ☐ PASS ☐ FAIL | |
| COMPAT-07 | Desktop 1920x1080 | - | ☐ PASS ☐ FAIL | |
| COMPAT-08 | Laptop 1366x768 | - | ☐ PASS ☐ FAIL | |
| COMPAT-09 | Tablet 768x1024 | - | ☐ PASS ☐ FAIL | |
| COMPAT-10 | Mobile 375x667 | - | ☐ PASS ☐ FAIL | |

**Tổng kết:** ___ / 10 PASS

---

## 3. TỔNG KẾT

### 3.1. Kết quả tổng hợp

| Loại test | Tổng số | Passed | Failed | Pass Rate |
|-----------|---------|--------|--------|-----------|
| Chức năng | 52 | _____ | _____ | _____% |
| Phi chức năng | 30 | _____ | _____ | _____% |
| **TỔNG** | **82** | _____ | _____ | _____% |

### 3.2. Vấn đề phát hiện

| STT | Test Case | Vấn đề | Mức độ | Trạng thái |
|-----|-----------|--------|--------|------------|
| 1 | | | ☐ Critical ☐ High ☐ Medium ☐ Low | ☐ Open ☐ Fixed |
| 2 | | | ☐ Critical ☐ High ☐ Medium ☐ Low | ☐ Open ☐ Fixed |
| 3 | | | ☐ Critical ☐ High ☐ Medium ☐ Low | ☐ Open ☐ Fixed |

### 3.3. Nhận xét

**Điểm mạnh:**
1. _______________________________________
2. _______________________________________
3. _______________________________________

**Điểm cần cải thiện:**
1. _______________________________________
2. _______________________________________
3. _______________________________________

**Khuyến nghị:**
1. _______________________________________
2. _______________________________________
3. _______________________________________

---

## 4. PHỤ LỤC

### 4.1. Screenshots
- Lưu tại: `docs/test-results/screenshots/`
- Đặt tên: `TC-XXX-YY_description.png`

### 4.2. Test Data
- Lưu tại: `docs/test-results/test-data/`
- Format: JSON, CSV

### 4.3. Logs
- Lưu tại: `docs/test-results/logs/`
- Format: TXT, LOG

---

**Người thực hiện:** _______________________  
**Người review:** _______________________  
**Ngày hoàn thành:** _______________________  
**Chữ ký:** _______________________
