import { Card, Button, Space, Tag, Typography } from "antd";
import { FileTextOutlined, DownloadOutlined, EyeOutlined } from "@ant-design/icons";
import { aiChatbotAPI } from "@/api/aiChatbotAPI";

const { Text, Title } = Typography;

export default function ReportCard({ report, onView, onDownload }) {
  const handleDownload = async () => {
    try {
      await aiChatbotAPI.downloadReport(report.id);
      if (onDownload) onDownload(report.id);
    } catch (error) {
      console.error("Download failed:", error);
    }
  };

  const handleView = () => {
    if (onView) {
      onView(report);
    } else {
      window.open(`http://localhost:8000${report.report_url || `/api/ai/reports/${report.id}`}`, "_blank");
    }
  };

  const getReportTypeColor = (type) => {
    const colors = {
      sentiment: "green",
      revenue: "blue",
      product: "purple",
      customer: "orange",
      business: "cyan",
    };
    return colors[type] || "default";
  };

  const getReportTypeName = (type) => {
    const names = {
      sentiment: "Phân tích Cảm xúc",
      revenue: "Doanh thu",
      product: "Sản phẩm",
      customer: "Khách hàng",
      business: "Kinh doanh",
    };
    return names[type] || type;
  };

  return (
    <Card
      hoverable
      className="mb-3"
      actions={[
        <Button
          key="view"
          type="link"
          icon={<EyeOutlined />}
          onClick={handleView}
        >
          Xem
        </Button>,
        <Button
          key="download"
          type="link"
          icon={<DownloadOutlined />}
          onClick={handleDownload}
        >
          Tải về
        </Button>,
      ]}
    >
      <Space direction="vertical" size="small" className="w-full">
        <div className="flex items-center justify-between">
          <Title level={5} className="mb-0">
            {report.title || `Báo cáo ${getReportTypeName(report.report_type)}`}
          </Title>
          <Tag color={getReportTypeColor(report.report_type)}>
            {getReportTypeName(report.report_type)}
          </Tag>
        </div>

        {report.period && (
          <Text type="secondary" className="text-xs">
            📅 {report.period}
          </Text>
        )}

        <div className="flex items-center justify-between text-xs">
          <Text type="secondary">
            {report.created_at
              ? new Date(report.created_at).toLocaleString("vi-VN")
              : "N/A"}
          </Text>
          {report.file_size && (
            <Text type="secondary">
              📦 {(report.file_size / 1024).toFixed(2)} KB
            </Text>
          )}
        </div>
      </Space>
    </Card>
  );
}

