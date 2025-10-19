import { useState } from "react";
import { Form, Input, Button, Card, Typography, Divider, Checkbox, Space } from "antd";
import {  FaLock, FaEyeSlash, FaEye, FaGoogle, FaEnvelope, FaGift } from "react-icons/fa";
import { Link } from "react-router-dom";
import { login } from "@/api/auth";
import { getUserProfile } from "@/api/userProfile";
import { toast } from "react-toastify";

const { Title, Text } = Typography;

export default function LoginForm({ onSwitchToRegister }) {
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();
  const [formValues, setFormValues] = useState({});

  // Kiểm tra form có hợp lệ không
  const isFormValid = () => {
    const { email, password } = formValues;
    return email && password && email.trim() !== '' && password.trim() !== '' && password.length >= 6;
  };

  // Xử lý khi form values thay đổi
  const handleFormChange = (changedValues, allValues) => {
    setFormValues(allValues);
  };

  const onFinish = async (values) => {
    try {
      setLoading(true);
      console.log("Login data being sent:", values);
      
      const response = await login(values);
      console.log("Login response:", response);
      
      if (response.data.success) {
        const userData = response.data.data.user;
        console.log("Login response user data:", userData);
        console.log("Login response avatar:", userData.avatar);
        console.log("Login response avatar type:", typeof userData.avatar);
        
        localStorage.setItem("token", response.data.data.accessToken);
        localStorage.setItem("user", JSON.stringify(userData));
        
        // Gọi API getUserProfile để lấy đầy đủ thông tin user (bao gồm avatar)
        try {
          console.log("Fetching full user profile after login...");
          const profileResponse = await getUserProfile();
          if (profileResponse.data.code === 200) {
            const fullUserData = profileResponse.data.data.user;
            console.log("Full user profile from API:", fullUserData);
            console.log("Full user profile avatar:", fullUserData.avatar);
            
            // Cập nhật localStorage với thông tin đầy đủ
            localStorage.setItem("user", JSON.stringify(fullUserData));
            console.log("Updated localStorage with full user profile");
            
            // Dispatch event để UserHeader cập nhật
            window.dispatchEvent(new CustomEvent('userUpdated'));
          }
        } catch (profileError) {
          console.error("Error fetching full user profile:", profileError);
          // Vẫn tiếp tục với user data từ login nếu có lỗi
        }
        
        console.log("Login successful, showing toast...");
        toast.success("🎉 Đăng nhập thành công!", {
          position: "top-right",
          autoClose: 2000,
        });
        
        // Delay redirect để toast có thời gian hiển thị và UserHeader cập nhật
        setTimeout(() => {
          if (response.data.data.user.userType === 'admin') {
            window.location.href = "/admin";
          } else {
            window.location.href = "/";
          }
        }, 2500);
      } else {
        console.log("Login failed:", response.data.message);
        toast.error(` ${response.data.message || "Đăng nhập thất bại"}`, {
          position: "top-right",
          autoClose: 3000,
        });
      }
    } catch (error) {
      console.error("Login error:", error);
      console.error("Error response:", error.response);
      
      let errorMessage = "Đăng nhập thất bại";
      
      if (error.response) {
        errorMessage = error.response.data?.message || `Lỗi server: ${error.response.status}`;
      } else if (error.request) {
        errorMessage = "Không thể kết nối đến server. Vui lòng kiểm tra kết nối mạng.";
      } else {
        errorMessage = error.message || "Có lỗi xảy ra";
      }
      
      toast.error(` ${errorMessage}`, {
        position: "top-right",
        autoClose: 5000,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    toast.info("Tính năng đăng nhập Google đang được phát triển!");
  };

  return (
    <div className="w-full">
      {/* Header with Decoration */}
      <div className="text-center mb-6 relative">
        <div className="absolute -top-3 -right-3 w-6 h-6 bg-orange-100 rounded-full flex items-center justify-center">
          <FaGift className="text-orange-500 text-xs" />
        </div>
        <Title level={2} className="!text-2xl !font-bold !mb-1 bg-gradient-to-r from-orange-500 to-red-500 bg-clip-text text-transparent">
          Đăng nhập
        </Title>
        <Text className="text-gray-600 text-base">
          Chào mừng bạn quay trở lại! 👋
        </Text>
      </div>

      {/* Form Card with Enhanced Styling */}
      <Card 
        className="border-0 shadow-2xl rounded-2xl overflow-hidden relative"
        style={{
          background: 'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.9) 100%)',
          backdropFilter: 'blur(10px)'
        }}
      >
        {/* Decorative Elements */}
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-orange-500 via-red-500 to-pink-500"></div>
        <div className="absolute top-4 right-4 w-3 h-3 bg-orange-200 rounded-full animate-pulse"></div>
        <div className="absolute bottom-4 left-4 w-2 h-2 bg-yellow-200 rounded-full animate-bounce"></div>

        <div className="p-6">
          <Form
            form={form}
            name="login"
            onFinish={onFinish}
            onValuesChange={handleFormChange}
            layout="vertical"
            size="large"
          >
            <Form.Item
              name="email"
              label={<span className="text-gray-700 font-semibold text-sm flex items-center gap-2">
                <FaEnvelope className="text-orange-500" />
                Email
              </span>}
              rules={[
                { required: true, message: "Vui lòng nhập email hoặc số điện thoại!" },
                { type: "email", message: "Email không hợp lệ!" }
              ]}
            >
              <Input
                prefix={<FaEnvelope className="text-gray-400" />}
                placeholder="Nhập email hoặc số điện thoại"
                className="h-12 rounded-lg border-2 border-gray-200 focus:border-orange-500 focus:shadow-lg transition-all duration-300 hover:border-gray-300"
                style={{ fontSize: '14px' }}
              />
            </Form.Item>

            <Form.Item
              name="password"
              label={<span className="text-gray-700 font-semibold text-sm flex items-center gap-2">
                <FaLock className="text-orange-500" />
                Mật khẩu
              </span>}
              rules={[
                { required: true, message: "Vui lòng nhập mật khẩu!" },
                { min: 6, message: "Mật khẩu phải có ít nhất 6 ký tự!" }
              ]}
            >
              <Input.Password
                prefix={<FaLock className="text-gray-400" />}
                placeholder="Nhập mật khẩu"
                iconRender={(visible) => (visible ? <FaEye /> : <FaEyeSlash />)}
                className="h-12 rounded-lg border-2 border-gray-200 focus:border-orange-500 focus:shadow-lg transition-all duration-300 hover:border-gray-300"
                style={{ fontSize: '14px' }}
              />
            </Form.Item>

            <div className="flex justify-between items-center mb-4">
              <Form.Item name="remember" valuePropName="checked" className="!mb-0">
                <Checkbox className="text-gray-600 text-sm">
                  <span className="font-medium">Ghi nhớ đăng nhập</span>
                </Checkbox>
              </Form.Item>
              <Button type="link" className="p-0 h-auto text-orange-500 hover:text-orange-600 font-medium text-sm">
                Quên mật khẩu?
              </Button>
            </div>

            <Form.Item className="!mb-4">
              <Button
                type="primary"
                htmlType="submit"
                loading={loading}
                disabled={!isFormValid() || loading}
                className={`w-full h-12 border-0 rounded-lg font-bold text-base shadow-lg transition-all duration-300 ${
                  isFormValid() && !loading 
                    ? 'bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 hover:shadow-xl transform hover:scale-[1.02]' 
                    : 'bg-gray-300 cursor-not-allowed'
                }`}
                style={{
                  background: isFormValid() && !loading 
                    ? 'linear-gradient(135deg, #ff6b35 0%, #f7931e 100%)' 
                    : '#d1d5db',
                  border: 'none',
                  boxShadow: isFormValid() && !loading 
                    ? '0 8px 20px rgba(255, 107, 53, 0.3)' 
                    : '0 2px 4px rgba(0, 0, 0, 0.1)'
                }}
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Đang đăng nhập...
                  </span>
                ) : (
                  " ĐĂNG NHẬP "
                )}
              </Button>
            </Form.Item>
          </Form>

          <Divider className="my-6">
            <Text className="text-gray-400 text-xs font-medium px-4 bg-white">Hoặc đăng nhập với</Text>
          </Divider>

          <Button
            onClick={handleGoogleLogin}
            className="w-full h-12 border-2 border-gray-200 hover:border-gray-300 hover:bg-gray-50 rounded-lg font-semibold text-sm flex items-center justify-center gap-2 transition-all duration-300 transform hover:scale-[1.02] shadow-md hover:shadow-lg"
          >
            <FaGoogle className="text-xl text-red-500" />
            <span>Google</span>
          </Button>

          <div className="text-center mt-6">
            <Text className="text-gray-600 text-base">
              Bạn chưa có tài khoản?{" "}
              <Button
                type="link"
                onClick={onSwitchToRegister}
                className="p-0 h-auto font-bold text-base text-orange-500 hover:text-orange-600 transition-colors"
              >
                Đăng ký 
              </Button>
            </Text>
            
           
          </div>
        </div>
      </Card>
    </div>
  );
}