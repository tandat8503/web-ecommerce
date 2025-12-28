# Additional Features - Các Tính Năng Bổ Sung

Tài liệu này tổng hợp các tính năng bổ sung còn lại của hệ thống.

---

## 09. Wishlist - Danh Sách Yêu Thích

### Database Schema
```prisma
model Wishlist {
  id        Int      @id @default(autoincrement())
  userId    Int      @map("user_id")
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  productId Int      @map("product_id")
  product   Product  @relation(fields: [productId], references: [id], onDelete: Cascade)
  createdAt DateTime @default(now()) @map("created_at")
  
  @@unique([userId, productId])
  @@map("wishlists")
}
```

### Key Features
- Add/Remove products from wishlist
- View wishlist
- Move to cart
- Sync across devices
- Share wishlist

### API Endpoints
- `POST /wishlist` - Add to wishlist
- `GET /wishlist` - Get user wishlist
- `DELETE /wishlist/:productId` - Remove from wishlist
- `POST /wishlist/:productId/move-to-cart` - Move to cart

---

## 10. Notification System - Hệ Thống Thông Báo

### Database Schema
```prisma
model Notification {
  id        Int      @id @default(autoincrement())
  userId    Int      @map("user_id")
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  title     String   @db.VarChar(255)
  message   String   @db.Text
  type      NotificationType
  
  isRead    Boolean  @default(false) @map("is_read")
  readAt    DateTime? @map("read_at")
  
  createdAt DateTime @default(now()) @map("created_at")
  
  @@map("notifications")
}

enum NotificationType {
  ORDER
  PAYMENT
  SHIPPING
  REVIEW
  COUPON
  SYSTEM
}
```

### Key Features
- Real-time notifications (Socket.IO)
- Order status updates
- Payment confirmations
- Coupon notifications
- Mark as read/unread
- Delete notifications

### Socket.IO Events
```javascript
// Server
io.to(`user_${userId}`).emit('notification', {
  title: 'Đơn hàng đã được xác nhận',
  message: 'Đơn hàng #123 đang được xử lý',
  type: 'ORDER'
});

// Client
socket.on('notification', (data) => {
  toast.info(data.message);
  // Update notification list
});
```

---

## 11. Search & Filter - Tìm Kiếm & Lọc

### Key Features
- Full-text search (product name, description)
- Filter by category, brand, price range
- Sort options (price, rating, newest)
- Pagination
- Search suggestions

### API Endpoint
```javascript
GET /products/search?q=ban&category=1&minPrice=1000000&maxPrice=5000000&sort=price_asc&page=1&limit=20
```

### Implementation
```javascript
export const searchProducts = async (req, res) => {
  const { q, category, brand, minPrice, maxPrice, sort, page = 1, limit = 20 } = req.query;
  
  const where = {};
  
  if (q) {
    where.OR = [
      { name: { contains: q, mode: 'insensitive' } },
      { description: { contains: q, mode: 'insensitive' } }
    ];
  }
  
  if (category) where.categoryId = Number(category);
  if (brand) where.brandId = Number(brand);
  
  if (minPrice || maxPrice) {
    where.price = {};
    if (minPrice) where.price.gte = Number(minPrice);
    if (maxPrice) where.price.lte = Number(maxPrice);
  }
  
  const orderBy = {};
  if (sort === 'price_asc') orderBy.price = 'asc';
  else if (sort === 'price_desc') orderBy.price = 'desc';
  else if (sort === 'newest') orderBy.createdAt = 'desc';
  else orderBy.createdAt = 'desc';
  
  const products = await prisma.product.findMany({
    where,
    orderBy,
    skip: (page - 1) * limit,
    take: Number(limit)
  });
  
  return res.json({ success: true, data: products });
};
```

---

## 12. User Profile - Quản Lý Hồ Sơ

### Key Features
- View/Edit profile
- Change password
- Avatar upload
- Address management
- Order history
- Review history
- Wishlist
- Coupon list

### API Endpoints
- `GET /user/profile` - Get profile
- `PUT /user/profile` - Update profile
- `POST /user/change-password` - Change password
- `POST /user/upload-avatar` - Upload avatar
- `GET /user/addresses` - Get addresses
- `POST /user/addresses` - Add address
- `PUT /user/addresses/:id` - Update address
- `DELETE /user/addresses/:id` - Delete address

### Profile Update
```javascript
export const updateProfile = async (req, res) => {
  const userId = req.user.id;
  const { firstName, lastName, phone } = req.body;
  
  const user = await prisma.user.update({
    where: { id: userId },
    data: { firstName, lastName, phone }
  });
  
  return res.json({ success: true, data: user });
};
```

---

## 13. Admin Dashboard - Trang Quản Trị

### Key Features
- Statistics overview
  - Total revenue
  - Total orders
  - Total users
  - Total products
- Charts (revenue by month, orders by status)
- Recent orders
- Low stock alerts
- Pending reviews

### Statistics API
```javascript
export const getDashboardStats = async (req, res) => {
  const [
    totalRevenue,
    totalOrders,
    totalUsers,
    totalProducts,
    revenueByMonth,
    ordersByStatus
  ] = await Promise.all([
    prisma.order.aggregate({
      where: { paymentStatus: 'PAID' },
      _sum: { totalAmount: true }
    }),
    prisma.order.count(),
    prisma.user.count(),
    prisma.product.count(),
    prisma.order.groupBy({
      by: ['createdAt'],
      where: { paymentStatus: 'PAID' },
      _sum: { totalAmount: true }
    }),
    prisma.order.groupBy({
      by: ['status'],
      _count: true
    })
  ]);
  
  return res.json({
    success: true,
    data: {
      totalRevenue: totalRevenue._sum.totalAmount || 0,
      totalOrders,
      totalUsers,
      totalProducts,
      revenueByMonth,
      ordersByStatus
    }
  });
};
```

