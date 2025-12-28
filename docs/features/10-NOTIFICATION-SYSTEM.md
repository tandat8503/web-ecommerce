# Notification System - Hệ Thống Thông Báo

## 📋 Tổng Quan

Hệ thống thông báo real-time bao gồm:
- Thông báo đơn hàng (order status updates)
- Thông báo thanh toán
- Thông báo vận chuyển
- Thông báo review
- Thông báo coupon
- Real-time với Socket.IO
- Mark as read/unread
- Delete notifications

---

## 🗄️ Database Schema

```prisma
model Notification {
  id        Int              @id @default(autoincrement())
  userId    Int              @map("user_id")
  user      User             @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  title     String           @db.VarChar(255)
  message   String           @db.Text
  type      NotificationType
  
  // Optional metadata
  metadata  Json?            // Store additional data (orderId, productId, etc.)
  
  isRead    Boolean          @default(false) @map("is_read")
  readAt    DateTime?        @map("read_at")
  
  createdAt DateTime         @default(now()) @map("created_at")
  
  @@map("notifications")
  @@index([userId])
  @@index([isRead])
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

---

## 🔧 Backend Implementation

### 1. Socket.IO Setup: `server.js`

```javascript
import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';

const app = express();
const server = http.createServer(app);

// Socket.IO configuration
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Socket.IO middleware for authentication
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  
  if (!token) {
    return next(new Error('Authentication error'));
  }
  
  try {
    const decoded = jwt.verify(token, JWT_CONFIG.secret);
    socket.userId = decoded.userId;
    next();
  } catch (error) {
    next(new Error('Authentication error'));
  }
});

// Socket.IO connection
io.on('connection', (socket) => {
  console.log(`User connected: ${socket.userId}`);
  
  // Join user's room
  socket.join(`user_${socket.userId}`);
  
  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.userId}`);
  });
});

// Export io for use in other files
export { io };

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
```

### 2. Notification Service: `services/notificationService.js`

```javascript
import prisma from '../config/prisma.js';
import { io } from '../server.js';
import logger from '../utils/logger.js';

/**
 * Create and send notification
 */
export const createNotification = async ({ userId, title, message, type, metadata = null }) => {
  try {
    // Create notification in database
    const notification = await prisma.notification.create({
      data: {
        userId,
        title,
        message,
        type,
        metadata
      }
    });

    // Send real-time notification via Socket.IO
    io.to(`user_${userId}`).emit('notification', {
      id: notification.id,
      title: notification.title,
      message: notification.message,
      type: notification.type,
      metadata: notification.metadata,
      createdAt: notification.createdAt
    });

    logger.info('Notification created and sent', { 
      notificationId: notification.id, 
      userId, 
      type 
    });

    return notification;
  } catch (error) {
    logger.error('Create notification error', { error: error.message });
    throw error;
  }
};

/**
 * Send order notification
 */
export const sendOrderNotification = async (userId, order, status) => {
  const statusMessages = {
    PENDING: 'Đơn hàng đã được tạo',
    CONFIRMED: 'Đơn hàng đã được xác nhận',
    PROCESSING: 'Đơn hàng đang được xử lý',
    SHIPPING: 'Đơn hàng đang được giao',
    DELIVERED: 'Đơn hàng đã được giao thành công',
    CANCELLED: 'Đơn hàng đã bị hủy'
  };

  await createNotification({
    userId,
    title: statusMessages[status],
    message: `Đơn hàng #${order.orderNumber} - ${statusMessages[status]}`,
    type: 'ORDER',
    metadata: {
      orderId: order.id,
      orderNumber: order.orderNumber,
      status
    }
  });
};

/**
 * Send payment notification
 */
export const sendPaymentNotification = async (userId, order, success = true) => {
  await createNotification({
    userId,
    title: success ? 'Thanh toán thành công' : 'Thanh toán thất bại',
    message: success 
      ? `Đơn hàng #${order.orderNumber} đã được thanh toán thành công`
      : `Thanh toán đơn hàng #${order.orderNumber} thất bại`,
    type: 'PAYMENT',
    metadata: {
      orderId: order.id,
      orderNumber: order.orderNumber,
      success
    }
  });
};

/**
 * Send coupon notification
 */
export const sendCouponNotification = async (userId, coupon) => {
  await createNotification({
    userId,
    title: 'Bạn nhận được mã giảm giá mới!',
    message: `Mã ${coupon.code}: ${coupon.name}`,
    type: 'COUPON',
    metadata: {
      couponId: coupon.id,
      couponCode: coupon.code
    }
  });
};

