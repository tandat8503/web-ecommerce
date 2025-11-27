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
```

**Frontend `.env`:**
```bash
VITE_API_URL=https://api.yourdomain.com
```

### 2. Security Checklist

- [ ] Dùng HTTPS cho cả frontend và backend
- [ ] Credentials trong `.env`, không hardcode
- [ ] Rate limiting cho API
- [ ] CORS config đúng domain
- [ ] Helmet.js cho security headers

### 4. Database

- [ ] Backup database
- [ ] Migration chạy thành công
- [ ] Index các bảng quan trọng
- [ ] Connection pool config

### 5. Testing

- [ ] Test thanh toán VNPay end-to-end
- [ ] Test callback từ VNPay
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
2. Check VNPay merchant portal
3. Contact VNPay support: support.vnpayment@vnpay.vn
















