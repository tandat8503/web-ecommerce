# Product Review System - Hệ Thống Đánh Giá Sản Phẩm

## 📋 Tổng Quan

Hệ thống đánh giá sản phẩm bao gồm:
- Đánh giá với rating (1-5 sao)
- Upload hình ảnh review
- Chỉ cho phép review sau khi mua hàng
- Tặng mã giảm giá cho review đầu tiên
- Admin moderation (duyệt/xóa review)
- Hiển thị review trên trang sản phẩm
- Tính rating trung bình

---

## 🗄️ Database Schema

```prisma
model ProductReview {
  id          Int      @id @default(autoincrement())
  userId      Int      @map("user_id")
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  productId   Int      @map("product_id")
  product     Product  @relation(fields: [productId], references: [id], onDelete: Cascade)
  
  orderId     Int?     @map("order_id")
  order       Order?   @relation(fields: [orderId], references: [id])
  
  rating      Int      // 1-5 stars
  title       String?  @db.VarChar(255)
  comment     String   @db.Text
  
  // Images
  images      ReviewImage[]
  
  // Moderation
  isApproved  Boolean  @default(false) @map("is_approved")
  approvedAt  DateTime? @map("approved_at")
  
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")
  
  @@unique([userId, productId]) // One review per user per product
  @@map("product_reviews")
  @@index([productId])
  @@index([userId])
}

model ReviewImage {
  id        Int           @id @default(autoincrement())
  reviewId  Int           @map("review_id")
  review    ProductReview @relation(fields: [reviewId], references: [id], onDelete: Cascade)
  
  imageUrl  String        @map("image_url")
  publicId  String        @map("public_id")
  
  createdAt DateTime      @default(now()) @map("created_at")
  
  @@map("review_images")
  @@index([reviewId])
}
```

---

## 🔧 Backend Implementation

### 1. Controller: `controller/productReviewController.js`

#### Create Review
```javascript
import { grantFirstReviewCoupon } from '../services/couponService.js';
import { uploadToCloudinary } from '../services/cloudinaryService.js';

export const createReview = async (req, res) => {
  try {
    const userId = req.user.id;
    const { productId, orderId, rating, title, comment } = req.body;
    const files = req.files; // Multer multiple files

    // Validate required fields
    if (!productId || !rating || !comment) {
      return res.status(400).json({
        success: false,
        message: 'Thiếu thông tin bắt buộc'
      });
    }

    // Validate rating
    if (rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        message: 'Rating phải từ 1-5 sao'
      });
    }

    // Check if product exists
    const product = await prisma.product.findUnique({
      where: { id: Number(productId) }
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy sản phẩm'
      });
    }

    // Check if user has purchased this product
    const hasPurchased = await prisma.orderItem.findFirst({
      where: {
        productId: Number(productId),
        order: {
          userId,
          status: 'DELIVERED'
        }
      }
    });

    if (!hasPurchased) {
      return res.status(403).json({
        success: false,
        message: 'Bạn chỉ có thể đánh giá sản phẩm đã mua'
      });
    }

    // Check if already reviewed
    const existingReview = await prisma.productReview.findUnique({
      where: {
        userId_productId: {
          userId,
          productId: Number(productId)
        }
      }
    });

    if (existingReview) {
      return res.status(409).json({
        success: false,
        message: 'Bạn đã đánh giá sản phẩm này rồi'
      });
    }

    // Upload images if provided
    const uploadedImages = [];
    if (files && files.length > 0) {
      for (const file of files) {
        const result = await uploadToCloudinary(file.buffer, 'reviews');
        uploadedImages.push({
          imageUrl: result.secure_url,
          publicId: result.public_id
        });
      }
    }

    // Create review
    const review = await prisma.productReview.create({
      data: {
        userId,
        productId: Number(productId),
        orderId: orderId ? Number(orderId) : null,
        rating: Number(rating),
        title,
        comment,
        isApproved: false, // Requires admin approval
        images: {
          create: uploadedImages
        }
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatar: true
          }
        },
        images: true
      }
    });

    // Grant first review coupon (async, non-blocking)
    grantFirstReviewCoupon(userId).catch(err => {
      logger.error('Failed to grant first review coupon', { userId });
    });

    // Create notification
    await prisma.notification.create({
      data: {
        userId,
        title: 'Cảm ơn đánh giá của bạn!',
        message: 'Đánh giá của bạn đang chờ duyệt. Bạn nhận được 100 coin!',
        type: 'REVIEW'
      }
    });

    logger.info('Review created', { reviewId: review.id, userId, productId });

    return res.status(201).json({
      success: true,
      message: 'Đánh giá thành công. Đang chờ duyệt.',
      data: review
    });
  } catch (error) {
    logger.error('Create review error', { error: error.message });
    return res.status(500).json({
      success: false,
      message: 'Lỗi khi tạo đánh giá'
    });
  }
};
```

