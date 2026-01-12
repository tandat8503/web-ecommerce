# HƯỚNG DẪN TÍCH HỢP TINGEE QR CODE PAYMENT

## 🎯 GIỚI THIỆU

Tingee là giải pháp thanh toán chuyển khoản ngân hàng tự động qua mã QR Code VietQR. Hệ thống tự động xác minh giao dịch qua webhook.

---

## ✅ ĐÃ TRIỂN KHAI

### **1. Tingee Service** (`backend/services/payment/tingeeService.js`)
- ✅ Generate VietQR Code
- ✅ HMAC SHA512 signature generation
- ✅ Webhook signature verification
- ✅ Support 7 ngân hàng: OCB, MBB, BIDV, ACB, CTG, PGB, STB

### **2. Tingee Controller** (`backend/controller/tingeeController.js`)
- ✅ Generate QR Code API
- ✅ Webhook handler
- ✅ Get supported banks API

### **3. Routes** (`backend/routes/tingeeRoutes.js`)
- ✅ POST `/api/payment/tingee/generate-qr` - Tạo mã QR
- ✅ POST `/api/payment/tingee/webhook` - Nhận thông báo từ Tingee
- ✅ GET `/api/payment/tingee/banks` - Danh sách ngân hàng

---

## 📋 CẤU HÌNH

### **Bước 1: Đăng ký tài khoản Tingee**

1. Truy cập: https://app.tingee.vn
2. Đăng ký tài khoản
3. Thêm cửa hàng
4. Liên kết tài khoản ngân hàng

### **Bước 2: Lấy thông tin xác thực**

1. Đăng nhập Tingee
2. Click **Avatar** → **Developers**
3. Copy **Client ID** và **Secret Token**

### **Bước 3: Cấu hình Webhook**

1. Trong trang Developers
2. Click **Thêm URL**
3. Nhập URL webhook:
   ```
   https://your-domain.com/api/payment/tingee/webhook
   ```
4. Click **Lưu**

### **Bước 4: Cập nhật .env**

Thêm vào file `backend/.env`:

```env
# Tingee Payment Configuration
TINGEE_BASE_URL=https://uat-open-api.tingee.vn
TINGEE_CLIENT_ID=631033dfff96932f2c3d7eadbb29c3a1
TINGEE_SECRET_TOKEN=p6EBf+fD8N3TpngnPilil2gKWoWr4S1eAgZjsh4O1FE=
TINGEE_BANK_NAME=BIDV
TINGEE_ACCOUNT_NUMBER=your_bank_account_number
```

**Lưu ý:**
- `TINGEE_BASE_URL`: UAT cho test, Production: `https://open-api.tingee.vn`
- `TINGEE_CLIENT_ID`: Lấy từ Tingee Developers
- `TINGEE_SECRET_TOKEN`: Lấy từ Tingee Developers
- `TINGEE_BANK_NAME`: Mã ngân hàng (OCB, MBB, BIDV, ACB, CTG, PGB, STB)
- `TINGEE_ACCOUNT_NUMBER`: Số tài khoản ngân hàng nhận tiền

---

## 🚀 SỬ DỤNG

### **1. Generate QR Code**

**Endpoint:** `POST /api/payment/tingee/generate-qr`

**Headers:**
```
Authorization: Bearer {token}
Content-Type: application/json
```

**Request Body:**
```json
{
  "orderId": 123,
  "bankName": "BIDV",
  "accountNumber": "V1T40524094111"
}
```

**Response:**
```json
{
  "success": true,
  "message": "QR Code generated successfully",
  "data": {
    "qrCode": "00020101021238...",
    "qrCodeImage": "data:image/png;base64,...",
    "qrAccount": "V1T40524094111",
    "referenceLabelCode": "ABC123",
    "orderNumber": "ORD20260109001",
    "amount": 500000,
    "content": "Thanh toan don hang ORD20260109001",
    "bankName": "BIDV"
  }
}
```

### **2. Webhook từ Tingee**

**Endpoint:** `POST /api/payment/tingee/webhook`

**Headers:**
```
x-signature: {hmac_sha512_signature}
x-request-timestamp: 20260109153000123
Content-Type: application/json
```

**Request Body:**
```json
{
  "clientId": "631033dfff96932f2c3d7eadbb29c3a1",
  "transactionCode": "FT26010912345",
  "amount": 500000,
  "content": "Thanh toan don hang ORD20260109001",
  "bank": "BIDV",
  "accountNumber": "V1T40524094111",
  "vaAccountNumber": "",
  "transactionDate": "20260109153000",
  "additionalData": []
}
```

**Response:**
```json
{
  "code": "00",
  "message": "Transaction processed successfully"
}
```

