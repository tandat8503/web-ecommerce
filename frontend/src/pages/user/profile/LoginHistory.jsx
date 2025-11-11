import { useState, useEffect } from "react";
import { Card, Table, Tag, Typography } from "antd";
import { FaUser } from "react-icons/fa";
import { getLoginHistory } from "@/api/userProfile";
import { toast } from "@/lib/utils";

const { Title, Text } = Typography;

export default function LoginHistory({ isActive = true }) {
  const [loginHistory, setLoginHistory] = useState([]);
  const [loading, setLoading] = useState(false);


  useEffect(() => {
    // Chỉ gọi API khi component thực sự được hiển thị (isActive = true)
    if (isActive) {
      fetchLoginHistory();
    }
  }, [isActive]);

  const fetchLoginHistory = async () => {
    try {
      setLoading(true);
      const response = await getLoginHistory();
      if (response.data.code === 200) {
        setLoginHistory(response.data.data);
      }
    } catch (error) {
      console.error("Error fetching login history:", error);
      // Chỉ hiển thị toast khi component đang active
      if (isActive) {
        toast.error("Không thể tải lịch sử đăng nhập");
      }
    } finally {
      setLoading(false);
    }
  };

  // Hàm parse User Agent để lấy thông tin thiết bị
  const parseUserAgent = (userAgent) => {
    if (!userAgent) return { device: 'Unknown', browser: 'Unknown', os: 'Unknown', version: 'Unknown' };
    
    const ua = userAgent.toLowerCase();
    
    // Detect Browser
    let browser = 'Unknown';
    let version = 'Unknown';
    if (ua.includes('chrome')) {
      browser = 'Chrome';
      const match = ua.match(/chrome\/([0-9.]+)/);
      if (match) version = match[1];
    } else if (ua.includes('firefox')) {
      browser = 'Firefox';
      const match = ua.match(/firefox\/([0-9.]+)/);
      if (match) version = match[1];
    } else if (ua.includes('safari') && !ua.includes('chrome')) {
      browser = 'Safari';
      const match = ua.match(/version\/([0-9.]+)/);
      if (match) version = match[1];
    } else if (ua.includes('edge')) {
      browser = 'Edge';
      const match = ua.match(/edg\/([0-9.]+)/);
      if (match) version = match[1];
    } else if (ua.includes('opera')) {
      browser = 'Opera';
      const match = ua.match(/opr\/([0-9.]+)/);
      if (match) version = match[1];
    } else if (ua.includes('postman')) {
      browser = 'Postman';
      const match = ua.match(/postman runtime\/([0-9.]+)/);
      if (match) version = match[1];
    }
    
    // Detect OS
    let os = 'Unknown';
    if (ua.includes('windows nt 10')) os = 'Windows 10';
    else if (ua.includes('windows nt 6.3')) os = 'Windows 8.1';
    else if (ua.includes('windows nt 6.2')) os = 'Windows 8';
    else if (ua.includes('windows nt 6.1')) os = 'Windows 7';
    else if (ua.includes('windows')) os = 'Windows';
    else if (ua.includes('mac os x')) os = 'macOS';
    else if (ua.includes('mac')) os = 'macOS';
    else if (ua.includes('linux')) os = 'Linux';
    else if (ua.includes('android')) os = 'Android';
    else if (ua.includes('iphone os')) os = 'iOS';
    else if (ua.includes('ipad')) os = 'iPadOS';
    
    // Detect Device
    let device = 'Desktop';
    if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) {
      device = 'Mobile';
    } else if (ua.includes('tablet') || ua.includes('ipad')) {
      device = 'Tablet';
    } else if (ua.includes('postman')) {
      device = 'API Client';
    }
    
    return { device, browser, os, version };
  };

  const historyColumns = [
    {
      title: 'Trạng thái',
      dataIndex: 'isSuccessful',
      key: 'isSuccessful',
      width: 100,
      render: (isSuccessful) => (
        <Tag 
          color={isSuccessful ? 'green' : 'red'}
          icon={isSuccessful ? <FaUser /> : <FaUser />}
        >
          {isSuccessful ? 'Thành công' : 'Thất bại'}
        </Tag>
      ),
    },
    {
      title: 'Phương thức',
      dataIndex: 'loginMethod',
      key: 'loginMethod',
      width: 120,
      render: (method) => (
        <Tag color="blue">
          {method === 'EMAIL_PASSWORD' ? 'Email/Password' : method}
        </Tag>
      ),
    },
    {
      title: 'Thiết bị',
      dataIndex: 'userAgent',
      key: 'device',
      render: (userAgent) => {
        const { device, browser, os, version } = parseUserAgent(userAgent);
        return (
          <div className="space-y-2">
            <div className="flex items-center gap-1 flex-wrap">
              <Tag color="purple" size="small" className="mb-1">
                {device}
              </Tag>
              <Tag color="cyan" size="small" className="mb-1">
                {os}
              </Tag>
            </div>
            <div className="text-xs text-gray-600">
              <div className="font-medium">{browser}</div>
              {version !== 'Unknown' && (
                <div className="text-gray-500">v{version}</div>
              )}
            </div>
          </div>
        );
      },
    },
    {
      title: 'IP Address',
      dataIndex: 'ipAddress',
      key: 'ipAddress',
      width: 120,
    },
    {
      title: 'Thời gian',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 150,
      render: (date) => (
        <div className="text-sm">
          <div>{new Date(date).toLocaleDateString('vi-VN')}</div>
          <div className="text-gray-500">{new Date(date).toLocaleTimeString('vi-VN')}</div>
        </div>
      ),
    },
  ];

  return (
    <Card>
      <div className="mb-6">
        <Title level={3} className="mb-2">
          Lịch sử đăng nhập
        </Title>
        <Text className="text-gray-600">
          Xem lịch sử đăng nhập gần đây của tài khoản
        </Text>
      </div>

      <Table
        columns={historyColumns}
        dataSource={loginHistory}
        loading={loading}
        rowKey="id"
        pagination={{
          pageSize: 10,
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total, range) => 
            `${range[0]}-${range[1]} của ${total} bản ghi`,
        }}
        className="rounded-lg"
        size="middle"
        bordered={false}
      />
    </Card>
  );
}
