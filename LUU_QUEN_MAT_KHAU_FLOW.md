# 🔐 LUỒNG DỮ LIỆU CHỨC NĂNG QUÊN MẬT KHẨU

## 📋 TỔNG QUAN

Chức năng quên mật khẩu được thực hiện qua **3 bước chính**:
1. **Bước 1**: Người dùng nhập email → Hệ thống gửi mã OTP qua email
2. **Bước 2**: Người dùng nhập OTP → Hệ thống xác thực và trả về `resetToken`
3. **Bước 3**: Người dùng nhập mật khẩu mới + `resetToken` → Hệ thống cập nhật mật khẩu

---

## 🎯 BƯỚC 1: YÊU CẦU GỬI MÃ OTP

### 📍 Frontend: User nhập email

**File**: `frontend/src/pages/auth/ForgotPassword/ForgotPasswordCard.jsx`

```79:87:frontend/src/pages/auth/ForgotPassword/ForgotPasswordCard.jsx
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                placeholder="A@gmail.com"
                value={formData.email}
                onChange={(e) => onChange("email", e.target.value)}
                disabled={loading}
              />
            </div>
```

- User nhập email vào input field
- Khi click "Gửi mã OTP", gọi `handleRequestOtp()`

### 📍 Frontend: Xử lý request OTP

**File**: `frontend/src/pages/auth/ForgotPassword/useForgotPassword.js`

```32:51:frontend/src/pages/auth/ForgotPassword/useForgotPassword.js
  // hàm để gửi OTP
  const handleRequestOtp = async () => {
    if (!formData.email) {
      toast.error("Vui lòng nhập email");
      return;
    }

    try {
      setLoading(true);
      await requestPasswordReset(formData.email);
      toast.success("Đã gửi OTP (nếu email hợp lệ).");
      setStep(1);// chuyển sang step 1
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Không thể gửi OTP. Thử lại sau."
      );
    } finally {
      setLoading(false);
    }
  };
```

**Luồng xử lý:**
1. Validate email đã nhập chưa
2. Gọi API `requestPasswordReset(email)` từ `frontend/src/api/auth.js`
3. Nếu thành công → Chuyển sang step 1 (form nhập OTP)
4. Hiển thị toast thông báo thành công

### 📍 Frontend: API Call

**File**: `frontend/src/api/auth.js`

```42:45:frontend/src/api/auth.js
//yêu cầu quên mật khẩu
export async function requestPasswordReset(email) {
  return await axiosClient.post("auth/forgot-password", { email });
}
```

**Luồng:**
- Gửi POST request đến `/api/auth/forgot-password` với body `{ email }`

### 📍 Backend: Route

**File**: `backend/routes/authRoutes.js`

```23:23:backend/routes/authRoutes.js
router.post("/forgot-password", requestPasswordReset);// Forgot Password
```

- Route không cần authentication (public route)
- Gọi controller `requestPasswordReset`

### 📍 Backend: Controller - Xử lý logic chính

**File**: `backend/controller/passwordController.js`

#### 1. Validate và tìm user

```15:45:backend/controller/passwordController.js
export const requestPasswordReset = async (req, res) => {
  try {
    // Lấy và chuẩn hóa email từ body
    const email = (req.body.email || '').trim().toLowerCase();
    // Không nhập email -> báo lỗi
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email là bắt buộc.',
      });
    }

    // Helper inline: phản hồi chung để tránh lộ thông tin user tồn tại
    const safeSuccess = () =>
      res.json({
        success: true,
        message: 'Nếu email hợp lệ chúng tôi đã gửi hướng dẫn.',
      });

    // Tìm user trong DB theo email
    const user = await prisma.user.findUnique({ where: { email } });
    // Không tồn tại hoặc bị khóa -> vẫn trả thành công giả
    if (!user || !user.isActive) return safeSuccess();

        // User đăng nhập Google (không có password) -> không hỗ trợ quên mật khẩu
    if (!user.password) {
      return res.status(400).json({
        success: false,
        message: 'Tài khoản đăng nhập Google không hỗ trợ quên mật khẩu.',
      });
    }
```

