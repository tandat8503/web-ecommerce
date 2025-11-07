import { useState, useEffect } from "react";
import { toast } from "@/lib/utils";
import {
  getBanners,
  getBannerById,
  createBanner,
  updateBanner,
  deleteBanner,
} from "@/api/banner.js";

/**
 * Custom hook quản lý toàn bộ logic cho AdminBanner
 * Bao gồm: state management, API calls, CRUD operations
 * 
 * @returns {Object} Object chứa:
 *   - State: banners, loading, modalOpen, detailOpen, editingRecord, detailData, confirmLoading
 *   - Handlers: fetchBanners, handleSubmit, handleDelete, handleView, openCreateModal, openEditModal, closeModal, closeDetailModal
 */
export function useAdminBanner() {
  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [detailData, setDetailData] = useState(null);
  const [confirmLoading, setConfirmLoading] = useState(false);

  // Helper function để delay (cho skeleton loading effect)
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  /**
   * Lấy danh sách banners từ API
   */
  const fetchBanners = async () => {
    setLoading(true);
    try {
      const [res] = await Promise.all([getBanners(), sleep(800)]);
      setBanners(res.data.data);
    } catch (err) {
      console.error(err);
      toast.error("Lỗi tải banner");
    } finally {
      setLoading(false);
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
      const formData = new FormData();

      // Xử lý từng field riêng biệt
      if (values.title) formData.append("title", values.title);
      if (values.isActive !== undefined) {
        formData.append("isActive", values.isActive ? "true" : "false");
      }

      // Thêm file ảnh nếu có
      if (values.image && values.image[0]?.originFileObj) {
        formData.append("image", values.image[0].originFileObj);
      }

      if (record) {
        await updateBanner(record.id, formData);
        toast.success("Cập nhật banner thành công");
      } else {
        await createBanner(formData);
        toast.success("Tạo banner thành công");
      }

      setModalOpen(false);
      setEditingRecord(null);
      fetchBanners();
    } catch (err) {
      console.error(err);
      toast.error("Lỗi khi lưu banner");
    } finally {
      setConfirmLoading(false);
    }
  };

  /**
   * Xử lý xóa banner
   * @param {number} id - ID của banner cần xóa
   */
  const handleDelete = async (id) => {
    try {
      await deleteBanner(id);
      toast.success("Xóa thành công");
      fetchBanners();
    } catch (err) {
      console.error(err);
      toast.error("Lỗi khi xóa banner");
    }
  };

  /**
   * Xử lý xem chi tiết banner
   * @param {number} id - ID của banner cần xem
   */
  const handleView = async (id) => {
    try {
      const res = await getBannerById(id);
      setDetailData(res.data.data);
      setDetailOpen(true);
    } catch (err) {
      console.error(err);
      toast.error("Không tải được chi tiết banner");
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

  // Fetch banners khi component mount
  useEffect(() => {
    fetchBanners();
  }, []);

  return {
    // ===== STATE =====
    banners,              // Danh sách banners
    loading,              // Trạng thái loading khi fetch data
    modalOpen,            // Trạng thái mở/đóng modal CRUD
    detailOpen,           // Trạng thái mở/đóng modal chi tiết
    editingRecord,        // Record đang được edit (null nếu là create)
    detailData,          // Data hiển thị trong modal chi tiết
    confirmLoading,       // Trạng thái loading khi submit form

    // ===== HANDLERS =====
    fetchBanners,         // Hàm fetch danh sách banners
    handleSubmit,         // Hàm xử lý submit form (create/update)
    handleDelete,         // Hàm xử lý xóa banner
    handleView,           // Hàm xử lý xem chi tiết
    openCreateModal,      // Hàm mở modal tạo mới
    openEditModal,        // Hàm mở modal chỉnh sửa
    closeModal,           // Hàm đóng modal CRUD
    closeDetailModal,     // Hàm đóng modal chi tiết
  };
}

