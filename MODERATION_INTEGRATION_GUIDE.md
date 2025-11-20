# 🛡️ Hướng dẫn Tích hợp AI Content Moderation vào Backend

## 📋 Tổng quan

Hướng dẫn này sẽ giúp bạn tích hợp **AI Content Moderation** vào hệ thống comment của backend để tự động kiểm duyệt nội dung trước khi lưu vào database.

---

## 🎯 Mục tiêu

- ✅ Tự động kiểm duyệt comments trước khi lưu
- ✅ Block nội dung vi phạm nghiêm trọng (severity: high)
- ✅ Flag nội dung cần review (severity: medium)
- ✅ Approve nội dung phù hợp (severity: low hoặc không vi phạm)
- ✅ Log tất cả moderation results để admin review

---

## 🔧 Implementation Steps

### **Step 1: Cài đặt axios (nếu chưa có)**

```bash
cd backend
npm install axios
```

---

### **Step 2: Tạo AI Moderation Client**

Tạo file `backend/utils/aiModerationClient.js`:

```javascript
const axios = require('axios');

// AI System URL (adjust theo environment của bạn)
const AI_BASE_URL = process.env.AI_API_URL || 'http://localhost:8000';

/**
 * Call AI Content Moderation API
 * @param {Object} options - Moderation options
 * @param {string} options.content - Content to moderate
 * @param {string} options.content_type - Type: comment, review, chat
 * @param {number} options.product_id - Product ID
 * @param {number} options.user_id - User ID
 * @returns {Promise<Object>} Moderation result
 */
async function moderateContent({ content, content_type = 'comment', product_id, user_id }) {
  try {
    console.log(`🔍 Moderating ${content_type} content (length: ${content.length})`);
    
    const response = await axios.post(`${AI_BASE_URL}/moderate`, {
      content,
      content_type,
      product_id,
      user_id
    }, {
      timeout: 10000, // 10 second timeout
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    const result = response.data;
    
    console.log(`✅ Moderation result: ${result.suggested_action} (confidence: ${result.confidence})`);
    
    return {
      success: true,
      ...result
    };
    
  } catch (error) {
    console.error('❌ AI Moderation error:', error.message);
    
    // Fallback: Allow content if AI fails (fail-open policy)
    return {
      success: false,
      error: error.message,
      is_appropriate: true, // Default to allow
      violations: [],
      severity: 'low',
      confidence: 0.0,
      suggested_action: 'approve',
      explanation: 'AI moderation unavailable, content approved by default'
    };
  }
}

/**
 * Check if content should be rejected
 * @param {Object} moderationResult - Result from moderateContent
 * @returns {boolean} True if content should be rejected
 */
function shouldRejectContent(moderationResult) {
  // Reject if:
  // 1. Suggested action is "reject"
  // 2. Severity is "high"
  // 3. Confidence > 0.8 AND has violations
  
  if (moderationResult.suggested_action === 'reject') {
    return true;
  }
  
  if (moderationResult.severity === 'high') {
    return true;
  }
  
  if (moderationResult.confidence >= 0.8 && moderationResult.violations.length > 0) {
    return true;
  }
  
  return false;
}

/**
 * Check if content needs human review
 * @param {Object} moderationResult - Result from moderateContent
 * @returns {boolean} True if content needs review
 */
function needsReview(moderationResult) {
  // Flag for review if:
  // 1. Suggested action is "review"
  // 2. Severity is "medium"
  // 3. Has violations but low confidence
  
  if (moderationResult.suggested_action === 'review') {
    return true;
  }
  
  if (moderationResult.severity === 'medium') {
    return true;
  }
  
  if (moderationResult.violations.length > 0 && moderationResult.confidence < 0.8) {
    return true;
  }
  
  return false;
}

module.exports = {
  moderateContent,
  shouldRejectContent,
  needsReview
};
```

---

### **Step 3: Cập nhật ProductComment Controller**

Cập nhật `backend/controller/productCommentController.js`:

