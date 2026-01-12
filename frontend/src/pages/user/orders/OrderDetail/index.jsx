import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Steps, Card, Descriptions, Tag, List, Space, Skeleton, Modal, message } from "antd";
import { ExclamationCircleOutlined } from "@ant-design/icons";
import { Button } from "@/components/ui/button";
import BreadcrumbNav from "@/components/user/BreadcrumbNav";
import { formatPrice } from "@/lib/utils";
import { useOrderDetail, getStatusLabel, getStatusTagColor, getPaymentStatusLabel, getPaymentStatusTagColor } from "./useOrderDetail";
import { handleVNPayPayment } from "@/features/payment";
import { createVNPayPayment } from "@/api/payment";

export default function OrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [cancelModalVisible, setCancelModalVisible] = useState(false);
  const {
    order,
    loading,
    actionLoading,
    steps,
    handleCancel,//hủy đơn hàng
    handleConfirmReceived,//xác nhận nhận hàng
  } = useOrderDetail(id);

  const showCancelModal = () => {
    setCancelModalVisible(true);
  };

  const handleCancelConfirm = async () => {
    setCancelModalVisible(false);
    await handleCancel();
  };

  const handleCancelCancel = () => {
    setCancelModalVisible(false);
  };
  //thanh toán lại VNPay nếu thanh toán thất bại
  const handleRetryVNPay = async () => {
    try {
      if (!order?.id) return;
      await handleVNPayPayment(order.id, createVNPayPayment, (err) => {
        message.error(err || "Không thể tạo thanh toán VNPay, vui lòng thử lại.");
      });
    } catch {
      // lỗi đã được hiển thị qua message ở trên
    }
  };

  // thanh toán lại Tingee
  const handleRetryTingee = () => {
    if (!order) return;
    navigate(`/payment/tingee?orderId=${order.id}&amount=${order.totalAmount}&orderNumber=${order.orderNumber}`);
  };

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

              {/* Ghi chú admin */}
              {order.adminNote && (
                <div className="border-2 border-red-400 bg-blue-50 rounded-lg p-4 shadow-md">
                  <div className="flex items-start gap-3">
                    <h3 className="text-base font-semibold text-blue-800 whitespace-nowrap">Ghi chú từ shop:</h3>
                    <p className="whitespace-pre-wrap text-gray-800 font-medium flex-1">{order.adminNote}</p>
                  </div>
                </div>
              )}

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
                {/* Trạng thái thanh toán */}
                {order.paymentSummary && (
                  <>
                    <Descriptions.Item label="Trạng thái thanh toán">
                      <div className="flex items-center gap-3">
                        <Tag color={getPaymentStatusTagColor(order.paymentSummary.status)}>
                          {getPaymentStatusLabel(order.paymentSummary)}
                        </Tag>
                        {/* Nút thanh toán lại VNPay ngay cạnh trạng thái, dễ nhìn hơn */}
                        {order.paymentMethod === "VNPAY" && order.paymentStatus !== "PAID" && (
                          <Button
                            size="sm"
                            className="bg-orange-500 hover:bg-orange-600 text-white"
                            disabled={actionLoading}
                            onClick={handleRetryVNPay}
                          >
                            Thanh toán lại VNPay
                          </Button>
                        )}

                        {/* Nút thanh toán lại Tingee */}
                        {order.paymentMethod === "TINGEE" && order.paymentStatus !== "PAID" && order.status !== "CANCELLED" && (
                          <Button
                            size="sm"
                            className="bg-blue-600 hover:bg-blue-700 text-white"
                            disabled={actionLoading}
                            onClick={handleRetryTingee}
                          >
                            Thanh toán lại
                          </Button>
                        )}
                      </div>
                    </Descriptions.Item>
                    {/* Hiển thị ngân hàng thanh toán nếu có (lấy từ database) */}
                    {order.bankInfo && (
                      <Descriptions.Item label="Ngân hàng thanh toán">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold ">{order.bankInfo.bankCode}</span>
                        </div>
                      </Descriptions.Item>
                    )}
                  </>
                )}
              </Descriptions>

              {/* Thông tin nhận hàng */}
              <Descriptions column={1} bordered title="Thông tin nhận hàng">
                <Descriptions.Item label="Họ tên">
                  <span className="font-semibold text-gray-900">{order.shippingAddress?.fullName || "-"}</span>
                </Descriptions.Item>
                <Descriptions.Item label="Số điện thoại">
                  <span className="font-semibold text-gray-900">{order.shippingAddress?.phone || "-"}</span>
                </Descriptions.Item>
                {order.user?.email && (
                  <Descriptions.Item label="Email">
                    <span className="font-semibold text-gray-900">{order.user.email}</span>
                  </Descriptions.Item>
                )}
                <Descriptions.Item label="Địa chỉ">
                  <span className="font-semibold text-gray-900">
                    {order.shippingAddress
                      ? `${order.shippingAddress.streetAddress || ""}, ${order.shippingAddress.ward || ""}, ${order.shippingAddress.district || ""}, ${order.shippingAddress.city || ""}`
                      : "-"}
                  </span>
                </Descriptions.Item>
              </Descriptions>



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
                    <Button variant="outline" disabled={actionLoading} onClick={showCancelModal}>Hủy đơn</Button>
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

      {/* Modal xác nhận hủy đơn */}
      <Modal
        title={
          <div className="flex items-center gap-2">
            <ExclamationCircleOutlined className="text-orange-500 text-xl" />
            <span>Xác nhận hủy đơn hàng</span>
          </div>
        }
        open={cancelModalVisible}//hiển thị modal
        onOk={handleCancelConfirm}//xác nhận hủy đơn
        onCancel={handleCancelCancel}//không xác nhận hủy đơn
        okText="Xác nhận hủy"//text của nút xác nhận
        cancelText="Không"//text của nút không
        okButtonProps={{ danger: true, loading: actionLoading }}//props của nút xác nhận
        cancelButtonProps={{ disabled: actionLoading }}//props của nút không
        maskClosable={false}//không đóng modal khi click ra ngoài
        keyboard={false}//không đóng modal khi nhấn phím escape
      >
        <div className="py-4">
          <p className="text-base mb-2">
            Bạn có chắc chắn muốn hủy đơn hàng <strong>{order?.orderNumber}</strong> không?
          </p>
          <p className="text-sm text-gray-600">
            Hành động này không thể hoàn tác. Đơn hàng sẽ được chuyển sang trạng thái "Đã hủy".
          </p>
        </div>
      </Modal>
    </div>
  );
}

