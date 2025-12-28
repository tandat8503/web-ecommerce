# Remaining Features - Admin Dashboard, File Upload & Email Service

Tài liệu này bao gồm 3 tính năng cuối cùng của hệ thống.

---

# 13. Admin Dashboard - Trang Quản Trị

## 📋 Tổng Quan

Dashboard admin hiển thị:
- Thống kê tổng quan (doanh thu, đơn hàng, users, products)
- Biểu đồ doanh thu theo tháng
- Biểu đồ đơn hàng theo trạng thái
- Đơn hàng gần đây
- Sản phẩm sắp hết hàng
- Đánh giá chờ duyệt

## 🔧 Backend Implementation

### Controller: `controller/adminDashboardController.js`

```javascript
import prisma from '../config/prisma.js';
import logger from '../utils/logger.js';

export const getDashboardStats = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const dateFilter = {};
    if (startDate && endDate) {
      dateFilter.createdAt = {
        gte: new Date(startDate),
        lte: new Date(endDate)
      };
    }

    // Get statistics
    const [
      totalRevenue,
      totalOrders,
      totalUsers,
      totalProducts,
      recentOrders,
      lowStockProducts,
      pendingReviews,
      ordersByStatus,
      revenueByMonth
    ] = await Promise.all([
      // Total revenue (paid orders only)
      prisma.order.aggregate({
        where: { 
          paymentStatus: 'PAID',
          ...dateFilter
        },
        _sum: { totalAmount: true }
      }),
      
      // Total orders
      prisma.order.count({ where: dateFilter }),
      
      // Total users
      prisma.user.count({
        where: { role: 'CUSTOMER' }
      }),
      
      // Total products
      prisma.product.count({
        where: { isActive: true }
      }),
      
      // Recent orders
      prisma.order.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              firstName: true,
              lastName: true,
              email: true
            }
          }
        }
      }),
      
      // Low stock products
      prisma.product.findMany({
        where: {
          isActive: true,
          stockQuantity: { lte: 10 }
        },
        take: 10,
        orderBy: { stockQuantity: 'asc' },
        select: {
          id: true,
          name: true,
          sku: true,
          stockQuantity: true,
          primaryImage: true
        }
      }),
      
      // Pending reviews
      prisma.productReview.count({
        where: { isApproved: false }
      }),
      
      // Orders by status
      prisma.order.groupBy({
        by: ['status'],
        _count: true
      }),
      
      // Revenue by month (last 12 months)
      prisma.$queryRaw`
        SELECT 
          DATE_FORMAT(created_at, '%Y-%m') as month,
          SUM(total_amount) as revenue,
          COUNT(*) as orders
        FROM orders
        WHERE payment_status = 'PAID'
          AND created_at >= DATE_SUB(NOW(), INTERVAL 12 MONTH)
        GROUP BY month
        ORDER BY month ASC
      `
    ]);

    return res.json({
      success: true,
      data: {
        overview: {
          totalRevenue: totalRevenue._sum.totalAmount || 0,
          totalOrders,
          totalUsers,
          totalProducts
        },
        recentOrders,
        lowStockProducts,
        pendingReviews,
        charts: {
          ordersByStatus,
          revenueByMonth
        }
      }
    });
  } catch (error) {
    logger.error('Get dashboard stats error', { error: error.message });
    return res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy thống kê'
    });
  }
};
```

## 🎨 Frontend Implementation

### Dashboard Page: `src/pages/admin/Dashboard.jsx`

