import { useState, useEffect, useCallback, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Row, Col, Typography } from "antd";
import { getUserProfile, uploadAvatar } from "@/api/userProfile";
import { toast } from "@/lib/utils";
import Sidebar from "./Sidebar";
import Profile from "./Profile";
import ChangePassword from "./ChangePassword";
import Address from "./address/Address";

const { Text } = Typography;

export default function ProfileManager() {
  const location = useLocation();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true); // Bắt đầu với loading = true
  const [activeSection, setActiveSection] = useState("profile");
  const [selectedFile, setSelectedFile] = useState(null);
  const [error, setError] = useState(null);
  const isFetching = useRef(false); // Prevent duplicate API calls

  // Memoize fetchUserProfile để tránh re-create function
  const fetchUserProfile = useCallback(async () => {
    // Prevent duplicate calls
    if (isFetching.current) {
      console.log("⏸️ ProfileManager - Already fetching, skipping...");
      return;
    }

    // Kiểm tra token trước khi gọi API
    const token = localStorage.getItem("token");
    if (!token) {
      console.warn("⚠️ ProfileManager - No token found, redirecting to login...");
      setError("Vui lòng đăng nhập để tiếp tục");
      setLoading(false);
      // Có thể redirect về trang login
      // navigate("/login", { state: { from: location.pathname } });
      return;
    }

    try {
      isFetching.current = true;
      setLoading(true);
      setError(null);

      console.log("🔄 ProfileManager - Fetching user profile...");
      const response = await getUserProfile();
      
      if (response.data.code === 200) {
        const userData = response.data.data.user;
        console.log("✅ ProfileManager - User data fetched:", userData);
        setUser(userData);
        
        // Cập nhật localStorage với data từ API
        localStorage.setItem("user", JSON.stringify(userData));
        
        // Dispatch event để UserHeader cập nhật (nhưng không trigger fetch lại)
        window.dispatchEvent(new CustomEvent('userUpdated', { detail: { skipFetch: true } }));
      } else {
        throw new Error(response.data.message || "Lỗi khi tải profile");
      }
    } catch (error) {
      console.error("❌ ProfileManager - Error fetching user profile:", error);
      
      // Xử lý lỗi 401 (token hết hạn)
      if (error.response?.status === 401) {
        setError("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        // navigate("/login", { state: { from: location.pathname } });
      } else {
        setError(error.response?.data?.message || "Không thể tải thông tin profile. Vui lòng thử lại.");
      }
      
      // Không hiển thị toast nếu đã có error state
      // toast.error("❌ Không thể tải thông tin profile");
    } finally {
      setLoading(false);
      isFetching.current = false;
    }
  }, [navigate, location.pathname]);

  // Lấy thông tin user từ API khi component mount
  useEffect(() => {
    fetchUserProfile();
  }, [fetchUserProfile]); // Giờ fetchUserProfile đã được memoize

  // Lắng nghe event userUpdated (chỉ fetch lại nếu cần)
  useEffect(() => {
    const handleUserUpdated = (event) => {
      // Kiểm tra xem có cần fetch lại không
      if (event.detail?.skipFetch) {
        console.log("ℹ️ ProfileManager - userUpdated event received, but skipFetch=true");
        return;
      }
      
      console.log("🔔 ProfileManager - Nhận được event userUpdated, reload user data");
      fetchUserProfile();
    };

    window.addEventListener("userUpdated", handleUserUpdated);

    return () => {
      window.removeEventListener("userUpdated", handleUserUpdated);
    };
  }, [fetchUserProfile]);

  const handleUploadAvatar = async (file) => {
    try {
      setLoading(true);
      const response = await uploadAvatar(file);
      
      console.log("Full API response:", response);
      console.log("Response data:", response.data);
      
      if (response.data.code === 200) {
        const updatedUser = response.data.data.user;
        console.log("Updated user after upload:", updatedUser);
        console.log("Avatar URL from API:", updatedUser.avatar);
        console.log("Avatar field exists:", 'avatar' in updatedUser);
        console.log("Avatar value type:", typeof updatedUser.avatar);
        
        setUser(updatedUser);
        localStorage.setItem("user", JSON.stringify(updatedUser));
        
        // Clear selected file after successful upload
        setSelectedFile(null);
        
        // Dispatch custom event to notify other components
        window.dispatchEvent(new CustomEvent('userUpdated'));
        
        toast.success("🎉 Cập nhật avatar thành công!");
      } else {
        console.error("API error response:", response.data);
        toast.error(`❌ ${response.data.message || "Upload avatar thất bại"}`);
      }
    } catch (error) {
      console.error("Upload avatar error:", error);
      const errorMessage = error.response?.data?.message || "Upload avatar thất bại";
      toast.error(`❌ ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };


  // Hiển thị loading hoặc error
  if (loading && !user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <Text className="text-gray-600">Đang tải thông tin...</Text>
        </div>
      </div>
    );
  }

  // Hiển thị error nếu có
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="text-6xl mb-4">⚠️</div>
          <Text className="text-lg font-medium text-gray-800 block mb-2">{error}</Text>
          <button
            onClick={() => {
              setError(null);
              fetchUserProfile();
            }}
            className="mt-4 px-6 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition"
          >
            Thử lại
          </button>
        </div>
      </div>
    );
  }

  // Nếu không có user sau khi load xong (không nên xảy ra)
  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Text className="text-gray-600">Không tìm thấy thông tin người dùng</Text>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <Row gutter={[24, 24]}>
          {/* Left Sidebar */}
          <Col xs={24} lg={6}>
            <Sidebar
              user={user}
              activeSection={activeSection}
              setActiveSection={setActiveSection}
              onUploadAvatar={handleUploadAvatar}
              selectedFile={selectedFile}
              setSelectedFile={setSelectedFile}
            />
          </Col>

          {/* Right Content */}
          <Col xs={24} lg={18}>
            {activeSection === "profile" && (
              <Profile user={user} setUser={setUser} />
            )}
            {activeSection === "password" && (
              <ChangePassword />
            )}
            {activeSection === "address" && (
              <Address isActive={activeSection === "address"} />
            )}
          </Col>
        </Row>
      </div>
    </div>
  );
}