#### Get Product Reviews
```javascript
export const getProductReviews = async (req, res) => {
  try {
    const { productId } = req.params;
    const { page = 1, limit = 10, rating } = req.query;

    const skip = (Number(page) - 1) * Number(limit);
    const where = {
      productId: Number(productId),
      isApproved: true // Only show approved reviews
    };

    if (rating) {
      where.rating = Number(rating);
    }

    const [reviews, total] = await Promise.all([
      prisma.productReview.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              avatar: true
            }
          },
          images: true
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: Number(limit)
      }),
      prisma.productReview.count({ where })
    ]);

    // Calculate rating statistics
    const ratingStats = await prisma.productReview.groupBy({
      by: ['rating'],
      where: {
        productId: Number(productId),
        isApproved: true
      },
      _count: true
    });

    const totalReviews = ratingStats.reduce((sum, stat) => sum + stat._count, 0);
    const averageRating = totalReviews > 0
      ? ratingStats.reduce((sum, stat) => sum + (stat.rating * stat._count), 0) / totalReviews
      : 0;

    return res.json({
      success: true,
      data: {
        reviews,
        statistics: {
          averageRating: Math.round(averageRating * 10) / 10,
          totalReviews,
          ratingDistribution: ratingStats
        },
        pagination: {
          total,
          page: Number(page),
          limit: Number(limit),
          totalPages: Math.ceil(total / Number(limit))
        }
      }
    });
  } catch (error) {
    logger.error('Get product reviews error', { error: error.message });
    return res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy đánh giá'
    });
  }
};
```

#### Get User Reviews
```javascript
export const getUserReviews = async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 10 } = req.query;

    const skip = (Number(page) - 1) * Number(limit);

    const [reviews, total] = await Promise.all([
      prisma.productReview.findMany({
        where: { userId },
        include: {
          product: {
            select: {
              id: true,
              name: true,
              slug: true,
              primaryImage: true
            }
          },
          images: true
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: Number(limit)
      }),
      prisma.productReview.count({ where: { userId } })
    ]);

    return res.json({
      success: true,
      data: {
        reviews,
        pagination: {
          total,
          page: Number(page),
          limit: Number(limit),
          totalPages: Math.ceil(total / Number(limit))
        }
      }
    });
  } catch (error) {
    logger.error('Get user reviews error', { error: error.message });
    return res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy danh sách đánh giá'
    });
  }
};
```

### 2. Admin Controller: `controller/adminReviewController.js`

#### Approve Review
```javascript
export const approveReview = async (req, res) => {
  try {
    const { id } = req.params;

    const review = await prisma.productReview.update({
      where: { id: Number(id) },
      data: {
        isApproved: true,
        approvedAt: new Date()
      },
      include: {
        user: true,
        product: true
      }
    });

    // Notify user
    await prisma.notification.create({
      data: {
        userId: review.userId,
        title: 'Đánh giá đã được duyệt',
        message: `Đánh giá của bạn cho sản phẩm "${review.product.name}" đã được duyệt`,
        type: 'REVIEW'
      }
    });

    logger.info('Review approved', { reviewId: review.id });

    return res.json({
      success: true,
      message: 'Duyệt đánh giá thành công',
      data: review
    });
  } catch (error) {
    logger.error('Approve review error', { error: error.message });
    return res.status(500).json({
      success: false,
      message: 'Lỗi khi duyệt đánh giá'
    });
  }
};
```

