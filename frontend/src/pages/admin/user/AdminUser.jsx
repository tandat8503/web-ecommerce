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
  Checkbox,
} from "antd";
import { FaPlus, FaEdit, FaEye } from "react-icons/fa";
import { Button } from "@/components/ui/button"; // shadcn/ui button
import { TableSkeleton } from "@/components/ui/skeleton";
import CrudModal from "@/pages/hepler/CrudModal";
import DetailModal from "@/pages/hepler/DetailModal";
import { useAdminUser } from "./useAdminUser";

export default function AdminUser() {
  // Lấy tất cả state và handlers từ custom hook
  const {
    users,
    showSkeleton,
    modalLoading,
    pagination,
    searchValue,
    modalOpen,
    detailOpen,
    editingRecord,
    detailData,
    loadingUserId,
    handleSubmit,
    handleViewDetail,
    handleToggleStatus,
    openCreateModal,
    openEditModal,
    closeModal,
    closeDetailModal,
    handleSearchChange,
    handlePaginationChange,
  } = useAdminUser();

  // Cấu hình form fields cho CrudModal
  const formFields = [
    {
      name: "email",
      label: "Email",
      component: (
        <Input
          placeholder="Nhập email"
          type="email"
          disabled={!!editingRecord}
        />
      ),
      rules: editingRecord
        ? []
        : [
          { required: true, message: "Bắt buộc" },
          { type: "email", message: "Email không hợp lệ" },
        ],
    },
    {
      name: "firstName",
      label: "Họ",
      component: <Input placeholder="Nhập họ" />,
      rules: [
        { required: true, message: "Bắt buộc" },
        {
          pattern: /^[a-zA-ZÀÁÂÃÈÉÊÌÍÒÓÔÕÙÚĂĐĨŨƠàáâãèéêìíòóôõùúăđĩũơƯĂẠẢẤẦẨẪẬẮẰẲẴẶẸẺẼỀỀỂưăạảấầẩẫậắằẳẵặẹẻẽềềểỄỆỈỊỌỎỐỒỔỖỘỚỜỞỠỢỤỦỨỪễệỉịọỏốồổỗộớờởỡợụủứừỬỮỰỲỴÝỶỸửữựỳỵýỷỹ\s]+$/,
          message: "Họ không được chứa ký tự đặc biệt hoặc số!"
        }
      ],
    },
    {
      name: "lastName",
      label: "Tên",
      component: <Input placeholder="Nhập tên" />,
      rules: [
        { required: true, message: "Bắt buộc" },
        {
          pattern: /^[a-zA-ZÀÁÂÃÈÉÊÌÍÒÓÔÕÙÚĂĐĨŨƠàáâãèéêìíòóôõùúăđĩũơƯĂẠẢẤẦẨẪẬẮẰẲẴẶẸẺẼỀỀỂưăạảấầẩẫậắằẳẵặẹẻẽềềểỄỆỈỊỌỎỐỒỔỖỘỚỜỞỠỢỤỦỨỪễệỉịọỏốồổỗộớờởỡợụủứừỬỮỰỲỴÝỶỸửữựỳỵýỷỹ\s]+$/,
          message: "Tên không được chứa ký tự đặc biệt hoặc số!"
        }
      ],
    },
    {
      name: "phone",
      label: "Số điện thoại",
      component: <Input placeholder="Nhập số điện thoại" />,
      rules: [
        { required: true, message: "Bắt buộc" },
        {
          pattern: /^[0-9]{10,11}$/,
          message: "Số điện thoại phải có 10-11 chữ số",
        },
      ],
    },
    {
      name: "role",
      label: "Quyền",
      component: (
        <Select placeholder="Chọn quyền">
          <Select.Option value="CUSTOMER">Khách hàng</Select.Option>
          <Select.Option value="ADMIN">Quản trị viên</Select.Option>
        </Select>
      ),
      initialValue: "CUSTOMER",
    },
    // Chỉ hiển thị isVerified khi edit
    ...(editingRecord
      ? [
        {
          name: "isVerified",
          label: "Đã xác thực email",
          component: <Checkbox>Đã xác thực email</Checkbox>,
          valuePropName: "checked",
        },
      ]
      : []),
  ];

  // Table columns
  const columns = [
    { title: "ID", dataIndex: "id", width: 70 },
    {
      title: "Email",
      dataIndex: "email",
      render: (text) => <strong>{text}</strong>,
    },
    { title: "Họ", dataIndex: "firstName" },
    { title: "Tên", dataIndex: "lastName" },
    { title: "SĐT", dataIndex: "phone" },
    {
      title: "Quyền",
      dataIndex: "role",
      width: 120,
      render: (role) => (
        <Tag color={role === "ADMIN" ? "purple" : "blue"}>
          {role === "ADMIN" ? "Quản trị viên" : "Khách hàng"}
        </Tag>
      ),
    },
    {
      title: "Xác thực",
      dataIndex: "isVerified",
      width: 100,
      render: (isVerified) => (
        <Tag color={isVerified ? "green" : "orange"}>
          {isVerified ? "Đã xác thực" : "Chưa xác thực"}
        </Tag>
      ),
    },
    {
      title: "Trạng thái",
      dataIndex: "isActive",
      render: (val, record) => {
        const isLoading = loadingUserId === record.id;

        return (
          <Popconfirm
            title={`Bạn có chắc muốn ${val ? "vô hiệu hóa" : "kích hoạt"} user này?`}
            okText="Xác nhận"
            cancelText="Hủy"
            onConfirm={() => handleToggleStatus(record.id, val)}
          >
            <span>
              {isLoading ? (
                <Tag color="blue" className="flex items-center gap-1 cursor-wait">
                  <div className="w-3 h-3 bg-gray-300 rounded animate-pulse"></div>
                  Đang cập nhật...
                </Tag>
              ) : (
                <Tag color={val ? "green" : "red"} className="cursor-pointer">
                  {val ? "Hoạt động" : "Vô hiệu hóa"}
                </Tag>
              )}
            </span>
          </Popconfirm>
        );
      },
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
            >
              <FaEye />
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
        </Space>
      ),
    },
  ];

  // Detail fields cho DetailModal
  const detailFields = [
    { name: "id", label: "ID" },
    { name: "email", label: "Email" },
    { name: "firstName", label: "Họ" },
    { name: "lastName", label: "Tên" },
    { name: "phone", label: "SĐT" },
    {
      name: "role",
      label: "Quyền",
      render: (role) => (
        <Tag color={role === "ADMIN" ? "purple" : "blue"}>
          {role === "ADMIN" ? "Quản trị viên" : "Khách hàng"}
        </Tag>
      ),
    },
    {
      name: "isVerified",
      label: "Xác thực email",
      render: (v) => (
        <Tag color={v ? "green" : "orange"}>
          {v ? "Đã xác thực" : "Chưa xác thực"}
        </Tag>
      ),
    },
    {
      name: "emailVerifiedAt",
      label: "Ngày xác thực email",
      render: (v) => {
        if (!v) return <span className="text-gray-400">Chưa xác thực</span>;
        const d = new Date(v);
        const date = d.toLocaleDateString("vi-VN");
        const time = d.toLocaleTimeString("vi-VN");
        return `${time} ${date}`;
      },
    },
    {
      name: "isActive",
      label: "Trạng thái",
      render: (v) => (
        <Tag color={v ? "green" : "red"}>
          {v ? "Hoạt động" : "Tạm dừng"}
        </Tag>
      ),
    },
    {
      name: "createdAt",
      label: "Ngày tạo",
      render: (v) => {
        const d = new Date(v);
        const date = d.toLocaleDateString("vi-VN");
        const time = d.toLocaleTimeString("vi-VN");
        return `${time} ${date}`;
      },
    },
    {
      name: "updatedAt",
      label: "Ngày cập nhật",
      render: (v) => {
        const d = new Date(v);
        const date = d.toLocaleDateString("vi-VN");
        const time = d.toLocaleTimeString("vi-VN");
        return `${time} ${date}`;
      },
    },
  ];

  return (
    <>
      <style>
        {`
          @keyframes gradientShift {
            0% {
              background-position: 0% 50%;
            }
            50% {
              background-position: 100% 50%;
            }
            100% {
              background-position: 0% 50%;
            }
          }
        `}
      </style>
      <Row gutter={[16, 16]}>
        <Col span={24}>
          <Badge.Ribbon
            text="Quản lý người dùng"
            color="#667eea"
            style={{
              background:
                "linear-gradient(45deg, #667eea, #764ba2, #f093fb, #667eea)",
              backgroundSize: "300% 300%",
              animation: "gradientShift 4s ease infinite",
              fontWeight: "bold",
              boxShadow: "0 6px 20px rgba(102, 126, 234, 0.4)",
              textShadow: "0 2px 4px rgba(0,0,0,0.3)",
              fontSize: "16px",
              padding: "8px 20px",
              height: "40px",
              lineHeight: "24px",
            }}
          >
            <Card className="shadow rounded-2xl">
              <div className="flex justify-between mb-4">
                <div className="flex gap-4">
                  <Button variant="default" onClick={openCreateModal}>
                    <FaPlus /> Thêm user
                  </Button>
                  <Input.Search
                    placeholder="Tìm theo email, tên, SĐT"
                    value={searchValue}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    allowClear
                    style={{ maxWidth: 300 }}
                  />
                </div>
              </div>
              {showSkeleton ? (
                <TableSkeleton rows={pagination.limit} columns={9} />
              ) : (
                <Table
                  rowKey="id"
                  columns={columns}
                  dataSource={users}
                  pagination={{
                    current: pagination.page,
                    pageSize: pagination.limit,
                    total: pagination.total,
                    onChange: handlePaginationChange,
                  }}
                />
              )}
            </Card>
          </Badge.Ribbon>
        </Col>

        {/* Modal thêm/sửa */}
        <CrudModal
          open={modalOpen}
          onCancel={closeModal}
          onSubmit={handleSubmit}
          editingRecord={editingRecord}
          fields={formFields}
          title={editingRecord ? "Sửa user" : "Thêm user"}
          confirmLoading={modalLoading}
          okText={editingRecord ? "Cập nhật" : "Thêm mới"}
        />

        {/* Modal chi tiết */}
        <DetailModal
          open={detailOpen}
          onCancel={closeDetailModal}
          title="Chi tiết người dùng"
          data={detailData}
          fields={detailFields}
        />
      </Row>
    </>
  );
}

