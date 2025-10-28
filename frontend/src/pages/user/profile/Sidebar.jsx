import { Card, Avatar, Typography, Tag, Button, Upload } from "antd";
import { FaUser, FaKey, FaHistory, FaDownload, FaMapMarkerAlt } from "react-icons/fa";
import { toast } from "react-toastify";

const { Title, Text } = Typography;

export default function Sidebar({ 
  user, 
  activeSection, 
  setActiveSection, 
  onUploadAvatar, 
  selectedFile,
  setSelectedFile
}) {
  return (
    <Card className="h-full">
      {/* Avatar Section */}
      <div className="bg-blue-500 rounded-t-lg -m-6 mb-6 p-6 text-center">
        <div className="relative inline-block group">
          <Avatar
            size={80}
            src={user?.avatar || "https://res.cloudinary.com/dww6krdpx/image/upload/v1756100724/Avatars/fqzevhnhcnqscw7rpgtx.jpg"}
            className="border-4 border-white mb-4 transition-transform group-hover:scale-105"
          />
        </div>
        <Upload
          id="avatar-upload"
          showUploadList={false}
          beforeUpload={() => false}
          accept="image/*"
          onChange={(info) => {
            if (info.file) {
              // Kiểm tra kích thước file (max 2MB)
              if (info.file.size > 2 * 1024 * 1024) {
                toast.error("❌ Kích thước file không được vượt quá 2MB");
                return;
              }
              // Kiểm tra định dạng file
              if (!info.file.type.startsWith('image/')) {
                toast.error("❌ Chỉ chấp nhận file ảnh");
                return;
              }
              // Chỉ lưu file vào state, không upload ngay
              setSelectedFile(info.file);
              toast.info("📷 Ảnh đã được chọn. Bấm 'Cập nhật ảnh' để lưu.", {
                position: "top-right",
                autoClose: 3000,
              });
            }
          }}
          style={{ display: 'none' }}
        >
          <div />
        </Upload>
        <div className="mt-2">
          <Button
            type="link"
            size="small"
            className="text-white hover:text-orange-200 text-xs font-medium"
            onClick={() => document.getElementById('avatar-upload').click()}
            style={{ 
              color: '#ffffff',
              textShadow: '0 1px 2px rgba(0,0,0,0.3)',
              fontWeight: '500'
            }}
          >
            <FaDownload className="mr-1" />
            Thay đổi ảnh
          </Button>
        </div>
        
        {/* Preview ảnh đã chọn */}
        {selectedFile && (
          <div className="mt-3 p-2 bg-white/20 rounded-lg">
            <div className="text-white text-xs mb-2">Ảnh đã chọn:</div>
            <div className="flex items-center gap-2">
              <img 
                src={URL.createObjectURL(selectedFile)} 
                alt="Preview" 
                className="w-8 h-8 rounded-full object-cover"
              />
              <span className="text-white text-xs truncate">{selectedFile.name}</span>
            </div>
            <Button
              type="primary"
              size="small"
              className="w-full mt-2 bg-orange-500 hover:bg-orange-600 border-0"
              onClick={() => onUploadAvatar(selectedFile)}
            >
              Cập nhật ảnh
            </Button>
          </div>
        )}
      </div>
      
      {/* User Name */}
      <div className="text-center mb-6">
        <Title level={4} className="mb-0">
          {user?.firstName} {user?.lastName}
        </Title>
        <Text className="text-gray-500 text-sm">
          {user?.email}
        </Text>
        <div className="mt-2">
          <Tag color="green" className="text-xs">
            {user?.isVerified ? 'Đã xác thực' : 'Chưa xác thực'}
          </Tag>
        </div>
      </div>
      
      {/* Navigation Menu */}
      <div className="space-y-2">
        <button 
          onClick={() => setActiveSection("profile")}
          className={`block w-full p-3 rounded-lg text-left transition-colors ${
            activeSection === "profile" 
              ? "bg-blue-50 text-blue-600 font-medium" 
              : "text-gray-600 hover:bg-gray-100"
          }`}
        >
          <FaUser className="inline mr-2" />
          Hồ sơ cá nhân
        </button>
        <button 
          onClick={() => setActiveSection("password")}
          className={`block w-full p-3 rounded-lg text-left transition-colors ${
            activeSection === "password" 
              ? "bg-blue-50 text-blue-600 font-medium" 
              : "text-gray-600 hover:bg-gray-100"
          }`}
        >
          <FaKey className="inline mr-2" />
          Đổi mật khẩu
        </button>
        <button 
          onClick={() => setActiveSection("history")}
          className={`block w-full p-3 rounded-lg text-left transition-colors ${
            activeSection === "history" 
              ? "bg-blue-50 text-blue-600 font-medium" 
              : "text-gray-600 hover:bg-gray-100"
          }`}
        >
          <FaHistory className="inline mr-2" />
          Lịch sử đăng nhập
        </button>
        <button 
          onClick={() => setActiveSection("address")}
          className={`block w-full p-3 rounded-lg text-left transition-colors ${
            activeSection === "address" 
              ? "bg-blue-50 text-blue-600 font-medium" 
              : "text-gray-600 hover:bg-gray-100"
          }`}
        >
          <FaMapMarkerAlt className="inline mr-2" />
          Địa chỉ của tôi
        </button>
      </div>
    </Card>
  );
}