```javascript
const { moderateContent, shouldRejectContent, needsReview } = require('../utils/aiModerationClient');

/**
 * Create new comment (with AI moderation)
 */
export const createComment = async (req, res) => {
  try {
    const { productId, content, parentId } = req.body;
    const userId = req.user.id;

    // Validate input
    if (!productId || !content || content.trim().length < 3) {
      return res.status(400).json({
        success: false,
        message: "Nội dung bình luận phải có ít nhất 3 ký tự"
      });
    }

    // Check if product exists
    const product = await prisma.product.findUnique({
      where: { id: Number(productId) }
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Sản phẩm không tồn tại"
      });
    }

    // ===== 🛡️ AI CONTENT MODERATION =====
    const moderationResult = await moderateContent({
      content: content.trim(),
      content_type: 'comment',
      product_id: Number(productId),
      user_id: Number(userId)
    });

    console.log('🤖 AI Moderation Result:', {
      is_appropriate: moderationResult.is_appropriate,
      violations: moderationResult.violations,
      severity: moderationResult.severity,
      confidence: moderationResult.confidence,
      suggested_action: moderationResult.suggested_action
    });

    // Check if content should be rejected
    if (shouldRejectContent(moderationResult)) {
      return res.status(400).json({
        success: false,
        message: "Bình luận của bạn vi phạm quy định cộng đồng",
        moderation: {
          violations: moderationResult.violations,
          explanation: moderationResult.explanation,
          severity: moderationResult.severity
        }
      });
    }

    // Determine if comment needs review
    const requiresReview = needsReview(moderationResult);
    const isApproved = !requiresReview; // Auto-approve if doesn't need review

    // Create comment
    const comment = await prisma.productComment.create({
      data: {
        userId: Number(userId),
        productId: Number(productId),
        parentId: parentId ? Number(parentId) : null,
        content: content.trim(),
        isApproved: isApproved // Auto-approve or flag for review
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatar: true
          }
        }
      }
    });

    // Log moderation result to database (optional - for admin review)
    if (requiresReview) {
      await prisma.moderationLog.create({
        data: {
          commentId: comment.id,
          userId: Number(userId),
          productId: Number(productId),
          content: content.trim(),
          moderationResult: JSON.stringify(moderationResult),
          violations: moderationResult.violations.join(', '),
          severity: moderationResult.severity,
          confidence: moderationResult.confidence,
          suggestedAction: moderationResult.suggested_action,
          status: 'pending_review'
        }
      });
    }

    return res.status(201).json({
      success: true,
      message: isApproved 
        ? "Bình luận đã được đăng thành công!" 
        : "Bình luận của bạn đang được xem xét",
      data: {
        ...comment,
        needsReview: requiresReview
      }
    });

  } catch (error) {
    console.error("Error creating comment:", error);
    return res.status(500).json({
      success: false,
      message: "Lỗi khi tạo bình luận"
    });
  }
};
```

---

### **Step 4: Thêm Moderation Log Table (Optional)**

Thêm vào `backend/prisma/schema.prisma`:

```prisma
model ModerationLog {
  id                Int      @id @default(autoincrement())
  commentId         Int?     @map("comment_id")
  userId            Int      @map("user_id")
  productId         Int?     @map("product_id")
  content           String   @db.Text
  moderationResult  Json     @map("moderation_result")
  violations        String?
  severity          String   @default("low")
  confidence        Float    @default(0.0)
  suggestedAction   String   @map("suggested_action") @default("approve")
  status            String   @default("pending_review") // pending_review, approved, rejected
  reviewedBy        Int?     @map("reviewed_by")
  reviewedAt        DateTime? @map("reviewed_at")
  createdAt         DateTime @default(now()) @map("created_at")
  
  comment           ProductComment? @relation(fields: [commentId], references: [id])
  user              User     @relation(fields: [userId], references: [id])
  reviewer          User?    @relation("ModerationReviewer", fields: [reviewedBy], references: [id])
  
  @@map("moderation_logs")
}

// Thêm relation vào ProductComment model
model ProductComment {
  // ... existing fields ...
  
  moderationLogs ModerationLog[]
  
  // ... existing relations ...
}

// Thêm relation vào User model
model User {
  // ... existing fields ...
  
  moderationLogs       ModerationLog[]
  reviewedModerations  ModerationLog[] @relation("ModerationReviewer")
  
  // ... existing relations ...
}
```

Sau đó chạy migration:

```bash
cd backend
npx prisma migrate dev --name add_moderation_logs
npx prisma generate
```

---

### **Step 5: Cấu hình Environment**

Thêm vào `backend/.env`:

