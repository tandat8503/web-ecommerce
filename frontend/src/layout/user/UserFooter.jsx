import { Row, Col, Input, Button } from "antd";
import { 
  FaPhone, 
  FaEnvelope, 
  FaMapMarkerAlt, 
  FaFacebook,
  FaInstagram,
  FaYoutube,
  FaTwitter,
  FaPaperPlane
} from "react-icons/fa";

export default function UserFooter() {
  return (
    <footer className="bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 text-white">
      {/* Nội dung chính */}
      <div className="max-w-7xl mx-auto px-4 py-12">
        <Row gutter={[32, 32]}>
          {/* Thông tin công ty */}
          <Col xs={24} md={6}>
            <div className="mb-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-white rounded-full p-2 shadow-lg">
                  <svg className="w-8 h-8 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z"/>
                  </svg>
                </div>
                <div>
                  <h3 className="font-bold text-xl text-white">OFFICE PRO</h3>
                  <p className="text-blue-200 text-sm">Văn phòng chuyên nghiệp</p>
                </div>
              </div>
              <p className="text-gray-300 text-sm leading-relaxed mb-4">
                Chuyên cung cấp đồ dùng văn phòng cao cấp, thiết bị công nghệ và nội thất văn phòng. 
                Cam kết chất lượng Nhật Bản với giá cả hợp lý.
              </p>
              <div className="flex gap-3">
                <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center hover:bg-blue-500 transition-colors cursor-pointer">
                  <FaFacebook />
                </div>
                <div className="w-10 h-10 bg-pink-600 rounded-full flex items-center justify-center hover:bg-pink-500 transition-colors cursor-pointer">
                  <FaInstagram />
                </div>
                <div className="w-10 h-10 bg-red-600 rounded-full flex items-center justify-center hover:bg-red-500 transition-colors cursor-pointer">
                  <FaYoutube />
                </div>
                <div className="w-10 h-10 bg-sky-500 rounded-full flex items-center justify-center hover:bg-sky-400 transition-colors cursor-pointer">
                  <FaTwitter />
                </div>
              </div>
            </div>
          </Col>

          {/* Danh mục sản phẩm */}
          <Col xs={24} md={6}>
            <h4 className="font-bold text-lg mb-4 text-white">Sản phẩm</h4>
            <ul className="space-y-3">
              <li className="hover:text-blue-300 cursor-pointer transition-colors text-gray-300">
                📝 Văn phòng phẩm
              </li>
              <li className="hover:text-blue-300 cursor-pointer transition-colors text-gray-300">
                💻 Máy tính & Laptop
              </li>
              <li className="hover:text-blue-300 cursor-pointer transition-colors text-gray-300">
                🖨️ Máy in & Scan
              </li>
              <li className="hover:text-blue-300 cursor-pointer transition-colors text-gray-300">
                🪑 Bàn ghế văn phòng
              </li>
              <li className="hover:text-blue-300 cursor-pointer transition-colors text-gray-300">
                📱 Thiết bị di động
              </li>
              <li className="hover:text-blue-300 cursor-pointer transition-colors text-gray-300">
                🔌 Phụ kiện điện tử
              </li>
            </ul>
          </Col>

          {/* Dịch vụ */}
          <Col xs={24} md={6}>
            <h4 className="font-bold text-lg mb-4 text-white">Dịch vụ</h4>
            <ul className="space-y-3">
              <li className="hover:text-blue-300 cursor-pointer transition-colors text-gray-300">
                🚚 Giao hàng miễn phí
              </li>
              <li className="hover:text-blue-300 cursor-pointer transition-colors text-gray-300">
                🔧 Bảo hành chính hãng
              </li>
              <li className="hover:text-blue-300 cursor-pointer transition-colors text-gray-300">
                💼 Tư vấn thiết kế văn phòng
              </li>
              <li className="hover:text-blue-300 cursor-pointer transition-colors text-gray-300">
                📦 Lắp đặt tại chỗ
              </li>
              <li className="hover:text-blue-300 cursor-pointer transition-colors text-gray-300">
                🔄 Đổi trả 30 ngày
              </li>
              <li className="hover:text-blue-300 cursor-pointer transition-colors text-gray-300">
                💳 Thanh toán linh hoạt
              </li>
            </ul>
          </Col>

          {/* Liên hệ & Newsletter */}
          <Col xs={24} md={6}>
            <h4 className="font-bold text-lg mb-4 text-white">Liên hệ</h4>
            <div className="space-y-3 mb-6">
              <div className="flex items-center gap-3 text-gray-300">
                <FaPhone className="text-blue-400" />
                <span>1900-xxxx (Miễn phí)</span>
              </div>
              <div className="flex items-center gap-3 text-gray-300">
                <FaEnvelope className="text-blue-400" />
                <span>support@officepro.vn</span>
              </div>
              <div className="flex items-center gap-3 text-gray-300">
                <FaMapMarkerAlt className="text-blue-400" />
                <span>123 Nguyễn Huệ, Q1, TP.HCM</span>
              </div>
            </div>

            {/* Newsletter */}
            <div>
              <h5 className="font-semibold mb-3 text-white">Đăng ký nhận tin</h5>
              <div className="flex">
                <Input 
                  placeholder="Email của bạn..." 
                  className="rounded-l-lg"
                  size="small"
                />
                <Button 
                  type="primary" 
                  className="rounded-r-lg bg-blue-600 hover:bg-blue-500 border-0"
                  size="small"
                >
                  <FaPaperPlane />
                </Button>
              </div>
              <p className="text-xs text-gray-400 mt-2">
                Nhận ưu đãi độc quyền và tin tức mới nhất
              </p>
            </div>
          </Col>
        </Row>
      </div>

      {/* Dòng bản quyền */}
      <div className="border-t border-gray-700">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <Row align="middle" justify="space-between">
            <Col xs={24} md={12}>
              <p className="text-gray-400 text-sm">
                © 2025 <span className="font-semibold text-blue-400">OFFICE PRO</span>. 
                Tất cả quyền được bảo lưu. | 
                <span className="ml-2">MST: 0123456789</span>
              </p>
            </Col>
            <Col xs={24} md={12}>
              <div className="flex flex-wrap gap-4 justify-end text-sm text-gray-400">
                <span className="hover:text-white cursor-pointer transition-colors">Chính sách bảo mật</span>
                <span className="hover:text-white cursor-pointer transition-colors">Điều khoản sử dụng</span>
                <span className="hover:text-white cursor-pointer transition-colors">Chính sách cookie</span>
              </div>
            </Col>
          </Row>
        </div>
      </div>
    </footer>
  );
}