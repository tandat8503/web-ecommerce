import { useEffect, useMemo, useState, useCallback } from "react";
import { message } from "antd";
import { getOrderById, cancelOrder, confirmReceivedOrder } from "@/api/orders";
import { initializeSocket, joinOrderRoom, leaveOrderRoom, onOrderStatusUpdate } from "@/utils/socket";

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

export const useOrderDetail = (id) => {
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchDetail = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await getOrderById(id);
      setOrder(data.order || null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { 
    fetchDetail(); 
  }, [fetchDetail]);

  // Socket.IO logic
  useEffect(() => {
    const userStr = localStorage.getItem('user');
    const userId = userStr ? JSON.parse(userStr).id : null;

    if (!userId || !id) return;

    const socket = initializeSocket(userId);
    joinOrderRoom(Number(id));

    const unsubscribe = onOrderStatusUpdate((data) => {
      if (data.orderId === Number(id)) {
        message.success(`Đơn hàng ${data.orderNumber} đã được cập nhật: ${data.statusLabel}`);
        fetchDetail();
      }
    });

    return () => {
      unsubscribe();
      leaveOrderRoom(Number(id));
      // Không disconnect socket vì có thể đang dùng ở component khác
    };
  }, [id, fetchDetail]);

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
    order,
    loading,
    actionLoading,
    steps,
    handleCancel,
    handleConfirmReceived,
  };
};

