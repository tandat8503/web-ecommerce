import { useState, useEffect } from "react";
import { Row, Col, Typography, Modal } from "antd";
import { getUserProfile, uploadAvatar } from "@/api/userProfile";
import { toast } from "react-toastify";
import Sidebar from "./Sidebar";
import Profile from "./Profile";
import ChangePassword from "./ChangePassword";
import LoginHistory from "./LoginHistory";
import Address from "./Address";

const { Text } = Typography;

export default function ProfileManager() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeSection, setActiveSection] = useState("profile");
  const [selectedFile, setSelectedFile] = useState(null);

  // Lấy thông tin user từ API
  useEffect(() => {
    fetchUserProfile();
  }, []);

  const fetchUserProfile = async () => {
    try {
      setLoading(true);
      const response = await getUserProfile();
      console.log("getUserProfile API response:", response);
      console.log("getUserProfile response data:", response.data);
      
      if (response.data.code === 200) {
        const userData = response.data.data.user;
        console.log("User data from getUserProfile API:", userData);
        console.log("Avatar from getUserProfile:", userData.avatar);
        console.log("Avatar type:", typeof userData.avatar);
        setUser(userData);
        
        // Cập nhật localStorage với data từ API
        localStorage.setItem("user", JSON.stringify(userData));
        console.log("Updated localStorage with API data");
        
        // Dispatch event để UserHeader cập nhật
        window.dispatchEvent(new CustomEvent('userUpdated'));
      }
    } catch (error) {
      console.error("Error fetching user profile:", error);
      toast.error("❌ Không thể tải thông tin profile");
    } finally {
      setLoading(false);
    }
  };

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


  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <Text>Đang tải thông tin...</Text>
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
            {activeSection === "history" && (
              <LoginHistory />
            )}
            {activeSection === "address" && (
              <Address />
            )}
          </Col>
        </Row>
      </div>
    </div>
  );
}
