import { useState } from "react";
import { Form, Input, Button, Card, Typography, Divider, Checkbox, Space } from "antd";
import {  FaLock, FaEyeSlash, FaEye, FaGoogle, FaEnvelope, FaGift } from "react-icons/fa";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { login } from "@/api/auth";
import { toast } from "@/lib/utils";
import LoginGoogle from "./LoginGoogle";
import ForgotPasswordCard from "./ForgotPassword/ForgotPasswordCard";

const { Title, Text } = Typography;

export default function LoginForm({ onSwitchToRegister }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);
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
      const response = await login(values);
      
      if (response.data.success) {
        const userData = response.data.data.user;
        
        localStorage.setItem("token", response.data.data.accessToken);
        localStorage.setItem("user", JSON.stringify(userData));
        
        // Dispatch event để UserHeader cập nhật
        window.dispatchEvent(new CustomEvent('userUpdated'));
        
        toast.success(" Đăng nhập thành công!");
        
        // Delay redirect để toast có thời gian hiển thị và UserHeader cập nhật
        setTimeout(() => {
          // Kiểm tra role từ backend response
          if (userData.role === 'ADMIN') {
            window.location.href = "/admin";
          } else {
            // Kiểm tra xem có redirect URL không
            const redirectUrl = searchParams.get('redirect');
            if (redirectUrl) {
              // Redirect về trang đã yêu cầu trước đó
              window.location.href = redirectUrl;
            } else {
              window.location.href = "/";
            }
          }
        }, 1000);
      } else {
        toast.error(response.data.message || "Đăng nhập thất bại");
      }
    } catch (error) {
      let errorMessage = "Đăng nhập thất bại";
      
      if (error.response) {
        errorMessage = error.response.data?.message || `Lỗi server: ${error.response.status}`;
      } else if (error.request) {
        errorMessage = "Không thể kết nối đến server. Vui lòng kiểm tra kết nối mạng.";
      } else {
        errorMessage = error.message || "Có lỗi xảy ra";
      }
      
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
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
          Chào mừng bạn quay trở lại! 
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
                { required: true, message: "Vui lòng nhập email của bạn" },
                { type: "email", message: "Email không hợp lệ!" }
              ]}
            >
              <Input
                prefix={<FaEnvelope className="text-gray-400" />}
                placeholder="Nhập email"
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
              <Button
                type="link"
                className="p-0 h-auto text-orange-500 hover:text-orange-600 font-medium text-sm"
                onClick={() => setForgotOpen(true)}// mở card quên mật khẩu
              >
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

          <LoginGoogle />

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

      <ForgotPasswordCard
        open={forgotOpen}
        onClose={() => setForgotOpen(false)}
      />
    </div>
  );
}