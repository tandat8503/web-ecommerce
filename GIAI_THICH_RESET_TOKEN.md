# 🔐 GIẢI THÍCH CƠ CHẾ RESET TOKEN VÀ THỜI HẠN 1 GIỜ

## ❓ CÂU HỎI

> "RESET_TTL_HR = 1 chỉ sống 1h là sao? Nếu nhập đúng OTP thì token mới tự sinh ra, vậy nếu qua 1h thì người dùng không đăng nhập vào được hả?"

## ✅ TRẢ LỜI CHI TIẾT

### 🔑 QUAN TRỌNG: Reset Token KHÔNG phải để đăng nhập!

**Reset Token chỉ dùng để đặt lại mật khẩu**, không dùng để đăng nhập. Sau khi đặt lại mật khẩu thành công, người dùng sẽ **đăng nhập bình thường bằng email + mật khẩu mới**.

---

## 📊 LUỒNG HOẠT ĐỘNG CHI TIẾT

### **BƯỚC 1: Yêu cầu OTP (không có token)**
```
User nhập email → Backend gửi OTP qua email
```
- Thời điểm này: **Chưa có Reset Token**
- OTP sống: **10 phút**

### **BƯỚC 2: Nhập đúng OTP → Tạo Reset Token**
```javascript
// backend/controller/passwordController.js (dòng 156-158)
const resetToken = crypto.randomBytes(32).toString('hex');
const expiresAt = new Date(Date.now() + RESET_TTL_HR * 60 * 60 * 1000);
// expiresAt = thời điểm hiện tại + 1 giờ
```

**Khi nào token được sinh ra:**
- ✅ User nhập **đúng OTP** (trong vòng 10 phút)
- ✅ Backend xác thực OTP thành công
- ✅ **Lúc này mới sinh Reset Token** và trả về cho frontend

**Thời hạn Reset Token:**
- ⏰ **1 giờ** từ thời điểm token được sinh ra
- Ví dụ: Token sinh lúc 14:00 → Hết hạn lúc 15:00

### **BƯỚC 3: Dùng Reset Token để đặt lại mật khẩu**

```javascript
// backend/controller/passwordController.js (dòng 218)
if (!resetRecord || resetRecord.isUsed || resetRecord.expiresAt < new Date()) {
  return res.status(400).json({
    success: false,
    message: 'Token không hợp lệ hoặc đã hết hạn.',
  });
}
```

**Kiểm tra khi đặt lại mật khẩu:**
1. ✅ Token có tồn tại không?
2. ✅ Token đã được dùng chưa? (`isUsed: false`)
3. ✅ Token còn hạn không? (`expiresAt >= thời điểm hiện tại`)

**Sau khi đặt lại mật khẩu thành công:**
```javascript
// backend/controller/passwordController.js (dòng 229-232)
await tx.user.update({
  where: { id: resetRecord.userId },
  data: { password: hashedPassword }, // Mật khẩu mới (đã hash)
});
```

**✅ Từ đây trở đi:**
- User có thể **đăng nhập bình thường** bằng:
  - Email + **Mật khẩu mới** (đã được cập nhật trong database)
- **KHÔNG cần Reset Token nữa!**

---

## 🕐 KỊCH BẢN NẾU TOKEN HẾT HẠN

### **Tình huống: User nhận được Reset Token nhưng chưa kịp đặt lại mật khẩu**

**Ví dụ:**
- 14:00 - User nhập đúng OTP → Nhận được `resetToken`
- 14:30 - User rời khỏi máy, chưa nhập mật khẩu mới
- 15:01 - Token đã hết hạn (quá 1 giờ)
- 15:01 - User quay lại, nhập mật khẩu mới → **Token đã hết hạn!**

**Kết quả:**
```
❌ Error: "Token không hợp lệ hoặc đã hết hạn."
```

### **Giải pháp: User làm lại từ đầu**

User chỉ cần:
1. ✅ Quay lại **Bước 1**: Nhập email để nhận OTP mới
2. ✅ Quay lại **Bước 2**: Nhập OTP mới để nhận Reset Token mới
3. ✅ Quay lại **Bước 3**: Đặt lại mật khẩu với token mới

**⚠️ Lưu ý:**
- Reset Token hết hạn **KHÔNG ảnh hưởng** đến việc đăng nhập
- User vẫn có thể đăng nhập bằng **mật khẩu cũ** (nếu nhớ)
- Chỉ khi user **quên mật khẩu** mới cần làm lại quy trình

---

## 💡 TẠI SAO CHỈ ĐỂ 1 GIỜ?

### **Lý do bảo mật:**

1. **Giảm rủi ro token bị lộ:**
   - Nếu token bị ai đó lấy được (ví dụ: screenshot, clipboard...)
   - Thời hạn ngắn giảm khả năng bị lợi dụng

