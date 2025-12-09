import { useEffect } from "react";
import { initializeSocket, onOrderStatusUpdate, onUserDeactivated } from "@/utils/socket";
import { logout } from "@/api/auth";
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

    // ✅ Khởi tạo socket cho CẢ KHÁCH và USER
    // - Có userId → Khởi tạo với userId (nhận thông báo đơn hàng + category + user deactivated)
    // - Không có userId (guest) → Khởi tạo không có userId (chỉ nhận category)
    const socket = initializeSocket(user?.id || null);

    // Lắng nghe event cập nhật đơn hàng (CHỈ cho user đã đăng nhập)
    let unsubscribeOrder = () => {};
    if (user?.id) {
      unsubscribeOrder = onOrderStatusUpdate((data) => {
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

      // Lắng nghe event user bị vô hiệu hóa (CHỈ cho user đã đăng nhập)
      const unsubscribeDeactivated = onUserDeactivated((data) => {
        console.log('🔴 Socket nhận event user:deactivated:', data);
        console.log('User hiện tại ID:', user.id);
        
        // Kiểm tra xem có phải user hiện tại không
        if (data.userId === user.id) {
          console.log('✅ User ID khớp, chuẩn bị logout');
          
          // ✅ Hiển thị thông báo để user biết lý do bị logout
          // Giúp tránh user nghĩ là lỗi hệ thống
          toast.error(data.message || "Tài khoản của bạn đã bị vô hiệu hóa", {
            autoClose: 500000,
            position: "top-right"
          });

          // Delay một chút để toast kịp hiển thị trước khi logout
          setTimeout(() => {
            console.log('🔄 Bắt đầu logout...');
            
            // Logout ngay lập tức (sau khi hiển thị toast)
            logout().finally(() => {
              console.log('✅ Logout thành công, clear localStorage...');
              
              // Clear localStorage
              localStorage.removeItem('user');
              localStorage.removeItem('token');
              
              // Redirect về trang chủ và reload để clear tất cả state
              window.location.href = '/';
            });
          }, 500); // Delay 500ms để toast kịp hiển thị
        } else {
          console.log('❌ User ID không khớp, không logout');
        }
      });

      // Cleanup khi component unmount
      return () => {
        unsubscribeOrder();
        unsubscribeDeactivated();
        // Không disconnect socket vì có thể đang dùng ở component khác
      };
    }

    // Cleanup cho guest (không có listener nào)
    return () => {
      unsubscribeOrder();
    };
  }, []); // Chỉ chạy 1 lần khi app load

  // Component này không render gì cả
  return null;
}

