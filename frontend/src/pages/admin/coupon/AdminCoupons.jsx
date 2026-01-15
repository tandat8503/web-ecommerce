import {
  Table,
  Input,
  Space,
  Popconfirm,
  Row,
  Col,
  Card,
  Tag,
  Tooltip,
  Badge,
  Select,
  InputNumber,
  DatePicker,
  Switch,
  Modal,
  Checkbox,
  message,
} from "antd";
import { FaPlus, FaEdit, FaTrash, FaEye } from "react-icons/fa";
import { Loader2, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TableSkeleton } from "@/components/ui/skeleton";
import CrudModal from "@/pages/hepler/CrudModal";
import DetailModal from "@/pages/hepler/DetailModal";
import { formatPrice } from "@/lib/utils";
import { getUsersForSharing, shareCouponToUsers } from "@/api/adminCoupons";
import dayjs from "dayjs";
import { useAdminCoupons } from "./useAdminCoupons";
import { useState, useEffect } from "react";

const { Search } = Input;
const { Option } = Select;
const { RangePicker } = DatePicker;

export default function AdminCoupons() {
  // Lấy tất cả state và handlers từ custom hook
  const {
    coupons,
    showSkeleton,
    modalLoading,
    pagination,
    searchValue,
    statusFilter,
    modalOpen,
    detailOpen,
    editingRecord,
    detailData,
    loadingCouponId,
    handleSubmit,
    handleDelete,
    handleViewDetail,
    openCreateModal,
    openEditModal,
    closeModal,
    closeDetailModal,
    handleSearchChange,
    handleStatusFilterChange,
    handlePaginationChange,
    getCouponStatus,
    processEditingRecord,
  } = useAdminCoupons();

  // Share coupon state
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [sharingCoupon, setSharingCoupon] = useState(null);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [users, setUsers] = useState([]);
  const [selectedUserIds, setSelectedUserIds] = useState([]);
  const [shareToAll, setShareToAll] = useState(false);
  const [searchUsers, setSearchUsers] = useState("");
  const [usersPagination, setUsersPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0
  });

  // Fetch users for sharing
  const fetchUsers = async (page = 1, search = "") => {
    if (!sharingCoupon) return;
    try {
      setLoadingUsers(true);
      const response = await getUsersForSharing({
        page,
        limit: usersPagination.pageSize,
        search,
        couponId: sharingCoupon.id
      });

      if (response.data.success) {
        setUsers(response.data.data.users);
        setUsersPagination({
          ...usersPagination,
          current: page,
          total: response.data.data.pagination.total
        });
      }
    } catch (error) {
      console.error('Failed to fetch users:', error);
      message.error('Không thể tải danh sách người dùng');
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    if (shareModalOpen) {
      fetchUsers(1, "");
      setSelectedUserIds([]);
      setShareToAll(false);
      setSearchUsers("");
    }
  }, [shareModalOpen]);

  const openShareModal = (coupon) => {
    setSharingCoupon(coupon);
    setShareModalOpen(true);
  };

  const closeShareModal = () => {
    setShareModalOpen(false);
    setSharingCoupon(null);
  };

  const handleShare = async () => {
    if (!shareToAll && selectedUserIds.length === 0) {
      message.warning('Vui lòng chọn ít nhất một người dùng hoặc chọn "Tất cả người dùng"');
      return;
    }

    try {
      setSharing(true);
      const response = await shareCouponToUsers(sharingCoupon.id, {
        userIds: selectedUserIds,
        shareToAll
      });

      if (response.data.success) {
        message.success(response.data.message);
        closeShareModal();
      }
    } catch (error) {
      console.error('Failed to share coupon:', error);
      const errorMsg = error.response?.data?.message || 'Không thể chia sẻ mã giảm giá';
      message.error(errorMsg);
    } finally {
      setSharing(false);
    }
  };

  const userColumns = [
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
      width: '25%'
    },
    {
      title: 'Họ tên',
      key: 'fullName',
      width: '25%',
      render: (_, record) => `${record.firstName} ${record.lastName}`
    },
    {
      title: 'Số điện thoại',
      dataIndex: 'phone',
      key: 'phone',
      width: '15%',
      render: (phone) => phone || '-'
    },
    {
      title: 'Sở hữu mã',
      key: 'couponStatus',
      width: '15%',
      render: (_, record) => (
        record.couponStatus === 'used'
          ? <Tag color="red">Đã dùng</Tag>
          : record.couponStatus === 'received'
            ? <Tag color="blue">Chưa dùng</Tag>
            : <Tag color="default">Chưa có</Tag>
      )
    },
    {
      title: 'Ngày đăng ký',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: '20%',
      render: (date) => new Date(date).toLocaleDateString('vi-VN')
    }
  ];

  // ===========================
  // TABLE COLUMNS CONFIGURATION
  // ===========================
  const columns = [
    { title: "ID", dataIndex: "id", key: "id", width: 80 },
    {
      title: "Mã giảm giá",
      dataIndex: "code",
      key: "code",
      render: (code) => (
        <Tag
          color="purple"
          style={{
            fontSize: "12px",
            fontWeight: "bold",
            borderRadius: "6px",
            padding: "4px 8px",
          }}
        >
          {code}
        </Tag>
      ),
    },
    {
      title: "Tên",
      dataIndex: "name",
      key: "name",
      render: (t) => <strong>{t}</strong>,
    },
    {
      title: "Giá  giảm",
      dataIndex: "discountValue",
      key: "discountValue",
      width: 120,
      render: (value, record) => (
        <Tag color="orange" style={{ fontSize: "12px", fontWeight: "bold" }}>
          {record.discountType === "PERCENT"
            ? `${value}%`
            : formatPrice(value)}
        </Tag>
      ),
    },
    {
      title: "Đơn tối thiểu",
      dataIndex: "minimumAmount",
      key: "minimumAmount",
      width: 120,
      render: (amount) =>
        amount ? formatPrice(amount) : "Không giới hạn",
    },
    {
      title: "Giới hạn sử dụng",
      dataIndex: "usageLimit",
      key: "usageLimit",
      width: 180,
      render: (limit, record) => {
        const usedCount = record.usedCount || 0;//số lần sử dụng của coupon
        const remaining = limit ? limit - usedCount : null;//số lần sử dụng còn lại của coupon

        return (
          <div style={{ fontSize: "12px" }}>
            {limit ? (
              <>
                <Tag
                  color="magenta"
                  style={{ fontSize: "12px", fontWeight: "bold", marginBottom: "4px" }}
                >
                  {limit} lượt tối đa
                </Tag>
                <div style={{ marginTop: "4px" }}>
                  <Tag
                    color={remaining > 0 ? "green" : "red"}
                    style={{ fontSize: "11px" }}
                  >
                    Đã dùng: {usedCount} / Còn lại: {remaining >= 0 ? remaining : 0}
                  </Tag>
                </div>
              </>
            ) : (
              <Tag
                color="default"
                style={{ fontSize: "12px", fontStyle: "italic" }}
              >
                Không giới hạn (Đã dùng: {usedCount})
              </Tag>
            )}
          </div>
        );
      },
    },
    {
      title: "Thời gian",
      key: "dateRange",
      width: 200,
      render: (_, record) => (
        <div style={{ fontSize: "12px" }}>
          <div>Từ: {dayjs(record.startDate).format("DD/MM/YYYY")}</div>
          <div>Đến: {dayjs(record.endDate).format("DD/MM/YYYY")}</div>
        </div>
      ),
    },
    {
      title: "Trạng thái",
      key: "status",
      width: 120,
      render: (_, record) => {
        const statusInfo = getCouponStatus(record);
        return <Tag color={statusInfo.color}>{statusInfo.text}</Tag>;
      },
    },
    {
      title: "Ngày tạo",
      dataIndex: "createdAt",
      key: "createdAt",
      width: 120,
      render: (d) => dayjs(d).format("DD/MM/YYYY"),
    },
    {
      title: "Thao tác",
      render: (_, record) => (
        <Space>
          <Tooltip title="Xem chi tiết">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => handleViewDetail(record.id)}
              disabled={loadingCouponId === record.id}
            >
              {loadingCouponId === record.id ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <FaEye />
              )}
            </Button>
          </Tooltip>
          <Tooltip title={
            !record.isActive ? "Mã đang tạm dừng" :
              dayjs().isAfter(dayjs(record.endDate)) ? "Mã đã hết hạn" :
                record.usageLimit && (record.usedCount || 0) >= record.usageLimit ? "Mã đã hết lượt dùng" :
                  "Chia sẻ mã"
          }>
            <Button
              className={`${!record.isActive ||
                dayjs().isAfter(dayjs(record.endDate)) ||
                (record.usageLimit && (record.usedCount || 0) >= record.usageLimit)
                ? "bg-gray-300 cursor-not-allowed"
                : "bg-green-500 hover:bg-green-600"
                } text-white`}
              size="sm"
              onClick={() => openShareModal(record)}
              disabled={
                !record.isActive ||
                dayjs().isAfter(dayjs(record.endDate)) ||
                (record.usageLimit && (record.usedCount || 0) >= record.usageLimit)
              }
            >
              <Share2 size={14} />
            </Button>
          </Tooltip>
          <Tooltip title="Sửa">
            <Button
              className="bg-blue-500 hover:bg-blue-600 text-white"
              size="sm"
              onClick={() => openEditModal(record)}
            >
              <FaEdit />
            </Button>
          </Tooltip>
          <Tooltip title="Xóa">
            <Popconfirm
              title="Bạn có chắc muốn xóa mã giảm giá này?"
              onConfirm={() => handleDelete(record.id)}
            >
              <Button variant="destructive" size="sm">
                <FaTrash />
              </Button>
            </Popconfirm>
          </Tooltip>
        </Space>
      ),
    },
  ];

  // ===========================
  // FORM FIELDS CONFIGURATION
  // ===========================
  const fields = [
    {
      name: "code",
      label: "Mã giảm giá",
      component: <Input placeholder="Nhập mã giảm giá (VD: WELCOME10)" />,
      rules: [
        { required: true, message: "Vui lòng nhập mã giảm giá" },
        { min: 2, message: "Mã giảm giá phải có ít nhất 2 ký tự" },
        { max: 30, message: "Mã giảm giá không được quá 30 ký tự" },
      ],
    },
    {
      name: "name",
      label: "Tên mã giảm giá",
      component: <Input placeholder="Nhập tên mã giảm giá" />,
      rules: [
        { required: true, message: "Vui lòng nhập tên mã giảm giá" },
        { min: 3, message: "Tên mã giảm giá phải có ít nhất 3 ký tự" },
        { max: 150, message: "Tên mã giảm giá không được quá 150 ký tự" },
      ],
    },
    {
      name: "discountType",
      label: "Loại giảm giá",
      component: (
        <Select placeholder="Chọn loại giảm giá">
          <Option value="PERCENT">Phần trăm (%)</Option>
          <Option value="AMOUNT">Số tiền (VND)</Option>
        </Select>
      ),
      rules: [{ required: true, message: "Vui lòng chọn loại giảm giá" }],
    },
    {
      name: "discountValue",
      label: "Giá trị giảm giá",
      component: (
        <InputNumber
          placeholder="Nhập giá trị giảm giá"
          style={{ width: "100%" }}
          min={0.01}
          precision={2}
        />
      ),
      rules: [
        { required: true, message: "Vui lòng nhập giá trị giảm giá" },
        {
          type: "number",
          min: 0.01,
          message: "Giá trị giảm giá phải là số dương",
        },
      ],
    },
    {
      name: "minimumAmount",
      label: "Đơn hàng tối thiểu (VND)",
      component: (
        <InputNumber
          placeholder="Nhập đơn hàng tối thiểu"
          style={{ width: "100%" }}
          min={0}
          precision={0}
        />
      ),
      rules: [
        {
          type: "number",
          min: 0,
          message: "Giá trị đơn hàng tối thiểu không được âm",
        },
      ],
    },
    {
      name: "usageLimit",
      label: "Giới hạn sử dụng",
      component: (
        <InputNumber
          placeholder="Nhập số lần sử dụng tối đa"
          style={{ width: "100%" }}
          min={1}
          precision={0}
        />
      ),
      rules: [
        {
          type: "number",
          min: 1,
          message: "Giới hạn sử dụng phải ít nhất 1",
        },
        {
          type: "integer",
          message: "Giới hạn sử dụng phải là số nguyên",
        },
      ],
    },
    {
      name: "dateRange",
      label: "Thời gian hiệu lực",
      component: <RangePicker style={{ width: "100%" }} showTime={false} />,
      rules: [
        { required: true, message: "Vui lòng chọn thời gian hiệu lực" },
        {
          validator: (_, value) => {
            if (!value || !value[0] || !value[1]) {
              return Promise.reject(
                new Error("Vui lòng chọn cả ngày bắt đầu và kết thúc")
              );
            }
            if (value[1].isBefore(value[0])) {
              return Promise.reject(
                new Error("Ngày kết thúc phải sau ngày bắt đầu")
              );
            }
            return Promise.resolve();
          },
        },
      ],
    },
    {
      name: "isActive",
      label: "Trạng thái hoạt động",
      component: (
        <Switch checkedChildren="Hoạt động" unCheckedChildren="Tạm dừng" />
      ),
      valuePropName: "checked",
    },
  ];

  // ===========================
  // DETAIL FIELDS CONFIGURATION
  // ===========================
  const detailFields = [
    { name: "id", label: "ID" },
    {
      name: "code",
      label: "Mã giảm giá",
      render: (code) => (
        <Tag
          color="purple"
          style={{
            fontSize: "12px",
            fontWeight: "bold",
            borderRadius: "6px",
            padding: "4px 8px",
          }}
        >
          {code}
        </Tag>
      ),
    },
    { name: "name", label: "Tên mã giảm giá" },
    {
      name: "discountType",
      label: "Loại giảm giá",
      render: (type) => (
        <Tag color={type === "PERCENT" ? "blue" : "green"}>
          {type === "PERCENT" ? "Phần trăm" : "Số tiền"}
        </Tag>
      ),
    },
    {
      name: "discountValue",
      label: "Giá trị giảm",
      render: (value, record) => (
        <span style={{ fontSize: "12px", fontWeight: "bold" }}>
          {record.discountType === "PERCENT"
            ? `${value}%`
            : formatPrice(value)}
        </span>
      ),
    },
    {
      name: "minimumAmount",
      label: "Đơn hàng tối thiểu",
      render: (amount) =>
        amount ? formatPrice(amount) : "Không giới hạn",
    },
    {
      name: "usageLimit",
      label: "Giới hạn sử dụng",
      render: (limit) =>
        limit ? (
          <Tag
            color="magenta"
            style={{ fontSize: "12px", fontWeight: "bold" }}
          >
            {limit} lượt sử dụng
          </Tag>
        ) : (
          <Tag
            color="default"
            style={{ fontSize: "12px", fontStyle: "italic" }}
          >
            Không giới hạn
          </Tag>
        ),
    },
    {
      name: "startDate",
      label: "Ngày bắt đầu",
      render: (date) => dayjs(date).format("DD/MM/YYYY HH:mm"),
    },
    {
      name: "endDate",
      label: "Ngày kết thúc",
      render: (date) => dayjs(date).format("DD/MM/YYYY HH:mm"),
    },
    {
      name: "isActive",
      label: "Trạng thái",
      render: (isActive) => (
        <Tag color={isActive ? "green" : "red"}>
          {isActive ? "Hoạt động" : "Tạm dừng"}
        </Tag>
      ),
    },
    {
      name: "createdAt",
      label: "Ngày tạo",
      render: (date) => dayjs(date).format("DD/MM/YYYY HH:mm"),
    },
  ];

  return (
    <>
      {/* CSS Animation */}
      <style>
        {`
          @keyframes gradientShift {
            0% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
            100% { background-position: 0% 50%; }
          }
        `}
      </style>

      <Row gutter={[16, 16]}>
        <Col span={24}>
          <Badge.Ribbon
            text="Quản lý Mã giảm giá"
            color="#667eea"
            style={{
              background:
                "linear-gradient(45deg, #667eea, #764ba2, #f093fb, #667eea)",
              backgroundSize: "300% 300%",
              animation: "gradientShift 4s ease infinite",
              fontWeight: "bold",
              fontSize: "16px",
              padding: "8px 20px",
              height: "40px",
              lineHeight: "24px",
            }}
          >
            <Card className="shadow rounded-2xl">
              {/* Header với các nút điều khiển */}
              <div className="flex justify-between mb-4">
                <div className="flex gap-4">
                  <Button variant="default" onClick={openCreateModal}>
                    <FaPlus /> Thêm mã giảm giá
                  </Button>
                  <Search
                    placeholder="Tìm kiếm mã giảm giá..."
                    allowClear
                    size="large"
                    value={searchValue}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    style={{ width: 300 }}
                  />
                  <Select
                    placeholder="Lọc theo trạng thái"
                    allowClear
                    style={{ width: 200 }}
                    value={statusFilter}
                    onChange={handleStatusFilterChange}
                  >
                    <Option value="true">Đang hoạt động</Option>
                    <Option value="false">Tạm dừng</Option>
                  </Select>
                </div>
                <div>Tổng: {pagination.total} mã giảm giá</div>
              </div>

              {/* Bảng dữ liệu */}
              {showSkeleton ? (
                <TableSkeleton />
              ) : (
                <Table
                  columns={columns}
                  dataSource={coupons}
                  rowKey="id"
                  pagination={{
                    current: pagination.page,
                    pageSize: pagination.limit,
                    total: pagination.total,
                    showSizeChanger: true,
                    showQuickJumper: true,
                    showTotal: (total, range) =>
                      `${range[0]}-${range[1]} của ${total} mã giảm giá`,
                    onChange: handlePaginationChange,
                  }}
                  scroll={{ x: 1200 }}
                />
              )}
            </Card>
          </Badge.Ribbon>
        </Col>
      </Row>

      {/* Modal CRUD */}
      <CrudModal
        open={modalOpen}
        onCancel={closeModal}
        onSubmit={handleSubmit}
        editingRecord={processEditingRecord(editingRecord)}
        fields={fields}
        title={editingRecord ? "Sửa mã giảm giá" : "Thêm mã giảm giá"}
        confirmLoading={modalLoading}
        okText={editingRecord ? "Cập nhật" : "Tạo mới"}
        width={800}
      />

      {/* Modal Detail */}
      <DetailModal
        open={detailOpen}
        onCancel={closeDetailModal}
        title="Chi tiết mã giảm giá"
        data={detailData}
        fields={detailFields}
        width={600}
      />

      {/* Modal Share Coupon */}
      <Modal
        title={
          <div className="flex items-center gap-2">
            <Share2 size={20} className="text-blue-600" />
            <span>Chia sẻ mã giảm giá</span>
          </div>
        }
        open={shareModalOpen}
        onCancel={closeShareModal}
        width={900}
        footer={[
          <Button key="cancel" variant="secondary" onClick={closeShareModal}>
            Hủy
          </Button>,
          <Button
            key="share"
            onClick={handleShare}
            disabled={sharing}
          >
            {sharing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Share2 size={16} className="mr-2" />}
            Chia sẻ
          </Button>
        ]}
      >
        {/* Coupon Info */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4 mb-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-600 mb-1">Mã giảm giá</div>
              <div className="text-2xl font-bold text-blue-600">{sharingCoupon?.code}</div>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-600 mb-1">Giá trị</div>
              <div className="text-xl font-semibold text-orange-600">
                {sharingCoupon?.discountType === 'PERCENT'
                  ? `${sharingCoupon?.discountValue}%`
                  : formatPrice(sharingCoupon?.discountValue)}
              </div>
            </div>
          </div>
          <div className="text-sm text-gray-600 mt-2">{sharingCoupon?.name}</div>
        </div>

        {/* Share to all checkbox */}
        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <Checkbox
            checked={shareToAll}
            onChange={(e) => {
              setShareToAll(e.target.checked);
              if (e.target.checked) {
                setSelectedUserIds([]);
              }
            }}
          >
            <span className="font-semibold">Chia sẻ cho tất cả người dùng</span>
            <span className="text-sm text-gray-600 ml-2">
              (Mã sẽ được tự động thêm vào kho coupon của tất cả user)
            </span>
          </Checkbox>
        </div>

        {/* Search */}
        <div className="mb-4">
          <Search
            placeholder="Tìm kiếm theo email, tên, số điện thoại..."
            value={searchUsers}
            onChange={(e) => {
              setSearchUsers(e.target.value);
              fetchUsers(1, e.target.value);
            }}
            disabled={shareToAll}
            allowClear
          />
        </div>

        {/* Users table */}
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm font-semibold text-gray-700">
              Danh sách người dùng
              {!shareToAll && selectedUserIds.length > 0 && (
                <span className="ml-2 text-blue-600">
                  ({selectedUserIds.length} đã chọn)
                </span>
              )}
            </span>
          </div>

          <Table
            rowSelection={shareToAll ? undefined : {
              selectedRowKeys: selectedUserIds,
              onChange: (selectedKeys) => setSelectedUserIds(selectedKeys),
              getCheckboxProps: (record) => ({
                disabled: record.couponStatus === 'used', // Khóa nếu đã dùng
              }),
            }}
            columns={userColumns}
            dataSource={users}
            rowKey="id"
            loading={loadingUsers}
            pagination={{
              ...usersPagination,
              showSizeChanger: false,
              showTotal: (total) => `Tổng ${total} người dùng`,
              onChange: (page) => fetchUsers(page, searchUsers)
            }}
            scroll={{ y: 400 }}
            size="small"
          />
        </div>

        {/* Summary */}
        {(shareToAll || selectedUserIds.length > 0) && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <div className="text-sm">
              <span className="font-semibold text-green-700">Sẽ chia sẻ cho: </span>
              <span className="text-green-600">
                {shareToAll
                  ? `Tất cả ${usersPagination.total} người dùng`
                  : `${selectedUserIds.length} người dùng đã chọn`}
              </span>
            </div>
            <div className="text-xs text-gray-600 mt-1">
              Mã sẽ có hiệu lực trong 30 ngày kể từ khi được chia sẻ
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}

