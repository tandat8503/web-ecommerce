import { useState, useEffect } from "react";
import { toast } from "@/lib/utils";
import {
  getBrands,
  createBrand,
  updateBrand,
  deleteBrand,
  getBrandById,
} from "@/api/adminBrands";
import { debugAuth } from "@/utils/authUtils";

/**
 * Custom hook quản lý toàn bộ logic cho AdminBrands
 * Bao gồm: state management, API calls, CRUD operations, pagination, search
 * 
 * @returns {Object} Object chứa:
 *   - State: brands, showSkeleton, modalLoading, pagination, keyword, searchValue, modalOpen, detailOpen, editingRecord, detailData, loadingBrandId
 *   - Handlers: fetchBrands, handleSubmit, handleDelete, handleCreate, handleViewDetail, openEditModal, closeModal, closeDetailModal, handlePaginationChange, handleSearchChange
 */
export function useAdminBrands() {
  const [showSkeleton, setShowSkeleton] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [brands, setBrands] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 5, total: 0 });
  const [keyword, setKeyword] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [detailData, setDetailData] = useState(null);
  const [loadingBrandId, setLoadingBrandId] = useState(null);
  const [searchValue, setSearchValue] = useState("");

  // Helper function để delay (cho skeleton loading effect)
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

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
   * Lấy danh sách brands từ API
   */
  const fetchBrands = async () => {
    setShowSkeleton(true);

    // Debug authentication trước khi gọi API
    const authStatus = debugAuth();
    console.log("🔍 Auth status before API call:", authStatus);

    try {
      const response = await getBrands({
        page: pagination.page,
        limit: pagination.limit,
        search: keyword,
      });
      setBrands(response.data.items || []);
      setPagination((prev) => ({
        ...prev,
        total: response.data.total || 0,
      }));
      // Ép skeleton hiển thị ít nhất 800ms
      await sleep(800);
    } catch (error) {
      console.error("Error fetching brands:", error);

      // Xử lý lỗi cụ thể
      if (error.response?.status === 401) {
        toast.error("❌ Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
      } else if (error.response?.status === 403) {
        toast.error("❌ Bạn không có quyền truy cập trang này.");
      } else if (error.response?.status >= 500) {
        toast.error("❌ Lỗi server. Vui lòng thử lại sau.");
      } else {
        toast.error("❌ Lỗi khi tải danh sách thương hiệu");
      }
    } finally {
      setShowSkeleton(false);
    }
  };

  /**
   * Fetch brands khi pagination hoặc keyword thay đổi
   */
  useEffect(() => {
    fetchBrands();
  }, [pagination.page, pagination.limit, keyword]);

  /**
   * Xử lý submit form (create/update)
   * @param {Object} values - Form values
   * @param {Object|null} record - Record đang edit (null nếu là create)
   */
  const handleSubmit = async (values, record) => {
    setModalLoading(true);
    try {
      if (record) {
        await updateBrand(record.id, values);
        toast.success("Cập nhật thương hiệu thành công");
      } else {
        await createBrand(values);
        toast.success("Tạo thương hiệu thành công");
      }
      setModalOpen(false);
      setEditingRecord(null);
      fetchBrands();
    } catch (error) {
      toast.error(error.response?.data?.message || "Có lỗi xảy ra");
    } finally {
      setModalLoading(false);
    }
  };

  /**
   * Xử lý xóa brand
   * @param {number} id - ID của brand cần xóa
   */
  const handleDelete = async (id) => {
    try {
      await deleteBrand(id);
      toast.success("Xóa thương hiệu thành công");
      fetchBrands();
    } catch (error) {
      const rawMessage = error.response?.data?.message || "";
      if (/brand has products/i.test(rawMessage)) {
        toast.error("Không thể xóa thương hiệu vì vẫn còn sản phẩm.");
      } else {
        toast.error(rawMessage || "Có lỗi xảy ra khi xóa thương hiệu.");
      }
    }
  };

  /**
   * Mở modal để tạo mới
   */
  const handleCreate = () => {
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
   * Xử lý xem chi tiết brand
   * @param {number} id - ID của brand cần xem
   */
  const handleViewDetail = async (id) => {
    setLoadingBrandId(id);
    try {
      const response = await getBrandById(id);
      setDetailData(response.data);
      setDetailOpen(true);
    } catch (error) {
      toast.error("Lỗi khi tải chi tiết thương hiệu");
    } finally {
      setLoadingBrandId(null);
    }
  };

  /**
   * Đóng modal chi tiết
   */
  const closeDetailModal = () => {
    setDetailOpen(false);
    setDetailData(null);
  };

  /**
   * Xử lý thay đổi pagination
   * @param {number} page - Trang hiện tại
   * @param {number} pageSize - Số items mỗi trang
   */
  const handlePaginationChange = (page, pageSize) => {
    setPagination((prev) => ({
      ...prev,
      page,
      limit: pageSize || prev.limit,
    }));
  };

  /**
   * Xử lý thay đổi search value
   * @param {string} value - Giá trị search
   */
  const handleSearchChange = (value) => {
    setSearchValue(value);
  };

  return {
    // ===== STATE =====
    brands,              // Danh sách brands
    showSkeleton,         // Trạng thái hiển thị skeleton
    modalLoading,         // Trạng thái loading khi submit form
    pagination,           // Thông tin phân trang
    keyword,              // Keyword tìm kiếm (sau debounce)
    searchValue,          // Giá trị search hiện tại (trước debounce)
    modalOpen,            // Trạng thái mở/đóng modal CRUD
    detailOpen,           // Trạng thái mở/đóng modal chi tiết
    editingRecord,        // Record đang được edit (null nếu là create)
    detailData,          // Data hiển thị trong modal chi tiết
    loadingBrandId,       // ID của brand đang được load chi tiết

    // ===== HANDLERS =====
    fetchBrands,          // Hàm fetch danh sách brands
    handleSubmit,         // Hàm xử lý submit form (create/update)
    handleDelete,         // Hàm xử lý xóa brand
    handleCreate,         // Hàm mở modal tạo mới
    openEditModal,        // Hàm mở modal chỉnh sửa
    closeModal,           // Hàm đóng modal CRUD
    handleViewDetail,     // Hàm xử lý xem chi tiết
    closeDetailModal,     // Hàm đóng modal chi tiết
    handlePaginationChange, // Hàm xử lý thay đổi pagination
    handleSearchChange,   // Hàm xử lý thay đổi search
  };
}

