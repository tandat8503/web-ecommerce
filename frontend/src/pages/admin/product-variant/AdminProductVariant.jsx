import {
  Table,
  Popconfirm,
  Tag,
  Tooltip,
  Space,
  Row,
  Col,
  Card,
  Badge,
  Input,
  Select,
  Switch,
} from "antd";
import { FaPlus, FaEdit, FaTrash, FaEye } from "react-icons/fa";
import { Button } from "@/components/ui/button"; // shadcn/ui
import CrudModal from "@/pages/hepler/CrudModal";
import DetailModal from "@/pages/hepler/DetailModal";
import { TableSkeleton } from "@/components/ui/skeleton";
import { formatPrice } from "@/lib/utils";
import { useAdminProductVariant } from "./useAdminProductVariant";

export default function AdminProductVariant() {
  // Lấy tất cả state và handlers từ custom hook
  const {
    variants,
    products,
    loading,
    modalOpen,
    detailOpen,
    editingRecord,
    detailData,
    confirmLoading,
    pagination,
    handleSubmit,
    handleDelete,
    handleView,
    openCreateModal,
    openEditModal,
    closeModal,
    closeDetailModal,
    handleSearch,
    handlePaginationChange,
  } = useAdminProductVariant();

  // ✅ Fields cho CrudModal
  const formFields = [
    {
      name: "productId",
      label: "Sản phẩm",
      component: (
        <Select placeholder="Chọn sản phẩm">
          {(products || []).map((p) => (
            <Select.Option key={p.id} value={p.id}>
              {p.name}
            </Select.Option>
          ))}
        </Select>
      ),
      rules: [{ required: true, message: "Vui lòng chọn sản phẩm" }],
    },
    {
      name: "name",
      label: "Tên biến thể",
      component: <Input placeholder="Nhập tên biến thể" />,
      rules: [{ required: true, message: "Vui lòng nhập tên" }],
    },
    {
      name: "price",
      label: "Giá",
      component: <Input type="number" placeholder="Nhập giá" />,
    },
    {
      name: "stockQuantity",
      label: "Số lượng tồn",
      component: <Input type="number" placeholder="Nhập số lượng" />,
    },
    {
      name: "color",
      label: "Màu sắc",
      component: <Input placeholder="VD: Đỏ, Đen..." />,
    },
    {
      name: "size",
      label: "Size",
      component: <Input placeholder="VD: S, M, L" />,
    },
    {
      name: "isActive",
      label: "Trạng thái",
      component: (
        <Switch checkedChildren="Hoạt động" unCheckedChildren="Tạm dừng" />
      ),
      valuePropName: "checked",
    },
  ];

  // ✅ Fields cho DetailModal
  const detailFields = [
    { name: "id", label: "ID" },
    { name: "productId", label: "Sản phẩm" },
    { name: "name", label: "Tên" },
    { name: "price", label: "Giá" },
    { name: "color", label: "Màu" },
    { name: "size", label: "Size" },
    { name: "stockQuantity", label: "Số lượng tồn" },
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

  // ✅ Columns table
  const columns = [
    { title: "ID", dataIndex: "id", width: 80 },
    { title: "Tên", dataIndex: "name" },
    { title: "Giá", dataIndex: "price", render: (val) => formatPrice(val) },
    { title: "Màu", dataIndex: "color" },
    { title: "Size", dataIndex: "size" },
    {
      title: "Số lượng tồn",
      dataIndex: "stockQuantity",
      render: (qty) => {
        const quantity = qty || 0;
        // Xác định màu theo số lượng
        let color = "green"; // Còn nhiều (>= 50)
        if (quantity === 0) color = "red"; // Hết hàng
        else if (quantity < 10) color = "orange"; // Sắp hết
        else if (quantity < 50) color = "blue"; // Còn ít

        return <Tag color={color}>{quantity.toLocaleString("vi-VN")}</Tag>;
      },
    },
    {
      title: "Trạng thái",
      dataIndex: "isActive",
      render: (val) => (
        <Tag color={val ? "green" : "red"}>
          {val ? "Hoạt động" : "Tạm dừng"}
        </Tag>
      ),
    },
    {
      title: "Hành động",
      render: (_, record) => (
        <Space>
          <Tooltip title="Xem chi tiết">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => handleView(record.id)}
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
            <Popconfirm
              title="Bạn có chắc muốn xóa biến thể này?"
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
            text="Quản lý Biến thể sản phẩm"
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
                    <FaPlus /> Thêm Biến thể
                  </Button>
                  <Input.Search
                    placeholder="Tìm kiếm theo tên, màu, size..."
                    allowClear
                    onSearch={handleSearch}
                    style={{ width: 300 }}
                  />
                </div>
              </div>

              {loading ? (
                <TableSkeleton columnsCount={6} rowsCount={6} />
              ) : (
                <Table
                  rowKey="id"
                  columns={columns}
                  dataSource={variants}
                  pagination={{
                    current: pagination.page,
                    pageSize: pagination.limit,
                    total: pagination.total,
                    showSizeChanger: true,
                    onChange: handlePaginationChange,
                  }}
                  style={{ marginTop: 16 }}
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
        title={editingRecord ? "Cập nhật Biến thể" : "Thêm Biến thể"}
        confirmLoading={confirmLoading}
        fields={formFields}
        okText={editingRecord ? "Cập nhật" : "Thêm"}
      />

      {/* Modal Detail */}
      <DetailModal
        open={detailOpen}
        onCancel={closeDetailModal}
        title="Chi tiết Biến thể"
        data={detailData}
        fields={detailFields}
      />
    </>
  );
}

