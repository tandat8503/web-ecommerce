import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, Table, Tag, Empty, Button } from "antd";
import { ClockCircleOutlined, CheckCircleOutlined, DollarOutlined } from "@ant-design/icons";
import BreadcrumbNav from "@/components/user/BreadcrumbNav";
import { formatPrice } from "@/lib/utils";
import { useMyOrders, STATUS_TABS, getStatusLabel, getStatusTagColor } from "./useMyOrders";

export default function MyOrders() {
  const navigate = useNavigate();
  const {
    orders,
    page,
    setPage,
    limit,
    total,
    loading,
    status,
    setStatus,
  } = useMyOrders();

  const columns = [
    {
      title: "Mã đơn hàng",
      dataIndex: "orderNumber",
      key: "orderNumber",
      width: 200,
      render: (text) => <span className="font-medium">{text}</span>,
    },
    {
      title: "Ngày đặt",
      dataIndex: "createdAt",
      key: "createdAt",
      width: 120,
      render: (date) => (
        <div className="flex items-center gap-1">
          <ClockCircleOutlined className="text-gray-400" />
          <span>{date ? new Date(date).toLocaleDateString("vi-VN") : "-"}</span>
        </div>
      ),
    },
    {
      title: "Sản phẩm",
      key: "products",
      width: 120,
      render: (_, record) => {
        const firstItem = record.orderItems?.[0];
        if (!firstItem) return "-";
        return (
          <img
            src={firstItem.product?.primaryImage || firstItem.product?.imageUrl || "/placeholder-product.jpg"}
            alt={firstItem.product?.name || firstItem.productName}
            className="h-12 w-12 rounded border object-cover"
          />
        );
      },
    },
    {
      title: "Tổng tiền",
      dataIndex: "totalAmount",
      key: "totalAmount",
      width: 150,
      render: (amount) => (
        <span className="text-red-600 font-bold">
          {formatPrice(Number(amount))}
        </span>
      ),
    },
    {
      title: "Thanh toán",
      dataIndex: "paymentMethod",
      key: "paymentMethod",
      width: 120,
      render: (method) => (
        <div className="flex items-center gap-1">
          <DollarOutlined className="text-gray-400" />
          <span>{method || "COD"}</span>
        </div>
      ),
    },
    {
      title: "Trạng thái",
      dataIndex: "status",
      key: "status",
      width: 180,
      render: (status) => {
        const label = status === 'DELIVERED' ? 'Giao hàng thành công' : getStatusLabel(status);
        return (
          <Tag color={getStatusTagColor(status)} icon={status === 'DELIVERED' ? <CheckCircleOutlined /> : null}>
            {label || status}
          </Tag>
        );
      },
    },
    {
      title: "Hành động",
      key: "action",
      width: 200,
      render: (_, record) => (
        <div className="flex gap-2">
          <Button
            type="primary"
            danger
            size="small"
            onClick={() => navigate(`/orders/${record.id}`)}
          >
            Chi tiết
          </Button>
          {record.status === 'DELIVERED' && (
            <Button
              type="primary"
              danger
              size="small"
              onClick={() => navigate(`/orders/${record.id}/review`)}
            >
              Đánh giá
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <BreadcrumbNav />

      <Card className="mt-6">
        <CardContent className="p-0">
          {/* Tabs trạng thái */}
          <div className="px-6 pt-6 border-b bg-white">
            <Tabs
              activeKey={status}
              onChange={(key) => { setPage(1); setStatus(key); }}
              items={STATUS_TABS.map((t) => ({ key: t.key, label: t.label }))}
            />
          </div>

          {/* Bảng đơn hàng */}
          <div className="p-6">
            {orders.length === 0 && !loading ? (
              <Empty description="Chưa có đơn hàng" />
            ) : (
              <Table
                columns={columns}
                dataSource={orders}
                rowKey="id"
                loading={loading}
                pagination={{
                  current: page,
                  pageSize: limit,
                  total: total,
                  showSizeChanger: false,
                  showTotal: (total) => `Tổng: ${total} đơn hàng`,
                  onChange: (p) => setPage(p),
                }}
              />
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

