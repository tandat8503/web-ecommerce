import { useState, useEffect } from "react";
import { toast } from "@/lib/utils";
import {
  getCoupons,
  createCoupon,
  updateCoupon,
  deleteCoupon,
  getCouponById,
} from "@/api/adminCoupons";
import dayjs from "dayjs";

/**
 * Custom hook quản lý toàn bộ logic cho AdminCoupons
 * Bao gồm: state management, API calls, CRUD operations, pagination, search, filter
 * 
 * @returns {Object} Object chứa:
 *   - State: coupons, showSkeleton, modalLoading, pagination, keyword, searchValue, statusFilter, modalOpen, detailOpen, editingRecord, detailData, loadingCouponId
 *   - Handlers: fetchCoupons, handleSubmit, handleDelete, handleViewDetail, openCreateModal, openEditModal, closeModal, closeDetailModal, handleSearchChange, handleStatusFilterChange, handlePaginationChange, getCouponStatus, processEditingRecord
 */
export function useAdminCoupons() {
  const [showSkeleton, setShowSkeleton] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [coupons, setCoupons] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0 });
  const [keyword, setKeyword] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [detailData, setDetailData] = useState(null);
  const [loadingCouponId, setLoadingCouponId] = useState(null);
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
   * Load danh sách coupons từ API
   */
  const fetchCoupons = async () => {
    setShowSkeleton(true);
    try {
      const response = await getCoupons({
        page: pagination.page,
        limit: pagination.limit,
        q: keyword,
        status: statusFilter,
      });

      // Backend trả về: { items: [...], total: number, page: number, limit: number }
      const couponsData = response.data?.items || response.data || [];
      const totalData = response.data?.total || 0;

      setCoupons(couponsData);
      setPagination((prev) => ({ ...prev, total: totalData }));

      // Delay để hiển thị skeleton
      await new Promise((resolve) => setTimeout(resolve, 800));
    } catch (error) {
      toast.error("Lỗi khi tải danh sách mã giảm giá");
      console.error("Error fetching coupons:", error);
    } finally {
      setShowSkeleton(false);
    }
  };

  /**
   * Fetch coupons khi pagination, keyword hoặc statusFilter thay đổi
   */
  useEffect(() => {
    fetchCoupons();
  }, [pagination.page, pagination.limit, keyword, statusFilter]);

  /**
   * Xử lý submit form (create/update)
   * @param {Object} values - Form values
   * @param {Object|null} record - Record đang edit (null nếu là create)
   */
  const handleSubmit = async (values, record) => {
    setModalLoading(true);
    try {
      // Xử lý dữ liệu trước khi gửi
      const submitData = {
        ...values,
        startDate: values.dateRange?.[0]?.format("YYYY-MM-DD") || values.startDate,
        endDate: values.dateRange?.[1]?.format("YYYY-MM-DD") || values.endDate,
        isActive: values.isActive ? "true" : "false",
      };

      delete submitData.dateRange; // Xóa dateRange khỏi data gửi đi

      // ✅ Xử lý dữ liệu cho update: chỉ gửi field có giá trị
      if (record) {
        // Cho update: chỉ gửi field có giá trị, không gửi field rỗng
        const updateData = {};

        if (submitData.code && submitData.code.trim() !== "")
          updateData.code = submitData.code;
        if (submitData.name && submitData.name.trim() !== "")
          updateData.name = submitData.name;
        if (submitData.discountType && submitData.discountType !== "")
          updateData.discountType = submitData.discountType;
        if (submitData.discountValue !== undefined && submitData.discountValue !== null)
          updateData.discountValue = Number(submitData.discountValue);
        if (submitData.minimumAmount !== undefined && submitData.minimumAmount !== null)
          updateData.minimumAmount = Number(submitData.minimumAmount);
        if (submitData.usageLimit !== undefined && submitData.usageLimit !== null)
          updateData.usageLimit = Number(submitData.usageLimit);
        if (submitData.startDate && submitData.startDate !== "")
          updateData.startDate = submitData.startDate;
        if (submitData.endDate && submitData.endDate !== "")
          updateData.endDate = submitData.endDate;
        if (submitData.isActive !== undefined) updateData.isActive = submitData.isActive;

        console.log("Update data being sent:", updateData);
        await updateCoupon(record.id, updateData);
        toast.success("Cập nhật mã giảm giá thành công");
      } else {
        // Cho create: gửi tất cả field required
        if (submitData.discountValue !== undefined && submitData.discountValue !== null) {
          submitData.discountValue = Number(submitData.discountValue);
        }
        if (submitData.minimumAmount !== undefined && submitData.minimumAmount !== null) {
          submitData.minimumAmount = Number(submitData.minimumAmount);
        }
        if (submitData.usageLimit !== undefined && submitData.usageLimit !== null) {
          submitData.usageLimit = Number(submitData.usageLimit);
        }

        console.log("Create data being sent:", submitData);
        await createCoupon(submitData);
        toast.success("Tạo mã giảm giá thành công");
      }

      setModalOpen(false);
      setEditingRecord(null);
      fetchCoupons();
    } catch (error) {
      console.error("Submit error:", error);
      toast.error(error.response?.data?.message || "Có lỗi xảy ra");
    } finally {
      setModalLoading(false);
    }
  };

  /**
   * Xử lý xóa coupon
   * @param {number} id - ID của coupon cần xóa
   */
  const handleDelete = async (id) => {
    try {
      await deleteCoupon(id);
      toast.success("Xóa mã giảm giá thành công");
      fetchCoupons();
    } catch (error) {
      toast.error(error.response?.data?.message || "Có lỗi xảy ra");
    }
  };

  /**
   * Xử lý xem chi tiết coupon
   * @param {number} id - ID của coupon cần xem
   */
  const handleViewDetail = async (id) => {
    setLoadingCouponId(id);
    try {
      const response = await getCouponById(id);
      // Backend trả về: { message: "...", data: coupon }
      const couponData = response.data?.data || response.data;
      setDetailData(couponData);
      setDetailOpen(true);
    } catch (error) {
      toast.error("Lỗi khi tải chi tiết mã giảm giá");
    } finally {
      setLoadingCouponId(null);
    }
  };

  /**
   * Mở modal để tạo mới
   */
  const openCreateModal = () => {
    setEditingRecord(null);
    setModalOpen(true);
  };

  /**
   * Mở modal để chỉnh sửa
   * @param {Object} record - Record cần edit
   */
  const openEditModal = (record) => {
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
    setStatusFilter(value);
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  /**
   * Xử lý thay đổi pagination
   * @param {number} page - Trang hiện tại
   * @param {number} pageSize - Số items mỗi trang
   */
  const handlePaginationChange = (page, pageSize) => {
    setPagination((prev) => ({ ...prev, page, limit: pageSize || prev.limit }));
  };

  /**
   * Lấy thông tin trạng thái của coupon
   * @param {Object} coupon - Coupon object
   * @returns {Object} Object chứa status, color, text
   */
  const getCouponStatus = (coupon) => {
    // Chỉ theo backend: isActive = true/false
    return coupon.isActive
      ? { status: "active", color: "green", text: "Hoạt động" }
      : { status: "inactive", color: "red", text: "Tạm dừng" };
  };

  /**
   * Xử lý dữ liệu editing record để hiển thị trong form
   * @param {Object|null} record - Record cần xử lý
   * @returns {Object|null} Record đã được xử lý
   */
  const processEditingRecord = (record) => {
    if (!record) return null;

    // ✅ Xử lý dữ liệu để hiển thị trong form
    const processedRecord = {
      ...record,
      // Xử lý dateRange
      dateRange:
        record.startDate && record.endDate
          ? [dayjs(record.startDate), dayjs(record.endDate)]
          : null,
      // Xử lý isActive
      isActive: record.isActive === true || record.isActive === "true",
      // Đảm bảo các số được convert đúng
      discountValue: record.discountValue ? Number(record.discountValue) : undefined,
      minimumAmount: record.minimumAmount ? Number(record.minimumAmount) : undefined,
      usageLimit: record.usageLimit ? Number(record.usageLimit) : undefined,
    };

    console.log("Processed editing record:", processedRecord);
    return processedRecord;
  };

  return {
    // ===== STATE =====
    coupons,                // Danh sách coupons
    showSkeleton,           // Trạng thái hiển thị skeleton
    modalLoading,           // Trạng thái loading khi submit form
    pagination,             // Thông tin phân trang
    keyword,                // Keyword tìm kiếm (sau debounce)
    searchValue,            // Giá trị search hiện tại (trước debounce)
    statusFilter,           // Filter theo trạng thái
    modalOpen,              // Trạng thái mở/đóng modal CRUD
    detailOpen,             // Trạng thái mở/đóng modal chi tiết
    editingRecord,          // Record đang được edit (null nếu là create)
    detailData,            // Data hiển thị trong modal chi tiết
    loadingCouponId,        // ID của coupon đang được load chi tiết

    // ===== HANDLERS =====
    fetchCoupons,           // Hàm fetch danh sách coupons
    handleSubmit,           // Hàm xử lý submit form (create/update)
    handleDelete,           // Hàm xử lý xóa coupon
    handleViewDetail,       // Hàm xử lý xem chi tiết
    openCreateModal,        // Hàm mở modal tạo mới
    openEditModal,          // Hàm mở modal chỉnh sửa
    closeModal,             // Hàm đóng modal CRUD
    closeDetailModal,       // Hàm đóng modal chi tiết
    handleSearchChange,     // Hàm xử lý thay đổi search
    handleStatusFilterChange, // Hàm xử lý thay đổi status filter
    handlePaginationChange, // Hàm xử lý thay đổi pagination
    getCouponStatus,        // Hàm lấy thông tin trạng thái coupon
    processEditingRecord,   // Hàm xử lý editing record cho form
  };
}