#### Delete Review
```javascript
export const deleteReview = async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.productReview.delete({
      where: { id: Number(id) }
    });

    logger.info('Review deleted', { reviewId: Number(id) });

    return res.json({
      success: true,
      message: 'Xóa đánh giá thành công'
    });
  } catch (error) {
    logger.error('Delete review error', { error: error.message });
    return res.status(500).json({
      success: false,
      message: 'Lỗi khi xóa đánh giá'
    });
  }
};
```

### 3. Routes: `routes/reviewRoutes.js`

```javascript
import express from 'express';
import multer from 'multer';
import {
  createReview,
  getProductReviews,
  getUserReviews
} from '../controller/productReviewController.js';
import { authenticate } from '../middleware/authMiddleware.js';

const router = express.Router();

// Multer for image upload
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB per file
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Chỉ chấp nhận file hình ảnh'));
    }
  }
});

router.post('/', authenticate, upload.array('images', 5), createReview);
router.get('/product/:productId', getProductReviews);
router.get('/my-reviews', authenticate, getUserReviews);

export default router;
```

---

## 🎨 Frontend Implementation

### 1. API Service: `src/api/reviews.js`

```javascript
import axiosClient from './axiosClient';

export const createReview = (data) => {
  return axiosClient.post('/reviews', data, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
};

export const getProductReviews = (productId, params) => {
  return axiosClient.get(`/reviews/product/${productId}`, { params });
};

export const getUserReviews = (params) => {
  return axiosClient.get('/reviews/my-reviews', { params });
};
```

### 2. Review Form Component

```jsx
import { useState } from 'react';
import { Star } from 'lucide-react';
import { createReview } from '@/api/reviews';

export default function ReviewForm({ productId, orderId, onSuccess }) {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [title, setTitle] = useState('');
  const [comment, setComment] = useState('');
  const [images, setImages] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);
    if (files.length + images.length > 5) {
      toast.error('Tối đa 5 hình ảnh');
      return;
    }
    setImages([...images, ...files]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (rating === 0) {
      toast.error('Vui lòng chọn số sao');
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('productId', productId);
      if (orderId) formData.append('orderId', orderId);
      formData.append('rating', rating);
      if (title) formData.append('title', title);
      formData.append('comment', comment);
      
      images.forEach(image => {
        formData.append('images', image);
      });

      await createReview(formData);
      toast.success('Đánh giá thành công! Đang chờ duyệt.');
      onSuccess?.();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Lỗi khi đánh giá');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Rating Stars */}
      <div>
        <label className="block mb-2 font-medium">Đánh giá của bạn *</label>
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => setRating(star)}
              onMouseEnter={() => setHoverRating(star)}
              onMouseLeave={() => setHoverRating(0)}
              className="focus:outline-none"
            >
              <Star
                size={32}
                className={`${
                  star <= (hoverRating || rating)
                    ? 'fill-yellow-400 text-yellow-400'
                    : 'text-gray-300'
                }`}
              />
            </button>
          ))}
        </div>
      </div>

      {/* Title */}
      <div>
        <label className="block mb-2 font-medium">Tiêu đề</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Tóm tắt đánh giá của bạn"
          className="w-full border px-4 py-2 rounded"
        />
      </div>

      {/* Comment */}
      <div>
        <label className="block mb-2 font-medium">Nhận xét *</label>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Chia sẻ trải nghiệm của bạn về sản phẩm..."
          rows={4}
          required
          className="w-full border px-4 py-2 rounded"
        />
      </div>

      {/* Images */}
      <div>
        <label className="block mb-2 font-medium">Hình ảnh (Tối đa 5)</label>
        <input
          type="file"
          accept="image/*"
          multiple
          onChange={handleImageChange}
          className="mb-2"
        />
        {images.length > 0 && (
          <div className="flex gap-2 flex-wrap">
            {images.map((img, idx) => (
              <div key={idx} className="relative">
                <img
                  src={URL.createObjectURL(img)}
                  alt={`Preview ${idx + 1}`}
                  className="w-20 h-20 object-cover rounded"
                />
                <button
                  type="button"
                  onClick={() => setImages(images.filter((_, i) => i !== idx))}
                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:opacity-50"
      >
        {submitting ? 'Đang gửi...' : 'Gửi Đánh Giá'}
      </button>
    </form>
  );
}
```

