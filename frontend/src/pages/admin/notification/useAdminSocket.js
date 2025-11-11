
import { useEffect } from "react";

import { initializeSocket, joinAdminRoom, onNewOrder } from "@/utils/socket.js";

/**
 * Hook quản lý WebSocket cho admin
 * 
 * CHỨC NĂNG TỔNG QUAN:
 * - Khởi tạo kết nối WebSocket đến backend
 * - Join vào admin room để nhận thông báo đơn hàng mới
 * - Lắng nghe event 'order:new' từ backend real-time
 * - Tự động dọn dẹp khi component bị gỡ bỏ khi chuyển trang , đóng trang hoặc dependencies thay đổi
 * 
 * THAM SỐ:
 * @param {Function} onNewOrderCallback - Hàm callback được gọi khi nhận được đơn hàng mới
 *   + Nhận data: { orderId, orderNumber, customerName, totalAmount, ... }
 *   + Component tự quyết định xử lý (hiển thị toast, refresh danh sách, ...)
 * 
 * @param {Array} dependencies - Mảng dependencies cho useEffect
 *   + Khi dependencies thay đổi → hook sẽ chạy lại
 *   + Ví dụ: [fetchNotifications, fetchUnreadCount] hoặc [fetchOrders]
 * 
 * VÍ DỤ SỬ DỤNG:
 * useAdminSocket((data) => {
 *   toast.success(`Đơn hàng mới: ${data.orderNumber}`);
 *   fetchNotifications();
 * }, [fetchNotifications, fetchUnreadCount]);
 */
export const useAdminSocket = (onNewOrderCallback, dependencies = []) => {
  // useEffect: Chạy khi component mount hoặc dependencies thay đổi
  useEffect(() => {
    // Lấy thông tin user từ localStorage
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    
    // Kiểm tra user có tồn tại và có id không
    // Nếu không có user → dừng lại, không setup socket
    if (!user?.id) return;

    // ========== BƯỚC 1: KHỞI TẠO SOCKET ==========
    // Gọi hàm initializeSocket(null) để tạo kết nối WebSocket
    // Truyền null vì admin không cần join user room (chỉ cần join admin room)
    const socket = initializeSocket(null);
    
    // Biến lưu hàm unsubscribe để ngừng lắng nghe khi cleanup
    let unsubscribe = null;
    
    // ========== BƯỚC 2: HÀM SETUP KHI SOCKET ĐÃ KẾT NỐI ==========
    // Hàm này sẽ được gọi khi socket đã kết nối thành công
    const setupWhenConnected = () => {
      // Cleanup listener cũ trước (nếu có) để tránh đăng ký nhiều lần
      if (unsubscribe) {
        unsubscribe();
        unsubscribe = null;
      }
      
      // Join vào admin room để nhận thông báo đơn hàng mới
      // Backend sẽ gửi thông báo đến tất cả admin trong room này
      joinAdminRoom();
      
      // Lắng nghe event 'order:new' từ backend
      // Khi backend gửi event này → callback sẽ được gọi với data đơn hàng mới
      unsubscribe = onNewOrder((data) => {
        // Gọi hàm callback mà component truyền vào
        // Component sẽ tự xử lý (hiển thị toast, refresh danh sách, ...)
        onNewOrderCallback(data);
      });
    };
    
    // ========== BƯỚC 3: KIỂM TRA VÀ SETUP ==========
    // Kiểm tra socket đã kết nối thành công chưa
    if (socket?.connected) {
      // Nếu đã kết nối → gọi setup ngay lập tức
      setupWhenConnected();
    } else {
      // Nếu chưa kết nối → đợi event 'connect' từ initializeSocket
      // Khi socket kết nối thành công → tự động gọi setupWhenConnected()
      socket.on('connect', setupWhenConnected);
    }

    // ========== CLEANUP: DỌN DẸP KHI COMPONENT UNMOUNT ==========
    // Hàm này được gọi khi:
    // - Component unmount (đóng trang, chuyển trang)
    // - Dependencies thay đổi (hook chạy lại)
    return () => {
      // Nếu có hàm unsubscribe → gọi để ngừng lắng nghe event 'order:new'
      if (unsubscribe) unsubscribe();
      
      // Xóa event listener 'connect' để tránh lỗi memory leak
      socket.off('connect', setupWhenConnected);
    };
  }, dependencies); // Hook sẽ chạy lại khi dependencies thay đổi
};

