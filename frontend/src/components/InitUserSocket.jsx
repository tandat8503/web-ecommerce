import { useEffect } from "react";
import { initializeSocket, onOrderStatusUpdate } from "@/utils/socket";
import { toast } from "@/lib/utils";

/**
 * Component khởi tạo WebSocket cho user
 * 
 * CHỨC NĂNG:
 * - Kết nối WebSocket khi user đăng nhập
 * - Lắng nghe cập nhật đơn hàng real-time
 * - Hiển thị thông báo toast khi admin cập nhật đơn hàng
 * - Hoạt động ở MỌI TRANG (không chỉ trang đơn hàng)
 * 
 * VÍ DỤ:
 * - User đang ở trang Home → Admin update đơn → User nhận toast ngay lập tức
 * - User đang ở trang Sản phẩm → Admin update đơn → User nhận toast
 */
export default function InitUserSocket() {
  useEffect(() => {
    // Lấy user từ localStorage
    const userStr = localStorage.getItem('user');
    const user = userStr ? JSON.parse(userStr) : null;

    // Nếu không có user → không setup socket
    if (!user?.id) return;

    // Khởi tạo socket với userId
    const socket = initializeSocket(user.id);

    // Lắng nghe event cập nhật đơn hàng
    const unsubscribe = onOrderStatusUpdate((data) => {
      // Hiển thị thông báo toast
      toast.success(
        `Đơn hàng ${data.orderNumber} đã được cập nhật: ${data.statusLabel}`,
        {
          autoClose: 5000, // Tự động đóng sau 5s
          position: "top-right"
        }
      );

      // ✅ Dispatch custom event để các component khác có thể reload data
      // Component nào cần reload khi có update đơn hàng thì listen event này
      window.dispatchEvent(new CustomEvent('order:status:updated', { 
        detail: data 
      }));
    });

    // Cleanup khi component unmount
    return () => {
      unsubscribe();
      // Không disconnect socket vì có thể đang dùng ở component khác
    };
  }, []); // Chỉ chạy 1 lần khi app load

  // Component này không render gì cả
  return null;
}

