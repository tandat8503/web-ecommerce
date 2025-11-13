/**
 * ========================================
 * WEBSOCKET CLIENT - Real-time Order Updates
 * ========================================
 * 
 * MỤC ĐÍCH TỔNG QUAN:
 * - Kết nối với backend Socket.IO server qua WebSocket
 * - Nhận thông báo cập nhật đơn hàng real-time (không cần refresh)
 * - Tự động reconnect nếu mất kết nối
 */

import { io } from 'socket.io-client';

let socket = null;

/**
 * HÀM 1: initializeSocket(userId)
 * 
 * MỤC ĐÍCH:
 * - Tạo Socket.IO client (wrapper của WebSocket)
 * - Kết nối đến backend qua WebSocket protocol
 * - Tự động join user room khi kết nối thành công (nếu có userId)
 * - Tự động reconnect nếu mất kết nối
 * 
 * THAM SỐ:
 * - userId: ID của user (từ database)
 *   + Nếu truyền userId → Tự động join user room (dùng cho user thường)
 *   + Nếu truyền null → Không join user room (dùng cho admin)
 * 
 * WEBSOCKET Ở ĐÂU?
 * - Dòng socket = io(serverUrl, {...}) → Tạo WebSocket connection
 * - Socket.IO tự động tạo WebSocket connection bên trong
 */
export const initializeSocket = (userId) => {
  if (socket?.connected) {
    socket.disconnect();
  }

  const serverUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
  
  socket = io(serverUrl, {
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    reconnectionAttempts: Infinity, // Retry vô hạn (cho đến khi kết nối thành công)
    autoConnect: true,
    // Tắt log lỗi connection trong console (vì đã có retry tự động)
    // Chỉ log khi thực sự cần thiết
    timeout: 20000 // Timeout 20 giây
  });

  socket.on('connect', () => {
    console.log('✅ Socket.IO connected', { socketId: socket.id });
    
    if (userId) {
      socket.emit('join:user', userId);
      console.log('👤 Joined user room', { userId });
    }
  });

  socket.on('disconnect', (reason) => {
    console.log('🔌 Socket.IO disconnected', { reason });
  });

  socket.on('reconnect', (attemptNumber) => {
    console.log('🔄 Socket.IO reconnected', { attemptNumber });
    
    if (userId) {
      socket.emit('join:user', userId);
      console.log('👤 Rejoined user room', { userId });
    }
  });

  socket.on('connect_error', (error) => {
    // Chỉ log khi không phải lỗi retry thông thường
    // Socket.IO sẽ tự động retry, không cần log mỗi lần thử
    if (error.message && !error.message.includes('websocket error')) {
      console.warn('⚠️ Socket.IO connection error:', error.message);
    }
    // Không log lỗi websocket thông thường vì Socket.IO sẽ tự động fallback sang polling
  });

  return socket;
};

/**
 * HÀM 2: joinOrderRoom(orderId)
 * 
 * MỤC ĐÍCH:
 * - Join vào room của một đơn hàng cụ thể
 * - Nhận updates cho đơn hàng đó
 */
export const joinOrderRoom = (orderId) => {
  if (socket?.connected) {
    socket.emit('join:order', orderId);
    console.log('📦 Joined order room', { orderId });
  } else {
    console.warn('⚠️ Socket not connected, cannot join order room');
  }
};

/**
 * HÀM 3: leaveOrderRoom(orderId)
 * 
 * MỤC ĐÍCH:
 * - Rời khỏi room của một đơn hàng cụ thể
 * - Không nhận updates cho đơn hàng đó nữa
 */
export const leaveOrderRoom = (orderId) => {
  if (socket?.connected) {
    socket.emit('leave:order', orderId);
    console.log('📦 Left order room', { orderId });
  }
};

/**
 * HÀM 4: onOrderStatusUpdate(callback)
 * 
 * MỤC ĐÍCH:
 * - Lắng nghe event 'order:status:updated' từ backend
 * - Gọi callback function khi nhận được update
 * - Trả về unsubscribe function để ngừng lắng nghe
 */
export const onOrderStatusUpdate = (callback) => {
  if (!socket) {
    console.warn('Socket chưa được khởi tạo');
    return () => {};
  }

  socket.on('order:status:updated', (data) => {
    console.log('Cập nhật trạng thái đơn hàng nhận được:', data);
    callback(data);
  });

  return () => {
    socket.off('order:status:updated', callback);
  };
};

/**
 * HÀM 5: onNewOrder(callback) - Lắng nghe đơn hàng mới
 * 
 * MỤC ĐÍCH:
 * - Lắng nghe event 'order:new' từ backend qua WebSocket
 * - Gọi callback function khi nhận được đơn hàng mới
 * - Trả về unsubscribe function để ngừng lắng nghe
 * 
 * WEBSOCKET Ở ĐÂU?
 * - socket.on('order:new', callback) → Lắng nghe qua WebSocket
 * - Backend gửi event qua WebSocket → Frontend nhận được ở đây
 */
// Danh sách callback đang lắng nghe
let callbacks = [];

// Handler chung: nhận event → gọi tất cả callback
const handler = (data) => {
  console.log('Nhận được đơn hàng mới:', data);
  callbacks.forEach(cb => cb(data));
};

export const onNewOrder = (callback) => {
  if (!socket) {
    console.warn('Socket chưa được khởi tạo');
    return () => {};
  }

  // Thêm callback vào danh sách
  callbacks.push(callback);

  // Nếu là callback đầu tiên → đăng ký listener (chỉ 1 lần)
  if (callbacks.length === 1) {
    socket.on('order:new', handler);
  }

  // Cleanup: xóa callback khỏi danh sách
  return () => {
    callbacks = callbacks.filter(cb => cb !== callback);
    // Nếu không còn callback nào → xóa listener
    if (callbacks.length === 0) {
      socket.off('order:new', handler);
    }
  };
};

/**
 * HÀM 6: disconnectSocket()
 * 
 * MỤC ĐÍCH:
 * - Đóng kết nối WebSocket
 * - Xóa socket instance
 * - Giải phóng tài nguyên
 */
export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
    console.log('Socket đã đóng kết nối');
  }
};

/**
 * HÀM 7: joinAdminRoom()
 * 
 * MỤC ĐÍCH:
 * - Gửi event 'join:admin' qua WebSocket để join admin room
 * - Admin nhận được tất cả thông báo đơn hàng mới
 * 
 * WEBSOCKET Ở ĐÂU?
 * - socket.emit('join:admin') → Gửi qua WebSocket
 */
export const joinAdminRoom = () => {
  if (socket?.connected) {
    socket.emit('join:admin');
    console.log('Admin đã join room');
  } else {
    console.warn('Socket chưa được kết nối, không thể join admin room');
  }
};