/**
 * Send review notification
 */
export const sendReviewNotification = async (userId, message, approved = false) => {
  await createNotification({
    userId,
    title: approved ? 'Đánh giá đã được duyệt' : 'Cảm ơn đánh giá của bạn',
    message,
    type: 'REVIEW'
  });
};
```

### 3. Controller: `controller/notificationController.js`

```javascript
import prisma from '../config/prisma.js';
import logger from '../utils/logger.js';

/**
 * Get user notifications
 * GET /api/notifications
 */
export const getNotifications = async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 20, isRead } = req.query;

    const skip = (Number(page) - 1) * Number(limit);
    const where = { userId };

    if (isRead !== undefined) {
      where.isRead = isRead === 'true';
    }

    const [notifications, total, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: Number(limit)
      }),
      prisma.notification.count({ where }),
      prisma.notification.count({
        where: { userId, isRead: false }
      })
    ]);

    return res.json({
      success: true,
      data: {
        notifications,
        unreadCount,
        pagination: {
          total,
          page: Number(page),
          limit: Number(limit),
          totalPages: Math.ceil(total / Number(limit))
        }
      }
    });
  } catch (error) {
    logger.error('Get notifications error', { error: error.message });
    return res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy thông báo'
    });
  }
};

/**
 * Mark notification as read
 * PUT /api/notifications/:id/read
 */
export const markAsRead = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    // Check ownership
    const notification = await prisma.notification.findUnique({
      where: { id: Number(id) }
    });

    if (!notification || notification.userId !== userId) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy thông báo'
      });
    }

    // Update
    const updated = await prisma.notification.update({
      where: { id: Number(id) },
      data: {
        isRead: true,
        readAt: new Date()
      }
    });

    return res.json({
      success: true,
      data: updated
    });
  } catch (error) {
    logger.error('Mark as read error', { error: error.message });
    return res.status(500).json({
      success: false,
      message: 'Lỗi khi đánh dấu đã đọc'
    });
  }
};

/**
 * Mark all as read
 * PUT /api/notifications/read-all
 */
export const markAllAsRead = async (req, res) => {
  try {
    const userId = req.user.id;

    await prisma.notification.updateMany({
      where: {
        userId,
        isRead: false
      },
      data: {
        isRead: true,
        readAt: new Date()
      }
    });

    return res.json({
      success: true,
      message: 'Đã đánh dấu tất cả là đã đọc'
    });
  } catch (error) {
    logger.error('Mark all as read error', { error: error.message });
    return res.status(500).json({
      success: false,
      message: 'Lỗi khi đánh dấu đã đọc'
    });
  }
};

/**
 * Delete notification
 * DELETE /api/notifications/:id
 */
export const deleteNotification = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    // Check ownership
    const notification = await prisma.notification.findUnique({
      where: { id: Number(id) }
    });

    if (!notification || notification.userId !== userId) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy thông báo'
      });
    }

    await prisma.notification.delete({
      where: { id: Number(id) }
    });

    return res.json({
      success: true,
      message: 'Đã xóa thông báo'
    });
  } catch (error) {
    logger.error('Delete notification error', { error: error.message });
    return res.status(500).json({
      success: false,
      message: 'Lỗi khi xóa thông báo'
    });
  }
};

/**
 * Delete all notifications
 * DELETE /api/notifications
 */
export const deleteAllNotifications = async (req, res) => {
  try {
    const userId = req.user.id;

    await prisma.notification.deleteMany({
      where: { userId }
    });

    return res.json({
      success: true,
      message: 'Đã xóa tất cả thông báo'
    });
  } catch (error) {
    logger.error('Delete all notifications error', { error: error.message });
    return res.status(500).json({
      success: false,
      message: 'Lỗi khi xóa thông báo'
    });
  }
};

/**
 * Get unread count
 * GET /api/notifications/unread-count
 */
export const getUnreadCount = async (req, res) => {
  try {
    const userId = req.user.id;

    const count = await prisma.notification.count({
      where: {
        userId,
        isRead: false
      }
    });

    return res.json({
      success: true,
      data: { count }
    });
  } catch (error) {
    logger.error('Get unread count error', { error: error.message });
    return res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy số thông báo chưa đọc'
    });
  }
};
```

### 4. Routes: `routes/notificationRoutes.js`

```javascript
import express from 'express';
import {
  getNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  deleteAllNotifications,
  getUnreadCount
} from '../controller/notificationController.js';
import { authenticate } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(authenticate);

