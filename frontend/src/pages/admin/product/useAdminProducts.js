import { useState, useEffect } from "react";
import { toast } from "@/lib/utils";
import {
  getProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  getProductById,
} from "@/api/adminProducts";
import { getCategories } from "@/api/adminCategories";
import { getBrands } from "@/api/adminBrands";

/**
 * Custom hook quản lý toàn bộ logic cho AdminProducts
 * Bao gồm: state management, API calls, CRUD operations, pagination, search, dimension conversion
 * 
 * @returns {Object} Object chứa:
 *   - State: products, categories, brands, showSkeleton, modalLoading, pagination, keyword, searchValue, modalOpen, detailOpen, editingRecord, detailData, loadingProductId, imageModalOpen, selectedProduct
 *   - Handlers: fetchProducts, fetchSelectOptions, handleSubmit, handleDelete, handleCreate, handleViewDetail, handleManageImages, openEditModal, closeModal, closeDetailModal, closeImageModal, handlePaginationChange, handleSearchChange, processEditingRecord, isChairCategory, isTableOrCabinetCategory
 */
export function useAdminProducts() {
  const [showSkeleton, setShowSkeleton] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 5, total: 0 });
  const [keyword, setKeyword] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [detailData, setDetailData] = useState(null);
  const [loadingProductId, setLoadingProductId] = useState(null);
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
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
   * Lấy danh sách products từ API
   */
  const fetchProducts = async () => {
    setShowSkeleton(true);
    try {
      const response = await getProducts({
        page: pagination.page,
        limit: pagination.limit,
        q: keyword,
      });
      setProducts(response.data.items || []);
      setPagination((prev) => ({
        ...prev,
        total: response.data.total || 0,
      }));
      // Ép skeleton hiển thị ít nhất 800ms
      await sleep(800);
    } catch (error) {
      console.error("Error fetching products:", error);
      
      // Xử lý lỗi cụ thể
      if (error.response?.status === 401) {
        toast.error("❌ Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
      } else if (error.response?.status === 403) {
        toast.error("❌ Bạn không có quyền truy cập trang này.");
      } else if (error.response?.status >= 500) {
        toast.error("❌ Lỗi server. Vui lòng thử lại sau.");
      } else {
        toast.error("❌ Lỗi khi tải danh sách sản phẩm");
      }
    } finally {
      setShowSkeleton(false);
    }
  };

  /**
   * Lấy danh sách categories và brands cho select options
   */
  const fetchSelectOptions = async () => {
    try {
      const [categoriesRes, brandsRes] = await Promise.all([
        getCategories({ limit: 1000 }),
        getBrands({ limit: 1000 }),
      ]);
      setCategories(categoriesRes.data.items || []);
      setBrands(brandsRes.data.items || []);
    } catch (error) {
      console.error("Error fetching select options:", error);
    }
  };

  /**
   * Fetch products khi pagination hoặc keyword thay đổi
   */
  useEffect(() => {
    fetchProducts();
    fetchSelectOptions();
  }, [pagination.page, pagination.limit, keyword]);

  /**
   * Xử lý submit form (create/update) với FormData và convert dimensions
   * @param {Object} values - Form values
   * @param {Object|null} record - Record đang edit (null nếu là create)
   */
  const handleSubmit = async (values, record) => {
    setModalLoading(true);
    try {
      // Tạo FormData để gửi file
      const formData = new FormData();
      
      // Xử lý từng field riêng biệt
      if (values.name) formData.append('name', values.name);
      if (values.description) formData.append('description', values.description);
      if (values.price) formData.append('price', values.price);
      if (values.salePrice) formData.append('salePrice', values.salePrice);
      if (values.costPrice) formData.append('costPrice', values.costPrice);
      if (values.stock !== undefined) formData.append('stock', values.stock);
      if (values.minStockLevel !== undefined) formData.append('minStockLevel', values.minStockLevel);
      if (values.metaTitle) formData.append('metaTitle', values.metaTitle);
      if (values.metaDescription) formData.append('metaDescription', values.metaDescription);
      if (values.categoryId) formData.append('categoryId', values.categoryId);
      if (values.brandId) formData.append('brandId', values.brandId);
      if (values.warranty) formData.append('warranty', values.warranty);
      
      // Helper function để convert về cm
      const convertToCm = (value, unit) => {
        if (!value) return null;
        if (unit === 'inch') {
          return (Number(value) * 2.54).toFixed(2);
        }
        return Number(value).toFixed(2);
      };

      // Xử lý các field kích thước với unit riêng
      if (values.length !== undefined && values.length !== null) {
        const lengthInCm = convertToCm(values.length, values.lengthUnit || 'cm');
        formData.append('length', lengthInCm);
      }
      if (values.width !== undefined && values.width !== null) {
        const widthInCm = convertToCm(values.width, values.widthUnit || 'cm');
        formData.append('width', widthInCm);
      }
      if (values.height !== undefined && values.height !== null) {
        const heightInCm = convertToCm(values.height, values.heightUnit || 'cm');
        formData.append('height', heightInCm);
      }
      if (values.seatHeight !== undefined && values.seatHeight !== null) {
        const seatHeightInCm = convertToCm(values.seatHeight, values.seatHeightUnit || 'cm');
        formData.append('seatHeight', seatHeightInCm);
      }
      if (values.backHeight !== undefined && values.backHeight !== null) {
        const backHeightInCm = convertToCm(values.backHeight, values.backHeightUnit || 'cm');
        formData.append('backHeight', backHeightInCm);
      }
      if (values.depth !== undefined && values.depth !== null) {
        const depthInCm = convertToCm(values.depth, values.depthUnit || 'cm');
        formData.append('depth', depthInCm);
      }
      
      // Set dimensionUnit mặc định là cm (vì đã convert tất cả về cm)
      formData.append('dimensionUnit', 'cm');
      
      // Xử lý trạng thái - gửi status field thay vì isActive
      if (values.isActive !== undefined) {
        formData.append('status', values.isActive ? 'ACTIVE' : 'INACTIVE');
      }
      
      // Xử lý sản phẩm nổi bật
      if (values.isFeatured !== undefined) {
        formData.append('isFeatured', values.isFeatured ? 'true' : 'false');
      }

      if (record) {
        await updateProduct(record.id, formData);
        toast.success("Cập nhật sản phẩm thành công");
      } else {
        await createProduct(formData);
        toast.success("Tạo sản phẩm thành công");
      }
      setModalOpen(false);
      setEditingRecord(null);
      fetchProducts();
    } catch (error) {
      console.error('Error updating product:', error);
      toast.error(error.response?.data?.message || "Có lỗi xảy ra");
    } finally {
      setModalLoading(false);
    }
  };

  /**
   * Xử lý xóa product
   * @param {number} id - ID của product cần xóa
   */
  const handleDelete = async (id) => {
    try {
      await deleteProduct(id);
      toast.success("Xóa sản phẩm thành công");
      fetchProducts();
    } catch (error) {
      toast.error(error.response?.data?.message || "Có lỗi xảy ra");
    }
  };

  /**
   * Process editing record để map đúng các field
   * @param {Object} record - Record cần xử lý
   * @returns {Object|null} Record đã được xử lý
   */
  const processEditingRecord = (record) => {
    if (!record) return null;
    
    // Xử lý dữ liệu để hiển thị trong form
    const processedRecord = {
      ...record,
      // Map stockQuantity -> stock
      stock: record.stockQuantity !== undefined ? Number(record.stockQuantity) : undefined,
      // Map status -> isActive
      isActive: record.status === 'ACTIVE' || record.isActive === true,
      // Convert các field dimension từ Decimal sang number
      length: record.length ? Number(record.length) : undefined,
      width: record.width ? Number(record.width) : undefined,
      height: record.height ? Number(record.height) : undefined,
      seatHeight: record.seatHeight ? Number(record.seatHeight) : undefined,
      backHeight: record.backHeight ? Number(record.backHeight) : undefined,
      depth: record.depth ? Number(record.depth) : undefined,
      // Set unit mặc định là cm
      lengthUnit: record.dimensionUnit || 'cm',
      widthUnit: record.dimensionUnit || 'cm',
      heightUnit: record.dimensionUnit || 'cm',
      seatHeightUnit: record.dimensionUnit || 'cm',
      backHeightUnit: record.dimensionUnit || 'cm',
      depthUnit: record.dimensionUnit || 'cm',
      // Đảm bảo các số được convert đúng
      price: record.price ? Number(record.price) : undefined,
      salePrice: record.salePrice ? Number(record.salePrice) : undefined,
      costPrice: record.costPrice ? Number(record.costPrice) : undefined,
      minStockLevel: record.minStockLevel ? Number(record.minStockLevel) : undefined,
      categoryId: record.categoryId ? Number(record.categoryId) : undefined,
      brandId: record.brandId ? Number(record.brandId) : undefined,
      isFeatured: record.isFeatured === true || record.isFeatured === 'true',
    };
    
    return processedRecord;
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
    setEditingRecord(processEditingRecord(record));
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
   * Xử lý xem chi tiết product
   * @param {number} id - ID của product cần xem
   */
  const handleViewDetail = async (id) => {
    setLoadingProductId(id);
    try {
      const response = await getProductById(id);
      setDetailData(response.data);
      setDetailOpen(true);
    } catch (error) {
      toast.error("Lỗi khi tải chi tiết sản phẩm");
    } finally {
      setLoadingProductId(null);
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
   * Xử lý quản lý ảnh sản phẩm
   * @param {Object} product - Product object
   */
  const handleManageImages = (product) => {
    setSelectedProduct(product);
    setImageModalOpen(true);
  };

  /**
   * Đóng modal quản lý ảnh
   */
  const closeImageModal = () => {
    setImageModalOpen(false);
    setSelectedProduct(null);
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

  /**
   * Helper function để kiểm tra category có phải là Ghế không
   * @param {number} categoryId - ID của category
   * @returns {boolean}
   */
  const isChairCategory = (categoryId) => {
    if (!categoryId) return false;
    const category = categories.find(c => c.id === categoryId);
    if (!category) return false;
    const categoryName = category.name?.toLowerCase() || '';
    return categoryName.includes('ghế') || categoryName.includes('ghe') || categoryName.includes('chair');
  };

  /**
   * Helper function để kiểm tra category có phải là Bàn/Tủ không
   * @param {number} categoryId - ID của category
   * @returns {boolean}
   */
  const isTableOrCabinetCategory = (categoryId) => {
    if (!categoryId) return false;
    const category = categories.find(c => c.id === categoryId);
    if (!category) return false;
    const categoryName = category.name?.toLowerCase() || '';
    return categoryName.includes('bàn') || categoryName.includes('ban') || 
           categoryName.includes('tủ') || categoryName.includes('tu') ||
           categoryName.includes('table') || categoryName.includes('cabinet');
  };

  return {
    // ===== STATE =====
    products,                // Danh sách products
    categories,              // Danh sách categories (cho select)
    brands,                  // Danh sách brands (cho select)
    showSkeleton,            // Trạng thái hiển thị skeleton
    modalLoading,             // Trạng thái loading khi submit form
    pagination,               // Thông tin phân trang
    keyword,                  // Keyword tìm kiếm (sau debounce)
    searchValue,              // Giá trị search hiện tại (trước debounce)
    modalOpen,                // Trạng thái mở/đóng modal CRUD
    detailOpen,               // Trạng thái mở/đóng modal chi tiết
    editingRecord,            // Record đang được edit (null nếu là create)
    detailData,               // Data hiển thị trong modal chi tiết
    loadingProductId,         // ID của product đang được load chi tiết
    imageModalOpen,           // Trạng thái mở/đóng modal quản lý ảnh
    selectedProduct,          // Product được chọn để quản lý ảnh

    // ===== HANDLERS =====
    fetchProducts,            // Hàm fetch danh sách products
    handleSubmit,             // Hàm xử lý submit form (create/update)
    handleDelete,             // Hàm xử lý xóa product
    handleCreate,             // Hàm mở modal tạo mới
    openEditModal,            // Hàm mở modal chỉnh sửa
    closeModal,               // Hàm đóng modal CRUD
    handleViewDetail,         // Hàm xử lý xem chi tiết
    closeDetailModal,         // Hàm đóng modal chi tiết
    handleManageImages,       // Hàm mở modal quản lý ảnh
    closeImageModal,          // Hàm đóng modal quản lý ảnh
    handlePaginationChange,   // Hàm xử lý thay đổi pagination
    handleSearchChange,       // Hàm xử lý thay đổi search
    processEditingRecord,     // Hàm xử lý editing record cho form
    isChairCategory,          // Helper function kiểm tra category là Ghế
    isTableOrCabinetCategory, // Helper function kiểm tra category là Bàn/Tủ
  };
}

