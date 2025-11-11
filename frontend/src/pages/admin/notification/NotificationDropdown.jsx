import { Button, Divider, Badge, List, Empty, Typography } from "antd";
import { FaTrash } from "react-icons/fa";
import { useNavigate } from "react-router-dom";

const { Text } = Typography;

/**
 * Component hiển thị dropdown danh sách thông báo
 * 
 * @param {Array} notifications - Danh sách thông báo
 * @param {number} unreadCount - Số lượng thông báo chưa đọc
 * @param {boolean} loading - Trạng thái loading
 * @param {Function} handleMarkAsRead - Hàm đánh dấu đã đọc
 * @param {Function} handleMarkAllAsRead - Hàm đánh dấu tất cả đã đọc
 * @param {Function} handleDelete - Hàm xóa thông báo
 */
const NotificationDropdown = ({
  notifications,//danh sách thông báo
  unreadCount,//số lượng thông báo chưa đọc
  loading,//loading
  handleMarkAsRead,//đánh dấu đã đọc
  handleMarkAllAsRead,//đánh dấu tất cả đã đọc
  handleDelete,//xóa thông báo
}) => {
  const navigate = useNavigate();

  return (
    <div style={{ width: 400, maxHeight: 500, overflowY: "auto" }}>
      {/* Header với nút đánh dấu tất cả đã đọc */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "8px 0",
          marginBottom: 8,
        }}
      >
        <Text strong style={{ fontSize: 16 }}>
          Thông báo
        </Text>
        {unreadCount > 0 && (
          <Button type="link" size="small" onClick={handleMarkAllAsRead}>
            Đánh dấu tất cả đã đọc
          </Button>
        )}
      </div>

      <Divider style={{ margin: "8px 0" }} />

      {/* Nội dung: Loading / Empty / List */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "20px" }}>Đang tải...</div>
      ) : notifications.length === 0 ? (
        <Empty description="Không có thông báo" style={{ padding: "20px" }} />
      ) : (
        <List
          dataSource={notifications}
          renderItem={(item) => (
            <List.Item
              style={{
                padding: "12px",
                backgroundColor: item.isRead ? "#fff" : "#f0f7ff",
                cursor: "pointer",
                borderRadius: "4px",
                marginBottom: "8px",
              }}
              onClick={() => {
                // Đánh dấu đã đọc nếu chưa đọc
                if (!item.isRead) {
                  handleMarkAsRead(item.id);
                }
                // Navigate đến trang đơn hàng nếu là thông báo đơn hàng mới
                if (item.type === "ORDER_NEW") {
                  navigate("/admin/orders");
                }
              }}
            >
              <List.Item.Meta
                title={
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    {/* Tiêu đề thông báo */}
                    <Text strong={!item.isRead} style={{ fontSize: 14 }}>
                      {item.title}
                    </Text>
                    {/* Badge đánh dấu thông báo chưa đọc */}
                    {!item.isRead && (
                      <Badge dot style={{ backgroundColor: "#1890ff" }} />
                    )}
                  </div>
                }
                description={
                  <div>
                    {/* Nội dung thông báo */}
                    <Text style={{ fontSize: 13, color: "#666" }}>
                      {item.message}
                    </Text>
                    {/* Thời gian tạo thông báo */}
                    <div style={{ marginTop: 4, fontSize: 12, color: "#999" }}>
                      {new Date(item.createdAt).toLocaleString("vi-VN")}
                    </div>
                  </div>
                }
              />
              {/* Nút xóa chỉ hiển thị khi đã đọc */}
              {item.isRead && (
                <Button
                  type="text"
                  danger
                  size="small"
                  icon={<FaTrash />}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(item.id);
                  }}
                />
              )}
            </List.Item>
          )}
        />
      )}
    </div>
  );
};

export default NotificationDropdown;

