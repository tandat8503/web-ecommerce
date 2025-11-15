import { Typography, Row, Col } from "antd";

const { Title, Paragraph } = Typography;

export default function About() {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <div className="py-16 bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <Title level={1} className="text-5xl md:text-6xl font-bold mb-4 text-gray-900">
            OFFICE PRO
          </Title>
          <Paragraph className="text-xl text-gray-600 max-w-3xl mx-auto">
            Nền tảng thương mại điện tử chuyên về nội thất văn phòng
          </Paragraph>
        </div>
      </div>

      {/* Phần chính - Chúng tôi là ai */}
      <div className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-4">
          <Row gutter={[60, 40]} align="top">
            {/* Bên trái - Nội dung text */}
            <Col xs={24} lg={12}>
              <div>
                <Title level={2} className="text-4xl font-bold text-gray-900 mb-6">
                  Chúng tôi là ai?
                </Title>
                <Paragraph className="text-lg text-gray-700 leading-relaxed mb-4">
                  <strong>OFFICE PRO</strong> là một nền tảng thương mại điện tử chuyên cung cấp các sản phẩm 
                  nội thất văn phòng, đặc biệt là <strong>bàn ghế văn phòng</strong> chất lượng cao. Chúng tôi 
                  tập trung vào việc mang đến cho khách hàng những giải pháp hoàn chỉnh để tạo nên không gian 
                  làm việc chuyên nghiệp và hiện đại.
                </Paragraph>
                <Paragraph className="text-lg text-gray-700 leading-relaxed mb-4">
                  Với sứ mệnh cung cấp những sản phẩm nội thất tốt nhất, <strong>OFFICE PRO</strong> luôn chú trọng 
                  đến việc chọn lọc kỹ lưỡng từng sản phẩm, đảm bảo chất lượng và phù hợp với mọi nhu cầu sử dụng 
                  từ văn phòng nhỏ đến các doanh nghiệp lớn. Chúng tôi hiểu rằng một không gian làm việc được 
                  thiết kế tốt có thể tạo nên sự khác biệt lớn trong năng suất và tinh thần làm việc.
                </Paragraph>
                <Paragraph className="text-lg text-gray-700 leading-relaxed mb-4">
                  <strong>OFFICE PRO</strong> cam kết mang đến trải nghiệm mua sắm trực tuyến tiện lợi, an toàn 
                  và đáng tin cậy. Chúng tôi không chỉ bán sản phẩm mà còn tư vấn và hỗ trợ khách hàng trong việc 
                  lựa chọn những sản phẩm phù hợp nhất cho không gian làm việc của họ.
                </Paragraph>
                <Paragraph className="text-lg text-gray-700 leading-relaxed">
                  Với đội ngũ tư vấn chuyên nghiệp và dịch vụ chăm sóc khách hàng tận tâm, <strong>OFFICE PRO</strong> 
                  luôn sẵn sàng đồng hành cùng bạn trong suốt quá trình từ lựa chọn đến sau khi mua hàng, đảm bảo 
                  bạn có được trải nghiệm mua sắm tuyệt vời nhất.
                </Paragraph>
              </div>
            </Col>

            {/* Bên phải - Grid 2x2 Giá Trị Cốt Lõi */}
            <Col xs={24} lg={12}>
              <div className="grid grid-cols-2 gap-4">
                {/* Chất Lượng */}
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 h-64 flex flex-col justify-center shadow-md hover:shadow-lg transition-all duration-300">
                  <h3 className="text-2xl font-bold text-gray-900 mb-3">Chất Lượng</h3>
                  <p className="text-gray-700 text-sm leading-relaxed">Sản phẩm được chọn lọc kỹ lưỡng, đảm bảo độ bền và tính thẩm mỹ cao</p>
                </div>

                {/* Thiết Kế */}
                <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-6 h-64 flex flex-col justify-center shadow-md hover:shadow-lg transition-all duration-300">
                  <h3 className="text-2xl font-bold text-gray-900 mb-3">Thiết Kế</h3>
                  <p className="text-gray-700 text-sm leading-relaxed">Kết hợp giữa tính hiện đại và công năng thực tiễn, phù hợp mọi không gian</p>
                </div>

                {/* Dịch Vụ */}
                <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-6 h-64 flex flex-col justify-center shadow-md hover:shadow-lg transition-all duration-300">
                  <h3 className="text-2xl font-bold text-gray-900 mb-3">Dịch Vụ</h3>
                  <p className="text-gray-700 text-sm leading-relaxed">Hỗ trợ tư vấn chuyên nghiệp, giao hàng nhanh chóng và bảo hành uy tín</p>
                </div>

                {/* Giá Trị */}
                <div className="bg-gradient-to-br from-cyan-50 to-cyan-100 rounded-xl p-6 h-64 flex flex-col justify-center shadow-md hover:shadow-lg transition-all duration-300">
                  <h3 className="text-2xl font-bold text-gray-900 mb-3">Giá Trị</h3>
                  <p className="text-gray-700 text-sm leading-relaxed">Mang đến giải pháp tối ưu về chi phí với chất lượng vượt trội</p>
                </div>
              </div>
            </Col>
          </Row>
        </div>
      </div>

    </div>
  );
}