```jsx
import { useEffect, useState } from 'react';
import { getDashboardStats } from '@/api/admin';
import { DollarSign, ShoppingBag, Users, Package } from 'lucide-react';
import { Line, Pie } from 'react-chartjs-2';

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await getDashboardStats();
      setStats(response.data.data);
    } catch (error) {
      console.error('Fetch stats error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Đang tải...</div>;

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-8">Dashboard</h1>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="Tổng Doanh Thu"
          value={stats.overview.totalRevenue.toLocaleString('vi-VN') + 'đ'}
          icon={DollarSign}
          color="green"
        />
        <StatCard
          title="Tổng Đơn Hàng"
          value={stats.overview.totalOrders}
          icon={ShoppingBag}
          color="blue"
        />
        <StatCard
          title="Tổng Khách Hàng"
          value={stats.overview.totalUsers}
          icon={Users}
          color="purple"
        />
        <StatCard
          title="Tổng Sản Phẩm"
          value={stats.overview.totalProducts}
          icon={Package}
          color="orange"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg border">
          <h3 className="font-bold mb-4">Doanh Thu 12 Tháng Gần Đây</h3>
          <Line data={revenueChartData} />
        </div>
        
        <div className="bg-white p-6 rounded-lg border">
          <h3 className="font-bold mb-4">Đơn Hàng Theo Trạng Thái</h3>
          <Pie data={orderStatusChartData} />
        </div>
      </div>

      {/* Recent Orders & Low Stock */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RecentOrders orders={stats.recentOrders} />
        <LowStockProducts products={stats.lowStockProducts} />
      </div>
    </div>
  );
}

function StatCard({ title, value, icon: Icon, color }) {
  const colorClasses = {
    green: 'bg-green-100 text-green-600',
    blue: 'bg-blue-100 text-blue-600',
    purple: 'bg-purple-100 text-purple-600',
    orange: 'bg-orange-100 text-orange-600'
  };

  return (
    <div className="bg-white p-6 rounded-lg border">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-600 text-sm">{title}</p>
          <p className="text-2xl font-bold mt-2">{value}</p>
        </div>
        <div className={`p-3 rounded-full ${colorClasses[color]}`}>
          <Icon size={24} />
        </div>
      </div>
    </div>
  );
}
```

---

# 14. File Upload - Cloudinary Integration

## 📋 Tổng Quan

Hệ thống upload file sử dụng Cloudinary:
- Upload hình ảnh sản phẩm
- Upload avatar
- Upload review images
- Image optimization
- Delete images

## 🔧 Configuration

### Environment Variables
```env
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
```

## 🔧 Backend Implementation

### Service: `services/cloudinaryService.js`

```javascript
import { v2 as cloudinary } from 'cloudinary';
import streamifier from 'streamifier';
import logger from '../utils/logger.js';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

/**
 * Upload image to Cloudinary
 * @param {Buffer} fileBuffer - File buffer from multer
 * @param {String} folder - Folder name (products, avatars, reviews)
 * @returns {Promise<Object>} Upload result
 */
export const uploadToCloudinary = (fileBuffer, folder = 'products') => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: `ecommerce/${folder}`,
        resource_type: 'auto',
        transformation: [
          { width: 1000, height: 1000, crop: 'limit' },
          { quality: 'auto:good' },
          { fetch_format: 'auto' }
        ]
      },
      (error, result) => {
        if (error) {
          logger.error('Cloudinary upload error', { error: error.message });
          reject(error);
        } else {
          logger.info('Image uploaded to Cloudinary', { 
            publicId: result.public_id,
            url: result.secure_url 
          });
          resolve(result);
        }
      }
    );

    streamifier.createReadStream(fileBuffer).pipe(uploadStream);
  });
};

/**
 * Delete image from Cloudinary
 * @param {String} publicId - Public ID of image
 * @returns {Promise<Object>} Delete result
 */
export const deleteFromCloudinary = async (publicId) => {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    logger.info('Image deleted from Cloudinary', { publicId });
    return result;
  } catch (error) {
    logger.error('Cloudinary delete error', { error: error.message, publicId });
    throw error;
  }
};

/**
 * Upload multiple images
 * @param {Array<Buffer>} fileBuffers - Array of file buffers
 * @param {String} folder - Folder name
 * @returns {Promise<Array>} Array of upload results
 */
export const uploadMultipleToCloudinary = async (fileBuffers, folder = 'products') => {
  const uploadPromises = fileBuffers.map(buffer => uploadToCloudinary(buffer, folder));
  return await Promise.all(uploadPromises);
};
```

### Multer Configuration: `middleware/upload.js`

