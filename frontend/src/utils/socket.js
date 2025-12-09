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
 * - Sử dụng handler chung để tránh duplicate listeners (toast nhiều lần)
 */
// Danh sách callback đang lắng nghe order status updates
let statusUpdateCallbacks = [];

// Handler chung: nhận event → gọi tất cả callbacks (chỉ 1 listener đăng ký)
const statusUpdateHandler = (data) => {
  console.log('📦 Socket: Nhận được cập nhật trạng thái đơn hàng:', data);
  statusUpdateCallbacks.forEach(cb => {
    try {
      cb(data);
    } catch (error) {
      console.error('❌ Lỗi khi xử lý callback cập nhật trạng thái đơn hàng:', error);
    }
  });
};

export const onOrderStatusUpdate = (callback) => {
  if (!socket) {
    console.warn('⚠️ Socket chưa được khởi tạo');
    return () => {};
  }

  // Thêm callback vào danh sách
  statusUpdateCallbacks.push(callback);

  // Nếu là callback đầu tiên → đăng ký listener (chỉ 1 lần)
  if (statusUpdateCallbacks.length === 1) {
    socket.on('order:status:updated', statusUpdateHandler);
    console.log('✅ Đã đăng ký listener order:status:updated');
  }

  // Cleanup: xóa callback khỏi danh sách
  return () => {
    statusUpdateCallbacks = statusUpdateCallbacks.filter(cb => cb !== callback);
    // Nếu không còn callback nào → xóa listener
    if (statusUpdateCallbacks.length === 0) {
      socket.off('order:status:updated', statusUpdateHandler);
      console.log('🗑️ Đã xóa listener order:status:updated');
    }
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

/**
 * HÀM 8: onCategoryCreated(callback)
 * 
 * MỤC ĐÍCH:
 * - Lắng nghe event 'category:created' từ backend
 * - Khi có danh mục mới được tạo, gọi callback để cập nhật UI
 * - Trả về unsubscribe function để ngừng lắng nghe
 * 
 * @param {Function} callback - Hàm được gọi khi có danh mục mới (nhận data danh mục)
 * @returns {Function} Unsubscribe function để ngừng lắng nghe
 */
export const onCategoryCreated = (callback) => {
  if (!socket) {
    console.warn('⚠️ Socket chưa được khởi tạo');
    return () => {};
  }

  socket.on('category:created', (data) => {
    console.log('✅ Danh mục mới được tạo:', data);
    callback(data);
  });

  // Trả về hàm cleanup để ngừng lắng nghe
  return () => {
    socket.off('category:created', callback);
  };
};

/**
 * HÀM 9: onCategoryUpdated(callback)
 * 
 * MỤC ĐÍCH:
 * - Lắng nghe event 'category:updated' từ backend
 * - Khi có danh mục được cập nhật, gọi callback để cập nhật UI
 * - Trả về unsubscribe function để ngừng lắng nghe
 * 
 * @param {Function} callback - Hàm được gọi khi có danh mục cập nhật (nhận data danh mục)
 * @returns {Function} Unsubscribe function để ngừng lắng nghe
 */
export const onCategoryUpdated = (callback) => {
  if (!socket) {
    console.warn('⚠️ Socket chưa được khởi tạo');
    return () => {};
  }

  socket.on('category:updated', (data) => {
    console.log('🔄 Danh mục được cập nhật:', data);
    callback(data);
  });

  return () => {
    socket.off('category:updated', callback);
  };
};

/**
 * HÀM 10: onCategoryDeleted(callback)
 * 
 * MỤC ĐÍCH:
 * - Lắng nghe event 'category:deleted' từ backend
 * - Khi có danh mục bị xóa, gọi callback để cập nhật UI
 * - Trả về unsubscribe function để ngừng lắng nghe
 * 
 * @param {Function} callback - Hàm được gọi khi có danh mục bị xóa (nhận categoryId)
 * @returns {Function} Unsubscribe function để ngừng lắng nghe
 */
export const onCategoryDeleted = (callback) => {
  if (!socket) {
    console.warn('⚠️ Socket chưa được khởi tạo');
    return () => {};
  }

  socket.on('category:deleted', (data) => {
    console.log('🗑️ Danh mục bị xóa:', data);
    callback(data);
  });

  return () => {
    socket.off('category:deleted', callback);
  };
};

/**
 * HÀM 11: onUserDeactivated(callback) vô hiệu hóa user
 * 
 * MỤC ĐÍCH:
 * - Lắng nghe event 'user:deactivated' từ backend
 * - Khi user bị vô hiệu hóa, gọi callback để logout
 * - Trả về unsubscribe function để ngừng lắng nghe
 * 
 * @param {Function} callback - Hàm được gọi khi user bị vô hiệu hóa (nhận { userId, message })
 * @returns {Function} Unsubscribe function để ngừng lắng nghe
 */
export const onUserDeactivated = (callback) => {
  if (!socket) {
    console.warn('⚠️ Socket chưa được khởi tạo');
    return () => {};
  }

  socket.on('user:deactivated', (data) => {
    callback(data);
  });

  return () => {
    socket.off('user:deactivated', callback);
  };
};

/**
 * SOCKET BANNER - Lắng nghe event từ backend để cập nhật slider real-time
 * ở trên file soket fe phải ghi đúng tên 'banner:created ở backend
 
 */

// Lắng nghe banner mới → Gọi callback để thêm vào slider
export const onBannerCreated = (callback) => {//callback là hàm được gọi khi nhận được event 'banner:created' từ backend
  if (!socket) return () => {};//Nếu socket chưa được khởi tạo, trả về hàm rỗng
  socket.on('banner:created', callback);//Lắng nghe event 'banner:created' từ backend
  return () => socket.off('banner:created', callback);//Trả về hàm cleanup để ngừng lắng nghe
};

// Lắng nghe banner cập nhật → Gọi callback để cập nhật hoặc xóa khỏi slider
export const onBannerUpdated = (callback) => {
  if (!socket) return () => {};
  socket.on('banner:updated', callback);
  return () => socket.off('banner:updated', callback);
};

// Lắng nghe banner xóa → Gọi callback để xóa khỏi slider
export const onBannerDeleted = (callback) => {
  if (!socket) return () => {};//
  socket.on('banner:deleted', callback);//Lắng nghe event 'banner:deleted' từ backend
  return () => socket.off('banner:deleted', callback);//Trả về hàm cleanup để ngừng lắng nghe
};

/**
 * SOCKET PRODUCT - Lắng nghe event từ backend để cập nhật sản phẩm real-time
 */

// Lắng nghe sản phẩm mới → Gọi callback để thêm vào danh sách
export const onProductCreated = (callback) => {
  if (!socket) {
    console.warn(' Socket chưa được khởi tạo');
    return () => {};
  }
  
  // Đăng ký listener
  socket.on('product:created', callback);
  console.log(' Đã đăng ký listener product:created');
  
  // Trả về hàm cleanup
  return () => {
    socket.off('product:created', callback);
    console.log(' Đã cleanup listener product:created');
  };
};

// Lắng nghe sản phẩm cập nhật → Gọi callback để cập nhật hoặc xóa khỏi danh sách
export const onProductUpdated = (callback) => {
  if (!socket) {
    console.warn(' Socket chưa được khởi tạo');
    return () => {};
  }
  
  // Đăng ký listener
  socket.on('product:updated', callback);
  console.log(' Đã đăng ký listener product:updated');
  
  // Trả về hàm cleanup
  return () => {
    socket.off('product:updated', callback);
    console.log(' Đã cleanup listener product:updated');
  };
};

// Lắng nghe sản phẩm xóa → Gọi callback để xóa khỏi danh sách
export const onProductDeleted = (callback) => {
  if (!socket) {
    console.warn(' Socket chưa được khởi tạo');
    return () => {};
  }
  
  // Đăng ký listener
  socket.on('product:deleted', callback);
  console.log(' Đã đăng ký listener product:deleted');
  
  // Trả về hàm cleanup
  return () => {
    socket.off('product:deleted', callback);
    console.log(' Đã cleanup listener product:deleted');
  };
};

// Lắng nghe biến thể mới → Gọi callback để thêm vào danh sách
export const onVariantCreated = (callback) => {
  if (!socket) {
    console.warn(' Socket chưa được khởi tạo');
    return () => {};
  }
  
  socket.on('variant:created', callback);
  return () => socket.off('variant:created', callback);
};

// Lắng nghe biến thể cập nhật → Gọi callback để cập nhật
export const onVariantUpdated = (callback) => {
  if (!socket) {
    console.warn(' Socket chưa được khởi tạo');
    return () => {};
  }
  
  socket.on('variant:updated', callback);
  return () => socket.off('variant:updated', callback);
};

// Lắng nghe biến thể xóa → Gọi callback để xóa khỏi danh sách
export const onVariantDeleted = (callback) => {
  if (!socket) {
    console.warn(' Socket chưa được khởi tạo');
    return () => {};
  }
  
  socket.on('variant:deleted', callback);
  return () => socket.off('variant:deleted', callback);
};