```env
# AI System Configuration
AI_API_URL=http://localhost:8000
AI_MODERATION_ENABLED=true
AI_MODERATION_FAIL_OPEN=true  # Allow content if AI fails
```

---

### **Step 6: Admin Dashboard - Moderation Review Page**

Tạo API endpoint để admin review flagged comments:

`backend/controller/adminModerationController.js`:

```javascript
const prisma = require('../config/prisma');

/**
 * Get all comments pending review
 */
export const getPendingModerations = async (req, res) => {
  try {
    const { page = 1, limit = 20, severity, status } = req.query;
    
    const where = {
      status: status || 'pending_review'
    };
    
    if (severity) {
      where.severity = severity;
    }
    
    const [moderations, total] = await Promise.all([
      prisma.moderationLog.findMany({
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
          comment: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  slug: true
                }
              }
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: Number(limit)
      }),
      prisma.moderationLog.count({ where })
    ]);
    
    return res.json({
      success: true,
      data: moderations,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / limit)
      }
    });
    
  } catch (error) {
    console.error("Error fetching pending moderations:", error);
    return res.status(500).json({
      success: false,
      message: "Lỗi khi lấy danh sách kiểm duyệt"
    });
  }
};

/**
 * Approve or reject moderation
 */
export const reviewModeration = async (req, res) => {
  try {
    const { id } = req.params;
    const { action, reason } = req.body; // action: approve, reject
    const adminId = req.user.id;
    
    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({
        success: false,
        message: "Action phải là 'approve' hoặc 'reject'"
      });
    }
    
    const moderation = await prisma.moderationLog.findUnique({
      where: { id: Number(id) },
      include: { comment: true }
    });
    
    if (!moderation) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy moderation log"
      });
    }
    
    // Update moderation log
    await prisma.moderationLog.update({
      where: { id: Number(id) },
      data: {
        status: action === 'approve' ? 'approved' : 'rejected',
        reviewedBy: Number(adminId),
        reviewedAt: new Date()
      }
    });
    
    // Update comment approval status
    if (moderation.commentId) {
      await prisma.productComment.update({
        where: { id: moderation.commentId },
        data: {
          isApproved: action === 'approve'
        }
      });
    }
    
    return res.json({
      success: true,
      message: `Bình luận đã được ${action === 'approve' ? 'phê duyệt' : 'từ chối'}`
    });
    
  } catch (error) {
    console.error("Error reviewing moderation:", error);
    return res.status(500).json({
      success: false,
      message: "Lỗi khi xem xét kiểm duyệt"
    });
  }
};

module.exports = {
  getPendingModerations,
  reviewModeration
};
```

Thêm routes:

`backend/routes/adminModerationRoutes.js`:

```javascript
const express = require('express');
const router = express.Router();
const { authenticateToken, isAdmin } = require('../middleware/authMiddleware');
const {
  getPendingModerations,
  reviewModeration
} = require('../controller/adminModerationController');

// All routes require admin authentication
router.use(authenticateToken, isAdmin);

// GET /api/admin/moderations - Get pending moderations
router.get('/', getPendingModerations);

// PATCH /api/admin/moderations/:id - Approve or reject
router.patch('/:id', reviewModeration);

module.exports = router;
```

Thêm vào `backend/routes/index.js`:

```javascript
const adminModerationRoutes = require('./adminModerationRoutes');

// Admin routes
app.use('/api/admin/moderations', adminModerationRoutes);
```

---

## 🎨 Frontend Integration (Optional)

### **Admin Moderation Dashboard**

Tạo `frontend/src/pages/admin/ModerationPage.jsx`:

```jsx
import React, { useState, useEffect } from 'react';
import { Table, Tag, Button, Modal, message } from 'antd';
import { CheckOutlined, CloseOutlined } from '@ant-design/icons';
import axios from 'axios';

const ModerationPage = () => {
  const [moderations, setModerations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 20, total: 0 });

  const fetchModerations = async (page = 1) => {
    setLoading(true);
    try {
      const response = await axios.get('/api/admin/moderations', {
        params: { page, limit: pagination.pageSize }
      });
      setModerations(response.data.data);
      setPagination({
        ...pagination,
        current: page,
        total: response.data.pagination.total
      });
    } catch (error) {
      message.error('Lỗi khi tải danh sách');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchModerations();
  }, []);

  const handleReview = async (id, action) => {
    try {
      await axios.patch(`/api/admin/moderations/${id}`, { action });
      message.success(`Đã ${action === 'approve' ? 'phê duyệt' : 'từ chối'}`);
      fetchModerations(pagination.current);
    } catch (error) {
      message.error('Lỗi khi xử lý');
    }
  };

  const columns = [
    {
      title: 'Người dùng',
      dataIndex: ['user', 'firstName'],
      render: (text, record) => `${record.user.firstName} ${record.user.lastName}`
    },
    {
      title: 'Nội dung',
      dataIndex: 'content',
      ellipsis: true,
      width: 300
    },
    {
      title: 'Vi phạm',
      dataIndex: 'violations',
      render: (violations) => violations || 'Không có'
    },
    {
      title: 'Mức độ',
      dataIndex: 'severity',
      render: (severity) => {
        const color = severity === 'high' ? 'red' : severity === 'medium' ? 'orange' : 'green';
        return <Tag color={color}>{severity}</Tag>;
      }
    },
    {
      title: 'Độ tin cậy',
      dataIndex: 'confidence',
      render: (confidence) => `${(confidence * 100).toFixed(0)}%`
    },
    {
      title: 'Hành động',
      key: 'action',
      render: (_, record) => (
        <>
          <Button
            type="primary"
            icon={<CheckOutlined />}
            size="small"
            onClick={() => handleReview(record.id, 'approve')}
            style={{ marginRight: 8 }}
          >
            Phê duyệt
          </Button>
          <Button
            danger
            icon={<CloseOutlined />}
            size="small"
            onClick={() => handleReview(record.id, 'reject')}
          >
            Từ chối
          </Button>
        </>
      )
    }
  ];

  return (
    <div className="moderation-page">
      <h1>Kiểm duyệt bình luận</h1>
      <Table
        columns={columns}
        dataSource={moderations}
        loading={loading}
        rowKey="id"
        pagination={pagination}
        onChange={(p) => fetchModerations(p.current)}
      />
    </div>
  );
};

export default ModerationPage;
```

---

## 🧪 Testing

### **Test 1: Normal comment (should pass)**

```bash
curl -X POST http://localhost:5000/api/product-comments \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "productId": 17,
    "content": "Sản phẩm rất tốt, tôi rất hài lòng!"
  }'
```

**Expected**: Comment được tạo và approved tự động

---

### **Test 2: Profanity comment (should be rejected)**

```bash
curl -X POST http://localhost:5000/api/product-comments \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "productId": 17,
    "content": "Sản phẩm đéo tốt, vcl!"
  }'
```

**Expected**: HTTP 400, message về vi phạm quy định

---

### **Test 3: Spam comment (should be flagged for review)**

```bash
curl -X POST http://localhost:5000/api/product-comments \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "productId": 17,
    "content": "Mua sản phẩm rẻ hơn tại https://fake-shop.com https://another-spam.com!!!"
  }'
```

**Expected**: Comment được tạo nhưng `isApproved: false`, cần admin review

---

## 📊 Monitoring & Logs

Bạn có thể monitor AI moderation performance bằng cách:

1. **Check moderation logs table**:
```sql
SELECT 
  severity,
  suggested_action,
  COUNT(*) as count,
  AVG(confidence) as avg_confidence
FROM moderation_logs
WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
GROUP BY severity, suggested_action;
```

2. **Check false positives/negatives**:
```sql
SELECT 
  ml.id,
  ml.content,
  ml.violations,
  ml.severity,
  ml.suggested_action,
  ml.status
FROM moderation_logs ml
WHERE ml.status != ml.suggested_action;
```

---

## 🎯 Best Practices

1. **Fail-open policy**: Nếu AI không khả dụng, cho phép content đi qua (để tránh block hợp lệ)
2. **Human review**: Luôn có admin review cho medium severity
3. **Feedback loop**: Admin review giúp cải thiện AI accuracy
4. **Rate limiting**: Limit số comment per user per minute
5. **Async moderation**: Consider queue-based moderation cho high traffic

---

## 🚀 Production Deployment

1. **Scale AI service** với load balancer
2. **Cache moderation results** cho duplicate content
3. **Monitor latency** và set timeout phù hợp
4. **Backup moderation rules** với rule-based fallback

---

**✅ Hoàn tất tích hợp AI Content Moderation!**