### 3. Review List Component

```jsx
import { useState, useEffect } from 'react';
import { Star } from 'lucide-react';
import { getProductReviews } from '@/api/reviews';

export default function ReviewList({ productId }) {
  const [reviews, setReviews] = useState([]);
  const [statistics, setStatistics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReviews = async () => {
      try {
        const response = await getProductReviews(productId);
        setReviews(response.data.data.reviews);
        setStatistics(response.data.data.statistics);
      } catch (error) {
        toast.error('Lỗi khi tải đánh giá');
      } finally {
        setLoading(false);
      }
    };
    fetchReviews();
  }, [productId]);

  if (loading) return <div>Đang tải...</div>;

  return (
    <div className="space-y-6">
      {/* Statistics */}
      {statistics && (
        <div className="border rounded p-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="text-4xl font-bold">{statistics.averageRating}</div>
            <div>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    size={20}
                    className={
                      star <= Math.round(statistics.averageRating)
                        ? 'fill-yellow-400 text-yellow-400'
                        : 'text-gray-300'
                    }
                  />
                ))}
              </div>
              <div className="text-sm text-gray-600">
                {statistics.totalReviews} đánh giá
              </div>
            </div>
          </div>

          {/* Rating Distribution */}
          <div className="space-y-2">
            {[5, 4, 3, 2, 1].map((rating) => {
              const count = statistics.ratingDistribution.find(
                (r) => r.rating === rating
              )?._count || 0;
              const percentage = (count / statistics.totalReviews) * 100;

              return (
                <div key={rating} className="flex items-center gap-2">
                  <span className="text-sm w-8">{rating} ⭐</span>
                  <div className="flex-1 bg-gray-200 rounded h-2">
                    <div
                      className="bg-yellow-400 h-2 rounded"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <span className="text-sm text-gray-600 w-12">{count}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Reviews */}
      <div className="space-y-4">
        {reviews.map((review) => (
          <div key={review.id} className="border rounded p-4">
            <div className="flex items-start gap-4">
              <img
                src={review.user.avatar || '/default-avatar.png'}
                alt={review.user.firstName}
                className="w-12 h-12 rounded-full"
              />
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-semibold">
                    {review.user.firstName} {review.user.lastName}
                  </span>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        size={16}
                        className={
                          star <= review.rating
                            ? 'fill-yellow-400 text-yellow-400'
                            : 'text-gray-300'
                        }
                      />
                    ))}
                  </div>
                </div>

                {review.title && (
                  <h4 className="font-semibold mb-2">{review.title}</h4>
                )}

                <p className="text-gray-700 mb-3">{review.comment}</p>

                {review.images.length > 0 && (
                  <div className="flex gap-2 mb-3">
                    {review.images.map((img) => (
                      <img
                        key={img.id}
                        src={img.imageUrl}
                        alt="Review"
                        className="w-20 h-20 object-cover rounded cursor-pointer"
                        onClick={() => window.open(img.imageUrl, '_blank')}
                      />
                    ))}
                  </div>
                )}

                <div className="text-sm text-gray-500">
                  {new Date(review.createdAt).toLocaleDateString('vi-VN')}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

## 🧪 Testing

```bash
# Create review
curl -X POST http://localhost:5000/api/reviews \
  -H "Authorization: Bearer USER_TOKEN" \
  -F "productId=1" \
  -F "rating=5" \
  -F "comment=San pham rat tot" \
  -F "images=@image1.jpg" \
  -F "images=@image2.jpg"
```

---

## ✅ Checklist

- [x] Create review with images
- [x] Rating 1-5 stars
- [x] Purchase verification
- [x] One review per user per product
- [x] Admin moderation
- [x] First review coupon grant
- [x] Rating statistics
- [x] Review list with pagination
- [x] Image upload (max 5)
- [x] Notifications
