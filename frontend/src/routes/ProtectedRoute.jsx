import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "@/lib/utils";

export default function ProtectedRoute({ children, requireAdmin = false }) {
  const [loading, setLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = () => {
    try {
      // Kiểm tra token
      const token = localStorage.getItem("token");
      if (!token) {
        toast.error("❌ Vui lòng đăng nhập để truy cập");
        navigate("/auth");
        return;
      }

      // Kiểm tra user data
      const userData = localStorage.getItem("user");
      if (!userData) {
        toast.error("❌ Thông tin người dùng không hợp lệ");
        navigate("/auth");
        return;
      }

      const user = JSON.parse(userData);
      
      // Kiểm tra quyền admin nếu cần
      if (requireAdmin) {
        if (user.role !== 'ADMIN') {
          toast.error("❌ Bạn không có quyền truy cập trang admin");
          navigate("/");
          return;
        }
      }

      // Kiểm tra trạng thái active
      if (!user.isActive) {
        toast.error("❌ Tài khoản đã bị vô hiệu hóa");
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        navigate("/auth");
        return;
      }

      setIsAuthorized(true);
    } catch (error) {
      console.error("Auth check error:", error);
      toast.error("❌ Lỗi xác thực");
      navigate("/auth");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Đang kiểm tra quyền truy cập...</p>
        </div>
      </div>
    );
  }

  if (!isAuthorized) {
    return null;
  }

  return children;
}