---

## 14. File Upload - Upload File

### Cloudinary Integration

#### Configuration
```env
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
```

#### Upload Service
```javascript
import { v2 as cloudinary } from 'cloudinary';
import streamifier from 'streamifier';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

export const uploadToCloudinary = (fileBuffer, folder = 'products') => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: `ecommerce/${folder}`,
        resource_type: 'auto',
        transformation: [
          { width: 1000, height: 1000, crop: 'limit' },
          { quality: 'auto:good' }
        ]
      },
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }
    );
    streamifier.createReadStream(fileBuffer).pipe(uploadStream);
  });
};

export const deleteFromCloudinary = async (publicId) => {
  return await cloudinary.uploader.destroy(publicId);
};
```

#### Multer Configuration
```javascript
import multer from 'multer';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only images allowed'));
    }
  }
});

// Single file
router.post('/upload', upload.single('image'), uploadHandler);

// Multiple files
router.post('/upload-multiple', upload.array('images', 5), uploadHandler);
```

---

## 15. Email Service - Dịch Vụ Email

### Nodemailer Configuration

```env
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
EMAIL_FROM=E-Commerce <noreply@ecommerce.com>
```

### Email Service
```javascript
import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransporter({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  }
});

export const sendEmail = async ({ to, subject, html }) => {
  try {
    await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to,
      subject,
      html
    });
    logger.info('Email sent', { to, subject });
  } catch (error) {
    logger.error('Send email error', { error: error.message });
    throw error;
  }
};
```

### Email Templates

#### Order Confirmation
```javascript
export const sendOrderConfirmation = async (order, user) => {
  const html = `
    <h1>Đơn hàng #${order.orderNumber} đã được xác nhận</h1>
    <p>Xin chào ${user.firstName},</p>
    <p>Cảm ơn bạn đã đặt hàng!</p>
    <h3>Chi tiết đơn hàng:</h3>
    <ul>
      ${order.items.map(item => `
        <li>${item.productName} x ${item.quantity} - ${item.subtotal.toLocaleString('vi-VN')}đ</li>
      `).join('')}
    </ul>
    <p><strong>Tổng cộng: ${order.totalAmount.toLocaleString('vi-VN')}đ</strong></p>
  `;
  
  await sendEmail({
    to: user.email,
    subject: `Xác nhận đơn hàng #${order.orderNumber}`,
    html
  });
};
```

#### Welcome Email
```javascript
export const sendWelcomeEmail = async (user) => {
  const html = `
    <h1>Chào mừng đến với E-Commerce!</h1>
    <p>Xin chào ${user.firstName},</p>
    <p>Cảm ơn bạn đã đăng ký tài khoản.</p>
    <p>Bạn nhận được mã giảm giá 200.000đ cho đơn hàng đầu tiên!</p>
    <p>Mã: <strong>WELCOME200K</strong></p>
  `;
  
  await sendEmail({
    to: user.email,
    subject: 'Chào mừng đến với E-Commerce',
    html
  });
};
```

#### Password Reset
```javascript
export const sendPasswordResetEmail = async (user, resetToken) => {
  const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
  
  const html = `
    <h1>Đặt lại mật khẩu</h1>
    <p>Xin chào ${user.firstName},</p>
    <p>Bạn đã yêu cầu đặt lại mật khẩu.</p>
    <p>Click vào link sau để đặt lại mật khẩu:</p>
    <a href="${resetUrl}">${resetUrl}</a>
    <p>Link này sẽ hết hạn sau 1 giờ.</p>
  `;
  
  await sendEmail({
    to: user.email,
    subject: 'Đặt lại mật khẩu',
    html
  });
};
```

---

## 🎯 Summary

Tổng hợp 15 chức năng chính của hệ thống E-Commerce:

1. ✅ **Authentication** - Xác thực (JWT, Google OAuth)
2. ✅ **Product Management** - Quản lý sản phẩm
3. ✅ **Shopping Cart** - Giỏ hàng
4. ✅ **Checkout & Order** - Thanh toán & Đơn hàng
5. ✅ **Coupon System** - Hệ thống mã giảm giá
6. ✅ **Shipping Integration** - Tích hợp vận chuyển (GHN)
7. ✅ **Payment Integration** - Tích hợp thanh toán (VNPay)
8. ✅ **Product Review** - Đánh giá sản phẩm
9. ✅ **Wishlist** - Danh sách yêu thích
10. ✅ **Notification System** - Hệ thống thông báo
11. ✅ **Search & Filter** - Tìm kiếm & Lọc
12. ✅ **User Profile** - Quản lý hồ sơ
13. ✅ **Admin Dashboard** - Trang quản trị
14. ✅ **File Upload** - Upload file (Cloudinary)
15. ✅ **Email Service** - Dịch vụ email (Nodemailer)

---

## 📚 Tài Liệu Tham Khảo

- **Prisma**: https://www.prisma.io/docs
- **Express**: https://expressjs.com/
- **React**: https://react.dev/
- **Zustand**: https://zustand-demo.pmnd.rs/
- **GHN API**: https://api.ghn.vn/home/docs/detail
- **VNPay**: https://sandbox.vnpayment.vn/apis/docs/
- **Cloudinary**: https://cloudinary.com/documentation
- **Nodemailer**: https://nodemailer.com/
- **Socket.IO**: https://socket.io/docs/

---

**Lưu ý**: Các tính năng 09-15 được tóm tắt trong file này. Nếu cần chi tiết hơn cho từng tính năng, vui lòng tham khảo code implementation trong project.
