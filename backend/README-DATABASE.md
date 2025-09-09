# 🗄️ HƯỚNG DẪN DATABASE - E-COMMERCE BACKEND

## ✅ ĐÃ HOÀN THÀNH

### 1. **Prisma Schema** ✅
- ✅ Đã tạo schema.prisma với đầy đủ các bảng
- ✅ Đã cấu hình SQLite cho development
- ✅ Đã sửa các lỗi relation và data types

### 2. **Database Setup** ✅
- ✅ Đã tạo database SQLite (dev.db)
- ✅ Đã chạy migration thành công
- ✅ Đã tạo Prisma Client

### 3. **Seed Data** ✅
- ✅ Đã tạo dữ liệu mẫu
- ✅ Admin user: `admin@ecommerce.com` / `admin123`
- ✅ 3 sản phẩm mẫu (iPhone 15, Galaxy S24, Nike Air Max)
- ✅ 3 danh mục (Điện tử, Thời trang, Nhà cửa)
- ✅ 3 thương hiệu (Apple, Samsung, Nike)
- ✅ 2 banners quảng cáo
- ✅ 3 cài đặt hệ thống

## 🚀 CÁCH SỬ DỤNG

### **1. Kiểm tra Database**
```bash
# Chạy test database
node test-db.js

# Mở Prisma Studio (GUI)
npx prisma studio
```

### **2. Sử dụng Prisma Client**
```javascript
import prisma from './lib/prisma.js';

// Lấy tất cả sản phẩm
const products = await prisma.product.findMany({
  include: {
    category: true,
    brand: true,
    images: true
  }
});

// Tạo user mới
const user = await prisma.user.create({
  data: {
    email: 'user@example.com',
    firstName: 'John',
    lastName: 'Doe'
  }
});
```

### **3. Chạy Seed Data**
```bash
# Chạy seed data
npx prisma db seed

# Hoặc
npm run seed
```

### **4. Tạo Migration Mới**
```bash
# Khi thay đổi schema
npx prisma migrate dev --name your_migration_name
```

## 📊 CẤU TRÚC DATABASE

### **Bảng Chính:**
- `users` - Người dùng
- `admin_users` - Quản trị viên
- `products` - Sản phẩm
- `categories` - Danh mục
- `brands` - Thương hiệu
- `orders` - Đơn hàng
- `shopping_cart` - Giỏ hàng
- `wishlist` - Danh sách yêu thích

### **Bảng Phụ:**
- `product_images` - Ảnh sản phẩm
- `product_specifications` - Thông số kỹ thuật
- `product_variants` - Biến thể sản phẩm
- `product_comments` - Bình luận
- `product_reviews` - Đánh giá
- `addresses` - Địa chỉ
- `coupons` - Mã giảm giá
- `payments` - Thanh toán
- `banners` - Banner quảng cáo
- `notifications` - Thông báo
- `settings` - Cài đặt hệ thống

## 🔧 CẤU HÌNH

### **File .env:**
```env
# Database
DATABASE_URL="file:./dev.db"

# JWT
JWT_SECRET="your-super-secret-jwt-key"
JWT_REFRESH_SECRET="your-super-secret-refresh-key"

# Server
PORT=5000
NODE_ENV="development"
```

### **File package.json:**
```json
{
  "prisma": {
    "seed": "node prisma/seed.js"
  }
}
```

## 🎯 CÁC BƯỚC TIẾP THEO

### **1. Tạo API Endpoints**
- ✅ User authentication (login/register)
- ✅ Product CRUD
- ✅ Category management
- ✅ Order processing
- ✅ Shopping cart
- ✅ Payment integration

### **2. Middleware & Validation**
- ✅ JWT authentication
- ✅ Input validation
- ✅ Error handling
- ✅ Rate limiting

### **3. File Upload**
- ✅ Cloudinary integration
- ✅ Image processing
- ✅ File validation

## 🐛 TROUBLESHOOTING

### **Lỗi thường gặp:**

1. **Database connection failed:**
   ```bash
   # Kiểm tra file .env
   cat .env
   
   # Kiểm tra database file
   ls -la dev.db
   ```

2. **Migration failed:**
   ```bash
   # Reset database
   rm -rf prisma/migrations
   rm dev.db
   npx prisma migrate dev --name init
   ```

3. **Seed data failed:**
   ```bash
   # Chạy lại seed
   npx prisma db seed
   ```

## 📝 GHI CHÚ

- Database hiện tại sử dụng SQLite cho development
- Có thể chuyển sang MySQL/PostgreSQL cho production
- Tất cả dữ liệu được lưu trong file `dev.db`
- Prisma Studio chạy trên `http://localhost:5555`

## 🎉 KẾT QUẢ

✅ **Database đã sẵn sàng sử dụng!**
- 3 sản phẩm mẫu
- 1 admin user
- 3 danh mục
- 3 thương hiệu
- 2 banners
- 3 cài đặt hệ thống

Bạn có thể bắt đầu phát triển API endpoints ngay bây giờ!


