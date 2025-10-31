import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, Pagination, Tag, Empty } from "antd";
import BreadcrumbNav from "@/components/user/BreadcrumbNav";
import { getUserOrders } from "@/api/orders";
import { formatPrice } from "@/lib/utils";

export default function MyOrders() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(""); // ALL by default

  const STATUS_TABS = [
    { key: "", label: "Tất cả" },
    { key: "PENDING", label: "Chờ xác nhận" },
    { key: "CONFIRMED", label: "Đã xác nhận" },
    { key: "PROCESSING", label: "Đang giao" },
    { key: "DELIVERED", label: "Đã giao" },
    { key: "CANCELLED", label: "Đã hủy" },
  ];

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

  const getStatusTagColor = (s) => {
    switch (String(s)) {
      case 'PENDING': return 'orange';
      case 'CONFIRMED': return 'blue';
      case 'PROCESSING': return 'cyan';
      case 'DELIVERED': return 'green';
      case 'CANCELLED': return 'red';
      default: return 'default';
    }
  };

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const { data } = await getUserOrders({ page, limit, status: status || undefined });
      setOrders(data.items || []);
      setTotal(data.total || 0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchOrders(); }, [page, limit, status]);

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

          {/* Danh sách đơn dạng card */}
          {loading ? (
            <div className="p-6 space-y-3">
              {[...Array(3)].map((_, i) => (<Skeleton key={i} className="h-24 w-full" />))}
            </div>
          ) : orders.length === 0 ? (
            <div className="p-6">
              <Empty description="Chưa có đơn hàng" />
            </div>
          ) : (
            <div className="divide-y">
              {orders.map((o) => (
                <div key={o.id} className="p-6 bg-white">
                  {/* Header: trạng thái và ngày đặt */}
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-500">
                      Ngày đặt: {o.createdAt ? new Date(o.createdAt).toLocaleDateString("vi-VN") : "-"}
                    </div>
                    <Tag color={getStatusTagColor(o.status)}>{getStatusLabel(o.status)}</Tag>
                  </div>

                  {/* Danh sách sản phẩm */}
                  <div className="mt-3 space-y-3">
                    {(o.orderItems || []).map((it) => {
                      const qty = Number(it.quantity ?? it.qty ?? it.count ?? it.amount ?? 1);
                      return (
                      <div key={it.id} className="flex items-center gap-3">
                        <img
                          src={(it.product?.primaryImage || it.product?.imageUrl || "/placeholder-product.jpg")}
                          alt={it.product?.name || it.productName}
                          className="h-14 w-14 rounded border object-cover"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-medium truncate">{it.product?.name || it.productName}</div>
                          <div className="text-xs text-gray-500 truncate">{it.variant?.name || it.variantName || ''} {`x${qty}`}</div>
                        </div>
                        <div className="text-sm font-semibold">{formatPrice(Number(it.totalPrice))}</div>
                      </div>
                      )
                    })}
                  </div>

                  {/* Tổng tiền + hành động */}
                  <div className="mt-3 flex items-center justify-end">
                    <div className="flex items-center gap-2 text-right">
                      <span className="text-sm font-semibold text-gray-900">Thành tiền:</span>
                      <span className="text-lg font-semibold text-red-600">{formatPrice(Number(o.totalAmount))}</span>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-end gap-2">
                    <Button size="sm" variant="outline" className="cursor-pointer" onClick={() => navigate(`/orders/${o.id}`)}>Xem chi tiết</Button>
                    {o.status === 'DELIVERED' && (
                      <Button size="sm" className="bg-blue-600 hover:bg-blue-700 cursor-pointer" onClick={() => navigate(`/orders/${o.id}/review`)}>
                        Đánh giá
                      </Button>
                    )}
                    <Button size="sm" className="bg-orange-500 hover:bg-orange-600 cursor-pointer" onClick={() => navigate(`/orders/${o.id}`)}>Mua lại</Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {total > 0 && (
            <div className="p-4 flex items-center justify-between">
              <div className="text-sm font-semibold text-gray-900">Tổng: {total}</div>
              <Pagination
                current={page}
                pageSize={limit}
                total={total}
                showSizeChanger={false}
                onChange={(p) => setPage(p)}
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}


