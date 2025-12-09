import { GoogleLogin } from "@react-oauth/google";
import { googleLogin } from "@/api/auth";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "@/lib/utils";

export default function LoginGoogle() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const handleSuccess = async (credentialResponse) => {
    try {
      const token = credentialResponse?.credential;
      if (!token) {
        toast.error("Không nhận được token từ Google");
        return;
      }

      const res = await googleLogin(token);

      // Backend trả về: { success: true, message: "...", data: { user: {...}, accessToken: "..." } }
      if (!res.data?.success || !res.data?.data) {
        toast.error(res.data?.message || "Đăng nhập Google thất bại");
        return;
      }

      const { user, accessToken } = res.data.data;

      if (!accessToken || !user) {
        toast.error("Dữ liệu phản hồi không hợp lệ");
        return;
      }

      // Lưu token và thông tin user vào localStorage
      localStorage.setItem("token", accessToken);
      localStorage.setItem("user", JSON.stringify(user));

      console.log("✅ User data từ googleLogin response:", user);
      console.log("✅ Avatar URL từ response:", user.avatar);

      // Dispatch event để UserHeader cập nhật avatar
      window.dispatchEvent(new CustomEvent("userUpdated"));

      toast.success("🎉 Đăng nhập Google thành công!");

      // Kiểm tra xem có redirect URL không
      const redirectUrl = searchParams.get('redirect');
      setTimeout(() => {
        if (redirectUrl) {
          // Redirect về trang đã yêu cầu trước đó
          navigate(redirectUrl);
        } else {
          navigate("/");
        }
      }, 1000);
    } catch (e) {
      console.error("Google Login Error:", e);
      
      let errorMessage = "Đăng nhập Google thất bại";
      
      if (e.response) {
        errorMessage = e.response.data?.message || e.response.data?.mess || errorMessage;
      } else if (e.message) {
        if (e.message.includes("popup_closed_by_user")) {
          errorMessage = "Bạn đã đóng cửa sổ đăng nhập";
        } else if (e.message.includes("idpiframe_initialization_failed")) {
          errorMessage = "Không thể khởi tạo Google OAuth. Vui lòng kiểm tra cấu hình.";
        }
      }
      
      toast.error(errorMessage);
    }
  };

  const handleError = () => {
    toast.error("Đăng nhập Google thất bại. Vui lòng thử lại.");
  };

  return (
    <div className="flex justify-center">
      <GoogleLogin
        onSuccess={handleSuccess}
        onError={handleError}
        theme="outline"
        size="large"
        shape="rectangular"
        text="signin_with"
        locale="vi"
        useOneTap={false}
      />
    </div>
  );
}
