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
} from "antd";
import { FaPlus, FaEdit, FaTrash, FaEye } from "react-icons/fa";
import { Button } from "@/components/ui/button"; // shadcn/ui
import { TableSkeleton } from "@/components/ui/skeleton";
import CrudModal from "@/pages/hepler/CrudModal";
import DetailModal from "@/pages/hepler/DetailModal";
import { useAdminBrands } from "./useAdminBrands";

const { Search } = Input;

export default function AdminBrands() {
  // Lấy tất cả state và handlers từ custom hook
  const {
    brands,
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
  } = useAdminBrands();

  // Cấu hình columns cho table
  const columns = [
    { title: "ID", dataIndex: "id", key: "id", width: 80 },
    {
      title: "Tên thương hiệu",
      dataIndex: "name",
      key: "name",
      render: (t) => <strong>{t}</strong>,
    },
    {
      title: "Quốc gia",
      dataIndex: "country",
      key: "country",
      render: (country) => (country ? <Tag color="blue">{country}</Tag> : "-"),
    },
    {
      title: "Trạng thái",
      dataIndex: "isActive",
      key: "isActive",
      width: 100,
      render: (v) => (
        <Tag color={v ? "green" : "red"}>{v ? "Hoạt động" : "Tạm dừng"}</Tag>
      ),
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
          <Tooltip title="Xóa">
            <span>
              <Popconfirm
                title="Bạn có chắc muốn xóa thương hiệu này?"
                onConfirm={() => handleDelete(record.id)}
              >
                <Button variant="destructive" size="sm">
                  <FaTrash />
                </Button>
              </Popconfirm>
            </span>
          </Tooltip>
        </Space>
      ),
    },
  ];

  // Cấu hình fields cho form CRUD
  const fields = [
    {
      name: "name",
      label: "Tên thương hiệu",
      component: <Input placeholder="Nhập tên thương hiệu" />,
      rules: [{ required: true, message: "Vui lòng nhập tên thương hiệu" }],
    },
    {
      name: "country",
      label: "Quốc gia",
      component: <Input placeholder="Nhập quốc gia" />,
    },
    {
      name: "isActive",
      label: "Trạng thái",
      component: <input type="checkbox" />,
      valuePropName: "checked",
    },
  ];

  // Cấu hình fields cho modal chi tiết
  const detailFields = [
    { name: "id", label: "ID" },
    { name: "name", label: "Tên thương hiệu" },
    { name: "country", label: "Quốc gia" },
    {
      name: "isActive",
      label: "Trạng thái",
      render: (v) => (
        <Tag color={v ? "green" : "red"}>{v ? "Hoạt động" : "Tạm dừng"}</Tag>
      ),
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
            text="Quản lý Thương hiệu"
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
              <div className="flex justify-between mb-4">
                <div className="flex gap-4">
                  <Button variant="default" onClick={handleCreate}>
                    <FaPlus /> Thêm thương hiệu
                  </Button>

                  <Search
                    placeholder="Tìm kiếm thương hiệu..."
                    allowClear
                    size="large"
                    value={searchValue}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    style={{ width: 300 }}
                  />
                </div>
                <div>Tổng: {pagination.total} thương hiệu</div>
              </div>

              {showSkeleton ? (
                <TableSkeleton />
              ) : (
                <Table
                  columns={columns}
                  dataSource={brands}
                  rowKey="id"
                  pagination={{
                    current: pagination.page,
                    pageSize: pagination.limit,
                    total: pagination.total,
                    showSizeChanger: true,
                    showQuickJumper: true,
                    showTotal: (total, range) =>
                      `${range[0]}-${range[1]} của ${total} thương hiệu`,
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
        title={editingRecord ? "Sửa thương hiệu" : "Thêm thương hiệu"}
        confirmLoading={modalLoading}
        okText={editingRecord ? "Cập nhật" : "Tạo mới"}
      />

      {/* Modal Detail */}
      <DetailModal
        open={detailOpen}
        onCancel={closeDetailModal}
        title="Chi tiết thương hiệu"
        data={detailData}
        fields={detailFields}
        width={600}
        maskClosable={false} //khi click ra ngoai modal se khong dong modal
      />
    </>
  );
}