**Các bước xử lý:**
1. ✅ Chuẩn hóa email (trim, lowercase)
2. ✅ Validate email không rỗng
3. ✅ Tìm user trong database theo email
4. ✅ Kiểm tra user có tồn tại và đang active không
5. ✅ **Bảo mật**: Nếu user không tồn tại → vẫn trả thành công để tránh lộ thông tin
6. ✅ Kiểm tra user có mật khẩu không (nếu đăng nhập bằng Google → không hỗ trợ)

#### 2. Tạo mã OTP

```47:73:backend/controller/passwordController.js
    // Sinh OTP ngẫu nhiên 6 chữ số + thời gian hết hạn
    const otpCode = crypto.randomInt(100000, 999999).toString();
    // Thời gian hết hạn của OTP là 10 phút
    const expiresAt = new Date(Date.now() + OTP_TTL_MIN * 60 * 1000);

    // Ghi OTP vào bảng otp_verifications trong transaction
    await prisma.$transaction(async (tx) => {
      // Xóa OTP cũ chưa dùng (nếu có)
      await tx.otpVerification.deleteMany({
        where: {
          userId: user.id,// ID của user
          type: 'PASSWORD_RESET',// Loại OTP là reset password
          isUsed: false,// OTP chưa được dùng
        },
      });

      // Lưu OTP mới
      await tx.otpVerification.create({
        data: {
          userId: user.id,// ID của user
          email: user.email,// Email của user
          otpCode,// Mã OTP
          type: 'PASSWORD_RESET',// Loại OTP là reset password
          expiresAt,// Thời gian hết hạn của OTP
        },
      });
    });
```

**Các bước:**
1. ✅ Sinh mã OTP ngẫu nhiên 6 chữ số (100000-999999)
2. ✅ Tính thời gian hết hạn: 10 phút từ thời điểm hiện tại
3. ✅ **Transaction** để đảm bảo tính nhất quán:
   - Xóa các OTP cũ chưa dùng của user (type: PASSWORD_RESET, isUsed: false)
   - Lưu OTP mới vào bảng `otp_verifications`

**Database Schema - OtpVerification:**
```43:59:backend/prisma/schema.prisma
model OtpVerification {
  id          Int      @id @default(autoincrement())
  userId      Int?     @map("user_id")
  email       String
  otpCode     String   @map("otp_code")
  type        OtpType
  isUsed      Boolean  @default(false) @map("is_used")
  expiresAt   DateTime @map("expires_at")
  attempts    Int      @default(0)
  maxAttempts Int      @default(3) @map("max_attempts")
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")
  user        User?    @relation(fields: [userId], references: [id])

  @@index([userId], map: "otp_verifications_user_id_fkey")
  @@map("otp_verifications")
}
```

#### 3. Gửi email chứa OTP

```75:77:backend/controller/passwordController.js
    // Gửi OTP qua email
    await sendForgotPasswordEmail({ email: user.email, otpCode });
    return safeSuccess();// Trả về thành công
```

**File**: `backend/services/Email/EmailServices.js`

```19:35:backend/services/Email/EmailServices.js
export const sendForgotPasswordEmail = async ({ email, otpCode }) => {
  return emailTransporter.sendMail({
    from: FROM_EMAIL,
    to: email,
    subject: 'Mã OTP đặt lại mật khẩu',
    text: `Xin chào,\n\nMã OTP đặt lại mật khẩu của bạn là: ${otpCode}\nMã có hiệu lực trong 10 phút.`,
    html: `
      <div style="font-family: Arial; line-height: 1.5;">
        <h3>Xin chào,</h3>
        <p>Mã OTP đặt lại mật khẩu của bạn:</p>
        <div style="font-size: 28px; font-weight: bold; letter-spacing: 6px;">${otpCode}</div>
        <p>Mã có hiệu lực trong <b>10 phút</b>. Không chia sẻ mã này cho bất kỳ ai.</p>
        <p>Cảm ơn bạn đã tin dùng Nội thất văn phòng!</p>
      </div>
    `,
  });
};
```

