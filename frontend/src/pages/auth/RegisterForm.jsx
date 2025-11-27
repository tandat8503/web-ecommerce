import { useState } from "react";
import { Form, Input, Button, Card, Typography, Divider, Radio, DatePicker, Space } from "antd";
import { FaUser, FaLock, FaEyeSlash, FaEye, FaGoogle, FaEnvelope, FaPhone, FaGift, FaCheckCircle, FaStar, FaTruck, FaShieldAlt } from "react-icons/fa";
import { Link } from "react-router-dom";
import { register } from "@/api/auth";
import { getUserProfile } from "@/api/userProfile";
import { toast } from "@/lib/utils";
import LoginGoogle from "./LoginGoogle";

const { Title, Text } = Typography;

export default function RegisterForm({ onSwitchToLogin }) {
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();
  const [formValues, setFormValues] = useState({});
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: ""
  });

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  // Kiểm tra form có hợp lệ không
  const isFormValid = () => {
    const { firstName, lastName, email, password, confirmPassword } = formValues;
    return firstName && lastName && email && password && confirmPassword && 
           firstName.trim() !== '' && lastName.trim() !== '' && email.trim() !== '' && 
           password.trim() !== '' && confirmPassword.trim() !== '' && password.length >= 6;
  };

  // Xử lý khi form values thay đổi
  const handleFormChange = (changedValues, allValues) => {
    setFormValues(allValues);
  };


  const onFinish = async (values) => {
    try {
      setLoading(true);
      
      // Chuẩn bị data, loại bỏ phone nếu trống
      const registerData = {
        firstName: values.firstName,
        lastName: values.lastName,
        email: values.email,
        password: values.password,
        confirmPassword: values.confirmPassword
      };
      
      // Chỉ thêm phone nếu có giá trị
      if (values.phone && values.phone.trim()) {
        registerData.phone = values.phone.trim();
      }
      
      console.log("Register data being sent:", registerData);
      
      const response = await register(registerData);
      console.log("Register response:", response);
      
      if (response.data.success) {
        console.log("Register response user data:", response.data.data.user);
        localStorage.setItem("token", response.data.data.accessToken);
        localStorage.setItem("user", JSON.stringify(response.data.data.user));
        
        // Gọi API getUserProfile để lấy đầy đủ thông tin user (bao gồm avatar)
        try {
          console.log("Fetching full user profile after registration...");
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
          // Vẫn tiếp tục với user data từ register nếu có lỗi
        }
        
        console.log("Register successful");
        toast.success(" Đăng ký thành công! Chào mừng bạn đến với OFFICE PRO!");
        window.location.href = "/";
      }
    } catch (error) {
      console.error("Register error:", error);
      console.error("Error response:", error.response);
      
      let errorMessage = "Đăng ký thất bại";
      
      if (error.response) {
        // Server trả về response
        errorMessage = error.response.data?.message || `Lỗi server: ${error.response.status}`;
      } else if (error.request) {
        // Request được gửi nhưng không nhận được response
        errorMessage = "Không thể kết nối đến server. Vui lòng kiểm tra kết nối mạng.";
      } else {
        // Lỗi khác
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
        <div className="absolute -top-3 -left-3 w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
          <FaGift className="text-green-500 text-xs" />
        </div>
        <div className="absolute -top-2 -right-2 w-5 h-5 bg-yellow-100 rounded-full flex items-center justify-center">
          <FaStar className="text-yellow-500 text-xs" />
        </div>
        <Title level={2} className="!text-2xl !font-bold !mb-1 bg-gradient-to-r from-green-500 to-blue-500 bg-clip-text text-transparent">
          Đăng ký
        </Title>
        <Text className="text-gray-600 text-base">
          Tạo tài khoản để mua sắm dễ dàng hơn! 🛍️
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
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-green-500 via-blue-500 to-purple-500"></div>
        <div className="absolute top-4 right-4 w-3 h-3 bg-green-200 rounded-full animate-pulse"></div>
        <div className="absolute bottom-4 left-4 w-2 h-2 bg-blue-200 rounded-full animate-bounce"></div>

        <div className="p-6">
          <Form
            form={form}
            name="register"
            onFinish={onFinish}
            onValuesChange={handleFormChange}
            layout="vertical"
            size="large"
          >
            <div className="grid grid-cols-2 gap-3">
              <Form.Item
                name="firstName"
                label={<span className="text-gray-700 font-semibold text-sm flex items-center gap-2">
                  <FaUser className="text-green-500" />
                  Họ
                </span>}
                rules={[
                  { required: true, message: "Vui lòng nhập họ!" },
                  { min: 2, message: "Họ phải có ít nhất 2 ký tự!" }
                ]}
              >
                <Input
                  prefix={<FaUser className="text-gray-400" />}
                  placeholder="Nhập họ"
                  className="h-10 rounded-lg border-2 border-gray-200 focus:border-green-500 focus:shadow-lg transition-all duration-300 hover:border-gray-300"
                  style={{ fontSize: '14px' }}
                />
              </Form.Item>

              <Form.Item
                name="lastName"
                label={<span className="text-gray-700 font-semibold text-sm flex items-center gap-2">
                  <FaUser className="text-green-500" />
                  Tên
                </span>}
                rules={[
                  { required: true, message: "Vui lòng nhập tên!" },
                  { min: 2, message: "Tên phải có ít nhất 2 ký tự!" }
                ]}
              >
                <Input
                  prefix={<FaUser className="text-gray-400" />}
                  placeholder="Nhập tên"
                  className="h-10 rounded-lg border-2 border-gray-200 focus:border-green-500 focus:shadow-lg transition-all duration-300 hover:border-gray-300"
                  style={{ fontSize: '14px' }}
                />
              </Form.Item>
            </div>

            <Form.Item
              name="email"
              label={<span className="text-gray-700 font-semibold text-sm flex items-center gap-2">
                <FaEnvelope className="text-green-500" />
                Email
              </span>}
              rules={[
                { required: true, message: "Vui lòng nhập email!" },
                { type: "email", message: "Email không hợp lệ!" }
              ]}
            >
              <Input
                prefix={<FaEnvelope className="text-gray-400" />}
                placeholder="Nhập email của bạn"
                className="h-10 rounded-lg border-2 border-gray-200 focus:border-green-500 focus:shadow-lg transition-all duration-300 hover:border-gray-300"
                style={{ fontSize: '14px' }}
              />
            </Form.Item>

            <Form.Item
              name="phone"
              label={<span className="text-gray-700 font-semibold text-sm flex items-center gap-2">
                <FaPhone className="text-green-500" />
                Số điện thoại (tùy chọn)
              </span>}
              rules={[
                { pattern: /^[0-9]{10,11}$/, message: "Số điện thoại phải có 10-11 chữ số!" }
              ]}
            >
              <Input
                prefix={<FaPhone className="text-gray-400" />}
                placeholder="Nhập số điện thoại"
                className="h-10 rounded-lg border-2 border-gray-200 focus:border-green-500 focus:shadow-lg transition-all duration-300 hover:border-gray-300"
                style={{ fontSize: '14px' }}
              />
            </Form.Item>

            <Form.Item
              name="password"
              label={<span className="text-gray-700 font-semibold text-sm flex items-center gap-2">
                <FaLock className="text-green-500" />
                Mật khẩu
              </span>}
              rules={[
                { required: true, message: "Vui lòng nhập mật khẩu!" },
                { min: 6, message: "Mật khẩu phải có ít nhất 6 ký tự!" }
              ]}
            >
              <Input.Password
                prefix={<FaLock className="text-gray-400" />}
                placeholder="Tạo mật khẩu mới"
                iconRender={(visible) => (visible ? <FaEye /> : <FaEyeSlash />)}
                className="h-10 rounded-lg border-2 border-gray-200 focus:border-green-500 focus:shadow-lg transition-all duration-300 hover:border-gray-300"
                style={{ fontSize: '14px' }}
                onChange={handleInputChange}
                name="password"
              />
            </Form.Item>

            <Form.Item
              name="confirmPassword"
              label={<span className="text-gray-700 font-semibold text-sm flex items-center gap-2">
                <FaLock className="text-green-500" />
                Xác nhận mật khẩu
              </span>}
              dependencies={['password']}
              rules={[
                { required: true, message: "Vui lòng xác nhận mật khẩu!" },
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    if (!value || getFieldValue('password') === value) {
                      return Promise.resolve();
                    }
                    return Promise.reject(new Error('Mật khẩu xác nhận không khớp!'));
                  },
                }),
              ]}
            >
              <Input.Password
                prefix={<FaLock className="text-gray-400" />}
                placeholder="Nhập lại mật khẩu"
                iconRender={(visible) => (visible ? <FaEye /> : <FaEyeSlash />)}
                className="h-10 rounded-lg border-2 border-gray-200 focus:border-green-500 focus:shadow-lg transition-all duration-300 hover:border-gray-300"
                style={{ fontSize: '14px' }}
              />
            </Form.Item>

            <Form.Item className="!mb-4">
              <Button
                type="primary"
                htmlType="submit"
                loading={loading}
                disabled={!isFormValid() || loading}
                className={`w-full h-12 border-0 rounded-lg font-bold text-base shadow-lg transition-all duration-300 ${
                  isFormValid() && !loading 
                    ? 'bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600 hover:shadow-xl transform hover:scale-[1.02]' 
                    : 'bg-gray-300 cursor-not-allowed'
                }`}
                style={{
                  background: isFormValid() && !loading 
                    ? 'linear-gradient(135deg, #10b981 0%, #3b82f6 100%)' 
                    : '#d1d5db',
                  border: 'none',
                  boxShadow: isFormValid() && !loading 
                    ? '0 8px 20px rgba(16, 185, 129, 0.3)' 
                    : '0 2px 4px rgba(0, 0, 0, 0.1)'
                }}
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Đang tạo tài khoản...
                  </span>
                ) : (
                  " ĐĂNG KÝ "
                )}
              </Button>
            </Form.Item>
          </Form>

          <Divider className="my-6">
            <Text className="text-gray-400 text-xs font-medium px-4 bg-white">Hoặc đăng ký với</Text>
          </Divider>
              {/* Google Login */}
          <LoginGoogle />

          <div className="text-center mt-6">
            <Text className="text-gray-600 text-base">
              Đã có tài khoản?{" "}
              <Button
                type="link"
                onClick={onSwitchToLogin}
                className="p-0 h-auto font-bold text-base text-green-500 hover:text-green-600 transition-colors"
              >
                Đăng nhập 
              </Button>
            </Text>
          </div>
        </div>
      </Card>

    </div>
  );
}