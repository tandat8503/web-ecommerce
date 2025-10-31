import { useEffect, useState } from "react";
import {
  Table,
  Input,
  Space,
  message,
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
import { toast } from "react-toastify";
import { getOrders, getOrderById, updateOrder, updateOrderNotes } from "@/api/adminOrders";
import { formatPrice } from "@/lib/utils";

const { Option } = Select;

export default function AdminOrders() {
  const [showSkeleton, setShowSkeleton] = useState(false);//  skeleton loading
  const [modalLoading, setModalLoading] = useState(false);//  modal loading
  const [orders, setOrders] = useState([]);//  danh sách đơn hàng
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0 });//  phân trang
  const [statusFilter, setStatusFilter] = useState("");//  trạng thái lọc
  const [keyword, setKeyword] = useState("");//  từ khóa tìm kiếm
  const [modalOpen, setModalOpen] = useState(false);//  modal cập nhật trạng thái đang mở
  const [detailOpen, setDetailOpen] = useState(false);//  modal chi tiết đang mở
  const [editingRecord, setEditingRecord] = useState(null);//  đơn hàng đang cập nhật
  const [detailData, setDetailData] = useState(null);//  chi tiết đơn hàng
  const [updatingOrderId, setUpdatingOrderId] = useState(null);//  trạng thái đang cập nhật đơn hàng

  // Debounce search
  const [searchValue, setSearchValue] = useState("");//  từ khóa tìm kiếm
  useEffect(() => {
    const timer = setTimeout(() => {
      setPagination((prev) => ({ ...prev, page: 1 }));//  reset về trang 1
      setKeyword(searchValue);//  set từ khóa tìm kiếm
    }, 500);//  delay 500ms
    return () => clearTimeout(timer);
  }, [searchValue]);

  // Load danh sách đơn hàng
  const fetchOrders = async () => {
    try {
      setShowSkeleton(true);
      
      const [res] = await Promise.all([
        getOrders({
          page: pagination.page,//  trang hiện tại
          limit: pagination.limit,//  số lượng đơn hàng trên mỗi trang
          status: statusFilter || undefined,//  trạng thái lọc
          q: keyword || undefined,//  từ khóa tìm kiếm
        }),
        new Promise((resolve) => setTimeout(resolve, 600)),//  delay 600ms
      ]);

      setOrders(res.data.items || []);//  set danh sách đơn hàng
      setPagination((prev) => ({
        ...prev,//  set phân trang
        total: res.data.total || 0,//  set tổng số đơn hàng
      }));
    } catch (err) {
      console.log(err);
      toast.error("Không thể tải danh sách đơn hàng");
    } finally {
      setShowSkeleton(false);
    }
  };
//  fetch danh sách đơn hàng khi trang, số lượng đơn hàng trên mỗi trang, trạng thái lọc, từ khóa tìm kiếm thay đổi
  useEffect(() => {
    fetchOrders();
  }, [pagination.page, pagination.limit, statusFilter, keyword]); 

  // Hàm lấy màu badge theo trạng thái
  const getStatusBadgeColor = (status) => {
    switch (String(status)) {
      case "PENDING":
        return "orange";
      case "CONFIRMED":
        return "blue";
      case "PROCESSING":
        return "cyan";
      case "DELIVERED":
        return "green";
      case "CANCELLED":
        return "red";
      default:
        return "default";
    }
  };

  // Hàm lấy label trạng thái
  const getStatusLabel = (status) => {
    const labels = {
      PENDING: "Chờ xác nhận",
      CONFIRMED: "Đã xác nhận",
      PROCESSING: "Đang giao",
      DELIVERED: "Đã giao",
      CANCELLED: "Đã hủy",
    };
    return labels[status] || status;
  };

  // Submit form cập nhật ghi chú admin (từ modal)
  const handleSubmit = async (values, record) => {
    try {
      setModalLoading(true);
      // Cập nhật chỉ ghi chú, không thay đổi status
      await updateOrderNotes(record.id, values.notes || "");
      toast.success("Cập nhật ghi chú thành công");
      setModalOpen(false);
      fetchOrders();
    } catch (err) {
      console.log(err);
      const errorMsg = err.response?.data?.message || "Có lỗi khi cập nhật ghi chú";
      toast.error(errorMsg);
    } finally {
      setModalLoading(false);
    }
  };

  // Cập nhật trạng thái trực tiếp từ dropdown
  const handleStatusChange = async (orderId, newStatus) => {
    try {
      setUpdatingOrderId(orderId);
      await updateOrder(orderId, {
        status: newStatus,
        notes: "",
      });
      toast.success("Cập nhật trạng thái đơn hàng thành công");
      fetchOrders();
    } catch (err) {
      console.log(err);
      const errorMsg = err.response?.data?.message || "Có lỗi khi cập nhật đơn hàng";
      toast.error(errorMsg);
      // Refresh để lấy lại trạng thái cũ
      fetchOrders();
    } finally {
      setUpdatingOrderId(null);
    }
  };

  // Xem chi tiết đơn hàng
  const handleViewDetail = async (id) => {
    try {
      const res = await getOrderById(id);
      setDetailData(res.data);
      setDetailOpen(true);
    } catch (err) {
      console.log(err);
      toast.error("Không thể tải chi tiết đơn hàng");
    }
  };

  // Cấu hình form fields cho CrudModal (chỉ cập nhật ghi chú admin)
  const getStatusUpdateFields = (order) => {
    if (!order) return [];
    return [
      {
        name: "notes",
        label: "Ghi chú admin",
        component: <Input.TextArea rows={4} placeholder="Nhập ghi chú (tùy chọn)" />,
        initialValue: order.adminNote || "",
      },
    ];
  };

  // Hàm mở modal cập nhật trạng thái và ghi chú
  const handleOpenUpdateModal = (record) => {
    setEditingRecord(record);
    setModalOpen(true);
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
                  onClick={() => handleOpenUpdateModal(record)}
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
              <Option value={record.status}>{getStatusLabel(record.status)}</Option>
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
                  onChange={(e) => setSearchValue(e.target.value)}
                  allowClear
                  style={{ width: 300 }}
                />
                <Select
                  placeholder="Lọc theo trạng thái"
                  allowClear
                  style={{ width: 200 }}
                  value={statusFilter || undefined}
                  onChange={(value) => {
                    setStatusFilter(value || "");
                    setPagination((prev) => ({ ...prev, page: 1 }));
                  }}
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
                    onChange: (page, pageSize) =>
                      setPagination({ ...pagination, page, limit: pageSize }),
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
        onCancel={() => {
          setModalOpen(false);
          setEditingRecord(null);
        }}
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
        onCancel={() => {
          setDetailOpen(false);
          setDetailData(null);
        }}
        title="Chi tiết đơn hàng"
        data={detailData}
        fields={detailFields}
        columns={2}
        width={900}
      />
    </>
  );
}