**Luồng:**
1. ✅ Gọi hàm `sendForgotPasswordEmail` với email và OTP code
2. ✅ Sử dụng Nodemailer với Gmail SMTP để gửi email
3. ✅ Email chứa mã OTP và thông báo thời hạn 10 phút

**Kết quả:**
- Trả về response thành công cho frontend (dù user có tồn tại hay không - bảo mật)

---

## 🎯 BƯỚC 2: XÁC THỰC OTP VÀ LẤY RESET TOKEN

### 📍 Frontend: User nhập OTP và mật khẩu mới

**File**: `frontend/src/pages/auth/ForgotPassword/ForgotPasswordCard.jsx`

```88:120:frontend/src/pages/auth/ForgotPassword/ForgotPasswordCard.jsx
          ) : (
            <>
              <div className="space-y-2">
                <Label>Mã OTP</Label>
                <Input
                  placeholder="123456"
                  maxLength={6}
                  value={formData.otpCode}
                  onChange={(e) => onChange("otpCode", e.target.value)}
                  disabled={loading}
                />
              </div>
              <div className="space-y-2">
                <Label>Mật khẩu mới</Label>
                <Input
                  type="password"
                  placeholder="••••••••"
                  value={formData.newPassword}
                  onChange={(e) => onChange("newPassword", e.target.value)}
                  disabled={loading}
                />
              </div>
              <div className="space-y-2">
                <Label>Nhập lại mật khẩu</Label>
                <Input
                  type="password"
                  placeholder="••••••••"
                  value={formData.confirmPassword}
                  onChange={(e) => onChange("confirmPassword", e.target.value)}
                  disabled={loading}
                />
              </div>
            </>
          )}
```

- User nhập OTP (6 chữ số), mật khẩu mới và xác nhận mật khẩu
- Khi click "Đặt lại mật khẩu", gọi `handleResetPassword()`

### 📍 Frontend: Xử lý reset password

**File**: `frontend/src/pages/auth/ForgotPassword/useForgotPassword.js`

```53:93:frontend/src/pages/auth/ForgotPassword/useForgotPassword.js
  const handleResetPassword = async () => {
    if (!formData.otpCode || formData.otpCode.length !== 6) {
      toast.error("Mã OTP phải gồm 6 chữ số.");
      return false;
    }

    if (!formData.newPassword || formData.newPassword.length < 6) {
      toast.error("Mật khẩu phải có ít nhất 6 ký tự.");
      return false;
    }

    if (formData.newPassword !== formData.confirmPassword) {
      toast.error("Mật khẩu xác nhận không khớp.");
      return false;
    }

    try {
      setLoading(true);
      const verifyRes = await verifyPasswordOTP({
        email: formData.email,
        otpCode: formData.otpCode,
      });
      const resetToken = verifyRes.data?.data?.resetToken;// lấy resetToken từ response
// hàm để đặt lại mật khẩu
      await resetPassword({
        resetToken,// resetToken để đặt lại mật khẩu
        newPassword: formData.newPassword,// mật khẩu mới
      });
      toast.success("Đặt lại mật khẩu thành công.");
      setFormData(INITIAL_STATE);// reset formData
      setStep(0);// reset step
      return true;
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Không thể đặt lại mật khẩu."
      );
      return false;
    } finally {
      setLoading(false);
    }
  };
```

**Luồng xử lý:**
1. ✅ Validate OTP (phải đúng 6 chữ số)
2. ✅ Validate mật khẩu mới (ít nhất 6 ký tự)
3. ✅ Validate mật khẩu xác nhận phải khớp
4. ✅ **Gọi API `verifyPasswordOTP`** → Nhận `resetToken`
5. ✅ **Gọi API `resetPassword`** với `resetToken` và mật khẩu mới
6. ✅ Nếu thành công → Reset form và đóng card

### 📍 Frontend: API Calls

**File**: `frontend/src/api/auth.js`

