# 🚀 Checklist Deploy Production

## 📋 Trước khi deploy

### 1. Environment Variables

**Backend `.env`:**
```bash
# Database
DATABASE_URL="mysql://user:password@host:3306/db"

# JWT
JWT_SECRET=your_strong_secret_here
JWT_EXPIRES_IN=7d

# Server
PORT=5000
NODE_ENV=production

# Frontend URL (HTTPS)
FRONTEND_URL=https://yourdomain.com

# MoMo Production
MOMO_PARTNER_CODE=YOUR_PRODUCTION_PARTNER_CODE
MOMO_ACCESS_KEY=YOUR_PRODUCTION_ACCESS_KEY
MOMO_SECRET_KEY=YOUR_PRODUCTION_SECRET_KEY
MOMO_API_URL=https://payment.momo.vn/v2/gateway/api/create
MOMO_REDIRECT_URL=https://yourdomain.com/payment/result
MOMO_IPN_URL=https://yourdomain.com/api/payment/momo/callback
```

**Frontend `.env`:**
```bash
VITE_API_URL=https://api.yourdomain.com
```

### 2. MoMo Production Setup

- [ ] Đăng ký MoMo Business: https://business.momo.vn
- [ ] Cung cấp giấy tờ doanh nghiệp
- [ ] Chờ duyệt (3-5 ngày)
- [ ] Lấy production credentials
- [ ] Update vào `.env`
- [ ] Test trên production

### 3. Security Checklist

- [ ] Dùng HTTPS cho cả frontend và backend
- [ ] Credentials trong `.env`, không hardcode
- [ ] Verify signature từ MoMo
- [ ] Rate limiting cho API
- [ ] CORS config đúng domain
- [ ] Helmet.js cho security headers

### 4. Database

- [ ] Backup database
- [ ] Migration chạy thành công
- [ ] Index các bảng quan trọng
- [ ] Connection pool config

### 5. Testing

- [ ] Test thanh toán MoMo end-to-end
- [ ] Test callback từ MoMo
- [ ] Test redirect về frontend
- [ ] Test error cases
- [ ] Test với số tiền khác nhau

---

## 🔧 Deploy Steps

### Backend

```bash
# 1. Build
npm run build

# 2. Start production
npm run start

# 3. Check logs
pm2 logs
```

### Frontend

```bash
# 1. Build
npm run build

# 2. Deploy dist/ folder
# (Vercel/Netlify/etc)
```

---

## ✅ Sau khi deploy

- [ ] Test thanh toán thật với số tiền nhỏ
- [ ] Monitor logs backend
- [ ] Check database updates
- [ ] Test trên mobile
- [ ] Test trên các trình duyệt khác nhau

---

## 📞 Support

Nếu có vấn đề:
1. Check logs backend
2. Check MoMo dashboard
3. Contact MoMo support: https://business.momo.vn/support