```javascript
import multer from 'multer';

// Memory storage for Cloudinary
const storage = multer.memoryStorage();

// File filter
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Chỉ chấp nhận file hình ảnh'), false);
  }
};

// Single file upload
export const uploadSingle = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter
}).single('image');

// Multiple files upload
export const uploadMultiple = (fieldName, maxCount = 5) => {
  return multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter
  }).array(fieldName, maxCount);
};
```

## 🎨 Frontend Implementation

### Image Upload Component: `src/components/ImageUpload.jsx`

```jsx
import { useState } from 'react';
import { Upload, X } from 'lucide-react';

export default function ImageUpload({ 
  multiple = false, 
  maxFiles = 5,
  value = [],
  onChange 
}) {
  const [previews, setPreviews] = useState(value);

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    
    if (multiple && files.length + previews.length > maxFiles) {
      alert(`Tối đa ${maxFiles} hình ảnh`);
      return;
    }

    const newPreviews = files.map(file => ({
      file,
      preview: URL.createObjectURL(file)
    }));

    const updated = multiple ? [...previews, ...newPreviews] : newPreviews;
    setPreviews(updated);
    onChange(updated.map(p => p.file));
  };

  const handleRemove = (index) => {
    const updated = previews.filter((_, i) => i !== index);
    setPreviews(updated);
    onChange(updated.map(p => p.file));
  };

  return (
    <div>
      <div className="grid grid-cols-4 gap-4 mb-4">
        {previews.map((item, index) => (
          <div key={index} className="relative">
            <img
              src={item.preview}
              alt={`Preview ${index + 1}`}
              className="w-full h-32 object-cover rounded border"
            />
            <button
              type="button"
              onClick={() => handleRemove(index)}
              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1"
            >
              <X size={16} />
            </button>
          </div>
        ))}
      </div>

      <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded cursor-pointer hover:bg-gray-50">
        <Upload size={32} className="text-gray-400 mb-2" />
        <span className="text-sm text-gray-600">
          {multiple ? `Chọn tối đa ${maxFiles} hình ảnh` : 'Chọn hình ảnh'}
        </span>
        <input
          type="file"
          accept="image/*"
          multiple={multiple}
          onChange={handleFileChange}
          className="hidden"
        />
      </label>
    </div>
  );
}
```

---

# 15. Email Service - Nodemailer Integration

## 📋 Tổng Quan

Hệ thống gửi email tự động:
- Welcome email (đăng ký)
- Order confirmation
- Order status updates
- Password reset
- Review reminder

## 🔧 Configuration

### Environment Variables
```env
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
EMAIL_FROM=E-Commerce <noreply@ecommerce.com>
```

### Gmail App Password
1. Vào Google Account → Security
2. Enable 2-Step Verification
3. Generate App Password
4. Copy password vào `EMAIL_PASSWORD`

## 🔧 Backend Implementation

### Service: `services/emailService.js`

```javascript
import nodemailer from 'nodemailer';
import logger from '../utils/logger.js';

// Create transporter
const transporter = nodemailer.createTransporter({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  }
});

/**
 * Send email
 */
export const sendEmail = async ({ to, subject, html }) => {
  try {
    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to,
      subject,
      html
    });

    logger.info('Email sent', { to, subject, messageId: info.messageId });
    return { success: true, messageId: info.messageId };
  } catch (error) {
    logger.error('Send email error', { error: error.message, to, subject });
    throw error;
  }
};

/**
 * Send welcome email
 */
export const sendWelcomeEmail = async (user) => {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #3b82f6; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background: #f9fafb; }
        .button { display: inline-block; padding: 12px 24px; background: #3b82f6; color: white; text-decoration: none; border-radius: 5px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Chào Mừng Đến Với E-Commerce!</h1>
        </div>
        <div class="content">
          <p>Xin chào <strong>${user.firstName} ${user.lastName}</strong>,</p>
          <p>Cảm ơn bạn đã đăng ký tài khoản tại E-Commerce!</p>
          <p>Bạn nhận được mã giảm giá <strong>200.000đ</strong> cho đơn hàng đầu tiên:</p>
          <p style="text-align: center; font-size: 24px; color: #3b82f6; font-weight: bold;">WELCOME200K</p>
          <p style="text-align: center;">
            <a href="${process.env.FRONTEND_URL}/products" class="button">Khám Phá Sản Phẩm</a>
          </p>
        </div>
      </div>
    </body>
    </html>
  `;

  await sendEmail({
    to: user.email,
    subject: 'Chào mừng đến với E-Commerce',
    html
  });
};

