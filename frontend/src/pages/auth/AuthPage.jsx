import { useState } from "react";
import { Row, Col, Typography, Divider, Badge } from "antd";
import { FaShoppingBag, FaHeart, FaStar, FaTruck, FaShieldAlt } from "react-icons/fa";
import { Link } from "react-router-dom";
import LoginForm from "@/pages/auth/LoginForm";
import RegisterForm from "@/pages/auth/RegisterForm";

const { Title, Text } = Typography;

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);

  const switchToRegister = () => setIsLogin(false);
  const switchToLogin = () => setIsLogin(true);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-orange-50 to-yellow-50 relative overflow-hidden">
      {/* Background Decorations */}
      <div className="absolute inset-0">
        <div className="absolute top-20 left-20 w-32 h-32 bg-orange-200 rounded-full opacity-20 animate-pulse"></div>
        <div className="absolute top-40 right-32 w-24 h-24 bg-yellow-200 rounded-full opacity-30 animate-bounce"></div>
        <div className="absolute bottom-32 left-1/4 w-40 h-40 bg-orange-200 rounded-full opacity-25 animate-pulse"></div>
        <div className="absolute bottom-20 right-20 w-28 h-28 bg-red-200 rounded-full opacity-30 animate-bounce"></div>
        
        {/* Floating Icons */}
        <div className="absolute top-32 right-20 text-orange-300 text-4xl animate-bounce">
          <FaStar />
        </div>
        <div className="absolute bottom-40 left-20 text-yellow-300 text-3xl animate-pulse">
          <FaHeart />
        </div>
        <div className="absolute top-1/2 left-10 text-orange-200 text-2xl animate-bounce">
          <FaTruck />
        </div>
      </div>

      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-orange-100 shadow-sm relative z-10">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link to="/" className="flex items-center gap-3 group">
              <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-500 rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all duration-300 transform group-hover:scale-105">
                <FaShoppingBag className="text-white text-xl" />
              </div>
              <div>
                <Title level={3} className="!mb-0 text-orange-500 group-hover:text-orange-600 transition-colors">
                  Nội Thất Văn Phòng
                </Title>
                <Text className="text-xs text-gray-500">Bàn ghế văn phòng cao cấp</Text>
              </div>
            </Link>
            
            
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-5xl mx-auto px-4 py-8 relative z-10">
        <Row gutter={[32, 32]} align="middle">
          {/* Left side - Image/Banner */}
          <Col xs={0} lg={10}>
            <div className="text-center relative">
              {/* Main Image with Decoration */}
              <div className="relative mb-6 group">
                <div className="absolute -inset-3 bg-gradient-to-r from-orange-400 to-red-400 rounded-xl blur opacity-20 group-hover:opacity-30 transition-opacity"></div>
                <div className="relative bg-white rounded-xl p-6 shadow-xl transform group-hover:scale-105 transition-all duration-300">
                  <img 
                    src="https://cdn.autonomous.ai/production/ecm/250701/Smd-2(1).webp" 
                    alt="Bàn ghế văn phòng" 
                    className="w-full rounded-lg shadow-md max-h-64 object-cover"
                  />
                  <div className="absolute -top-3 -right-3 bg-orange-500 text-white px-2 py-1 rounded-full text-xs font-bold shadow-md">
                    NEW
                  </div>
                </div>
              </div>

              {/* Content with Icons */}
              <div className="space-y-4">
                <div>
                  <Title level={2} className="!text-3xl !font-bold !mb-3 text-gray-800">
                    Bàn ghế văn phòng{" "}
                    <span className="bg-gradient-to-r from-orange-500 to-red-500 bg-clip-text text-transparent">
                      cao cấp
                    </span>
                  </Title>
                  <Text className="text-base text-gray-600 leading-relaxed">
                    Bàn ghế văn phòng chất lượng Nhật Bản<br/>
                    <span className="text-orange-600 font-semibold">Thiết kế hiện đại</span> - <span className="text-green-600 font-semibold">Giá cạnh tranh</span> - <span className="text-blue-600 font-semibold">Bảo hành 12 tháng</span>
                  </Text>
                </div>

                {/* Feature Cards */}
                <div className="grid grid-cols-3 gap-3 mt-6">
                  <div className="text-center p-3 bg-white/60 backdrop-blur-sm rounded-lg shadow-md hover:shadow-lg transition-all duration-300 transform hover:scale-105">
                    <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center mx-auto mb-2 shadow-sm">
                      <FaTruck className="text-white text-lg" />
                    </div>
                    <Text className="text-green-700 font-semibold text-xs block">Miễn phí lắp đặt</Text>
                    <Text className="text-green-600 text-xs">Hà Nội & TP.HCM</Text>
                  </div>
                  
                  <div className="text-center p-3 bg-white/60 backdrop-blur-sm rounded-lg shadow-md hover:shadow-lg transition-all duration-300 transform hover:scale-105">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center mx-auto mb-2 shadow-sm">
                      <FaShieldAlt className="text-white text-lg" />
                    </div>
                    <Text className="text-blue-700 font-semibold text-xs block">Chất lượng Nhật</Text>
                    <Text className="text-blue-600 text-xs">Gỗ cao cấp</Text>
                  </div>

                  
                  
                  <div className="text-center p-3 bg-white/60 backdrop-blur-sm rounded-lg shadow-md hover:shadow-lg transition-all duration-300 transform hover:scale-105">
                    <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg flex items-center justify-center mx-auto mb-2 shadow-sm">
                      <FaStar className="text-white text-lg" />
                    </div>
                    <Text className="text-purple-700 font-semibold text-xs block">Thiết kế</Text>
                    <Text className="text-purple-600 text-xs">Hiện đại</Text>
                  </div>
                </div>
              </div>
            </div>
          </Col>

          {/* Right side - Form */}
          <Col xs={24} lg={14}>
            <div className="max-w-sm mx-auto">
              {isLogin ? (
                <LoginForm onSwitchToRegister={switchToRegister} />
              ) : (
                <RegisterForm onSwitchToLogin={switchToLogin} />
              )}
            </div>
          </Col>
        </Row>
      </div>

      {/* Footer */}
      <div className="bg-white/80 backdrop-blur-sm border-t border-orange-100 mt-12 relative z-10">
        <div className="max-w-5xl mx-auto px-4 py-6">
          <div className="text-center">
            <div className="mb-4">
              <Text className="text-gray-500 text-sm">
                © 2025 Nội Thất Văn Phòng. Tất cả quyền được bảo lưu.
              </Text>
            </div>
           
          </div>
        </div>
      </div>
    </div>
  );
}