router.get('/', getNotifications);
router.get('/unread-count', getUnreadCount);
router.put('/:id/read', markAsRead);
router.put('/read-all', markAllAsRead);
router.delete('/:id', deleteNotification);
router.delete('/', deleteAllNotifications);

export default router;
```

---

## 🎨 Frontend Implementation

### 1. Socket.IO Setup: `src/lib/socket.js`

```javascript
import { io } from 'socket.io-client';

let socket = null;

export const initSocket = (token) => {
  if (socket) {
    socket.disconnect();
  }

  socket = io(import.meta.env.VITE_API_URL || 'http://localhost:5000', {
    auth: { token },
    transports: ['websocket', 'polling']
  });

  socket.on('connect', () => {
    console.log('Socket connected');
  });

  socket.on('disconnect', () => {
    console.log('Socket disconnected');
  });

  socket.on('connect_error', (error) => {
    console.error('Socket connection error:', error);
  });

  return socket;
};

export const getSocket = () => socket;

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
```

### 2. API Service: `src/api/notifications.js`

```javascript
import axiosClient from './axiosClient';

export const getNotifications = (params) => {
  return axiosClient.get('/notifications', { params });
};

export const getUnreadCount = () => {
  return axiosClient.get('/notifications/unread-count');
};

export const markAsRead = (id) => {
  return axiosClient.put(`/notifications/${id}/read`);
};

export const markAllAsRead = () => {
  return axiosClient.put('/notifications/read-all');
};

export const deleteNotification = (id) => {
  return axiosClient.delete(`/notifications/${id}`);
};

export const deleteAllNotifications = () => {
  return axiosClient.delete('/notifications');
};
```

### 3. Notification Store: `src/stores/notificationStore.js`

```javascript
import { create } from 'zustand';
import { 
  getNotifications, 
  getUnreadCount,
  markAsRead as markAsReadAPI,
  markAllAsRead as markAllAsReadAPI
} from '@/api/notifications';
import { initSocket, getSocket, disconnectSocket } from '@/lib/socket';
import { toast } from 'react-hot-toast';

const useNotificationStore = create((set, get) => ({
  notifications: [],
  unreadCount: 0,
  loading: false,
  socket: null,

  // Initialize socket connection
  initSocket: (token) => {
    const socket = initSocket(token);
    
    socket.on('notification', (data) => {
      // Add new notification to list
      set(state => ({
        notifications: [data, ...state.notifications],
        unreadCount: state.unreadCount + 1
      }));
      
      // Show toast
      toast.success(data.message, {
        duration: 4000,
        icon: '🔔'
      });
    });
    
    set({ socket });
  },

  // Disconnect socket
  disconnectSocket: () => {
    disconnectSocket();
    set({ socket: null });
  },

  // Fetch notifications
  fetchNotifications: async (params = {}) => {
    set({ loading: true });
    try {
      const response = await getNotifications(params);
      set({
        notifications: response.data.data.notifications,
        unreadCount: response.data.data.unreadCount
      });
    } catch (error) {
      console.error('Fetch notifications error:', error);
    } finally {
      set({ loading: false });
    }
  },

  // Fetch unread count
  fetchUnreadCount: async () => {
    try {
      const response = await getUnreadCount();
      set({ unreadCount: response.data.data.count });
    } catch (error) {
      console.error('Fetch unread count error:', error);
    }
  },

  // Mark as read
  markAsRead: async (id) => {
    try {
      await markAsReadAPI(id);
      set(state => ({
        notifications: state.notifications.map(n =>
          n.id === id ? { ...n, isRead: true, readAt: new Date() } : n
        ),
        unreadCount: Math.max(0, state.unreadCount - 1)
      }));
    } catch (error) {
      console.error('Mark as read error:', error);
    }
  },

  // Mark all as read
  markAllAsRead: async () => {
    try {
      await markAllAsReadAPI();
      set(state => ({
        notifications: state.notifications.map(n => ({
          ...n,
          isRead: true,
          readAt: new Date()
        })),
        unreadCount: 0
      }));
    } catch (error) {
      console.error('Mark all as read error:', error);
    }
  }
}));

export default useNotificationStore;
```

### 4. Notification Bell Component: `src/components/NotificationBell.jsx`

```jsx
import { useState, useEffect } from 'react';
import { Bell } from 'lucide-react';
import useNotificationStore from '@/stores/notificationStore';
import { useNavigate } from 'react-router-dom';

