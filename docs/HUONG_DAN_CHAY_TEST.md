# HƯỚNG DẪN CHẠY TEST CASES - CHƯƠNG 4

## 📋 Mục lục
1. [Chuẩn bị môi trường](#1-chuẩn-bị-môi-trường)
2. [Test chức năng](#2-test-chức-năng)
3. [Test hiệu năng](#3-test-hiệu-năng)
4. [Test bảo mật](#4-test-bảo-mật)
5. [Test tương thích](#5-test-tương-thích)
6. [Công cụ hỗ trợ](#6-công-cụ-hỗ-trợ)

---

## 1. Chuẩn bị môi trường

### 1.1. Yêu cầu hệ thống
```bash
- Node.js >= 18.x
- MySQL >= 8.0
- npm >= 9.x
- Git
```

### 1.2. Cài đặt dependencies
```bash
# Backend
cd backend
npm install

# Frontend
cd frontend
npm install
```

### 1.3. Cấu hình môi trường
```bash
# Backend .env
DATABASE_URL="mysql://root:password@localhost:3306/ecommerce_test"
JWT_SECRET="test-secret-key"
NODE_ENV="test"

# Frontend .env
VITE_API_URL="http://localhost:5000/api"
```

### 1.4. Setup database test
```bash
cd backend
npx prisma migrate dev
npm run seed
```

### 1.5. Chạy servers
```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend
cd frontend
npm run dev
```

---

## 2. Test chức năng

### 2.1. Test Xác thực và Phân quyền

#### TC-AUTH-01: Đăng ký tài khoản mới
```bash
# Bước 1: Mở browser http://localhost:3000/register
# Bước 2: Nhập thông tin
Email: test@example.com
Password: Test@123
Họ: Nguyễn
Tên: Văn A
Phone: 0901234567

# Bước 3: Click "Đăng ký"
# Kết quả mong đợi: 
✅ Hiển thị "Đăng ký thành công"
✅ Redirect đến /login
✅ Email xác thực được gửi
```

#### TC-AUTH-03: Đăng nhập
```bash
# Bước 1: Mở http://localhost:3000/login
# Bước 2: Nhập
Email: test@example.com
Password: Test@123

# Bước 3: Click "Đăng nhập"
# Kết quả mong đợi:
✅ Redirect đến trang chủ
✅ Token lưu trong localStorage
✅ Hiển thị tên user ở header
```

#### TC-AUTH-06: Test phân quyền Admin
```bash
# Bước 1: Đăng nhập với tài khoản Customer
# Bước 2: Truy cập http://localhost:3000/admin/products
# Kết quả mong đợi:
✅ Hiển thị "Bạn không có quyền truy cập"
✅ Redirect về trang chủ
```

### 2.2. Test Quản lý Sản phẩm

#### TC-PROD-01: Tạo sản phẩm mới
```bash
# Bước 1: Đăng nhập Admin
Email: admin@ecommerce.com
Password: admin123

# Bước 2: Vào /admin/products
# Bước 3: Click "Thêm sản phẩm"
# Bước 4: Nhập thông tin
Tên: Ghế văn phòng A
Danh mục: Ghế
Thương hiệu: Hòa Phát
Giá: 2500000
Mô tả: Ghế văn phòng cao cấp

# Bước 5: Click "Lưu"
# Kết quả mong đợi:
✅ Sản phẩm được tạo
✅ Slug: ghe-van-phong-a
✅ Hiển thị trong danh sách
```

#### TC-PROD-02: Upload hình ảnh
```bash
# Bước 1: Vào chi tiết sản phẩm
# Bước 2: Click "Quản lý hình ảnh"
# Bước 3: Chọn file ảnh (< 5MB)
# Bước 4: Click "Upload"
# Kết quả mong đợi:
✅ Ảnh được upload lên Cloudinary
✅ URL được lưu vào DB
✅ Preview hiển thị
```

#### TC-PROD-07: Tìm kiếm sản phẩm
```bash
# Bước 1: Vào trang sản phẩm
# Bước 2: Nhập "ghế văn phòng" vào search box
# Bước 3: Enter
# Kết quả mong đợi:
✅ Hiển thị sản phẩm liên quan
✅ Highlight từ khóa
✅ Sắp xếp theo relevance
```

### 2.3. Test Giỏ hàng và Thanh toán

#### TC-CART-01: Thêm sản phẩm vào giỏ
```bash
# Bước 1: Vào trang sản phẩm
# Bước 2: Click vào sản phẩm
# Bước 3: Chọn biến thể (nếu có)
# Bước 4: Nhập số lượng: 2
# Bước 5: Click "Thêm vào giỏ"
# Kết quả mong đợi:
✅ Hiển thị "Đã thêm vào giỏ"
✅ Icon giỏ hàng +2
✅ Tổng tiền cập nhật
```

#### TC-CART-06: Áp dụng mã giảm giá
```bash
# Bước 1: Vào giỏ hàng
# Bước 2: Nhập mã: WELCOME300
# Bước 3: Click "Áp dụng"
# Kết quả mong đợi:
✅ Hiển thị "Áp dụng thành công"
✅ Giảm giá: -300,000đ
✅ Tổng tiền cập nhật
```

#### TC-CART-11: Thanh toán VNPay
```bash
# Bước 1: Vào checkout
# Bước 2: Chọn phương thức: VNPay
# Bước 3: Click "Đặt hàng"
# Kết quả mong đợi:
✅ Redirect đến VNPay
✅ Hiển thị QR code
✅ Transaction được lưu
```

### 2.4. Test Đơn hàng

#### TC-ORDER-01: Tạo đơn hàng
```bash
# Bước 1: Hoàn tất checkout
# Kết quả mong đợi:
✅ Order được tạo
✅ OrderNumber: ORD-YYYYMMDD-XXX
✅ Email xác nhận được gửi
✅ Stock được trừ
```

#### TC-ORDER-05: Admin cập nhật trạng thái
```bash
# Bước 1: Admin vào /admin/orders
# Bước 2: Click vào đơn hàng
# Bước 3: Chọn trạng thái: "Đang xử lý"
# Bước 4: Click "Cập nhật"
# Kết quả mong đợi:
✅ Status updated
✅ StatusHistory saved
✅ Email gửi cho customer
```

---

## 3. Test hiệu năng

### 3.1. Test với Chrome DevTools

#### Lighthouse Performance
```bash
# Bước 1: Mở Chrome DevTools (F12)
# Bước 2: Tab "Lighthouse"
# Bước 3: Chọn "Performance"
# Bước 4: Click "Analyze page load"
# Kết quả mong đợi:
✅ Performance Score >= 90
✅ First Contentful Paint < 1.5s
✅ Largest Contentful Paint < 2.5s
✅ Time to Interactive < 3.5s
```

#### Network Analysis
```bash
# Bước 1: DevTools > Network tab
# Bước 2: Reload trang
# Bước 3: Kiểm tra
# Kết quả mong đợi:
✅ Total requests < 50
✅ Total size < 2MB
✅ Load time < 2s
```

### 3.2. Test với Apache JMeter

#### Load Test - 100 concurrent users
```bash
# Bước 1: Mở JMeter
# Bước 2: File > Open > load_test.jmx
# Bước 3: Set Thread Group
Number of Threads: 100
Ramp-up Period: 10s
Loop Count: 10

# Bước 4: Run test
# Kết quả mong đợi:
✅ Average Response Time < 200ms
✅ Error Rate < 1%
✅ Throughput > 200 req/s
```

### 3.3. Test Database Performance

#### Query Performance
```sql
-- Test 1: Product search
EXPLAIN SELECT * FROM products 
WHERE MATCH(name, description) AGAINST('ghế văn phòng' IN NATURAL LANGUAGE MODE);
-- Kết quả: Using fulltext index, < 50ms

-- Test 2: Order with joins
EXPLAIN SELECT o.*, oi.*, p.* 
FROM orders o
JOIN order_items oi ON o.id = oi.orderId
JOIN products p ON oi.productId = p.id
WHERE o.userId = 1;
-- Kết quả: Using index, < 100ms
```

---

## 4. Test bảo mật

### 4.1. Test SQL Injection

```bash
# Test 1: Login form
Email: admin@test.com' OR '1'='1
Password: anything

# Kết quả mong đợi:
✅ Login failed
✅ Prisma ORM chặn injection
```

### 4.2. Test XSS

```bash
# Test 1: Product comment
Comment: <script>alert('XSS')</script>

# Kết quả mong đợi:
✅ Script không execute
✅ Hiển thị dạng text
✅ DOMPurify sanitize
```

### 4.3. Test JWT Security

```bash
# Test 1: Expired token
# Bước 1: Lấy token cũ (đã hết hạn)
# Bước 2: Gọi API với token đó
curl -H "Authorization: Bearer EXPIRED_TOKEN" \
  http://localhost:5000/api/auth/profile

# Kết quả mong đợi:
✅ 401 Unauthorized
✅ Error: "Token expired"
```

### 4.4. Test Rate Limiting

```bash
# Test 1: Brute force login
# Bước 1: Gửi 10 requests login sai trong 1 phút
for i in {1..10}; do
  curl -X POST http://localhost:5000/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"test@test.com","password":"wrong"}'
done

# Kết quả mong đợi:
✅ Request thứ 6 bị chặn
✅ Error: "Too many requests"
✅ Retry after 15 minutes
```

---

## 5. Test tương thích

### 5.1. Test trên các trình duyệt

```bash
# Chrome
✅ Mở http://localhost:3000
✅ Test tất cả chức năng
✅ Kiểm tra console không có lỗi

# Firefox
✅ Mở http://localhost:3000
✅ Test tất cả chức năng
✅ Kiểm tra console

# Safari
✅ Mở http://localhost:3000
✅ Test tất cả chức năng
✅ Kiểm tra console

# Edge
✅ Mở http://localhost:3000
✅ Test tất cả chức năng
✅ Kiểm tra console
```

### 5.2. Test Responsive

```bash
# Desktop (1920x1080)
✅ Layout đầy đủ
✅ Sidebar hiển thị
✅ Không có scroll ngang

# Tablet (768x1024)
✅ Layout responsive
✅ Sidebar collapse
✅ Touch-friendly

# Mobile (375x667)
✅ Layout mobile
✅ Hamburger menu
✅ Bottom navigation
```

---

## 6. Công cụ hỗ trợ

### 6.1. Testing Tools

```bash
# Postman - API Testing
- Import collection: docs/postman_collection.json
- Run collection tests
- Export results

# Cypress - E2E Testing
npm install cypress --save-dev
npx cypress open

# Jest - Unit Testing
npm install jest --save-dev
npm test
```

### 6.2. Performance Tools

```bash
# Lighthouse CI
npm install -g @lhci/cli
lhci autorun

# WebPageTest
- Vào https://www.webpagetest.org
- Nhập URL: http://localhost:3000
- Run test

# GTmetrix
- Vào https://gtmetrix.com
- Nhập URL
- Analyze
```

### 6.3. Security Tools

```bash
# OWASP ZAP
- Download: https://www.zaproxy.org/download/
- Automated Scan
- Manual Explore

# npm audit
npm audit
npm audit fix

# Snyk
npm install -g snyk
snyk test
```

---

## 📊 Checklist tổng hợp

### Chức năng
- [ ] Xác thực và Phân quyền (10 tests)
- [ ] Quản lý Sản phẩm (10 tests)
- [ ] Giỏ hàng và Thanh toán (12 tests)
- [ ] Đơn hàng (10 tests)
- [ ] Tích hợp bên thứ ba (10 tests)

### Phi chức năng
- [ ] Hiệu năng (10 tests)
- [ ] Bảo mật (10 tests)
- [ ] Tương thích (10 tests)

### Báo cáo
- [ ] Screenshot kết quả
- [ ] Export test results
- [ ] Tạo báo cáo PDF
- [ ] Lưu vào docs/test-results/

---

## 🎯 Kết luận

Sau khi hoàn thành tất cả test cases:
1. ✅ Tổng hợp kết quả vào file Excel
2. ✅ Chụp screenshot các test quan trọng
3. ✅ Tạo báo cáo chi tiết
4. ✅ Lưu vào thư mục docs/test-results/

**Mục tiêu:** 100% test cases PASS

---

**Tác giả:** Tân Đạt & Phước Lý  
**Ngày:** 22/01/2025  
**Phiên bản:** 1.0.0
