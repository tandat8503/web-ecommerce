import { useState, useEffect } from "react";
import { toast } from "@/lib/utils";
import {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  getCategoryById,
} from "@/api/adminCategories";

/**
 * Custom hook quản lý toàn bộ logic cho AdminCategories
 * Bao gồm: state management, API calls, CRUD operations, pagination, search
 * 
 * @returns {Object} Object chứa:
 *   - State: categories, showSkeleton, modalLoading, pagination, keyword, searchValue, modalOpen, detailOpen, editingRecord, detailData, loadingCategoryId
 *   - Handlers: fetchCategories, handleSubmit, handleDelete, handleCreate, handleViewDetail, openEditModal, closeModal, closeDetailModal, handlePaginationChange, handleSearchChange
 */
export function useAdminCategories() {
  const [showSkeleton, setShowSkeleton] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [categories, setCategories] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 5, total: 0 });
  const [keyword, setKeyword] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [detailData, setDetailData] = useState(null);
  const [loadingCategoryId, setLoadingCategoryId] = useState(null);
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
   * Lấy danh sách categories từ API
   */
  const fetchCategories = async () => {
    setShowSkeleton(true);
    try {
      const response = await getCategories({
        page: pagination.page,
        limit: pagination.limit,
        q: keyword,
      });
      setCategories(response.data.items || []);
      setPagination((prev) => ({
        ...prev,
        total: response.data.total || 0,
      }));
      // Ép skeleton hiển thị ít nhất 800ms
      await sleep(800);
    } catch (error) {
      console.error("Error fetching categories:", error);
      
      // Xử lý lỗi cụ thể
      if (error.response?.status === 401) {
        toast.error("❌ Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
      } else if (error.response?.status === 403) {
        toast.error("❌ Bạn không có quyền truy cập trang này.");
      } else if (error.response?.status >= 500) {
        toast.error("❌ Lỗi server. Vui lòng thử lại sau.");
      } else {
        toast.error("❌ Lỗi khi tải danh sách danh mục");
      }
    } finally {
      setShowSkeleton(false);
    }
  };

  /**
   * Fetch categories khi pagination hoặc keyword thay đổi
   */
  useEffect(() => {
    fetchCategories();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagination.page, pagination.limit, keyword]);

  /**
   * Xử lý submit form (create/update) với FormData cho upload ảnh
   * @param {Object} values - Form values
   * @param {Object|null} record - Record đang edit (null nếu là create)
   */
  const handleSubmit = async (values, record) => {
    setModalLoading(true);
    try {
      // Tạo FormData để gửi file ảnh
      const formData = new FormData();
      formData.append("name", values.name);
      formData.append("isActive", values.isActive ? "true" : "false");

      // Nếu có ảnh được chọn
      if (values.image && values.image[0]?.originFileObj) {
        formData.append("image", values.image[0].originFileObj);
      }

      if (record) {
        await updateCategory(record.id, formData);
        toast.success("Cập nhật danh mục thành công");
      } else {
        await createCategory(formData);
        toast.success("Tạo danh mục thành công");
      }
      setModalOpen(false);
      setEditingRecord(null);
      fetchCategories();
    } catch (error) {
      toast.error(error.response?.data?.message || "Có lỗi xảy ra");
    } finally {
      setModalLoading(false);
    }
  };

  /**
   * Xử lý xóa category
   * @param {number} id - ID của category cần xóa
   */
  const handleDelete = async (id) => {
    try {
      await deleteCategory(id);
      toast.success("Xóa danh mục thành công");
      fetchCategories();
    } catch (error) {
      toast.error(error.response?.data?.message || "Có lỗi xảy ra");
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
    // Normalize record để đảm bảo image field là array rỗng (không phải undefined)
    const normalizedRecord = {
      ...record,
      image: [], // Upload component cần array, không phải imageUrl string
    };
    setEditingRecord(normalizedRecord);
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
   * Xử lý xem chi tiết category
   * @param {number} id - ID của category cần xem
   */
  const handleViewDetail = async (id) => {
    setLoadingCategoryId(id);
    try {
      const response = await getCategoryById(id);
      setDetailData(response.data);
      setDetailOpen(true);
    } catch (error) {
      toast.error("Lỗi khi tải chi tiết danh mục");
    } finally {
      setLoadingCategoryId(null);
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
    categories,              // Danh sách categories
    showSkeleton,            // Trạng thái hiển thị skeleton
    modalLoading,             // Trạng thái loading khi submit form
    pagination,               // Thông tin phân trang
    keyword,                  // Keyword tìm kiếm (sau debounce)
    searchValue,              // Giá trị search hiện tại (trước debounce)
    modalOpen,                // Trạng thái mở/đóng modal CRUD
    detailOpen,               // Trạng thái mở/đóng modal chi tiết
    editingRecord,            // Record đang được edit (null nếu là create)
    detailData,               // Data hiển thị trong modal chi tiết
    loadingCategoryId,        // ID của category đang được load chi tiết

    // ===== HANDLERS =====
    fetchCategories,          // Hàm fetch danh sách categories
    handleSubmit,             // Hàm xử lý submit form (create/update)
    handleDelete,             // Hàm xử lý xóa category
    handleCreate,             // Hàm mở modal tạo mới
    openEditModal,            // Hàm mở modal chỉnh sửa
    closeModal,               // Hàm đóng modal CRUD
    handleViewDetail,         // Hàm xử lý xem chi tiết
    closeDetailModal,         // Hàm đóng modal chi tiết
    handlePaginationChange,   // Hàm xử lý thay đổi pagination
    handleSearchChange,       // Hàm xử lý thay đổi search
  };
}

// Export default để đảm bảo tương thích
export default useAdminCategories;

