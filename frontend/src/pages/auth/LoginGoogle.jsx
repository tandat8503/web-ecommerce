import { GoogleLogin } from "@react-oauth/google";
import { googleLogin } from "@/api/auth";
import { useNavigate } from "react-router-dom";

export default function LoginGoogle() {
  const navigate = useNavigate();

  const handleSuccess = async (credentialResponse) => {
    try {
      const token = credentialResponse?.credential;
      const res = await googleLogin(token);

      localStorage.setItem("token", res.data.token);
      localStorage.setItem("user", JSON.stringify(res.data.user));

      window.dispatchEvent(new CustomEvent("userUpdated"));
      navigate("/");
    } catch (e) {
      console.error(e);
      alert("Đăng nhập Google thất bại");
    }
  };

  return (
    <div className="flex justify-center">
      <GoogleLogin onSuccess={handleSuccess} onError={() => alert("Lỗi Google")} />
    </div>
  );
}
