import {
  Table,
  Input,
  Space,
  Popconfirm,
  Row,
  Col,
  Card,
  Tag,
  Image,
  Tooltip,
  Badge,
  Upload,
  Checkbox,
  Button as AntButton
} from "antd";
import { UploadOutlined } from "@ant-design/icons";
import { FaPlus, FaEdit, FaTrash, FaEye } from "react-icons/fa";
import { Button } from "@/components/ui/button";
import { TableSkeleton } from "@/components/ui/skeleton";
import CrudModal from "@/pages/hepler/CrudModal";
import DetailModal from "@/pages/hepler/DetailModal";
import useAdminCategories from "./useAdminCategories";

const { Search } = Input;

export default function AdminCategories() {
  // Lấy tất cả state và handlers từ custom hook
  const {
    categories,
    showSkeleton,
    modalLoading,
    pagination,
    searchValue,
    modalOpen,
    detailOpen,
    editingRecord,
    detailData,
    handleSubmit,
    handleDelete,
    handleCreate,
    openEditModal,
    closeModal,
    handleViewDetail,
    closeDetailModal,
    handlePaginationChange,
    handleSearchChange,
  } = useAdminCategories();

  // Cấu hình columns cho table
  const columns = [
    { title: "ID", dataIndex: "id", key: "id", width: 80 },
    {
      title: "Hình ảnh",
      dataIndex: "imageUrl",
      key: "imageUrl",
      width: 100,
      render: (imageUrl) =>
        imageUrl ? (
          <Image width={60} height={60} src={imageUrl} style={{ objectFit: "cover", borderRadius: 8 }} />
        ) : (
          <div
            style={{
              width: 60,
              height: 60,
              background: "#f0f0f0",
              borderRadius: 8,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            No Image
          </div>
        ),
    },
    { title: "Tên danh mục", dataIndex: "name", key: "name", render: (t) => <strong>{t}</strong> },
    { title: "Slug", dataIndex: "slug", key: "slug", render: (t) => <code>{t}</code> },
    {
      title: "Trạng thái",
      dataIndex: "isActive",
      key: "isActive",
      width: 100,
      render: (v) => <Tag color={v ? "green" : "red"}>{v ? "Hoạt động" : "Tạm dừng"}</Tag>,
    },
    {
      title: "Ngày tạo",
      dataIndex: "createdAt",
      key: "createdAt",
      render: (d) => new Date(d).toLocaleDateString("vi-VN"),
    },
    {
      title: "Thao tác",
      render: (_, record) => (
        <Space>
          <Tooltip title="Xem chi tiết">
            <Button variant="secondary" size="sm" onClick={() => handleViewDetail(record.id)}>
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
          <Tooltip title="Xóa">
            <Popconfirm
              title="Bạn có chắc muốn xóa danh mục này?"
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

  // Cấu hình fields cho form CRUD (Upload ảnh)
  const fields = [
    {
      name: "name",
      label: "Tên danh mục",
      component: <Input placeholder="Nhập tên danh mục" />,
      rules: [{ required: true, message: "Vui lòng nhập tên" }],
    },
    {
      name: "image",
      label: "Hình ảnh",
      valuePropName: "fileList",
      getValueFromEvent: (e) => (Array.isArray(e) ? e : e?.fileList),
      component: (
        <Upload name="image" listType="picture" maxCount={1} beforeUpload={() => false}>
          <AntButton icon={<UploadOutlined />}>Chọn ảnh</AntButton>
        </Upload>
      ),
    },
    {
      name: "isActive",
      label: "Trạng thái",
      component: <Checkbox>Hoạt động</Checkbox>,
      valuePropName: "checked",
    },
  ];

  // Cấu hình fields cho modal chi tiết
  const detailFields = [
    { name: "id", label: "ID" },
    { name: "name", label: "Tên danh mục" },
    { name: "slug", label: "Slug" },
    {
      name: "imageUrl",
      label: "Hình ảnh",
      render: (v) => (v ? <Image width={100} src={v} /> : "Không có"),
    },
    {
      name: "isActive",
      label: "Trạng thái",
      render: (v) => <Tag color={v ? "green" : "red"}>{v ? "Hoạt động" : "Tạm dừng"}</Tag>,
    },
    {
      name: "createdAt",
      label: "Ngày tạo",
      render: (v) => new Date(v).toLocaleDateString("vi-VN"),
    },
  ];

  return (
    <>
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
            text="Quản lý Danh mục"
            color="#667eea"
            style={{
              background: "linear-gradient(45deg, #667eea, #764ba2, #f093fb, #667eea)",
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
              <div className="flex justify-between mb-4">
                <div className="flex gap-4">
                  <Button variant="default" onClick={handleCreate}>
                    <FaPlus /> Thêm danh mục
                  </Button>

                  <Search
                    placeholder="Tìm kiếm danh mục..."
                    allowClear
                    size="large"
                    value={searchValue}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    style={{ width: 300 }}
                  />
                </div>
                <div>Tổng: {pagination.total} danh mục</div>
              </div>

              {showSkeleton ? (
                <TableSkeleton />
              ) : (
                <Table
                  columns={columns}
                  dataSource={categories}
                  rowKey="id"
                  pagination={{
                    current: pagination.page,
                    pageSize: pagination.limit,
                    total: pagination.total,
                    showSizeChanger: true,
                    showQuickJumper: true,
                    showTotal: (total, range) =>
                      `${range[0]}-${range[1]} của ${total} danh mục`,
                    onChange: handlePaginationChange,
                  }}
                  scroll={{ x: 1000 }}
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
        editingRecord={editingRecord}
        fields={fields}
        title={editingRecord ? "Sửa danh mục" : "Thêm danh mục"}
        confirmLoading={modalLoading}
        okText={editingRecord ? "Cập nhật" : "Tạo mới"}
      />

      {/* Modal Detail */}
      <DetailModal
        open={detailOpen}
        onCancel={closeDetailModal}
        title="Chi tiết danh mục"
        data={detailData}
        fields={detailFields}
        width={600}
      />
    </>
  );
}

