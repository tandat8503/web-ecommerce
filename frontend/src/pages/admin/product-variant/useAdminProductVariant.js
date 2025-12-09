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
import { onVariantCreated, onVariantUpdated, onVariantDeleted } from "@/utils/socket";

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
      // Hiển thị lỗi validation chi tiết nếu có
      const errorMessage = err.response?.data?.message || "Lỗi khi lưu biến thể";
      const errorDetails = err.response?.data?.errors;
      
      if (errorDetails && Array.isArray(errorDetails) && errorDetails.length > 0) {
        // Hiển thị lỗi validation chi tiết
        toast.error(`${errorMessage}: ${errorDetails.join(', ')}`);
      } else {
        toast.error(errorMessage);
      }
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
      toast.success("Xóa biến thể thành công");
      fetchVariants();
    } catch (err) {
      console.error(err);
      // Hiển thị message từ backend nếu có
      const errorMessage = err.response?.data?.message || "Lỗi khi xóa biến thể";
      toast.error(errorMessage);
    }
  };

  /**
   * Xử lý xem chi tiết biến thể
   * @param {number} id - ID của biến thể cần xem
   */
  const handleView = async (id) => {
    try {
      const res = await getProductVariantById(id);
      setDetailData(res.data);
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
    // Đảm bảo productId được map đúng từ product.id hoặc record.productId
    const recordWithProductId = {
      ...record,
      productId: record?.productId || record?.product?.id || null
    };
    setEditingRecord(recordWithProductId);
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

  // Socket real-time: Cập nhật variants khi admin CRUD
  useEffect(() => {
    // Biến thể mới → Thêm vào danh sách
    const unsubscribeCreated = onVariantCreated((newVariant) => {
      console.log('🆕 Socket: Variant created', newVariant);
      
      setVariants(prev => { // prev là danh sách biến thể hiện tại (State cũ) trước khi cập nhật.
        const exists = prev.some(v => v.id === newVariant.id);//kiểm tra xem biến thể mới này (newVariant) đã tồn tại trong danh sách cũ (prev) hay chưa (dựa vào ID).
        if (exists) {// tìm đúng biến thể cần thiết bằng ID, thay thế nó bằng newVariant mới nhất, và trả về danh sách đã cập nhật.
          return prev.map(v => v.id === newVariant.id ? newVariant : v);
        }
        // Thêm vào đầu danh sách
 // khi biến thể mới được tạo,ăng tổng số lượng (total) của phân trang lên 1 để đảm bảo phân trang hiển thị chính xác số trang mới.
        setPagination(prev => ({ ...prev, total: prev.total + 1 }));//cập nhật tổng số biến thể trong pagination.
        return [newVariant, ...prev];//thêm biến thể mới vào đầu danh sách và trả về danh sách đã cập nhật.
      });
    });

    // Biến thể cập nhật → Cập nhật trong danh sách
    const unsubscribeUpdated = onVariantUpdated((updatedVariant) => {
      console.log('🔄 Socket: Variant updated', updatedVariant);
      // cập nhật biến thể mới nhất vào danh sách hiện tại.
      setVariants(prev => prev.map(v =>
        v.id === updatedVariant.id ? updatedVariant : v
      ));
    });

    // Biến thể xóa → Xóa khỏi danh sách
    const unsubscribeDeleted = onVariantDeleted((data) => {
      console.log('🗑️ Socket: Variant deleted', data);
      setVariants(prev => {
  // giữ lại tất cả các biến thể có ID khác (!==) với ID của biến thể bị xóa (data.id).
        const filtered = prev.filter(v => v.id !== data.id);
        if (filtered.length !== prev.length) {// nếu số lượng biến thể trong danh sách sau khi xóa khác với số lượng trước khi xóa, thì giảm tổng số biến thể trong pagination xuống 1.
          setPagination(prev => ({ ...prev, total: Math.max(0, prev.total - 1) }));// Math.max(0, prev.total - 1) đảm bảo tổng số biến thể không được nhỏ hơn 0.
        }
        return filtered; // trả về danh sách đã xóa biến thể.
      });
    });

    return () => {
      unsubscribeCreated();// hủy đăng ký listener khi biến thể mới được tạo.
      unsubscribeUpdated();// hủy đăng ký listener khi biến thể được cập nhật.
      unsubscribeDeleted();// hủy đăng ký listener khi biến thể được xóa.
    };
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

