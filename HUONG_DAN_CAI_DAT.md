# HƯỚNG DẪN CÀI ĐẶT HỆ THỐNG E-COMMERCE

## Yêu cầu hệ thống

- **Node.js**: v18 trở lên
- **MySQL**: v8.0 trở lên hoặc MariaDB v10.5 trở lên
- **npm**: Đi kèm với Node.js

---

## CÀI ĐẶT BACKEND

### Bước 1: Cài đặt dependencies

```bash
cd backend
npm install
```

### Bước 2: Tạo file `.env`

Tạo file `.env` trong thư mục `backend/` với nội dung:

```env
# Database
DATABASE_URL="mysql://username:password@localhost:3306/ecommerce_db"

# Server
PORT=5000
NODE_ENV=development

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRES_IN=24h
JWT_REFRESH_EXPIRES_IN=7d

# Cloudinary
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Email (tùy chọn)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password

# Google OAuth (tùy chọn)
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# GHN API (tùy chọn)
GHN_API_URL=https://online-gateway.ghn.vn
GHN_TOKEN=your_ghn_token
GHN_SHOP_ID=your_shop_id

# TINGEE (tùy chọn)
TINGEE_BASE_URL=https://uat-open-api.tingee.vn
TINGEE_CLIENT_ID=your_tingee_client_id
TINGEE_SECRET_TOKEN=your_tingee_secret_token

# VNPay (tùy chọn)
VNP_TMN_CODE=your_tmn_code
VNP_HASH_SECRET=your_hash_secret
VNP_RETURN_URL=http://localhost:5000/api/payment/vnpay/return

# Rate Limiting (tùy chọn)
SKIP_RATE_LIMIT=false
```

### Bước 3: Tạo database

Đăng nhập MySQL và tạo database:

```sql
CREATE DATABASE ecommerce_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### Bước 4: Chạy Prisma migrations

```bash
npx prisma generate
npx prisma migrate dev
```

### Bước 5: Seed dữ liệu mẫu (tùy chọn)

```bash
npm run seed
```

Tài khoản Admin mặc định:
- Email: `admin@ecommerce.com`
- Password: `admin123`

### Bước 6: Chạy Backend

**Development mode:**
```bash
npm run dev
```

**Production mode:**
```bash
npm start
```

Backend chạy tại: `http://localhost:5000`

---

## CÀI ĐẶT FRONTEND

### Bước 1: Cài đặt dependencies

```bash
cd frontend
npm install
```

### Bước 2: Tạo file `.env`

Tạo file `.env` trong thư mục `frontend/` với nội dung:

```env
# Backend API URL
VITE_API_URL=http://localhost:5000/api

# Google OAuth Client ID (tùy chọn)
VITE_GOOGLE_CLIENT_ID=your_google_client_id

# TINGEE (tùy chọn)
VITE_TINGEE_BANK_NAME=CTG
VITE_TINGEE_ACCOUNT_NUMBER=your_account_number
```

### Bước 3: Chạy Frontend

**Development mode:**
```bash
npm run dev
```

**Build production:**
```bash
npm run build
npm run preview
```

Frontend chạy tại: `http://localhost:5173`

---

## KIỂM TRA HỆ THỐNG

### Kiểm tra Backend

```bash
# Health check
curl http://localhost:5000/api/health

# Database connection
curl http://localhost:5000/api/test-db
```

### Kiểm tra Frontend

Mở trình duyệt: `http://localhost:5173`

### Kiểm tra Database

```bash
cd backend
npx prisma studio
```

Prisma Studio mở tại: `http://localhost:5555`

---

## CÁC LỆNH HỮU ÍCH

### Backend

```bash
# Chạy development server
npm run dev

# Chạy production server
npm start

# Seed dữ liệu
npm run seed

# Tạo Prisma Client
npx prisma generate

# Chạy migrations
npx prisma migrate dev

# Mở Prisma Studio
npx prisma studio
```

### Frontend

```bash
# Chạy development server
npm run dev

# Build production
npm run build

# Preview build
npm run preview

# Lint code
npm run lint
```

---

## LƯU Ý

1. **File `.env`**: Không commit file `.env` lên Git
2. **Database**: Đảm bảo MySQL đã chạy trước khi start Backend
3. **Port**: Backend mặc định port `5000`, Frontend mặc định port `5173`
4. **CORS**: Nếu gặp lỗi CORS, kiểm tra `allowedOrigins` trong `backend/server.js`

---

## TROUBLESHOOTING

### Lỗi kết nối Database

- Kiểm tra MySQL đã chạy chưa
- Kiểm tra `DATABASE_URL` trong `.env` đúng chưa
- Kiểm tra quyền truy cập database

### Lỗi Prisma

```bash
# Tạo lại Prisma Client
npx prisma generate

# Reset database (CẢNH BÁO: Xóa tất cả dữ liệu)
npx prisma migrate reset
```

### Lỗi Port đã được sử dụng

- Đổi `PORT` trong file `.env` của Backend
- Hoặc kill process đang dùng port đó

### Lỗi Frontend không kết nối được Backend

- Kiểm tra `VITE_API_URL` trong `.env` của Frontend
- Kiểm tra Backend đã chạy chưa
- Kiểm tra CORS settings trong Backend