2. **Token chỉ dùng 1 lần:**
   - Sau khi đặt lại mật khẩu, token bị đánh dấu `isUsed: true`
   - Không thể dùng lại token đó

3. **Thời gian đủ để user hoàn tất:**
   - User thường đặt lại mật khẩu **ngay sau khi nhận OTP**
   - Thời gian thực tế: **2-5 phút** (chưa đến 1 giờ)

### **Nếu cần thời gian dài hơn:**

Bạn có thể tăng thời hạn lên 2-4 giờ nếu muốn:

```javascript
// backend/controller/passwordController.js
const RESET_TTL_HR = 2; // Thay đổi từ 1 → 2 giờ
// hoặc
const RESET_TTL_HR = 4; // Thay đổi từ 1 → 4 giờ
```

**⚠️ Cân nhắc:**
- Thời gian dài hơn → Tiện lợi hơn cho user
- Nhưng → Rủi ro bảo mật cao hơn nếu token bị lộ

---

## 📝 TÓM TẮT

### **Reset Token dùng để làm gì?**
✅ Chỉ dùng để **đặt lại mật khẩu** (reset password)
❌ **KHÔNG dùng** để đăng nhập

### **Sau khi đặt lại mật khẩu thành công:**
✅ User đăng nhập bằng: **Email + Mật khẩu mới**
❌ Không cần Reset Token nữa

### **Nếu Reset Token hết hạn:**
✅ User làm lại từ đầu: Yêu cầu OTP mới → Nhận token mới
⚠️ Không ảnh hưởng đến việc đăng nhập (vẫn có thể đăng nhập bằng mật khẩu cũ nếu nhớ)

### **Thời hạn 1 giờ:**
✅ Đủ để user hoàn tất việc đặt lại mật khẩu (thường chỉ 2-5 phút)
✅ Giảm rủi ro bảo mật nếu token bị lộ
✅ Có thể tăng lên 2-4 giờ nếu cần

---

## 🔄 SO SÁNH: RESET TOKEN vs JWT TOKEN (Đăng nhập)

| Đặc điểm | Reset Token | JWT Token (Đăng nhập) |
|----------|-------------|----------------------|
| **Mục đích** | Đặt lại mật khẩu | Xác thực người dùng |
| **Sử dụng** | 1 lần duy nhất | Nhiều lần (cho đến khi hết hạn) |
| **Thời hạn** | 1 giờ | Thường 7-30 ngày |
| **Lưu trữ** | Database (`password_resets`) | localStorage/cookie |
| **Sau khi dùng** | Đánh dấu `isUsed: true` | Vẫn có thể dùng tiếp (cho đến khi hết hạn) |

---

## 💻 CODE DEMO MINH HỌA

### **Luồng hoàn chỉnh:**

```javascript
// BƯỚC 1: User yêu cầu OTP
POST /api/auth/forgot-password
{ email: "user@example.com" }
→ Response: { success: true, message: "Đã gửi OTP" }

// BƯỚC 2: User nhập OTP → Nhận Reset Token
POST /api/auth/verify-otp
{ email: "user@example.com", otpCode: "123456" }
→ Response: { 
    success: true, 
    data: { 
      resetToken: "a1b2c3d4e5f6..." // Token này sống 1 giờ
    }
  }

// BƯỚC 3A: User đặt lại mật khẩu TRONG 1 GIỜ (thành công)
POST /api/auth/reset-password
{ 
  resetToken: "a1b2c3d4e5f6...", 
  newPassword: "password123" 
}
→ Response: { success: true, message: "Đặt lại mật khẩu thành công" }

// Từ đây user có thể đăng nhập:
POST /api/auth/login
{ email: "user@example.com", password: "password123" }
→ Response: { success: true, token: "jwt_token_here", user: {...} }

// BƯỚC 3B: User đặt lại mật khẩu SAU 1 GIỜ (thất bại)
POST /api/auth/reset-password
{ 
  resetToken: "a1b2c3d4e5f6...", // Token đã hết hạn
  newPassword: "password123" 
}
→ Response: { 
    success: false, 
    message: "Token không hợp lệ hoặc đã hết hạn" 
  }

// User phải làm lại từ BƯỚC 1
```

---

## 🎯 KẾT LUẬN

**Reset Token hết hạn sau 1 giờ là cơ chế bảo mật hợp lý:**
- ✅ Đủ thời gian để user hoàn tất việc đặt lại mật khẩu
- ✅ Giảm rủi ro nếu token bị lộ
- ✅ Không ảnh hưởng đến việc đăng nhập (user đăng nhập bằng mật khẩu, không phải token)
- ✅ User có thể yêu cầu token mới nếu cần

**Nếu muốn tăng thời hạn:**
- Có thể thay đổi `RESET_TTL_HR = 2` hoặc `RESET_TTL_HR = 4`
- Nhưng nên cân nhắc giữa tiện lợi và bảo mật