```46:52:frontend/src/api/auth.js
//xác thực OTP
export async function verifyPasswordOTP(payload) {
  return await axiosClient.post("auth/verify-otp", payload);
}
//đặt lại mật khẩu
export async function resetPassword(payload) {
  return await axiosClient.post("auth/reset-password", payload);
}
```

### 📍 Backend: Route - Verify OTP

**File**: `backend/routes/authRoutes.js`

```24:24:backend/routes/authRoutes.js
router.post("/verify-otp", verifyPasswordResetOTP);// Verify OTP
```

### 📍 Backend: Controller - Verify OTP

**File**: `backend/controller/passwordController.js`

#### 1. Validate input và tìm user

```90:107:backend/controller/passwordController.js
export const verifyPasswordResetOTP = async (req, res) => {
  try {
    const email = (req.body.email || '').trim().toLowerCase();
    const otpCode = (req.body.otpCode || '').trim();
    if (!email || !otpCode) {
      return res.status(400).json({
        success: false,
        message: 'Email và mã OTP là bắt buộc.',
      });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Email hoặc mã OTP không đúng.',
      });
    }
```

#### 2. Tìm OTP record

```109:125:backend/controller/passwordController.js
    // Tìm record OTP mới nhất của user
    const otpRecord = await prisma.otpVerification.findFirst({
      where: {
        userId: user.id,
        email: user.email,
        type: 'PASSWORD_RESET',
        isUsed: false,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!otpRecord) {
      return res.status(400).json({
        success: false,
        message: 'Mã OTP không tồn tại hoặc đã dùng.',
      });
    }
```

**Logic:**
- Tìm OTP record chưa dùng (`isUsed: false`) và mới nhất của user
- Nếu không tìm thấy → OTP không tồn tại hoặc đã dùng

#### 3. Kiểm tra số lần thử

```127:132:backend/controller/passwordController.js
    if (otpRecord.attempts >= otpRecord.maxAttempts) {
      return res.status(400).json({
        success: false,
        message: 'Bạn đã vượt quá số lần thử OTP.',
      });
    }
```

**Bảo mật:** Giới hạn số lần nhập sai OTP (mặc định 3 lần)

#### 4. Kiểm tra OTP có đúng không

```133:143:backend/controller/passwordController.js
// OTP không đúng -> tăng số lần thử
    if (otpRecord.otpCode !== otpCode) {
      await prisma.otpVerification.update({
        where: { id: otpRecord.id },
        data: { attempts: { increment: 1 } },
      });
      return res.status(400).json({
        success: false,
        message: 'Email hoặc mã OTP không đúng.',
      });
    }
```

**Logic:**
- So sánh OTP user nhập với OTP trong database
- Nếu không khớp → Tăng `attempts` lên 1 và trả về lỗi

#### 5. Kiểm tra OTP hết hạn chưa

```144:154:backend/controller/passwordController.js
// OTP hết hạn -> đánh dấu là đã dùng
    if (otpRecord.expiresAt < new Date()) {
      await prisma.otpVerification.update({
        where: { id: otpRecord.id },
        data: { isUsed: true },
      });
      return res.status(400).json({
        success: false,
        message: 'Mã OTP đã hết hạn.',
      });
    }
```

**Logic:**
- Kiểm tra `expiresAt` < thời gian hiện tại
- Nếu hết hạn → Đánh dấu `isUsed: true` và trả về lỗi

#### 6. Tạo Reset Token

```156:183:backend/controller/passwordController.js
    // OTP hợp lệ -> sinh token reset random 32 bytes
    const resetToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + RESET_TTL_HR * 60 * 60 * 1000);
// Cập nhật OTP là đã dùng
    await prisma.$transaction(async (tx) => {
      await tx.otpVerification.update({
        where: { id: otpRecord.id },// ID của OTP
        data: { isUsed: true },// OTP đã dùng
      });
// Xóa các token reset cũ chưa dùng
      await tx.passwordReset.deleteMany({
        where: { userId: user.id, isUsed: false },
      });
// Tạo token reset mới
      await tx.passwordReset.create({
        data: {
          userId: user.id,// ID của user
          token: resetToken,// Token reset
          expiresAt,// Thời gian hết hạn của token reset
        },
      });
    });

    return res.json({
      success: true,
      message: 'Xác thực OTP thành công.',
      data: { resetToken },
    });
```

