import { useState, useEffect } from 'react';
import { toast } from '@/lib/utils';

/**
 * Custom hook cho CRUD operations trong admin pages
 * @param {Object} api - API functions object
 * @param {Function} api.getList - Function để lấy danh sách
 * @param {Function} api.getById - Function để lấy chi tiết
 * @param {Function} api.create - Function để tạo mới
 * @param {Function} api.update - Function để cập nhật
 * @param {Function} api.delete - Function để xóa
 * @param {Object} options - Options cho hook
 * @returns {Object} Hook state và functions
 */
export const useAdminCRUD = (api, options = {}) => {
  const {
    defaultPagination = { page: 1, limit: 5, total: 0 },
    debounceDelay = 500,
    enableSearch = true
  } = options;

  // State
  const [data, setData] = useState([]);
  const [pagination, setPagination] = useState(defaultPagination);
  const [keyword, setKeyword] = useState("");
  const [searchValue, setSearchValue] = useState("");
  const [showSkeleton, setShowSkeleton] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [detailData, setDetailData] = useState(null);
  const [loadingItemId, setLoadingItemId] = useState(null);

  // Debounce search
  useEffect(() => {
    if (!enableSearch) return;
    
    const timer = setTimeout(() => {
      setPagination((prev) => ({ ...prev, page: 1 }));
      setKeyword(searchValue);
    }, debounceDelay);
    
    return () => clearTimeout(timer);
  }, [searchValue, debounceDelay, enableSearch]);

  // Fetch data
  const fetchData = async () => {
    setShowSkeleton(true);
    try {
      const response = await api.getList({
        page: pagination.page,
        limit: pagination.limit,
        search: keyword,
      });
      
      setData(response.data.data || []);
      setPagination((prev) => ({
        ...prev,
        total: response.data.total || 0,
      }));
    } catch (error) {
      toast.error("Lỗi khi tải dữ liệu");
      console.error("Error fetching data:", error);
    } finally {
      setShowSkeleton(false);
    }
  };

  // Load data when dependencies change
  useEffect(() => {
    fetchData();
  }, [pagination.page, pagination.limit, keyword]);

  // CRUD Operations
  const handleCreate = () => {
    setEditingRecord(null);
    setModalOpen(true);
  };

  const handleEdit = (record) => {
    setEditingRecord(record);
    setModalOpen(true);
  };

  const handleViewDetail = async (id) => {
    if (!api.getById) return;
    
    setLoadingItemId(id);
    try {
      const response = await api.getById(id);
      setDetailData(response.data);
      setDetailOpen(true);
    } catch (error) {
      toast.error("Lỗi khi tải chi tiết");
    } finally {
      setLoadingItemId(null);
    }
  };

  const handleSubmit = async (values, editingRecord) => {
    setModalLoading(true);
    try {
      if (editingRecord) {
        await api.update(editingRecord.id, values);
        toast.success("Cập nhật thành công");
      } else {
        await api.create(values);
        toast.success("Tạo mới thành công");
      }
      setModalOpen(false);
      setEditingRecord(null);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || "Có lỗi xảy ra");
    } finally {
      setModalLoading(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(id);
      toast.success("Xóa thành công");
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || "Có lỗi xảy ra");
    }
  };

  const handleModalClose = () => {
    setModalOpen(false);
    setEditingRecord(null);
  };

  const handleDetailClose = () => {
    setDetailOpen(false);
    setDetailData(null);
  };

  const handlePaginationChange = (page, pageSize) => {
    setPagination((prev) => ({
      ...prev,
      page,
      limit: pageSize || prev.limit,
    }));
  };

  return {
    // Data
    data,
    pagination,
    keyword,
    searchValue,
    setSearchValue,
    
    // Loading states
    showSkeleton,
    modalLoading,
    loadingItemId,
    
    // Modal states
    modalOpen,
    detailOpen,
    editingRecord,
    detailData,
    
    // Actions
    handleCreate,
    handleEdit,
    handleViewDetail,
    handleSubmit,
    handleDelete,
    handleModalClose,
    handleDetailClose,
    handlePaginationChange,
    fetchData,
  };
};
