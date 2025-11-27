import { useState, useEffect, useCallback } from "react";
import { toast, formatPrice } from "@/lib/utils";
import { getOrders, getOrderById, updateOrder, cancelOrder, updateOrderNotes } from "@/api/adminOrders";
import { useAdminSocket } from "@/pages/admin/notification";


export function useAdminOrders() {
  // ========== STATE ==========
  const [orders, setOrders] = useState([]); // Danh sách đơn hàng
  const [loading, setLoading] = useState(false); // Đang tải danh sách
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0 }); // Phân trang
  const [searchValue, setSearchValue] = useState(""); // Tìm kiếm
  const [statusFilter, setStatusFilter] = useState(""); // Lọc theo trạng thái
  
  // Modal states
  const [modalOpen, setModalOpen] = useState(false); // Modal ghi chú
  const [detailOpen, setDetailOpen] = useState(false); // Modal chi tiết
  const [editingOrder, setEditingOrder] = useState(null); // Đơn hàng đang sửa ghi chú
  const [detailData, setDetailData] = useState(null); // Dữ liệu chi tiết đơn hàng
  const [updatingId, setUpdatingId] = useState(null); // ID đơn hàng đang cập nhật (để hiển thị loading)
  const [modalLoading, setModalLoading] = useState(false); // Loading state cho modal cập nhật ghi chú

  // ========== HELPER FUNCTIONS ==========
  
  /**
   * Chuyển status code thành label tiếng Việt
   */
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

  /**
   * Chuẩn hóa thông tin thanh toán từ order/payments
   */
  const normalizePaymentInfo = (order = {}) => {
    const latestPayment = Array.isArray(order.payments) && order.payments.length > 0
      ? order.payments[0]
      : null;

    const paymentStatus =
      order.paymentStatus ||
      latestPayment?.paymentStatus ||
      "PENDING";

    const paymentMethod =
      order.paymentMethod ||
      latestPayment?.paymentMethod ||
      order.paymentMethod;

    return { paymentStatus, paymentMethod };
  };

  /**
   * Lấy màu cho tag status
   */
  const getStatusColor = (status) => {
    const colors = {
      PENDING: "orange",
      CONFIRMED: "blue",
      PROCESSING: "cyan",
      DELIVERED: "green",
      CANCELLED: "red",
    };
    return colors[status] || "default";
  };

  /**
   * Tính toán các trạng thái có thể chuyển từ trạng thái hiện tại
   * Theo backend: PENDING → CONFIRMED → PROCESSING → DELIVERED
   */
  const getAvailableStatuses = (currentStatus) => {
    const transitions = {
      PENDING: ["CONFIRMED"],        // Chờ xác nhận → Đã xác nhận
      CONFIRMED: ["PROCESSING"],     // Đã xác nhận → Đang giao
      PROCESSING: ["DELIVERED"],      // Đang giao → Đã giao
      DELIVERED: [],                  // Đã giao → không thể chuyển nữa
      CANCELLED: [],                  // Đã hủy → không thể chuyển nữa
    };
    return (transitions[currentStatus] || []).map(status => ({
      value: status,
      label: getStatusLabel(status),
    }));
  };

  // ========== BƯỚC 1: LẤY DANH SÁCH ĐƠN HÀNG ==========
  
  /**
   * Gọi API lấy danh sách đơn hàng
   * Backend trả về: { items: [...], total: number, page: number, limit: number }
   * Dùng useCallback để tránh tạo function mới mỗi lần render → tránh hook chạy lại không cần thiết
   */
  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      
      // Gọi API với các tham số: page, limit, status (filter), q (search)
      const res = await getOrders({
        page: pagination.page,
        limit: pagination.limit,
        status: statusFilter || undefined,
        q: searchValue || undefined,
      });

      // Backend trả về: { items, total, page, limit }
      const items = (res.data.items || []).map(order => {
        const { paymentStatus, paymentMethod } = normalizePaymentInfo(order);
        return {
          ...order,
          paymentStatus,
          paymentMethod,
          // Thêm các field tính toán cho UI
          canCancel: order.status === "PENDING" || order.status === "CONFIRMED", // Có thể hủy không?
          availableStatuses: getAvailableStatuses(order.status), // Các trạng thái có thể chuyển
        };
      });

      setOrders(items);
      setPagination(prev => ({ ...prev, total: res.data.total || 0 }));
    } catch (err) {
      console.error("❌ Lỗi khi lấy danh sách đơn hàng:", err);
      toast.error("Không thể tải danh sách đơn hàng");
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, statusFilter, searchValue]);

  // Tự động fetch khi search thay đổi (debounce 500ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (pagination.page !== 1) {
        // Nếu đang ở trang khác trang 1, reset về trang 1
        setPagination(prev => ({ ...prev, page: 1 }));
      } else {
        // Nếu đang ở trang 1, fetch ngay
        fetchOrders();
      }
    }, 500);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchValue]);

  // Tự động fetch khi pagination hoặc filter thay đổi
  useEffect(() => {
    fetchOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagination.page, pagination.limit, statusFilter]);

  // ========== WEBSOCKET: LẮNG NGHE ĐƠN HÀNG MỚI ==========
  
  /**
   * 128-183: websocket
   * Khởi tạo Socket.IO và lắng nghe đơn hàng mới
   * - Khi có đơn hàng mới → Hiển thị thông báo và refresh danh sách
   */
  // Sử dụng hook chung để tránh lặp code
  // Lưu ý: Không hiển thị toast ở đây vì AdminHeader đã hiển thị rồi
  // Chỉ refresh danh sách đơn hàng khi có đơn hàng mới
  useAdminSocket((data) => {
    console.log(' Nhận được đơn hàng mới:', data);
    
    // Refresh danh sách đơn hàng (nếu đang ở trang 1)
    if (pagination.page === 1) {
      fetchOrders();
    }
  }, [pagination.page, fetchOrders]);
  //kết thúc websocket

  // ========== BƯỚC 2: LẤY CHI TIẾT ĐƠN HÀNG ==========
  
  /**
   * Gọi API lấy chi tiết đơn hàng
   * Backend trả về: order object đầy đủ với user, orderItems (có product, variant), payments, statusHistory
   */
  const handleViewDetail = async (id) => {
    try {
      const res = await getOrderById(id);
      const { paymentStatus, paymentMethod } = normalizePaymentInfo(res.data);
      setDetailData({ ...res.data, paymentStatus, paymentMethod }); // Lưu dữ liệu chi tiết
      setDetailOpen(true); // Mở modal chi tiết
    } catch (err) {
      console.error("❌ Lỗi khi lấy chi tiết đơn hàng:", err);
      toast.error(err.response?.data?.message || "Không thể tải chi tiết đơn hàng");
    }
  };

  // ========== BƯỚC 3: CẬP NHẬT TRẠNG THÁI ĐƠN HÀNG ==========
  
  /**
   * Gọi API cập nhật trạng thái đơn hàng
   * Backend chỉ cho phép: PENDING → CONFIRMED → PROCESSING → DELIVERED
   * 
   * Validation: Nếu đơn hàng thanh toán bằng VNPay và chuyển sang CONFIRMED,
   * phải kiểm tra paymentStatus phải là PAID (đã thanh toán thành công)
   */
  const handleStatusChange = async (orderId, newStatus) => {
    try {
      // Tìm đơn hàng trong danh sách để kiểm tra payment status
      const order = orders.find(o => o.id === orderId);
      
      // Kiểm tra: Nếu chuyển sang CONFIRMED và thanh toán bằng VNPay
      if (newStatus === 'CONFIRMED' && order?.paymentMethod === 'VNPAY') {
        // Kiểm tra paymentStatus phải là PAID
        if (order?.paymentStatus !== 'PAID') {
          const paymentStatusLabel = order?.paymentStatus === 'FAILED' 
            ? 'thất bại' 
            : 'chưa thanh toán';
          toast.error(`Không thể xác nhận đơn hàng. Thanh toán VNPay ${paymentStatusLabel}. Vui lòng đợi khách hàng thanh toán thành công.`);
          return; // Dừng lại, không gọi API
        }
      }

      setUpdatingId(orderId); // Hiển thị loading
      await updateOrder(orderId, { status: newStatus });
      toast.success("Cập nhật trạng thái thành công");
      fetchOrders(); // Refresh danh sách
    } catch (err) {
      toast.error(err.response?.data?.message || "Có lỗi khi cập nhật");
      fetchOrders(); // Refresh để đảm bảo UI đồng bộ
    } finally {
      setUpdatingId(null);
    }
  };

  // ========== BƯỚC 4: HỦY ĐƠN HÀNG ==========
  
  /**
   * Gọi API hủy đơn hàng
   * Backend chỉ cho phép hủy khi status = PENDING hoặc CONFIRMED
   * Backend tự động: hoàn trả tồn kho, cập nhật paymentStatus = FAILED
   * Lưu ý: Nếu muốn cập nhật ghi chú khi hủy, gọi riêng API updateOrderNotes
   */
  const handleCancelOrder = async (orderId) => {
    try {
      setUpdatingId(orderId);
      await cancelOrder(orderId, {}); // Backend không nhận adminNote, chỉ xử lý hủy đơn
      toast.success("Hủy đơn hàng thành công");
      fetchOrders(); // Refresh danh sách
    } catch (err) {
      console.error("❌ Lỗi khi hủy đơn hàng:", err);
      toast.error(err.response?.data?.message || "Có lỗi khi hủy đơn");
    } finally {
      setUpdatingId(null);
    }
  };

  // ========== BƯỚC 5: CẬP NHẬT GHI CHÚ ==========
  
  /**
   * Gọi API cập nhật ghi chú admin
   * Backend chỉ cập nhật adminNote, không thay đổi status
   */
  const handleUpdateNotes = async (values) => {
    try {
      setModalLoading(true); // Bắt đầu loading
      await updateOrderNotes(editingOrder.id, values.notes || "");
      toast.success("Cập nhật ghi chú thành công");
      setModalOpen(false);
      setEditingOrder(null);
      fetchOrders(); // Refresh danh sách
    } catch (err) {
      toast.error(err.response?.data?.message || "Có lỗi khi cập nhật");
    } finally {
      setModalLoading(false); // Dừng loading
    }
  };

  // ========== RETURN ==========
  return {
    // State
    orders,
    loading,
    pagination,
    searchValue,
    statusFilter,
    modalOpen,
    detailOpen,
    editingOrder,
    detailData,
    updatingId,
    modalLoading,
    // Helpers
    getStatusLabel,
    getStatusColor,
    // Actions
    handleStatusChange,
    handleCancelOrder,
    handleViewDetail,
    handleUpdateNotes,
    // Setters
    setSearchValue,
    setStatusFilter: (value) => {
      setStatusFilter(value || "");
      setPagination(prev => ({ ...prev, page: 1 })); // Reset về trang 1 khi filter
    },
    setPagination,
    openNotesModal: (order) => {
      // Set đơn hàng và mở modal
      // CrudModal sẽ tự động map adminNote -> notes khi mở modal
      setEditingOrder({
        ...order,
        notes: order.adminNote || "", // Map adminNote sang notes cho form
      });
      setModalOpen(true);
    },
    closeModal: () => {
      setModalOpen(false);
      // Reset sau khi đóng modal
      setTimeout(() => {
        setEditingOrder(null);
      }, 300); // Đợi animation đóng modal xong
    },
    closeDetailModal: () => {
      setDetailOpen(false);
      setDetailData(null);
    },
  };
}
