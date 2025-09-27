import { Button, Typography, Space } from "antd";
import { FaHome, FaArrowLeft, FaSearch, FaExclamationTriangle } from "react-icons/fa";
import { Link, useNavigate } from "react-router-dom";

const { Title, Text, Paragraph } = Typography;

export default function NotFound() {
  const navigate = useNavigate();

  const handleGoBack = () => {
    navigate(-1);
  };

  const handleGoHome = () => {
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center px-4">
      <div className="max-w-2xl mx-auto text-center">
        {/* 404 Icon */}
        <div className="mb-8">
          <div className="relative inline-block">
            <div className="text-9xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-purple-600 animate-pulse">
              404
            </div>
            <div className="absolute -top-4 -right-4">
              <FaExclamationTriangle className="text-6xl text-orange-500 animate-bounce" />
            </div>
          </div>
        </div>

        {/* Error Message */}
        <div className="mb-8">
          <Title level={1} className="text-4xl md:text-5xl font-bold text-gray-800 mb-4">
            Oops! Trang không tìm thấy
          </Title>
          <Paragraph className="text-lg text-gray-600 mb-6 max-w-md mx-auto">
            Xin lỗi, trang bạn đang tìm kiếm không tồn tại hoặc đã bị di chuyển.
          </Paragraph>
        </div>

        

        {/* Action Buttons */}
        <Space size="large" wrap className="justify-center">
          <Button
            type="primary"
            size="large"
            icon={<FaHome />}
            onClick={handleGoHome}
            className="bg-blue-500 hover:bg-blue-600 border-0 rounded-full px-8 py-3 h-auto font-medium"
          >
            Về trang chủ
          </Button>
          
          <Button
            size="large"
            icon={<FaArrowLeft />}
            onClick={handleGoBack}
            className="border-2 border-gray-300 hover:border-blue-500 rounded-full px-8 py-3 h-auto font-medium"
          >
            Quay lại
          </Button>
        </Space>

        {/* Helpful Links */}
        <div className="mt-12">
          <Text className="text-gray-500 mb-4 block">Có thể bạn quan tâm:</Text>
          <div className="flex flex-wrap justify-center gap-4">
            
            
            <Link 
              to="/auth" 
              className="text-blue-500 hover:text-blue-700 transition-colors px-4 py-2 rounded-lg hover:bg-blue-50"
            >
              Đăng nhập
            </Link>
          </div>
        </div>

        {/* Decorative Elements */}
        <div className="absolute top-20 left-10 w-20 h-20 bg-blue-200 rounded-full opacity-20 animate-pulse"></div>
        <div className="absolute top-40 right-10 w-16 h-16 bg-purple-200 rounded-full opacity-20 animate-pulse delay-1000"></div>
        <div className="absolute bottom-20 left-20 w-12 h-12 bg-orange-200 rounded-full opacity-20 animate-pulse delay-2000"></div>
        <div className="absolute bottom-40 right-20 w-24 h-24 bg-green-200 rounded-full opacity-20 animate-pulse delay-500"></div>
      </div>
    </div>
  );
}
