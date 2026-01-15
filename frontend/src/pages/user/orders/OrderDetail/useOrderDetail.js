import { useEffect, useMemo, useState, useCallback } from "react";
import { getOrderById, cancelOrder, confirmReceivedOrder } from "@/api/orders";
import { toast } from "@/lib/utils";
import { onOrderStatusUpdate, joinOrderRoom, leaveOrderRoom } from "@/utils/socket";

export const getStatusLabel = (status) => {
  const labels = {
    PENDING: "Chờ xác nhận",
    CONFIRMED: "Đã xác nhận",
    PROCESSING: "Đang giao",
    DELIVERED: "Đã giao",
    CANCELLED: "Đã hủy",
  };
  return labels[status] || status;  
};

export const getStatusTagColor = (s) => {
  switch (String(s)) {
    case 'PENDING': return 'orange';
    case 'CONFIRMED': return 'blue';
    case 'PROCESSING': return 'cyan';
    case 'DELIVERED': return 'green';
    case 'CANCELLED': return 'red';
    default: return 'default';
  }
};
export const getPaymentStatusTagColor = (status) => {
  switch (String(status)) {
    case 'PAID': return 'green';
    case 'FAILED': return 'red';
    default: return 'orange';
  }
};

export const getPaymentStatusLabel = (summary) => {
  if (!summary) return 'Đang xử lý';
  if (summary.method === 'COD') {
    if (summary.status === 'PAID') return 'Đã thanh toán COD';
    if (summary.status === 'FAILED') return 'Đơn đã hủy';
    return 'Chưa thanh toán (thanh toán khi nhận hàng)';
  }

  if (summary.method === 'VNPAY') {
    if (summary.status === 'PAID') return 'Đã thanh toán VNPay';
    if (summary.status === 'FAILED') return 'Thanh toán VNPay thất bại';
    return 'Chưa thanh toán VNPay';
  }

  if (summary.method === 'TINGEE') {
    if (summary.status === 'PAID') return 'Đã thanh toán QR';
    if (summary.status === 'FAILED') return 'Thanh toán QR thất bại';
    return 'Chưa thanh toán QR';
  }

  // Fallback cho các phương thức khác
  if (summary.status === 'PAID') return 'Đã thanh toán';
  if (summary.status === 'FAILED') return 'Thanh toán thất bại';
  return 'Chưa thanh toán';
};

export const getPaymentMethodLabel = (method) => {
  switch (method) {
    case 'COD': return 'Tiền mặt (COD)';
    case 'VNPAY': return 'VNPay';
    case 'TINGEE': return 'Chuyển khoản QR';
    default: return method || 'COD';
  }
};

export const useOrderDetail = (id) => {
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchDetail = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await getOrderById(id);
      if (!data.order) {
        setOrder(null);
        return;
      }

      let parsedAddress = data.order.shippingAddress;
      if (parsedAddress && typeof parsedAddress === "string") {
        try {
          parsedAddress = JSON.parse(parsedAddress);
        } catch {
          parsedAddress = null;
        }
      }

      setOrder({
        ...data.order,
        shippingAddress: parsedAddress || data.order.shippingAddress || {}
      });
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { 
    fetchDetail(); 
  }, [fetchDetail]);

  // ✅ Join order room để nhận socket event khi vào trang chi tiết
  useEffect(() => {
    if (id) {
      joinOrderRoom(Number(id));
      console.log('📦 Joined order room:', id);
      
      return () => {
        leaveOrderRoom(Number(id));
        console.log('📦 Left order room:', id);
      };
    }
  }, [id]);

  // ✅ Socket real-time: Cập nhật trạng thái đơn hàng khi admin/user thay đổi
  useEffect(() => {
    const unsubscribeStatusUpdated = onOrderStatusUpdate((data) => {
      // Chỉ cập nhật nếu đúng đơn hàng đang xem
      if (data.orderId === Number(id)) {
        console.log('🔄 Socket: Order status updated trong detail page', data);
        
        // Cập nhật trạng thái đơn hàng ngay lập tức
        setOrder(prev => {
          if (!prev) return prev;
          
          return {
            ...prev,
            status: data.status,
            updatedAt: data.updatedAt || new Date().toISOString(),
            // Cập nhật timeline nếu có
            timeline: {
              ...prev.timeline,
              ...(data.status === 'CANCELLED' && { cancelledAt: data.updatedAt }),
              ...(data.status === 'CONFIRMED' && { confirmedAt: data.updatedAt }),
              ...(data.status === 'PROCESSING' && { processingAt: data.updatedAt }),
              ...(data.status === 'DELIVERED' && { deliveredAt: data.updatedAt }),
            }
          };
        });
      }
    });

    return () => {
      unsubscribeStatusUpdated();
    };
  }, [id]); // Chỉ phụ thuộc vào id, không phụ thuộc vào order

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
    
    let currentIdx = rawSteps.findIndex(s => s.key === order.status);
    
    if (currentIdx < 0 && order.status === "CANCELLED") {
      rawSteps.push({ key: "CANCELLED", label: "Đã huỷ", time: formatDt(t.cancelledAt || order.updatedAt) });
      currentIdx = rawSteps.length - 1;
    }
    
    if (currentIdx < 0) currentIdx = 0;
    
    return {
      steps: rawSteps,
      current: currentIdx
    };
  }, [order]);

  return {
    order,//chi tiết đơn hàng
    loading,//loading
    actionLoading,//loading action
    steps,//bước tiến trình
    handleCancel,//hủy đơn hàng
    handleConfirmReceived,//xác nhận nhận hàng
  };
};

