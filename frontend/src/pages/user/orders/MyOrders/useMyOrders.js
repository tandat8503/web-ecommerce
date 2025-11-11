import { useEffect, useState, useCallback } from "react";
import { message } from "antd";
import { getUserOrders } from "@/api/orders";
import { initializeSocket, onOrderStatusUpdate } from "@/utils/socket";

export const STATUS_TABS = [
  { key: "", label: "Tất cả" },
  { key: "PENDING", label: "Chờ xác nhận" },
  { key: "CONFIRMED", label: "Đã xác nhận" },
  { key: "PROCESSING", label: "Đang giao" },
  { key: "DELIVERED", label: "Thành công" },
  { key: "CANCELLED", label: "Đã hủy" },
];

export const getStatusLabel = (status) => {
  if (!status) return "";
  const tab = STATUS_TABS.find(t => t.key === status);
  return tab ? tab.label : status;
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

export const useMyOrders = () => {
  const [orders, setOrders] = useState([]);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(""); // ALL by default

  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await getUserOrders({ page, limit, status: status || undefined });
      setOrders(data.items || []);
      setTotal(data.total || 0);
    } finally {
      setLoading(false);
    }
  }, [page, limit, status]);

  useEffect(() => { 
    fetchOrders(); 
  }, [fetchOrders]);

  // Socket.IO logic
  useEffect(() => {
    const userStr = localStorage.getItem('user');
    const userId = userStr ? JSON.parse(userStr).id : null;

    if (!userId) return;

    const socket = initializeSocket(userId);

    const unsubscribe = onOrderStatusUpdate((data) => {
      message.success(`Đơn hàng ${data.orderNumber} đã được cập nhật: ${data.statusLabel}`);
      fetchOrders();
    });

    return () => {
      unsubscribe();
      // Không disconnect socket vì có thể đang dùng ở component khác
    };
  }, [fetchOrders]);

  return {
    orders,
    page,
    setPage,
    limit,
    total,
    loading,
    status,
    setStatus,
    fetchOrders,
  };
};

