import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Steps } from "antd";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import BreadcrumbNav from "@/components/user/BreadcrumbNav";
import { getOrderById, cancelOrder, confirmReceivedOrder } from "@/api/orders";
import { formatPrice } from "@/lib/utils";

export default function OrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchDetail = async () => {
    try {
      setLoading(true);
      const { data } = await getOrderById(id);
      setOrder(data.order || null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchDetail(); }, [id]);

  const handleCancel = async () => {
    try {
      setActionLoading(true);
      await cancelOrder(id);
      await fetchDetail();
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmReceived = async () => {
    try {
      setActionLoading(true);
      await confirmReceivedOrder(id);
      await fetchDetail();
    } finally {
      setActionLoading(false);
    }
  };

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

  const getStatusBadgeClass = (s) => {
    switch (String(s)) {
      case 'PENDING': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'CONFIRMED': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'PROCESSING': return 'bg-cyan-100 text-cyan-700 border-cyan-200';
      case 'DELIVERED': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'CANCELLED': return 'bg-rose-100 text-rose-700 border-rose-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const steps = useMemo(() => {
    if (!order) return { steps: [], current: 0 };
    const t = order.timeline || {};
    const formatDt = (d) => (d ? new Date(d).toLocaleString("vi-VN") : "");
    const rawSteps = [
      { key: "PENDING", label: "Đã đặt hàng", time: formatDt(t.pendingAt || order.createdAt) },
      { key: "CONFIRMED", label: "Đã xác nhận", time: formatDt(t.confirmedAt || t.paymentConfirmedAt) },
      { key: "PROCESSING", label: "Đang giao", time: formatDt(t.processingAt) },
      { key: "DELIVERED", label: "Đã nhận hàng", time: formatDt(t.deliveredAt) },
    ];
    
    // Tính current index dựa trên index trong rawSteps array
    let currentIdx = rawSteps.findIndex(s => s.key === order.status);
    
    // Nếu không tìm thấy trong rawSteps (ví dụ: CANCELLED), xử lý riêng
    if (currentIdx < 0 && order.status === "CANCELLED") {
      rawSteps.push({ key: "CANCELLED", label: "Đã huỷ", time: formatDt(t.cancelledAt || order.updatedAt) });
      currentIdx = rawSteps.length - 1;
    }
    
    // Đảm bảo currentIdx hợp lệ
    if (currentIdx < 0) currentIdx = 0;
    
    return {
      steps: rawSteps,
      current: currentIdx
    };
  }, [order]);

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <BreadcrumbNav />

      <Card className="mt-6">
        <CardContent className="p-6 space-y-6">
          {loading || !order ? (
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => (<Skeleton key={i} className="h-6 w-full" />))}
            </div>
          ) : (
            <>
              {/* Header giống Shopee: mã đơn + trạng thái + tổng */}
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-500">Mã đơn: <span className="text-gray-800 font-medium">{order.orderNumber}</span></div>
                <div className="flex items-center gap-4">
                  <span className={`rounded-full px-3 py-1 text-sm border ${getStatusBadgeClass(order.status)}`}>{getStatusLabel(order.status)}</span>
                  <div className="flex items-center gap-2 text-right">
                    <span className="text-sm font-semibold text-gray-900">Tổng tiền:</span>
                    <span className="text-lg font-bold text-red-600">{formatPrice(Number(order.totalAmount))}</span>
                  </div>
                </div>
              </div>

              {/* Timeline trạng thái đơn hàng (Ant Design Steps) */}
              <div className="bg-white rounded border p-6">
                <Steps
                  current={steps.current}
                  items={steps.steps.map((s) => ({ title: s.label, description: s.time }))}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded border bg-white p-4">
                  <div className="font-semibold mb-2">Địa chỉ giao hàng</div>
                  <div className="text-sm text-gray-700">
                    {order.shippingAddress.fullName} • {order.shippingAddress.phone}<br />
                    {order.shippingAddress.streetAddress}, {order.shippingAddress.ward}, {order.shippingAddress.district}, {order.shippingAddress.city}
                  </div>
                </div>
                <div className="rounded border bg-white p-4">
                  <div className="font-semibold mb-2">Thanh toán</div>
                  <div className="text-sm text-gray-700">Phương thức: {order.paymentMethod}</div>
                  <div className="text-sm text-gray-700">Trạng thái: {order.paymentStatus}</div>
                </div>
              </div>

              {/* Ghi chú admin (nếu có) */}
              {order.adminNote && (
                <div className="rounded border bg-white p-4">
                  <div className="font-semibold mb-2">Ghi chú từ shop</div>
                  <div className="text-sm text-gray-700 whitespace-pre-wrap">{order.adminNote}</div>
                </div>
              )}

              <div className="overflow-x-auto rounded border bg-white">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Sản phẩm</TableHead>
                      <TableHead className="text-center">Số lượng</TableHead>
                      <TableHead className="text-right">Đơn giá</TableHead>
                      <TableHead className="text-right">Thành tiền</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {order.orderItems.map((it) => {
                      const qty = Number(it.quantity ?? it.qty ?? it.count ?? it.amount ?? 1);
                      return (
                      <TableRow key={it.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <img
                              src={(it.product?.primaryImage || it.product?.imageUrl || "/placeholder-product.jpg")}
                              alt={it.productName}
                              className="h-14 w-14 rounded border object-cover"
                            />
                            <div>
                              <div className="text-sm font-medium">{it.productName}</div>
                              {it.variantName && (<div className="text-xs text-gray-500">{it.variantName}</div>)}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">{qty}</TableCell>
                        <TableCell className="text-right">{formatPrice(Number(it.unitPrice))}</TableCell>
                        <TableCell className="text-right font-semibold">{formatPrice(Number(it.totalPrice))}</TableCell>
                      </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>

              <div className="flex items-center justify-between">
                <Button variant="outline" className="cursor-pointer" onClick={() => navigate('/orders')}>Quay lại danh sách</Button>
                <div className="flex gap-2">
                  {order.status === 'PENDING' && (
                    <Button variant="outline" className="cursor-pointer" disabled={actionLoading} onClick={handleCancel}>Hủy đơn</Button>
                  )}
                  {order.status === 'PROCESSING' && (
                    <Button className="bg-emerald-600 hover:bg-emerald-700 cursor-pointer" disabled={actionLoading} onClick={handleConfirmReceived}>Xác nhận đã nhận</Button>
                  )}
                  {order.status === 'DELIVERED' && (
                    <Button className="bg-blue-600 hover:bg-blue-700 cursor-pointer" onClick={() => navigate(`/orders/${id}/review`)}>
                      Viết đánh giá
                    </Button>
                  )}
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}


