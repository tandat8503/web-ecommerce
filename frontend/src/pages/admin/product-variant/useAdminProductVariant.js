import { useState, useEffect } from "react";
import { toast } from "@/lib/utils";
import {
  getProductVariants,
  getProductVariantById,
  createProductVariant,
  updateProductVariant,
  deleteProductVariant,
} from "@/api/adminproductVariant";
import { getProducts } from "@/api/adminProducts";

/**
 * Custom hook quản lý toàn bộ logic cho AdminProductVariant
 * Bao gồm: state management, API calls, CRUD operations, pagination, search
 * 
 * @returns {Object} Object chứa:
 *   - State: variants, products, loading, modalOpen, detailOpen, editingRecord, detailData, confirmLoading, pagination, keyword
 *   - Handlers: fetchVariants, fetchProducts, handleSubmit, handleDelete, handleView, openCreateModal, openEditModal, closeModal, closeDetailModal, handleSearch, handlePaginationChange
 */
export function useAdminProductVariant() {
  const [variants, setVariants] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [detailData, setDetailData] = useState(null);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [pagination, setPagination] = useState({ page: 1, limit: 5, total: 0 });
  const [keyword, setKeyword] = useState("");

  // Helper function để delay (cho skeleton loading effect)
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  /**
   * Load danh sách biến thể với phân trang và tìm kiếm
   * @param {number} page - Trang hiện tại
   * @param {number} limit - Số items mỗi trang
   * @param {string} searchKeyword - Từ khóa tìm kiếm
   */
  const fetchVariants = async (
    page = pagination.page,
    limit = pagination.limit,
    searchKeyword = keyword
  ) => {
    setLoading(true);
    try {
      const [res] = await Promise.all([
        getProductVariants({ page, limit, keyword: searchKeyword }),
        sleep(800),
      ]);
      setVariants(res.data.data.variants);
      setPagination(res.data.data.pagination);
    } catch (err) {
      console.error(err);
      toast.error("Lỗi tải biến thể");
    } finally {
      setLoading(false);
    }
  };

  /**
   * Load danh sách sản phẩm cho dropdown
   */
  const fetchProducts = async () => {
    try {
      const res = await getProducts();
      setProducts(res.data.items);
    } catch (err) {
      console.error(err);
      toast.error("Lỗi tải danh sách sản phẩm");
    }
  };

  /**
   * Xử lý submit form (create/update)
   * @param {Object} values - Form values
   * @param {Object|null} record - Record đang edit (null nếu là create)
   */
  const handleSubmit = async (values, record) => {
    setConfirmLoading(true);
    try {
      if (record) {
        await updateProductVariant(record.id, values);
        toast.success("Cập nhật biến thể thành công");
      } else {
        await createProductVariant(values);
        toast.success("Tạo biến thể thành công");
      }
      setModalOpen(false);
      setEditingRecord(null);
      fetchVariants();
    } catch (err) {
      console.error(err);
      toast.error("Lỗi khi lưu biến thể");
    } finally {
      setConfirmLoading(false);
    }
  };

  /**
   * Xử lý xóa biến thể
   * @param {number} id - ID của biến thể cần xóa
   */
  const handleDelete = async (id) => {
    try {
      await deleteProductVariant(id);
      toast.success("Xóa thành công");
      fetchVariants();
    } catch (err) {
      console.error(err);
      toast.error("Lỗi khi xóa biến thể");
    }
  };

  /**
   * Xử lý xem chi tiết biến thể
   * @param {number} id - ID của biến thể cần xem
   */
  const handleView = async (id) => {
    try {
      const res = await getProductVariantById(id);
      setDetailData(res.data.data);
      setDetailOpen(true);
    } catch (err) {
      console.error(err);
      toast.error("Không tải được chi tiết biến thể");
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
   * Xử lý tìm kiếm
   * @param {string} value - Giá trị tìm kiếm
   */
  const handleSearch = (value) => {
    setKeyword(value);
    fetchVariants(1, pagination.limit, value);
  };

  /**
   * Xử lý thay đổi pagination
   * @param {number} page - Trang hiện tại
   * @param {number} pageSize - Số items mỗi trang
   */
  const handlePaginationChange = (page, pageSize) => {
    fetchVariants(page, pageSize, keyword);
  };

  // Fetch variants và products khi component mount
  useEffect(() => {
    fetchVariants();
    fetchProducts();
  }, []);

  return {
    // ===== STATE =====
    variants,              // Danh sách biến thể
    products,              // Danh sách sản phẩm (cho dropdown)
    loading,               // Trạng thái loading khi fetch data
    modalOpen,             // Trạng thái mở/đóng modal CRUD
    detailOpen,            // Trạng thái mở/đóng modal chi tiết
    editingRecord,         // Record đang được edit (null nếu là create)
    detailData,           // Data hiển thị trong modal chi tiết
    confirmLoading,        // Trạng thái loading khi submit form
    pagination,            // Thông tin phân trang
    keyword,               // Từ khóa tìm kiếm

    // ===== HANDLERS =====
    fetchVariants,         // Hàm fetch danh sách biến thể
    fetchProducts,         // Hàm fetch danh sách sản phẩm
    handleSubmit,          // Hàm xử lý submit form (create/update)
    handleDelete,          // Hàm xử lý xóa biến thể
    handleView,            // Hàm xử lý xem chi tiết
    openCreateModal,       // Hàm mở modal tạo mới
    openEditModal,         // Hàm mở modal chỉnh sửa
    closeModal,            // Hàm đóng modal CRUD
    closeDetailModal,       // Hàm đóng modal chi tiết
    handleSearch,          // Hàm xử lý tìm kiếm
    handlePaginationChange, // Hàm xử lý thay đổi pagination
  };
}

