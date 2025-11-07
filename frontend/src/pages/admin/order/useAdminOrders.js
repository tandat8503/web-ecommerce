import { useState, useEffect } from "react";
import { toast } from "@/lib/utils";
import {
  getOrders,
  getOrderById,
  updateOrder,
  updateOrderNotes,
} from "@/api/adminOrders";

/**
 * Custom hook quản lý toàn bộ logic cho AdminOrders
 * Bao gồm: state management, API calls, CRUD operations, pagination, search, filter, status update
 * 
 * @returns {Object} Object chứa:
 *   - State: orders, showSkeleton, modalLoading, pagination, keyword, searchValue, statusFilter, modalOpen, detailOpen, editingRecord, detailData, updatingOrderId
 *   - Handlers: fetchOrders, handleSubmit, handleStatusChange, handleViewDetail, openUpdateModal, closeModal, closeDetailModal, handleSearchChange, handleStatusFilterChange, handlePaginationChange, getStatusBadgeColor, getStatusLabel, getStatusUpdateFields
 */
export function useAdminOrders() {
  const [showSkeleton, setShowSkeleton] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [orders, setOrders] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0 });
  const [statusFilter, setStatusFilter] = useState("");
  const [keyword, setKeyword] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [detailData, setDetailData] = useState(null);
  const [updatingOrderId, setUpdatingOrderId] = useState(null);
  const [searchValue, setSearchValue] = useState("");

  /**
   * Debounce search - cập nhật keyword sau 500ms khi searchValue thay đổi
   */
  useEffect(() => {
    const timer = setTimeout(() => {
      setPagination((prev) => ({ ...prev, page: 1 }));
      setKeyword(searchValue);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchValue]);

  /**
   * Load danh sách orders từ API
   */
  const fetchOrders = async () => {
    try {
      setShowSkeleton(true);

      const [res] = await Promise.all([
        getOrders({
          page: pagination.page,
          limit: pagination.limit,
          status: statusFilter || undefined,
          q: keyword || undefined,
        }),
        new Promise((resolve) => setTimeout(resolve, 600)),
      ]);

      setOrders(res.data.items || []);
      setPagination((prev) => ({
        ...prev,
        total: res.data.total || 0,
      }));
    } catch (err) {
      console.log(err);
      toast.error("Không thể tải danh sách đơn hàng");
    } finally {
      setShowSkeleton(false);
    }
  };

  /**
   * Fetch orders khi pagination, statusFilter hoặc keyword thay đổi
   */
  useEffect(() => {
    fetchOrders();
  }, [pagination.page, pagination.limit, statusFilter, keyword]);

  /**
   * Hàm lấy màu badge theo trạng thái
   * @param {string} status - Trạng thái đơn hàng
   * @returns {string} Màu badge
   */
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

  /**
   * Hàm lấy label trạng thái
   * @param {string} status - Trạng thái đơn hàng
   * @returns {string} Label trạng thái
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
   * Submit form cập nhật ghi chú admin (từ modal)
   * @param {Object} values - Form values
   * @param {Object} record - Record đang edit
   */
  const handleSubmit = async (values, record) => {
    try {
      setModalLoading(true);
      // Cập nhật chỉ ghi chú, không thay đổi status
      await updateOrderNotes(record.id, values.notes || "");
      toast.success("Cập nhật ghi chú thành công");
      setModalOpen(false);
      setEditingRecord(null);
      fetchOrders();
    } catch (err) {
      console.log(err);
      const errorMsg =
        err.response?.data?.message || "Có lỗi khi cập nhật ghi chú";
      toast.error(errorMsg);
    } finally {
      setModalLoading(false);
    }
  };

  /**
   * Cập nhật trạng thái trực tiếp từ dropdown
   * @param {number} orderId - ID đơn hàng
   * @param {string} newStatus - Trạng thái mới
   */
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
      const errorMsg =
        err.response?.data?.message || "Có lỗi khi cập nhật đơn hàng";
      toast.error(errorMsg);
      // Refresh để lấy lại trạng thái cũ
      fetchOrders();
    } finally {
      setUpdatingOrderId(null);
    }
  };

  /**
   * Xử lý xem chi tiết đơn hàng
   * @param {number} id - ID đơn hàng
   */
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

  /**
   * Mở modal cập nhật ghi chú
   * @param {Object} record - Record cần edit
   */
  const openUpdateModal = (record) => {
    setEditingRecord(record);
    setModalOpen(true);
  };

  /**
   * Đóng modal CRUD
   */
  const closeModal = () => {
    setModalOpen(false);
    setEditingRecord(null);
  };

  /**
   * Đóng modal chi tiết
   */
  const closeDetailModal = () => {
    setDetailOpen(false);
    setDetailData(null);
  };

  /**
   * Xử lý thay đổi search value
   * @param {string} value - Giá trị search
   */
  const handleSearchChange = (value) => {
    setSearchValue(value);
  };

  /**
   * Xử lý thay đổi status filter
   * @param {string} value - Giá trị filter
   */
  const handleStatusFilterChange = (value) => {
    setStatusFilter(value || "");
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  /**
   * Xử lý thay đổi pagination
   * @param {number} page - Trang hiện tại
   * @param {number} pageSize - Số items mỗi trang
   */
  const handlePaginationChange = (page, pageSize) => {
    setPagination({ ...pagination, page, limit: pageSize });
  };

  /**
   * Lấy initial value cho form field notes
   * @param {Object} order - Order object
   * @returns {string} Initial value
   */
  const getNotesInitialValue = (order) => {
    return order?.adminNote || "";
  };

  return {
    // ===== STATE =====
    orders,                  // Danh sách orders
    showSkeleton,            // Trạng thái hiển thị skeleton
    modalLoading,            // Trạng thái loading khi submit form
    pagination,              // Thông tin phân trang
    keyword,                 // Keyword tìm kiếm (sau debounce)
    searchValue,             // Giá trị search hiện tại (trước debounce)
    statusFilter,            // Filter theo trạng thái
    modalOpen,               // Trạng thái mở/đóng modal CRUD
    detailOpen,              // Trạng thái mở/đóng modal chi tiết
    editingRecord,           // Record đang được edit
    detailData,             // Data hiển thị trong modal chi tiết
    updatingOrderId,         // ID của order đang được cập nhật status

    // ===== HANDLERS =====
    fetchOrders,             // Hàm fetch danh sách orders
    handleSubmit,            // Hàm xử lý submit form (cập nhật ghi chú)
    handleStatusChange,      // Hàm xử lý thay đổi trạng thái
    handleViewDetail,        // Hàm xử lý xem chi tiết
    openUpdateModal,         // Hàm mở modal cập nhật ghi chú
    closeModal,              // Hàm đóng modal CRUD
    closeDetailModal,        // Hàm đóng modal chi tiết
    handleSearchChange,      // Hàm xử lý thay đổi search
    handleStatusFilterChange, // Hàm xử lý thay đổi status filter
    handlePaginationChange,  // Hàm xử lý thay đổi pagination
    getStatusBadgeColor,     // Hàm lấy màu badge theo trạng thái
    getStatusLabel,          // Hàm lấy label trạng thái
    getNotesInitialValue,    // Hàm lấy initial value cho notes field
  };
}

