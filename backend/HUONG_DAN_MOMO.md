# 🎯 HƯỚNG DẪN ĐĂNG KÝ VÀ CẤU HÌNH MOMO PAYMENT

## 📝 BƯỚC 1: ĐĂNG KÝ TÀI KHOẢN MOMO DEVELOPER

### 1.1 Truy cập trang đăng ký
- **URL:** https://developers.momo.vn/
- Hoặc tìm kiếm: "MoMo Developer Portal"

### 1.2 Đăng ký tài khoản
- Click vào nút **"Đăng ký"** hoặc **"Sign Up"**
- Có thể đăng ký bằng:
  - Email
  - Số điện thoại (nếu có tài khoản MoMo)
  - Tài khoản Facebook/Google (nếu hỗ trợ)

### 1.3 Xác thực tài khoản
- Kiểm tra email để xác thực tài khoản
- Đăng nhập vào MoMo Developer Portal

---

## 📝 BƯỚC 2: TẠO ỨNG DỤNG MỚI

### 2.1 Vào Dashboard
- Sau khi đăng nhập, vào **Dashboard** hoặc **Quản lý ứng dụng**

### 2.2 Tạo ứng dụng mới
1. Click nút **"Tạo ứng dụng mới"** hoặc **"Create New App"**
2. Điền thông tin:
   - **Tên ứng dụng:** E-Commerce Store (hoặc tên bạn muốn)
   - **Mô tả:** Website bán hàng trực tuyến
   - **Loại ứng dụng:** Chọn **"Thanh toán"** (Payment)
   - **Môi trường:** Chọn **Sandbox** (để test)

### 2.3 Lưu thông tin
- Sau khi tạo xong, hệ thống sẽ cung cấp:
  - **Partner Code** (Mã đối tác)
  - **Access Key** (Khóa truy cập)
  - **Secret Key** (Khóa bí mật) ⚠️ **QUAN TRỌNG:** Chỉ hiển thị 1 lần!

---

## 📝 BƯỚC 3: LẤY THÔNG TIN CREDENTIALS

Sau khi tạo ứng dụng, bạn sẽ thấy:

```
Partner Code: MOMOxxxxx
Access Key: xxxxxxxxxxxxxxxx
Secret Key: xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

⚠️ **LƯU Ý QUAN TRỌNG:**
- **Secret Key chỉ hiển thị 1 lần duy nhất!**
- **Hãy copy và lưu ngay vào file .env**
- **Nếu quên, phải tạo lại ứng dụng**

---

## 📝 BƯỚC 4: CẤU HÌNH FILE .ENV

### 4.1 Tạo file .env
Tạo file `.env` trong thư mục `backend/` (cùng cấp với `server.js`)

### 4.2 Thêm cấu hình MoMo

```env
# ==================== DATABASE ====================
DATABASE_URL="mysql://user:password@localhost:3306/database_name"

# ==================== SERVER ====================
PORT=5000
NODE_ENV=development

# ==================== JWT ====================
JWT_SECRET=your-jwt-secret-key
JWT_REFRESH_SECRET=your-jwt-refresh-secret-key

# ==================== MoMo Payment Gateway ====================
# Lấy từ MoMo Developer Portal sau khi tạo ứng dụng
MOMO_PARTNER_CODE=MOMOxxxxx
MOMO_ACCESS_KEY=your_access_key_here
MOMO_SECRET_KEY=your_secret_key_here

# URL API MoMo (Sandbox để test)
MOMO_API_URL=https://test-payment.momo.vn/v2/gateway/api/create

# Redirect URL - URL frontend sau khi thanh toán xong
# Thay đổi theo frontend của bạn
MOMO_REDIRECT_URL=http://localhost:5173/payment/result

# IPN URL - URL backend để nhận callback từ MoMo
# Lưu ý: Phải là public URL (dùng ngrok khi test local)
MOMO_IPN_URL=http://localhost:5000/api/payment/momo/callback
```

### 4.3 Thay thế giá trị
Thay các giá trị sau bằng thông tin thật của bạn:
- `MOMO_PARTNER_CODE` → Partner Code từ MoMo
- `MOMO_ACCESS_KEY` → Access Key từ MoMo
- `MOMO_SECRET_KEY` → Secret Key từ MoMo
- `MOMO_REDIRECT_URL` → URL frontend của bạn
- `MOMO_IPN_URL` → URL backend của bạn (có thể dùng ngrok khi test)

---

## 📝 BƯỚC 5: TEST VỚI SANDBOX

### 5.1 Cấu hình ngrok (nếu test local)
MoMo cần gọi callback về server của bạn, nên cần public URL:

1. **Cài đặt ngrok:**
   - Download: https://ngrok.com/
   - Hoặc: `npm install -g ngrok`

2. **Chạy ngrok:**
   ```bash
   ngrok http 5000
   ```

3. **Lấy URL từ ngrok:**
   ```
   Forwarding: https://abc123.ngrok.io -> http://localhost:5000
   ```

4. **Cập nhật MOMO_IPN_URL trong .env:**
   ```env
   MOMO_IPN_URL=https://abc123.ngrok.io/api/payment/momo/callback
   ```

### 5.2 Test payment flow
1. Khởi động server: `npm run dev`
2. Tạo đơn hàng với `paymentMethod: "MOMO"`
3. Gọi API tạo payment URL
4. Test thanh toán với tài khoản MoMo test

---

## ⚠️ LƯU Ý QUAN TRỌNG

### Test Environment (Sandbox)
- ✅ Miễn phí
- ✅ Không trừ tiền thật
- ✅ Dùng để test code

### Production Environment
- ⚠️ Cần đăng ký merchant với MoMo
- ⚠️ Có thể cần giấy tờ (CMND, giấy phép kinh doanh)
- ⚠️ Có phí giao dịch (~1-3%)
- ⚠️ Đổi URL sang: `https://payment.momo.vn/v2/gateway/api/create`

---

## 📞 HỖ TRỢ

- **Tài liệu MoMo:** https://developers.momo.vn/v3/vi/docs
- **Support:** Liên hệ qua MoMo Developer Portal