**Response Codes:**
- `00`: Thành công
- `02`: Giao dịch đã được cập nhật
- `09`: Chữ ký không hợp lệ
- `99`: Lỗi khác

### **3. Get Supported Banks**

**Endpoint:** `GET /api/payment/tingee/banks`

**Response:**
```json
{
  "success": true,
  "data": [
    { "code": "OCB", "name": "Ngân hàng TMCP Phương Đông" },
    { "code": "MBB", "name": "Ngân hàng TMCP Quân Đội" },
    { "code": "BIDV", "name": "Ngân hàng TMCP Đầu tư và Phát triển Việt Nam" },
    ...
  ]
}
```

---

## 🔐 BẢO MẬT

### **HMAC SHA512 Signature**

**Quy tắc tạo signature:**

```javascript
// 1. Tạo chuỗi cần hash
const dataToHash = `${timestamp}:${JSON.stringify(body)}`;

// 2. Tạo HMAC SHA512
const signature = crypto
  .createHmac('sha512', SECRET_TOKEN)
  .update(dataToHash)
  .digest('hex');
```

**Verify signature:**

```javascript
const isValid = receivedSignature === expectedSignature;
```

---

## 🧪 TESTING

### **1. Test Generate QR Code**

```bash
curl -X POST http://localhost:5000/api/payment/tingee/generate-qr \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "orderId": 1,
    "bankName": "BIDV",
    "accountNumber": "V1T40524094111"
  }'
```

### **2. Test Webhook (Local)**

**Sử dụng ngrok để expose localhost:**

```bash
ngrok http 5000
```

**Cập nhật webhook URL trong Tingee:**
```
https://your-ngrok-url.ngrok.io/api/payment/tingee/webhook
```

**Test bằng cách chuyển khoản thật:**
1. Generate QR Code
2. Quét mã QR bằng app ngân hàng
3. Chuyển khoản
4. Kiểm tra webhook được gọi

---

## 📊 FLOW THANH TOÁN

```
1. User chọn thanh toán QR Code
         ↓
2. Frontend gọi API generate-qr
         ↓
3. Backend tạo QR Code qua Tingee API
         ↓
4. Trả về QR Code cho user
         ↓
5. User quét mã và chuyển khoản
         ↓
6. Tingee gọi webhook
         ↓
7. Backend verify signature
         ↓
8. Cập nhật order status = PAID
         ↓
9. Gửi email xác nhận
```

---

## ⚠️ LƯU Ý

### **1. Webhook Retry**

Tingee sẽ retry webhook nếu:
- Response code khác `00` hoặc `02`
- Timeout > 10s
- Retry tối đa 5 lần, mỗi lần cách 5 phút

### **2. Security**

- ✅ Luôn verify signature
- ✅ Validate amount trước khi cập nhật
- ✅ Check order đã paid chưa
- ✅ Log tất cả webhook requests

### **3. Production**

Khi deploy production:

```env
TINGEE_BASE_URL=https://open-api.tingee.vn
```

---

## 🔧 TROUBLESHOOTING

### **Lỗi: Invalid signature**

**Nguyên nhân:**
- Secret token sai
- Timestamp format sai
- Body JSON format sai

**Giải pháp:**
- Kiểm tra SECRET_TOKEN trong .env
- Log timestamp và body để debug
- Đảm bảo JSON.stringify không có space

### **Lỗi: QR Code generation failed**

**Nguyên nhân:**
- Client ID sai
- Bank name không hợp lệ
- Account number sai

**Giải pháp:**
- Kiểm tra CLIENT_ID trong .env
- Dùng bank code chuẩn: OCB, MBB, BIDV, ACB, CTG, PGB, STB
- Kiểm tra account number

### **Webhook không được gọi**

**Nguyên nhân:**
- URL webhook chưa cấu hình
- Server không public
- Firewall chặn

**Giải pháp:**
- Kiểm tra webhook URL trong Tingee
- Dùng ngrok để test local
- Kiểm tra firewall/security group

---

## 📚 TÀI LIỆU THAM KHẢO

- **Tingee Documentation:** https://tingee.vn/docs
- **Tingee Dashboard:** https://app.tingee.vn
- **VietQR Standard:** https://vietqr.io

---

## ✅ CHECKLIST

- [ ] Đăng ký tài khoản Tingee
- [ ] Lấy Client ID và Secret Token
- [ ] Cấu hình webhook URL
- [ ] Cập nhật .env
- [ ] Test generate QR Code
- [ ] Test webhook với ngrok
- [ ] Deploy và test production

---

**Chúc bạn tích hợp thành công!** 🚀
