import {
  Table,
  Input,
  Space,
  Row,
  Col,
  Card,
  Tag,
  Tooltip,
  Badge,
  Select,
} from "antd";
import { FaEye, FaEdit } from "react-icons/fa";
import { Button } from "@/components/ui/button";
import { TableSkeleton } from "@/components/ui/skeleton";
import CrudModal from "@/pages/hepler/CrudModal";
import DetailModal from "@/pages/hepler/DetailModal";
import { formatPrice } from "@/lib/utils";
import { useAdminOrders } from "./useAdminOrders";

const { Option } = Select;

export default function AdminOrders() {
  // Lấy tất cả state và handlers từ custom hook
  const {
    orders,
    showSkeleton,
    modalLoading,
    pagination,
    searchValue,
    statusFilter,
    modalOpen,
    detailOpen,
    editingRecord,
    detailData,
    updatingOrderId,
    handleSubmit,
    handleStatusChange,
    handleViewDetail,
    openUpdateModal,
    closeModal,
    closeDetailModal,
    handleSearchChange,
    handleStatusFilterChange,
    handlePaginationChange,
    getStatusBadgeColor,
    getStatusLabel,
    getNotesInitialValue,
  } = useAdminOrders();

  // Cấu hình form fields cho CrudModal (chỉ cập nhật ghi chú admin)
  const getStatusUpdateFields = (order) => {
    if (!order) return [];
    return [
      {
        name: "notes",
        label: "Ghi chú admin",
        component: (
          <Input.TextArea rows={4} placeholder="Nhập ghi chú (tùy chọn)" />
        ),
        initialValue: getNotesInitialValue(order),
      },
    ];
  };

  // Table columns
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
      title: "Số điện thoại",
      width: 150,
      render: (_, record) => {
        const user = record.user || {};
        return user.phone || "-";
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
        <Tag color={getStatusBadgeColor(status)}>{getStatusLabel(status)}</Tag>
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
      width: 280,
      fixed: "right",
      render: (_, record) => (
        <Space size="middle">
          <Tooltip title="Xem chi tiết">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => handleViewDetail(record.id)}
            >
              <FaEye />
            </Button>
          </Tooltip>
          {record.availableStatuses && record.availableStatuses.length > 0 ? (
            <>
              <Select
                value={record.status}
                onChange={(value) => handleStatusChange(record.id, value)}
                loading={updatingOrderId === record.id}
                style={{ width: 150 }}
                disabled={updatingOrderId === record.id}
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
              <Tooltip title="Cập nhật ghi chú admin">
                <Button
                  className="bg-blue-500 hover:bg-blue-600 text-white"
                  size="sm"
                  onClick={() => openUpdateModal(record)}
                >
                  <FaEdit />
                </Button>
              </Tooltip>
            </>
          ) : (
            <Select
              value={record.status}
              disabled
              style={{ width: 150 }}
            >
              <Option value={record.status}>
                {getStatusLabel(record.status)}
              </Option>
            </Select>
          )}
        </Space>
      ),
    },
  ];

  // Cấu hình fields cho DetailModal
  const detailFields = detailData
    ? [
        {
          name: "id",
          label: "ID",
        },
        {
          name: "orderNumber",
          label: "Mã đơn hàng",
          render: (v) => <strong>{v}</strong>,
        },
        {
          name: "status",
          label: "Trạng thái",
          render: (v) => (
            <Tag color={getStatusBadgeColor(v)}>{getStatusLabel(v)}</Tag>
          ),
        },
        {
          name: "user",
          label: "Khách hàng",
          render: (v) => {
            if (!v) return "-";
            return `${v.firstName || ""} ${v.lastName || ""}`.trim() || "-";
          },
        },
        {
          name: "user",
          label: "Email",
          render: (v) => v?.email || "-",
        },
        {
          name: "user",
          label: "Số điện thoại",
          render: (v) => v?.phone || "-",
        },
        {
          name: "subtotal",
          label: "Tạm tính",
          render: (v) => formatPrice(Number(v || 0)),
        },
        {
          name: "shippingFee",
          label: "Phí vận chuyển",
          render: (v) => formatPrice(Number(v || 0)),
        },
        {
          name: "discountAmount",
          label: "Giảm giá",
          render: (v) => formatPrice(Number(v || 0)),
        },
        {
          name: "totalAmount",
          label: "Tổng tiền",
          render: (v) => (
            <span className="font-semibold text-red-600">
              {formatPrice(Number(v || 0))}
            </span>
          ),
        },
        {
          name: "paymentMethod",
          label: "Phương thức thanh toán",
        },
        {
          name: "paymentStatus",
          label: "Trạng thái thanh toán",
          render: (v) => {
            const colors = {
              PENDING: "orange",
              PAID: "green",
              FAILED: "red",
            };
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
        {
          name: "customerNote",
          label: "Ghi chú khách hàng",
          render: (v) => v || "-",
        },
        {
          name: "adminNote",
          label: "Ghi chú admin",
          render: (v) => v || "-",
        },
        {
          name: "trackingCode",
          label: "Mã vận đơn",
          render: (v) => v || "-",
        },
        {
          name: "createdAt",
          label: "Ngày tạo",
          render: (v) => {
            if (!v) return "-";
            const d = new Date(v);
            return `${d.toLocaleDateString("vi-VN")} ${d.toLocaleTimeString("vi-VN")}`;
          },
        },
        {
          name: "updatedAt",
          label: "Ngày cập nhật",
          render: (v) => {
            if (!v) return "-";
            const d = new Date(v);
            return `${d.toLocaleDateString("vi-VN")} ${d.toLocaleTimeString("vi-VN")}`;
          },
        },
        {
          name: "orderItems",
          label: <span style={{ whiteSpace: "nowrap" }}>Danh sách sản phẩm</span>,
          render: (items) => {
            if (!items || !Array.isArray(items)) return "-";
            return (
              <div className="space-y-2">
                {items.map((item, idx) => (
                  <div key={idx} className="border p-2 rounded">
                    <div className="flex items-center gap-3">
                      <img
                        src={
                          item.product?.imageUrl ||
                          "/placeholder-product.jpg"
                        }
                        alt={item.productName}
                        className="h-12 w-12 rounded border object-cover"
                      />
                      <div className="flex-1">
                        <div className="font-medium">{item.productName}</div>
                        {item.variantName && (
                          <div className="text-sm text-gray-500">
                            {item.variantName}
                          </div>
                        )}
                        <div className="text-sm text-gray-600">
                          SL: {item.quantity} × {formatPrice(Number(item.unitPrice))} ={" "}
                          <span className="font-semibold">
                            {formatPrice(Number(item.totalPrice))}
                          </span>
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
            text="Quản lý đơn hàng"
            color="#667eea"
            style={{
              background:
                "linear-gradient(45deg, #667eea, #764ba2, #f093fb, #667eea)",
              backgroundSize: "300% 300%",
              animation: "gradientShift 4s ease infinite",
              fontWeight: "bold",
              boxShadow: "0 6px 20px rgba(102, 126, 234, 0.4)",
              textShadow: "0 2px 4px rgba(0,0,0,0.3)",
              fontSize: "16px",
              padding: "8px 20px",
              height: "40px",
              lineHeight: "24px",
            }}
          >
            <Card className="shadow rounded-2xl">
              <div className="flex items-center gap-4 mb-4">
                <Input.Search
                  placeholder="Tìm theo mã đơn, tên khách hàng"
                  value={searchValue}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  allowClear
                  style={{ width: 300 }}
                />
                <Select
                  placeholder="Lọc theo trạng thái"
                  allowClear
                  style={{ width: 200 }}
                  value={statusFilter || undefined}
                  onChange={handleStatusFilterChange}
                >
                  <Option value="PENDING">Chờ xác nhận</Option>
                  <Option value="CONFIRMED">Đã xác nhận</Option>
                  <Option value="PROCESSING">Đang giao</Option>
                  <Option value="DELIVERED">Đã giao</Option>
                  <Option value="CANCELLED">Đã hủy</Option>
                </Select>
              </div>
              {showSkeleton ? (
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
                    showTotal: (total) => `Tổng ${total} đơn hàng`,
                    onChange: handlePaginationChange,
                  }}
                />
              )}
            </Card>
          </Badge.Ribbon>
        </Col>
      </Row>

      {/* Modal cập nhật trạng thái */}
      <CrudModal
        open={modalOpen}
        onCancel={closeModal}
        onSubmit={handleSubmit}
        editingRecord={editingRecord}
        fields={getStatusUpdateFields(editingRecord)}
        title="Cập nhật ghi chú đơn hàng"
        confirmLoading={modalLoading}
        okText="Lưu"
        width={600}
      />

      {/* Modal chi tiết */}
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