**Các bước:**
1. ✅ Sinh `resetToken` ngẫu nhiên 32 bytes (hex string)
2. ✅ Tính thời gian hết hạn: 1 giờ từ thời điểm hiện tại
3. ✅ **Transaction** để đảm bảo tính nhất quán:
   - Đánh dấu OTP là đã dùng (`isUsed: true`)
   - Xóa các token reset cũ chưa dùng của user
   - Tạo token reset mới trong bảng `password_resets`
4. ✅ Trả về `resetToken` cho frontend

**Database Schema - PasswordReset:**
```61:73:backend/prisma/schema.prisma
model PasswordReset {
  id        Int      @id @default(autoincrement())
  userId    Int      @map("user_id")
  token     String   @unique
  expiresAt DateTime @map("expires_at")
  isUsed    Boolean  @default(false) @map("is_used")
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")
  user      User     @relation(fields: [userId], references: [id], onDelete: NoAction)

  @@index([userId], map: "password_resets_user_id_fkey")
  @@map("password_resets")
}
```

---

## 🎯 BƯỚC 3: ĐẶT LẠI MẬT KHẨU

### 📍 Backend: Route - Reset Password

**File**: `backend/routes/authRoutes.js`

```25:25:backend/routes/authRoutes.js
router.post("/reset-password", resetPassword);// Reset Password
```

### 📍 Backend: Controller - Reset Password

**File**: `backend/controller/passwordController.js`

#### 1. Validate input

```196:211:backend/controller/passwordController.js
export const resetPassword = async (req, res) => {
  try {
    const token = (req.body.resetToken || '').trim();// Token reset
    const newPassword = req.body.newPassword || '';// Mật khẩu mới
    if (!token || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Token và mật khẩu mới là bắt buộc.',
      });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Mật khẩu phải >= 6 ký tự.',
      });
    }
```

#### 2. Tìm và validate reset token

```213:223:backend/controller/passwordController.js
    // Lấy record token tương ứng trong DB
    const resetRecord = await prisma.passwordReset.findUnique({
      where: { token },
    });
    // Token không hợp lệ hoặc đã hết hạn
    if (!resetRecord || resetRecord.isUsed || resetRecord.expiresAt < new Date()) {
      return res.status(400).json({
        success: false,
        message: 'Token không hợp lệ hoặc đã hết hạn.',
      });
    }
```

**Logic:**
- Tìm record trong bảng `password_resets` theo token
- Kiểm tra:
  - Token có tồn tại không
  - Token đã được dùng chưa (`isUsed: true`)
  - Token còn hạn không (`expiresAt` >= hiện tại)

#### 3. Hash mật khẩu mới và cập nhật

```225:243:backend/controller/passwordController.js
    // Hash mật khẩu mới trước khi lưu DB
    const hashedPassword = await bcrypt.hash(newPassword, 10);
// Cập nhật mật khẩu mới 
    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: resetRecord.userId },
        data: { password: hashedPassword },
      });
// Cập nhật token reset là đã dùng
      await tx.passwordReset.update({
        where: { id: resetRecord.id },
        data: { isUsed: true },
      });
    });

    return res.json({
      success: true,
      message: 'Đặt lại mật khẩu thành công.',
    });
```

**Các bước:**
1. ✅ Hash mật khẩu mới bằng bcrypt (salt rounds: 10)
2. ✅ **Transaction** để đảm bảo tính nhất quán:
   - Cập nhật mật khẩu mới (đã hash) cho user
   - Đánh dấu token reset là đã dùng (`isUsed: true`)
3. ✅ Trả về thành công

---

## 📊 SƠ ĐỒ LUỒNG DỮ LIỆU

