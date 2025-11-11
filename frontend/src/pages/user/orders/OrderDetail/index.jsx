import { useParams, useNavigate } from "react-router-dom";
import { Steps, Card, Descriptions, Tag, List, Space, Skeleton } from "antd";
import { Button } from "@/components/ui/button";
import BreadcrumbNav from "@/components/user/BreadcrumbNav";
import { formatPrice } from "@/lib/utils";
import { useOrderDetail, getStatusLabel, getStatusTagColor } from "./useOrderDetail";

export default function OrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const {
    order,
    loading,
    actionLoading,
    steps,
    handleCancel,
    handleConfirmReceived,
  } = useOrderDetail(id);

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <BreadcrumbNav />
      <div className="max-w-5xl mx-auto mt-6">
        <Card>
          {loading || !order ? (
            <Skeleton active paragraph={{ rows: 8 }} />
          ) : (
            <Space direction="vertical" size="large" className="w-full">
              {/* Header */}
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">Chi tiết đơn hàng</h2>
                <Tag color={getStatusTagColor(order.status)}>{getStatusLabel(order.status)}</Tag>
              </div>

              {/* Timeline */}
              <div className="border rounded p-4">
                <Steps
                  current={steps.current}
                  items={steps.steps.map((s) => ({ title: s.label, description: s.time }))}
                />
              </div>

              {/* Thông tin đơn hàng */}
              <Descriptions column={1} bordered title="Thông tin đơn hàng">
                <Descriptions.Item label="Mã đơn hàng">
                  <span className="font-semibold text-gray-900">{order.orderNumber}</span>
                </Descriptions.Item>
                <Descriptions.Item label="Ngày đặt">
                  <span className="font-semibold text-gray-900">
                    {order.createdAt ? new Date(order.createdAt).toLocaleDateString("vi-VN") : "-"}
                  </span>
                </Descriptions.Item>
                <Descriptions.Item label="Trạng thái">
                  <Tag color={getStatusTagColor(order.status)}>{getStatusLabel(order.status)}</Tag>
                </Descriptions.Item>
                <Descriptions.Item label="Phương thức thanh toán">
                  <span className="font-semibold text-gray-900">{order.paymentMethod}</span>
                </Descriptions.Item>
              </Descriptions>

              {/* Thông tin nhận hàng */}
              <Descriptions column={1} bordered title="Thông tin nhận hàng">
                <Descriptions.Item label="Họ tên">
                  <span className="font-semibold text-gray-900">{order.shippingAddress.fullName}</span>
                </Descriptions.Item>
                <Descriptions.Item label="Số điện thoại">
                  <span className="font-semibold text-gray-900">{order.shippingAddress.phone}</span>
                </Descriptions.Item>
                {order.user?.email && (
                  <Descriptions.Item label="Email">
                    <span className="font-semibold text-gray-900">{order.user.email}</span>
                  </Descriptions.Item>
                )}
                <Descriptions.Item label="Địa chỉ">
                  <span className="font-semibold text-gray-900">
                    {`${order.shippingAddress.streetAddress}, ${order.shippingAddress.ward}, ${order.shippingAddress.district}, ${order.shippingAddress.city}`}
                  </span>
                </Descriptions.Item>
              </Descriptions>

              {/* Ghi chú admin */}
              {order.adminNote && (
                <div>
                  <h3 className="text-base font-semibold mb-3">Ghi chú từ shop</h3>
                  <p className="whitespace-pre-wrap">{order.adminNote}</p>
                </div>
              )}

              {/* Sản phẩm */}
              <div>
                <h3 className="text-base font-semibold mb-3">Sản phẩm</h3>
                <List
                  dataSource={order.orderItems}
                  renderItem={(it) => {
                    const qty = Number(it.quantity ?? it.qty ?? it.count ?? it.amount ?? 1);
                    return (
                      <List.Item>
                        <List.Item.Meta
                          avatar={
                            <img
                              src={it.product?.primaryImage || it.product?.imageUrl || "/placeholder-product.jpg"}
                              alt={it.productName}
                              className="h-20 w-20 rounded border object-cover"
                            />
                          }
                          title={<span className="font-semibold text-gray-900">{it.productName}</span>}
                          description={
                            <div>
                              {it.variantName && <div className="text-sm text-gray-500 mb-1">{it.variantName}</div>}
                              <div className="flex items-center gap-4">
                                <span className="text-gray-600">SL: {qty}</span>
                                <span className="text-base font-semibold text-red-600">{formatPrice(Number(it.totalPrice))}</span>
                              </div>
                            </div>
                          }
                        />
                      </List.Item>
                    );
                  }}
                />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between pt-4 border-t">
                <span className="text-gray-900 font-bold text-lg">Tổng tiền: <span className="text-xl font-bold text-red-600">{formatPrice(Number(order.totalAmount))}</span></span>
                <Space>
                  {order.status === 'PENDING' && (
                    <Button variant="outline" disabled={actionLoading} onClick={handleCancel}>Hủy đơn</Button>
                  )}
                  {order.status === 'PROCESSING' && (
                    <Button className="bg-emerald-600 hover:bg-emerald-700" disabled={actionLoading} onClick={handleConfirmReceived}>Xác nhận đã nhận</Button>
                  )}
                  {order.status === 'DELIVERED' && (
                    <Button className="bg-blue-600 hover:bg-blue-700" onClick={() => navigate(`/orders/${id}/review`)}>
                      Viết đánh giá
                    </Button>
                  )}
                </Space>
              </div>
            </Space>
          )}
        </Card>
      </div>
    </div>
  );
}

