import { useState, useEffect } from "react";
import { toast } from "@/lib/utils";
import {
  getUsers,
  createUser,
  updateUser,
  deleteUser,
  getUserById,
} from "@/api/adminUser";

/**
 * Custom hook quản lý toàn bộ logic cho AdminUser
 * Bao gồm: state management, API calls, CRUD operations, pagination, search, toggle status
 * 
 * @returns {Object} Object chứa:
 *   - State: users, showSkeleton, modalLoading, pagination, keyword, searchValue, modalOpen, detailOpen, editingRecord, detailData, loadingUserId
 *   - Handlers: fetchUsers, handleSubmit, handleDelete, handleViewDetail, handleToggleStatus, openCreateModal, openEditModal, closeModal, closeDetailModal, handleSearchChange, handlePaginationChange
 */
export function useAdminUser() {
  const [showSkeleton, setShowSkeleton] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [users, setUsers] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 5, total: 0 });
  const [keyword, setKeyword] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [detailData, setDetailData] = useState(null);
  const [loadingUserId, setLoadingUserId] = useState(null);
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
   * Load danh sách users từ API
   */
  const fetchUsers = async () => {
    try {
      setShowSkeleton(true);

      // Tạo delay tối thiểu để người dùng thấy skeleton
      const [res] = await Promise.all([
        getUsers({
          page: pagination.page,
          limit: pagination.limit,
          keyword,
        }),
        new Promise((resolve) => setTimeout(resolve, 1000)), // Delay 1 giây
      ]);

      setUsers(res.data.data.users);
      setPagination((prev) => ({
        ...prev,
        total: res.data.data.pagination.total,
      }));
    } catch (err) {
      console.log(err);
      message.error("Không thể tải danh sách user");
    } finally {
      setShowSkeleton(false);
    }
  };

  /**
   * Fetch users khi pagination hoặc keyword thay đổi
   */
  useEffect(() => {
    fetchUsers();
  }, [pagination.page, pagination.limit, keyword]);

  /**
   * Xử lý submit form (create/update)
   * @param {Object} values - Form values
   * @param {Object|null} record - Record đang edit (null nếu là create)
   */
  const handleSubmit = async (values, record) => {
    try {
      setModalLoading(true);
      if (record) {
        // Khi edit, chỉ gửi các field có giá trị
        const updateData = {};
        if (values.firstName !== undefined) updateData.firstName = values.firstName;
        if (values.lastName !== undefined) updateData.lastName = values.lastName;
        if (values.phone !== undefined) updateData.phone = values.phone;
        if (values.role !== undefined) updateData.role = values.role;
        if (values.isVerified !== undefined) updateData.isVerified = values.isVerified;

        await updateUser(record.id, updateData);
        toast.success("Cập nhật user thành công");
      } else {
        // Khi tạo mới, gửi tất cả values
        await createUser(values);
        toast.success("Tạo user thành công (mặc định mật khẩu 123456)");
      }
      setModalOpen(false);
      setEditingRecord(null);
      fetchUsers();
    } catch (err) {
      console.log(err);

      // Xử lý lỗi cụ thể
      if (err.response?.data?.message) {
        const errorMessage = err.response.data.message;

        if (errorMessage.includes("Email đã tồn tại")) {
          toast.error("Email này đã được sử dụng. Vui lòng chọn email khác.");
        } else if (errorMessage.includes("Số điện thoại đã được sử dụng")) {
          toast.error("Số điện thoại này đã được sử dụng. Vui lòng chọn số điện thoại khác.");
        } else if (errorMessage.includes("Thiếu thông tin bắt buộc")) {
          toast.error("Vui lòng điền đầy đủ thông tin bắt buộc.");
        } else if (errorMessage.includes("User không tồn tại")) {
          toast.error("Không tìm thấy người dùng này.");
        } else if (errorMessage.includes("Không thể thay đổi quyền của chính bạn")) {
          toast.error("Không thể thay đổi quyền của chính bạn.");
        } else if (errorMessage.includes("Không thể vô hiệu hóa tài khoản của chính bạn")) {
          toast.error("Không thể vô hiệu hóa tài khoản của chính bạn.");
        } else {
          toast.error(` ${errorMessage}`);
        }
      } else {
        toast.error(" Có lỗi khi lưu user. Vui lòng thử lại.");
      }
    } finally {
      setModalLoading(false);
    }
  };

  /**
   * Xử lý xóa user
   * @param {number} id - ID của user cần xóa
   */
  const handleDelete = async (id) => {
    try {
      await deleteUser(id);
      toast.success("Xóa user thành công");
      fetchUsers();
    } catch (err) {
      console.log(err);
      message.error("Xóa thất bại");
    }
  };

  /**
   * Xử lý xem chi tiết user
   * @param {number} id - ID của user cần xem
   */
  const handleViewDetail = async (id) => {
    try {
      const res = await getUserById(id);
      setDetailData(res.data.data);
      setDetailOpen(true);
    } catch (err) {
      console.log(err);
      toast.error("Không thể tải chi tiết user");
    }
  };

  /**
   * Xử lý toggle trạng thái active/inactive của user
   * @param {number} id - ID của user
   * @param {boolean} currentStatus - Trạng thái hiện tại
   */
  const handleToggleStatus = async (id, currentStatus) => {
    try {
      setLoadingUserId(id);
      await updateUser(id, { isActive: !currentStatus });
      toast.success("Cập nhật trạng thái thành công");
      fetchUsers();
    } catch (err) {
      console.error(err);
      toast.error("Cập nhật trạng thái thất bại");
    } finally {
      setLoadingUserId(null);
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
   * Xử lý thay đổi pagination
   * @param {number} page - Trang hiện tại
   * @param {number} pageSize - Số items mỗi trang
   */
  const handlePaginationChange = (page, pageSize) => {
    setPagination({ ...pagination, page, limit: pageSize });
  };

  return {
    // ===== STATE =====
    users,                // Danh sách users
    showSkeleton,         // Trạng thái hiển thị skeleton
    modalLoading,         // Trạng thái loading khi submit form
    pagination,           // Thông tin phân trang
    keyword,              // Keyword tìm kiếm (sau debounce)
    searchValue,          // Giá trị search hiện tại (trước debounce)
    modalOpen,            // Trạng thái mở/đóng modal CRUD
    detailOpen,           // Trạng thái mở/đóng modal chi tiết
    editingRecord,        // Record đang được edit (null nếu là create)
    detailData,          // Data hiển thị trong modal chi tiết
    loadingUserId,        // ID của user đang được load (cho toggle status)

    // ===== HANDLERS =====
    fetchUsers,           // Hàm fetch danh sách users
    handleSubmit,         // Hàm xử lý submit form (create/update)
    handleDelete,         // Hàm xử lý xóa user
    handleViewDetail,     // Hàm xử lý xem chi tiết
    handleToggleStatus,   // Hàm xử lý toggle trạng thái active/inactive
    openCreateModal,      // Hàm mở modal tạo mới
    openEditModal,        // Hàm mở modal chỉnh sửa
    closeModal,           // Hàm đóng modal CRUD
    closeDetailModal,     // Hàm đóng modal chi tiết
    handleSearchChange,   // Hàm xử lý thay đổi search
    handlePaginationChange, // Hàm xử lý thay đổi pagination
  };
}

