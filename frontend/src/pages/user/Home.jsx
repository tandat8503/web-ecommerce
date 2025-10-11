import { Row, Col, Card, Typography } from "antd";
import BannerSlider from "./BannerSlider";

const { Title, Paragraph } = Typography;

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        {/* Banner */}
        <div className="mb-100">
          <BannerSlider />
        </div>

        {/* Nội dung giới thiệu */}
        <Row gutter={[24, 24]}>
          <Col span={24}>
            <Card className="text-center shadow-lg rounded-2xl">
              <div className="py-16">
                <Title level={1} className="text-4xl font-bold text-blue-600 mb-4">
                  🏢 OFFICE PRO
                </Title>
                <Title level={2} className="text-2xl text-gray-700 mb-6">
                  Văn phòng chuyên nghiệp
                </Title>
                <Paragraph className="text-lg text-gray-600 max-w-2xl mx-auto">
                  Chuyên cung cấp đồ dùng văn phòng cao cấp, thiết bị công nghệ và nội thất văn phòng.
                  Cam kết chất lượng Nhật Bản với giá cả hợp lý.
                </Paragraph>
              </div>
            </Card>
          </Col>
        </Row>
      </div>
    </div>
  );
}
