# HƯỚNG DẪN CẤU HÌNH EMAIL GỬI MÃ KHUYẾN MÃI

## 🎯 CHỨC NĂNG

Khi admin chia sẻ mã khuyến mãi cho người dùng, hệ thống sẽ tự động gửi email thông báo đến email của người dùng.

---

## 📋 BƯỚC 1: CẤU HÌNH EMAIL TRONG .ENV

Thêm các biến môi trường sau vào file `backend/.env`:

```env
# Email Configuration
EMAIL_SERVICE=gmail
EMAIL_USER=tandat8503@gmail.com
EMAIL_PASSWORD=your_app_password_here
EMAIL_FROM_NAME=Nội thất văn phòng

# Frontend URL (để tạo link trong email)
FRONTEND_URL=http://localhost:5173
```

### ⚠️ LƯU Ý QUAN TRỌNG:

**KHÔNG dùng mật khẩu Gmail thông thường!** Phải dùng **App Password**.

---

## 📋 BƯỚC 2: TẠO APP PASSWORD CHO GMAIL

### 2.1. Bật xác thực 2 bước (2FA)

1. Truy cập: https://myaccount.google.com/security
2. Tìm mục **"2-Step Verification"**
3. Click **"Get Started"** và làm theo hướng dẫn

### 2.2. Tạo App Password

1. Sau khi bật 2FA, truy cập: https://myaccount.google.com/apppasswords
2. Click **"Select app"** → Chọn **"Mail"**
3. Click **"Select device"** → Chọn **"Other (Custom name)"**
4. Nhập tên: `E-Commerce Backend`
5. Click **"Generate"**
6. Copy mật khẩu 16 ký tự (dạng: `xxxx xxxx xxxx xxxx`)
7. Paste vào `EMAIL_PASSWORD` trong `.env`

**Ví dụ:**
```env
EMAIL_PASSWORD=abcd efgh ijkl mnop
```

---

## 📋 BƯỚC 3: RESTART BACKEND

Sau khi cấu hình `.env`, restart backend:

```bash
# Dừng backend (Ctrl+C)
# Chạy lại
npm run dev
```

---

## 🧪 BƯỚC 4: TEST GỬI EMAIL

### 4.1. Tạo mã khuyến mãi

1. Đăng nhập admin
2. Vào **Quản lý mã giảm giá**
3. Tạo mã mới (ví dụ: `TEST10`)

### 4.2. Chia sẻ mã cho người dùng

1. Click **"Chia sẻ"** trên mã vừa tạo
2. Chọn người dùng hoặc **"Gửi cho tất cả"**
3. Click **"Chia sẻ"**

### 4.3. Kiểm tra email

- Kiểm tra hộp thư của người dùng
- Email sẽ có tiêu đề: **"Bạn có mã giảm giá mới!"**
- Nội dung: Mã giảm giá, phần trăm/số tiền, ngày hết hạn

---

## 📧 MẪU EMAIL

Email sẽ có dạng:

```
Tiêu đề: Bạn có mã giảm giá mới!

Nội dung:
Xin chào,

Chúng tôi tặng bạn mã giảm giá đặc biệt:

┌─────────────┐
│   TEST10    │
└─────────────┘

Giảm 10% cho đơn hàng tiếp theo. 
Mã có hiệu lực tới: 09/02/2026.

Mua sắm vui vẻ nhé!
```

---

## 🔧 TROUBLESHOOTING

### Lỗi: "Invalid login"

**Nguyên nhân:** Chưa bật 2FA hoặc App Password sai

**Giải pháp:**
1. Kiểm tra đã bật 2FA chưa
2. Tạo lại App Password
3. Copy chính xác (bao gồm cả dấu cách)

### Lỗi: "Connection timeout"

**Nguyên nhân:** Firewall chặn port 587

**Giải pháp:**
1. Kiểm tra firewall
2. Thử port 465 (SSL) thay vì 587 (TLS)

Sửa trong `emailService.js`:
```javascript
const emailTransporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 465,  // Đổi từ 587 sang 465
  secure: true,  // Đổi từ false sang true
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});
```

### Email không gửi được

**Kiểm tra:**
1. File `.env` có đúng không?
2. Backend có restart sau khi sửa `.env` không?
3. Kiểm tra log trong terminal backend
4. Kiểm tra spam folder

---

## 📝 LƯU Ý

### 1. Email gửi không đồng bộ

- Email được gửi **sau khi** response trả về
- Không làm chậm API
- Nếu gửi email lỗi, vẫn tạo coupon thành công

### 2. Giới hạn gửi email

Gmail có giới hạn:
- **500 email/ngày** (tài khoản thường)
- **2000 email/ngày** (Google Workspace)

Nếu gửi cho nhiều người, email sẽ được gửi từ từ (delay 1 giây/email)

### 3. Sử dụng SMTP khác

Nếu muốn dùng Outlook, Mailgun, SendGrid, v.v., sửa trong `emailService.js`:

```javascript
const emailTransporter = nodemailer.createTransport({
  host: 'smtp.example.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});
```

---

## ✅ HOÀN TẤT!

Bây giờ khi admin chia sẻ mã khuyến mãi, người dùng sẽ nhận được email thông báo tự động! 🎉

### Kiểm tra log:

```bash
# Trong terminal backend, bạn sẽ thấy:
✅ Email sent successfully { userId: 1, email: 'user@example.com', couponCode: 'TEST10' }
✅ All coupon emails sent { totalSent: 5, couponCode: 'TEST10' }
```

---

## 🎯 TÍNH NĂNG TIẾP THEO

Nếu muốn mở rộng, có thể thêm:
- Email template đẹp hơn (HTML với CSS)
- Gửi email khi có đơn hàng mới
- Gửi email xác nhận đăng ký
- Gửi email quên mật khẩu
- v.v.

Tất cả đều dùng chung `emailService.js`!