/**
 * Send order confirmation email
 */
export const sendOrderConfirmationEmail = async (order, user) => {
  const html = `
    <!DOCTYPE html>
    <html>
    <body>
      <div class="container">
        <h1>Đơn Hàng #${order.orderNumber} Đã Được Xác Nhận</h1>
        <p>Xin chào ${user.firstName},</p>
        <p>Cảm ơn bạn đã đặt hàng!</p>
        
        <h3>Chi Tiết Đơn Hàng:</h3>
        <table style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr style="background: #f3f4f6;">
              <th style="padding: 10px; text-align: left;">Sản phẩm</th>
              <th style="padding: 10px; text-align: right;">SL</th>
              <th style="padding: 10px; text-align: right;">Giá</th>
            </tr>
          </thead>
          <tbody>
            ${order.items.map(item => `
              <tr>
                <td style="padding: 10px;">${item.productName}</td>
                <td style="padding: 10px; text-align: right;">${item.quantity}</td>
                <td style="padding: 10px; text-align: right;">${item.subtotal.toLocaleString('vi-VN')}đ</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        
        <p><strong>Tổng cộng: ${order.totalAmount.toLocaleString('vi-VN')}đ</strong></p>
        
        <p>Chúng tôi sẽ giao hàng đến:</p>
        <p>${order.shippingAddress}<br>${order.ward}, ${order.district}, ${order.city}</p>
      </div>
    </body>
    </html>
  `;

  await sendEmail({
    to: user.email,
    subject: `Xác nhận đơn hàng #${order.orderNumber}`,
    html
  });
};

/**
 * Send password reset email
 */
export const sendPasswordResetEmail = async (user, resetToken) => {
  const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
  
  const html = `
    <!DOCTYPE html>
    <html>
    <body>
      <div class="container">
        <h1>Đặt Lại Mật Khẩu</h1>
        <p>Xin chào ${user.firstName},</p>
        <p>Bạn đã yêu cầu đặt lại mật khẩu.</p>
        <p>Click vào nút bên dưới để đặt lại mật khẩu:</p>
        <p style="text-align: center;">
          <a href="${resetUrl}" class="button">Đặt Lại Mật Khẩu</a>
        </p>
        <p>Link này sẽ hết hạn sau 1 giờ.</p>
        <p>Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này.</p>
      </div>
    </body>
    </html>
  `;

  await sendEmail({
    to: user.email,
    subject: 'Đặt lại mật khẩu',
    html
  });
};
```

### Integration in Controllers

```javascript
// In authController.js
import { sendWelcomeEmail } from '../services/emailService.js';

export const register = async (req, res) => {
  // ... create user logic
  
  // Send welcome email (non-blocking)
  sendWelcomeEmail(newUser).catch(err => {
    logger.error('Failed to send welcome email', { userId: newUser.id });
  });
  
  // ... return response
};

// In orderController.js
import { sendOrderConfirmationEmail } from '../services/emailService.js';

export const createOrder = async (req, res) => {
  // ... create order logic
  
  // Send confirmation email (non-blocking)
  sendOrderConfirmationEmail(order, user).catch(err => {
    logger.error('Failed to send order confirmation email', { orderId: order.id });
  });
  
  // ... return response
};
```

---

## ✅ Final Checklist

### Admin Dashboard
- [x] Statistics overview
- [x] Revenue charts
- [x] Order status charts
- [x] Recent orders
- [x] Low stock alerts
- [x] Pending reviews

### File Upload
- [x] Cloudinary integration
- [x] Image optimization
- [x] Multiple file upload
- [x] Delete images
- [x] Preview images

### Email Service
- [x] Nodemailer setup
- [x] Welcome email
- [x] Order confirmation
- [x] Password reset
- [x] HTML templates
- [x] Non-blocking sends

---

**🎉 Hoàn Thành Tất Cả 15 Tính Năng!**
