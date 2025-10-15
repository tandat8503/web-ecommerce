import { Typography, Row, Col } from "antd";

const { Title, Paragraph } = Typography;

export default function About() {
  return (
    <div className="py-20 bg-gradient-to-br from-violet-50 via-purple-50 to-pink-100">
      <div className="max-w-6xl mx-auto px-4">
        {/* Giới thiệu thương hiệu */}
        <div className="text-center mb-16">
          <Title level={2} className="text-3xl font-bold text-amber-800 mb-4">
            Về Chúng Tôi
          </Title>
          <Paragraph className="text-lg text-gray-600 max-w-3xl mx-auto">
            <strong>OFFICE PRO</strong> là thương hiệu nội thất văn phòng hàng đầu tại Việt Nam,
            chuyên cung cấp các giải pháp không gian làm việc hiện đại, tối ưu hiệu suất
            và truyền cảm hứng sáng tạo cho doanh nghiệp.
          </Paragraph>
        </div>

        <Row gutter={[60, 60]} align="middle">
          {/* Bên trái - Nội dung */}
          <Col xs={24} lg={12}>
            <div className="space-y-6">
              <Title level={3} className="text-2xl font-semibold text-gray-800">
                Tạo Dựng Không Gian Làm Việc Chuyên Nghiệp
              </Title>
              <Paragraph className="text-lg text-gray-700 leading-relaxed text-justify">
                Tại <strong>OFFICE PRO</strong>, chúng tôi hiểu rằng môi trường làm việc không chỉ là nơi
                để làm việc — mà còn là không gian để sáng tạo, kết nối và phát triển.  
                Mỗi sản phẩm được thiết kế tỉ mỉ để mang đến **sự thoải mái, thẩm mỹ và bền vững** cho văn phòng của bạn.
              </Paragraph>

              <Paragraph className="text-lg text-gray-700 leading-relaxed text-justify">
                Chúng tôi hợp tác với những nhà sản xuất uy tín, áp dụng quy trình kiểm định chặt chẽ 
                để đảm bảo **chất lượng cao cấp**, đáp ứng mọi tiêu chuẩn về thiết kế và công năng.
              </Paragraph>

              <Paragraph className="text-lg text-gray-700 leading-relaxed text-justify">
                Với hơn 10 năm kinh nghiệm trong lĩnh vực nội thất văn phòng, OFFICE PRO không chỉ 
                là nhà cung cấp – mà là **đối tác đồng hành** trong hành trình kiến tạo không gian làm việc hoàn hảo.
              </Paragraph>
            </div>
          </Col>

          {/* Bên phải - Hình ảnh */}
          <Col xs={24} lg={12}>
            <div className="grid grid-cols-2 gap-4">
              {/* Ảnh 1 */}
              <div className="bg-gradient-to-br from-amber-100 to-amber-200 rounded-2xl p-6 h-48 flex items-center justify-center shadow-md">
                <div className="text-center">
                  <div className="text-4xl mb-2">🪑</div>
                  <p className="text-sm font-semibold text-amber-800">Ghế & Bàn Làm Việc</p>
                </div>
              </div>

              {/* Ảnh 2 */}
              <div className="bg-gradient-to-br from-blue-100 to-blue-200 rounded-2xl p-6 h-48 flex items-center justify-center shadow-md">
                <div className="text-center">
                  <div className="text-4xl mb-2">🖥️</div>
                  <p className="text-sm font-semibold text-blue-800">Không Gian Hiện Đại</p>
                </div>
              </div>

              {/* Ảnh 3 */}
              <div className="bg-gradient-to-br from-green-100 to-green-200 rounded-2xl p-6 h-48 flex items-center justify-center shadow-md">
                <div className="text-center">
                  <div className="text-4xl mb-2">📦</div>
                  <p className="text-sm font-semibold text-green-800">Kho & Lắp Đặt Nhanh</p>
                </div>
              </div>

              {/* Ảnh 4 */}
              <div className="bg-gradient-to-br from-purple-100 to-purple-200 rounded-2xl p-6 h-48 flex items-center justify-center shadow-md">
                <div className="text-center">
                  <div className="text-4xl mb-2">🏢</div>
                  <p className="text-sm font-semibold text-purple-800">Thiết Kế Không Gian</p>
                </div>
              </div>
            </div>
          </Col>
        </Row>

        {/* Lý do chọn */}
        <div className="mt-20">
          <Title level={2} className="text-3xl font-bold text-center text-gray-800 mb-12">
            Vì Sao Khách Hàng Chọn OFFICE PRO?
          </Title>
          <Row gutter={[40, 40]}>
            {[
              {
                color: "from-blue-50 to-blue-100",
                title: "Chất Lượng Uy Tín",
                desc: "Từng sản phẩm được chọn lọc và kiểm định kỹ lưỡng, đảm bảo độ bền và tính thẩm mỹ vượt trội.",
              },
              {
                color: "from-green-50 to-green-100",
                title: "Giá Cả Cạnh Tranh",
                desc: "OFFICE PRO cam kết mang đến giải pháp tối ưu chi phí với giá trị sử dụng cao nhất.",
              },
              {
                color: "from-orange-50 to-orange-100",
                title: "Giao Hàng & Lắp Đặt Nhanh",
                desc: "Đội ngũ kỹ thuật chuyên nghiệp hỗ trợ lắp đặt toàn quốc, nhanh chóng và an toàn.",
              },
              {
                color: "from-purple-50 to-purple-100",
                title: "Bảo Hành Chính Hãng",
                desc: "Bảo hành dài hạn từ 2–5 năm và hỗ trợ bảo trì trọn đời cho tất cả sản phẩm.",
              },
            ].map((item, idx) => (
              <Col xs={24} sm={12} lg={6} key={idx}>
                <div
                  className={`p-6 bg-gradient-to-br ${item.color} rounded-2xl text-center shadow-sm hover:shadow-md transition`}
                >
                  <h4 className="text-xl font-semibold text-gray-800 mb-2">{item.title}</h4>
                  <p className="text-gray-600 text-sm leading-relaxed">{item.desc}</p>
                </div>
              </Col>
            ))}
          </Row>
        </div>
      </div>
    </div>
  );
}
