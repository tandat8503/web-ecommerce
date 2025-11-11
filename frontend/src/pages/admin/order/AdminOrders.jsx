import {
  Table,
  Input,
  Space,
  Popconfirm,
  Row,
  Col,
  Card,
  Tag,
  Tooltip,
  Badge,
  Select,
} from "antd";
import { FaEye, FaEdit, FaTimes } from "react-icons/fa";
import { Button } from "@/components/ui/button";
import { TableSkeleton } from "@/components/ui/skeleton";
import CrudModal from "@/pages/hepler/CrudModal";
import DetailModal from "@/pages/hepler/DetailModal";
import { formatPrice } from "@/lib/utils";
import { useAdminOrders } from "./useAdminOrders";

const { Option } = Select;
const { Search } = Input;

/**
 * Component quản lý đơn hàng cho admin
 * 
 * CẤU TRÚC:
 * 1. Header: Search + Filter theo status
 * 2. Table: Hiển thị danh sách đơn hàng
 * 3. Actions: Xem chi tiết, Cập nhật trạng thái, Hủy đơn, Cập nhật ghi chú
 * 4. Modals: Modal chi tiết, Modal cập nhật ghi chú
 */
export default function AdminOrders() {
  // Lấy tất cả state và functions từ hook
  const {
    orders,// Danh sách đơn hàng
    loading,// Đang tải danh sách đơn hàng
    pagination,// Phân trang
    searchValue,// Giá trị tìm kiếm
    statusFilter,// Giá trị lọc theo trạng thái
    modalOpen,// Modal cập nhật ghi chú
    detailOpen,// Modal chi tiết đơn hàng
    editingOrder,// Đơn hàng đang sửa ghi chú
    detailData,// Dữ liệu chi tiết đơn hàng
    updatingId,// ID đơn hàng đang cập nhật (để hiển thị loading)
    modalLoading,// Loading state cho modal cập nhật ghi chú
    getStatusLabel,// Hàm lấy label trạng thái
    getStatusColor,// Hàm lấy màu trạng thái
    handleStatusChange,// Hàm cập nhật trạng thái đơn hàng
    handleCancelOrder,// Hàm hủy đơn hàng
    handleViewDetail,// Hàm xem chi tiết đơn hàng
    handleUpdateNotes,// Hàm cập nhật ghi chú đơn hàng
    setSearchValue,// Hàm set giá trị tìm kiếm
    setStatusFilter,// Hàm set giá trị lọc theo trạng thái
    setPagination,// Hàm set phân trang
    openNotesModal,// Hàm mở modal cập nhật ghi chú
    closeModal,// Hàm đóng modal cập nhật ghi chú
    closeDetailModal,// Hàm đóng modal chi tiết đơn hàng
  } = useAdminOrders();

  // ========== TABLE COLUMNS ==========
  const columns = [
    {
      title: "Mã đơn",
      dataIndex: "orderNumber",
      width: 150,
      render: (text) => <strong>{text}</strong>,
    },
    {
      title: "Khách hàng",
      width: 200,
      render: (_, record) => {
        const user = record.user || {};
        return `${user.firstName || ""} ${user.lastName || ""}`.trim() || "-";
      },
    },
    {
      title: "Tổng tiền",
      dataIndex: "totalAmount",
      width: 150,
      align: "right",
      render: (amount) => (
        <span className="font-semibold text-red-600">
          {formatPrice(Number(amount || 0))}
        </span>
      ),
    },
    {
      title: "Trạng thái",
      dataIndex: "status",
      width: 150,
      render: (status) => (
        <Tag color={getStatusColor(status)}>{getStatusLabel(status)}</Tag>
      ),
    },
    {
      title: "Ngày đặt",
      dataIndex: "createdAt",
      width: 180,
      render: (date) => {
        if (!date) return "-";
        const d = new Date(date);
        return `${d.toLocaleDateString("vi-VN")} ${d.toLocaleTimeString("vi-VN", {
          hour: "2-digit",
          minute: "2-digit",
        })}`;
      },
    },
    {
      title: "Hành động",
      width: 300,
      fixed: "right",
      render: (_, record) => (
        <Space size="small">
          {/* Nút xem chi tiết */}
          <Tooltip title="Xem chi tiết">
            <Button className="cursor-pointer" variant="secondary" size="sm" onClick={() => handleViewDetail(record.id)}>
              <FaEye />
            </Button>
          </Tooltip>

          {/* Dropdown cập nhật trạng thái (chỉ hiện khi có trạng thái có thể chuyển) */}
          {record.availableStatuses?.length > 0 && (
            <Select
              value={record.status}
              onChange={(value) => handleStatusChange(record.id, value)}
              style={{ width: 150 }}
              disabled={updatingId === record.id}
            >
              <Option value={record.status} disabled>
                {getStatusLabel(record.status)} (hiện tại)
              </Option>
              {record.availableStatuses.map((s) => (
                <Option key={s.value} value={s.value}>
                  {s.label}
                </Option>
              ))}
            </Select>
          )}

          {/* Nút hủy đơn (chỉ hiện khi có thể hủy) */}
          {record.canCancel && (
            <Tooltip title="Hủy đơn hàng">
              <span>
                <Popconfirm
                  title="Hủy đơn hàng"
                  description={`Bạn có chắc muốn hủy đơn hàng ${record.orderNumber}?`}
                  onConfirm={() => handleCancelOrder(record.id)}
                  okText="Hủy đơn"
                  cancelText="Không"
                  okButtonProps={{ danger: true }}
                >
                  <Button
                    className="cursor-pointer"
                    variant="destructive"
                    size="sm"
                    disabled={updatingId === record.id}
                  >
                    {updatingId === record.id ? "..." : <FaTimes />}
                  </Button>
                </Popconfirm>
              </span>
            </Tooltip>
          )}

          {/* Nút cập nhật ghi chú */}
          <Tooltip title="Cập nhật ghi chú">
            <Button
              className="bg-blue-500 hover:bg-blue-600 text-white cursor-pointer"
              size="sm"
              onClick={() => openNotesModal(record)}
            >
              <FaEdit />
            </Button>
          </Tooltip>
        </Space>
      ),
    },
  ];

  // ========== DETAIL MODAL FIELDS ==========
  // Cấu hình các field hiển thị trong modal chi tiết
  const detailFields = detailData
    ? [
        { name: "id", label: "ID" },
        { name: "orderNumber", label: "Mã đơn hàng", render: (v) => <strong>{v}</strong> },
        {
          name: "status",
          label: "Trạng thái",
          render: (v) => <Tag color={getStatusColor(v)}>{getStatusLabel(v)}</Tag>,
        },
        {
          name: "user",
          label: "Khách hàng",
          render: (v) => (v ? `${v.firstName || ""} ${v.lastName || ""}`.trim() : "-"),
        },
        { name: "user", label: "Email", render: (v) => v?.email || "-" },
        { name: "subtotal", label: "Tạm tính", render: (v) => formatPrice(Number(v || 0)) },
        { name: "shippingFee", label: "Phí vận chuyển", render: (v) => formatPrice(Number(v || 0)) },
        { name: "discountAmount", label: "Giảm giá", render: (v) => formatPrice(Number(v || 0)) },
        {
          name: "totalAmount",
          label: "Tổng tiền",
          render: (v) => <span className="font-semibold text-red-600">{formatPrice(Number(v || 0))}</span>,
        },
        { name: "paymentMethod", label: "Phương thức thanh toán" },
        {
          name: "paymentStatus",
          label: "Trạng thái thanh toán",
          render: (v) => {
            const colors = { PENDING: "orange", PAID: "green", FAILED: "red" };
            return <Tag color={colors[v] || "default"}>{v}</Tag>;
          },
        },
        {
          name: "shippingAddress",
          label: "Địa chỉ giao hàng",
          render: (v) => {
            if (!v) return "-";
            return `${v.fullName} • ${v.phone}\n${v.streetAddress}, ${v.ward}, ${v.district}, ${v.city}`;
          },
        },
        { name: "customerNote", label: "Ghi chú khách hàng", render: (v) => v || "-" },
        { name: "adminNote", label: "Ghi chú admin", render: (v) => v || "-" },
        { name: "trackingCode", label: "Mã vận đơn", render: (v) => v || "-" },
        {
          name: "orderItems",
          label: "Danh sách sản phẩm",
          render: (items) => {
            if (!items || !Array.isArray(items)) return "-";
            return (
              <div className="space-y-2">
                {items.map((item, idx) => (
                  <div key={idx} className="border p-2 rounded">
                    <div className="flex items-center gap-3">
                      <img
                        src={item.product?.imageUrl || "/placeholder-product.jpg"}
                        alt={item.productName}
                        className="h-12 w-12 rounded border object-cover"
                      />
                      <div className="flex-1">
                        <div className="font-medium">{item.productName}</div>
                        {item.variantName && <div className="text-sm text-gray-500">{item.variantName}</div>}
                        <div className="text-sm text-gray-600">
                          SL: {item.quantity} × {formatPrice(Number(item.unitPrice))} ={" "}
                          <span className="font-semibold">{formatPrice(Number(item.totalPrice))}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            );
          },
        },
      ]
    : [];

  // ========== NOTES MODAL FIELDS ==========
  // Cấu hình form cập nhật ghi chú
  // Lưu ý: initialValue sẽ được set trong CrudModal dựa trên editingRecord
  const notesFields = [
    {
      name: "notes",
      label: "Ghi chú admin",
      component: <Input.TextArea rows={4} placeholder="Nhập ghi chú (tùy chọn)" />,
      // Không set initialValue ở đây, để CrudModal tự động set từ editingRecord
    },
  ];

  // ========== RENDER ==========
  return (
    <>
      <style>
        {`
          @keyframes gradientShift {
            0% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
            100% { background-position: 0% 50%; }
          }
        `}
      </style>
      <Row gutter={[16, 16]}>
        <Col span={24}>
          <Badge.Ribbon
            text="Quản lý Đơn hàng"
            color="#667eea"
            style={{
              background:
                "linear-gradient(45deg, #667eea, #764ba2, #f093fb, #667eea)",
              backgroundSize: "300% 300%",
              animation: "gradientShift 4s ease infinite",
              fontWeight: "bold",
              fontSize: "16px",
              padding: "8px 20px",
              height: "40px",
              lineHeight: "24px",
            }}
          >
            <Card className="shadow rounded-2xl">
              {/* Header: Search + Filter */}
              <div className="flex justify-between mb-4">
                <div className="flex gap-4">
                  <Search
                    placeholder="Tìm theo mã đơn, tên khách hàng"
                    allowClear
                    size="large"
                    value={searchValue}
                    onChange={(e) => setSearchValue(e.target.value)}
                    style={{ width: 300 }}
                  />
                  <Select
                    placeholder="Lọc theo trạng thái"
                    allowClear
                    size="large"
                    style={{ width: 200 }}
                    value={statusFilter || undefined}
                    onChange={setStatusFilter}
                  >
                    <Option value="PENDING">Chờ xác nhận</Option>
                    <Option value="CONFIRMED">Đã xác nhận</Option>
                    <Option value="PROCESSING">Đang giao</Option>
                    <Option value="DELIVERED">Đã giao</Option>
                    <Option value="CANCELLED">Đã hủy</Option>
                  </Select>
                </div>
                <div>Tổng: {pagination.total} đơn hàng</div>
              </div>

              {/* Table: Danh sách đơn hàng */}
              {loading ? (
                <TableSkeleton rows={5} columns={7} />
              ) : (
                <Table
                  rowKey="id"
                  columns={columns}
                  dataSource={orders}
                  scroll={{ x: 1200 }}
                  pagination={{
                    current: pagination.page,
                    pageSize: pagination.limit,
                    total: pagination.total,
                    showSizeChanger: true,
                    showTotal: (total) => `Tổng: ${total} đơn hàng`,
                    onChange: (page, pageSize) => setPagination({ ...pagination, page, limit: pageSize }),
                  }}
                />
              )}
            </Card>
          </Badge.Ribbon>
        </Col>
      </Row>

      {/* Modal cập nhật ghi chú */}
      <CrudModal
        open={modalOpen}
        onCancel={closeModal}
        onSubmit={handleUpdateNotes}
        editingRecord={editingOrder}
        fields={notesFields}
        title="Cập nhật ghi chú đơn hàng"
        okText="Lưu"
        width={600}
        confirmLoading={modalLoading}
      />

      {/* Modal chi tiết đơn hàng */}
      <DetailModal
        open={detailOpen}
        onCancel={closeDetailModal}
        title="Chi tiết đơn hàng"
        data={detailData}
        fields={detailFields}
        columns={2}
        width={900}
      />
    </>
  );
}