export default function NotificationBell() {
  const { unreadCount, fetchUnreadCount } = useNotificationStore();
  const navigate = useNavigate();

  useEffect(() => {
    fetchUnreadCount();
  }, []);

  return (
    <button
      onClick={() => navigate('/notifications')}
      className="relative p-2 hover:bg-gray-100 rounded"
    >
      <Bell size={24} />
      {unreadCount > 0 && (
        <span className="absolute -top-1 -right-1 bg-red-600 text-white text-xs w-5 h-5 flex items-center justify-center rounded-full">
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}
    </button>
  );
}
```

### 5. Notifications Page: `src/pages/user/notifications/Notifications.jsx`

```jsx
import { useEffect } from 'react';
import useNotificationStore from '@/stores/notificationStore';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';
import { Bell, Package, CreditCard, Truck, Star, Gift } from 'lucide-react';

const iconMap = {
  ORDER: Package,
  PAYMENT: CreditCard,
  SHIPPING: Truck,
  REVIEW: Star,
  COUPON: Gift,
  SYSTEM: Bell
};

export default function Notifications() {
  const { 
    notifications, 
    loading, 
    fetchNotifications, 
    markAsRead, 
    markAllAsRead 
  } = useNotificationStore();

  useEffect(() => {
    fetchNotifications();
  }, []);

  const handleNotificationClick = async (notification) => {
    if (!notification.isRead) {
      await markAsRead(notification.id);
    }
    
    // Navigate based on type
    if (notification.metadata?.orderId) {
      navigate(`/orders/${notification.metadata.orderId}`);
    }
  };

  if (loading) {
    return <div className="text-center py-20">Đang tải...</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Thông Báo</h1>
        {notifications.some(n => !n.isRead) && (
          <button
            onClick={markAllAsRead}
            className="text-blue-600 hover:underline"
          >
            Đánh dấu tất cả là đã đọc
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="text-center py-20 text-gray-500">
          Không có thông báo nào
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((notification) => {
            const Icon = iconMap[notification.type] || Bell;
            
            return (
              <div
                key={notification.id}
                onClick={() => handleNotificationClick(notification)}
                className={`flex gap-4 p-4 border rounded cursor-pointer hover:bg-gray-50 ${
                  !notification.isRead ? 'bg-blue-50 border-blue-200' : ''
                }`}
              >
                <div className={`p-2 rounded-full ${
                  !notification.isRead ? 'bg-blue-100' : 'bg-gray-100'
                }`}>
                  <Icon size={24} className={
                    !notification.isRead ? 'text-blue-600' : 'text-gray-600'
                  } />
                </div>
                
                <div className="flex-1">
                  <h3 className="font-semibold mb-1">{notification.title}</h3>
                  <p className="text-gray-600 text-sm mb-2">{notification.message}</p>
                  <span className="text-xs text-gray-500">
                    {formatDistanceToNow(new Date(notification.createdAt), {
                      addSuffix: true,
                      locale: vi
                    })}
                  </span>
                </div>
                
                {!notification.isRead && (
                  <div className="w-2 h-2 bg-blue-600 rounded-full mt-2"></div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
```

### 6. Initialize Socket in App: `src/App.jsx`

```jsx
import { useEffect } from 'react';
import useAuthStore from '@/stores/authStore';
import useNotificationStore from '@/stores/notificationStore';

function App() {
  const { token, isAuthenticated } = useAuthStore();
  const { initSocket, disconnectSocket } = useNotificationStore();

  useEffect(() => {
    if (isAuthenticated && token) {
      initSocket(token);
    } else {
      disconnectSocket();
    }

    return () => {
      disconnectSocket();
    };
  }, [isAuthenticated, token]);

  return (
    // Your app routes
  );
}
```

---

## 🧪 Testing

```bash
# Get notifications
curl -X GET http://localhost:5000/api/notifications \
  -H "Authorization: Bearer USER_TOKEN"

# Mark as read
curl -X PUT http://localhost:5000/api/notifications/1/read \
  -H "Authorization: Bearer USER_TOKEN"
```

---

## ✅ Checklist

- [x] Socket.IO setup
- [x] Real-time notifications
- [x] Create notification service
- [x] Order notifications
- [x] Payment notifications
- [x] Coupon notifications
- [x] Review notifications
- [x] Mark as read/unread
- [x] Delete notifications
- [x] Unread count badge
- [x] Toast notifications
- [x] Notification list page
- [x] Socket authentication
- [x] Auto-reconnect