```
┌─────────────┐
│   USER      │
└──────┬──────┘
       │
       │ 1. Nhập email
       ▼
┌─────────────────────────────────┐
│  ForgotPasswordCard.jsx         │
│  - Form nhập email              │
│  - handleRequestOtp()           │
└──────┬──────────────────────────┘
       │
       │ 2. POST /api/auth/forgot-password
       ▼
┌─────────────────────────────────┐
│  passwordController.js          │
│  requestPasswordReset()         │
│  ├─ Validate email              │
│  ├─ Tìm user trong DB           │
│  ├─ Tạo OTP (6 chữ số)          │
│  ├─ Lưu OTP vào DB              │
│  └─ Gửi email chứa OTP          │
└──────┬──────────────────────────┘
       │
       │ 3. Email gửi OTP
       ▼
┌─────────────────────────────────┐
│  EmailServices.js               │
│  sendForgotPasswordEmail()      │
│  └─ Nodemailer → Gmail SMTP     │
└─────────────────────────────────┘

       │
       │ 4. User nhận email, nhập OTP + mật khẩu mới
       ▼
┌─────────────────────────────────┐
│  ForgotPasswordCard.jsx         │
│  - Form nhập OTP                │
│  - Form nhập mật khẩu mới       │
│  - handleResetPassword()        │
└──────┬──────────────────────────┘
       │
       │ 5. POST /api/auth/verify-otp
       ▼
┌─────────────────────────────────┐
│  passwordController.js          │
│  verifyPasswordResetOTP()       │
│  ├─ Validate OTP                │
│  ├─ Kiểm tra OTP hết hạn        │
│  ├─ Kiểm tra số lần thử         │
│  ├─ Đánh dấu OTP đã dùng        │
│  ├─ Tạo resetToken              │
│  └─ Lưu resetToken vào DB       │
└──────┬──────────────────────────┘
       │
       │ 6. Nhận resetToken
       ▼
┌─────────────────────────────────┐
│  useForgotPassword.js           │
│  - Lưu resetToken               │
│  - Gọi resetPassword()          │
└──────┬──────────────────────────┘
       │
       │ 7. POST /api/auth/reset-password
       │    { resetToken, newPassword }
       ▼
┌─────────────────────────────────┐
│  passwordController.js          │
│  resetPassword()                │
│  ├─ Validate token              │
│  ├─ Hash mật khẩu mới           │
│  ├─ Cập nhật mật khẩu user      │
│  └─ Đánh dấu token đã dùng      │
└──────┬──────────────────────────┘
       │
       │ 8. Thành công
       ▼
┌─────────────────────────────────┐
│  Frontend                       │
│  - Hiển thị toast success       │
│  - Reset form                   │
│  - Đóng card                    │
└─────────────────────────────────┘
```

---

## 🔒 BẢO MẬT

1. **Bảo vệ thông tin user:**
   - Nếu email không tồn tại → vẫn trả thành công (không lộ thông tin)

2. **Giới hạn số lần thử OTP:**
   - Mặc định 3 lần (`maxAttempts: 3`)
   - Mỗi lần nhập sai → tăng `attempts`

3. **Thời gian hết hạn:**
   - OTP: 10 phút
   - Reset Token: 1 giờ

4. **Mã hóa mật khẩu:**
   - Sử dụng bcrypt với salt rounds = 10

5. **Token một lần sử dụng:**
   - OTP và Reset Token đều được đánh dấu `isUsed: true` sau khi dùng

6. **Transaction:**
   - Sử dụng database transaction để đảm bảo tính nhất quán dữ liệu

---

## 📝 TÓM TẮT

**Bước 1: Request OTP**
- User nhập email → Backend tạo OTP → Gửi email → Frontend chuyển sang step 2

**Bước 2: Verify OTP**
- User nhập OTP → Backend xác thực → Tạo resetToken → Trả về cho Frontend

**Bước 3: Reset Password**
- User nhập mật khẩu mới + resetToken → Backend hash mật khẩu → Cập nhật DB → Hoàn tất

**Database Tables sử dụng:**
- `otp_verifications`: Lưu mã OTP
- `password_resets`: Lưu reset token
- `users`: Lưu mật khẩu mới (đã hash)

