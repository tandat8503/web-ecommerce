## Tổng quan tính năng

Tài liệu này tóm tắt các khả năng chính của hệ thống web-ecommerce theo từng loại người dùng. Dựa trên danh sách này, chúng ta sẽ vẽ các sơ đồ Use Case bằng Mermaid.

---

### Người dùng cuối (Customer)
- Đăng ký, đăng nhập, đăng xuất (email/password, Google OAuth).
- Quản lý hồ sơ cá nhân, đổi mật khẩu, quản lý địa chỉ giao hàng.
- Duyệt danh mục sản phẩm, tìm kiếm toàn văn, lọc, xem chi tiết sản phẩm.
- Xem hình ảnh, biến thể, tồn kho, thông số sản phẩm.
- Thêm sản phẩm vào giỏ hàng, cập nhật số lượng, xóa, đồng bộ giữa các thiết bị.
- Quản lý danh sách yêu thích (wishlist) và đồng bộ khi đăng nhập.
- Tạo đơn hàng (chọn địa chỉ, ghi chú, phương thức thanh toán COD/MoMo).
- Thanh toán trực tuyến qua cổng MoMo, nhận kết quả thanh toán.
- Theo dõi đơn hàng: xem lịch sử, chi tiết, cập nhật trạng thái.
- Nhận thông báo real-time (socket) về đơn hàng, khuyến mãi.
- Viết đánh giá sản phẩm, đăng bình luận, trả lời bình luận.
- Sử dụng mã giảm giá/coupon hợp lệ và xem lịch sử sử dụng.

### Quản trị viên (Admin/Staff)
- Đăng nhập vào dashboard và xem thống kê doanh thu, đơn hàng, sản phẩm nổi bật.
- Quản lý danh mục sản phẩm (Category) và thương hiệu (Brand).
- CRUD sản phẩm: thông tin cơ bản, SEO, sản phẩm nổi bật.
- Quản lý biến thể (variants), kho hàng, thông số kỹ thuật, giá nhập/giá bán.
- Quản lý hình ảnh sản phẩm (upload, reorder, gán primary, đồng bộ Cloudinary).
- Quản lý banner quảng cáo, bộ sưu tập hiển thị trang chủ.
- Quản lý mã giảm giá (Coupon): cấu hình mức giảm, điều kiện, thời gian.
- Quản lý đơn hàng: xem chi tiết, cập nhật trạng thái, ghi chú nội bộ, theo dõi thanh toán.
- Quản lý người dùng: phân quyền, khóa/mở khóa tài khoản.
- Phê duyệt đánh giá, bình luận, xử lý báo cáo nội dung.
- Gửi, quản lý thông báo hệ thống cho người dùng.
- Theo dõi lịch sử thanh toán MoMo, xử lý các giao dịch lỗi.
- Sử dụng công cụ AI nội bộ (chatbot, báo cáo) để phân tích sản phẩm, doanh thu, sentiment.

---

### Ghi chú
- Các sơ đồ Use Case sẽ dựa trên hai nhóm chính: Customer và Admin/Staff.
- Một số use case liên quan AI/BI sẽ được gom vào Actor phụ (Analyst/AI Agent) nếu cần mở rộng trong tương lai.

