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
  InputNumber,
  Select,
  Switch,
  Form,
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

  // ✅ Fields cho CrudModal - Theo schema ProductVariant mới
  const formFields = [
    {
      name: "productId",
      label: "Sản phẩm",
      component: (
        <Select 
          placeholder="Chọn sản phẩm"
          showSearch
          optionFilterProp="children"
          filterOption={(input, option) =>
            option.children.toLowerCase().indexOf(input.toLowerCase()) >= 0
          }
        >
          {(products || []).map((p) => (
            <Select.Option key={p.id} value={p.id}>
              {p.name}
            </Select.Option>
          ))}
        </Select>
      ),
      rules: [{ required: true, message: "Vui lòng chọn sản phẩm" }],
    },
    
    // ===== KÍCH THƯỚC (mm) =====
    {
      name: "width",
      label: "Chiều rộng (mm)",
      component: <InputNumber placeholder="VD: 640" min={0} style={{ width: "100%" }} />,
      help: "Width - Chiều rộng sản phẩm"
    },
    {
      name: "depth",
      label: "Chiều sâu (mm)",
      component: <InputNumber placeholder="VD: 710" min={0} style={{ width: "100%" }} />,
      help: "Depth - Chiều sâu/độ dày sản phẩm"
    },
    {
      name: "height",
      label: "Chiều cao (mm)",
      component: <InputNumber placeholder="VD: 1040" min={0} style={{ width: "100%" }} />,
      help: "Height - Chiều cao tối thiểu"
    },
    {
      name: "heightMax",
      label: "Chiều cao tối đa (mm)",
      component: <InputNumber placeholder="VD: 1115" min={0} style={{ width: "100%" }} />,
      help: "Cho ghế/bàn nâng hạ điều chỉnh được chiều cao"
    },
    {
      name: "dimensionNote",
      label: "Ghi chú kích thước",
      component: <Input.TextArea rows={2} placeholder="VD: Có thể điều chỉnh chiều cao từ 1040-1115mm" />,
    },
    
    // ===== THÔNG SỐ KỸ THUẬT =====
    {
      name: "material",
      label: "Chất liệu",
      component: <Input placeholder="VD: Da PU, Lưới, Thép mạ..." />,
      help: "Chất liệu chính của sản phẩm"
    },
    {
      name: "color",
      label: "Màu sắc",
      component: <Input placeholder="VD: Đen, Trắng, Xám..." />,
    },
    {
      name: "warranty",
      label: "Bảo hành",
      component: <Input placeholder="VD: 24 tháng, 12 tháng..." />,
    },
    {
      name: "weightCapacity",
      label: "Trọng tải (kg)",
      component: <InputNumber placeholder="VD: 150" min={0} style={{ width: "100%" }} />,
      help: "Trọng lượng tối đa sản phẩm chịu được"
    },
    
    // ===== TỒN KHO =====
    {
      name: "stockQuantity",
      label: "Số lượng tồn kho",
      component: <InputNumber placeholder="Nhập số lượng" min={0} style={{ width: "100%" }} />,
      rules: [{ required: true, message: "Vui lòng nhập số lượng tồn kho" }],
    },
    {
      name: "minStockLevel",
      label: "Mức tồn kho tối thiểu",
      component: <InputNumber placeholder="VD: 5" min={0} style={{ width: "100%" }} />,
      help: "Cảnh báo khi tồn kho dưới mức này"
    },
    
    // ===== TRẠNG THÁI =====
    {
      name: "isActive",
      label: "Trạng thái hoạt động",
      component: (
        <Switch checkedChildren="Hoạt động" unCheckedChildren="Tạm dừng" />
      ),
      valuePropName: "checked",
    },
  ];

  // ✅ Fields cho DetailModal - Hiển thị đầy đủ thông tin variant
  const detailFields = [
    { name: "id", label: "ID" },
    { 
      name: "product", 
      label: "Sản phẩm", 
      render: (v) => v?.name || "N/A" 
    },
    
    // Kích thước
    { 
      name: "dimensions", 
      label: "Kích thước (WxDxH)", 
      render: (_, record) => {
        const parts = [];
        if (record.width) parts.push(`W${record.width}mm`);
        if (record.depth) parts.push(`D${record.depth}mm`);
        if (record.height) {
          if (record.heightMax) {
            parts.push(`H${record.height}-${record.heightMax}mm`);
          } else {
            parts.push(`H${record.height}mm`);
          }
        }
        return parts.length > 0 ? parts.join(" × ") : "-";
      }
    },
    { name: "dimensionNote", label: "Ghi chú kích thước", render: (v) => v || "-" },
    
    // Thông số kỹ thuật
    { name: "material", label: "Chất liệu", render: (v) => v || "-" },
    { name: "color", label: "Màu sắc", render: (v) => v || "-" },
    { name: "warranty", label: "Bảo hành", render: (v) => v || "-" },
    { 
      name: "weightCapacity", 
      label: "Trọng tải", 
      render: (v) => v ? `${v} kg` : "-" 
    },
    
    // Tồn kho
    { 
      name: "stockQuantity", 
      label: "Số lượng tồn",
      render: (qty) => {
        const quantity = qty || 0;
        let color = "green";
        if (quantity === 0) color = "red";
        else if (quantity < 10) color = "orange";
        else if (quantity < 50) color = "blue";
        return <Tag color={color}>{quantity.toLocaleString("vi-VN")}</Tag>;
      }
    },
    { 
      name: "minStockLevel", 
      label: "Mức tồn tối thiểu", 
      render: (v) => v || 0 
    },
    
    // Trạng thái
    {
      name: "isActive",
      label: "Trạng thái",
      render: (v) => (
        <Tag color={v ? "green" : "red"}>{v ? "Hoạt động" : "Tạm dừng"}</Tag>
      ),
    },
    
    // Thời gian
    {
      name: "createdAt",
      label: "Ngày tạo",
      render: (v) => {
        const d = new Date(v);
        return `${d.toLocaleTimeString("vi-VN")} ${d.toLocaleDateString("vi-VN")}`;
      },
    },
    {
      name: "updatedAt",
      label: "Ngày cập nhật",
      render: (v) => {
        const d = new Date(v);
        return `${d.toLocaleTimeString("vi-VN")} ${d.toLocaleDateString("vi-VN")}`;
      },
    },
  ];

  // ✅ Columns table - Hiển thị thông tin quan trọng
  const columns = [
    { 
      title: "ID", 
      dataIndex: "id", 
      width: 60,
      fixed: "left"
    },
    { 
      title: "Sản phẩm", 
      dataIndex: ["product", "name"],
      width: 250,
      render: (_, record) => <strong>{record.product?.name || "N/A"}</strong>
    },
    { 
      title: "Kích thước", 
      width: 150,
      render: (_, record) => {
        const parts = [];
        if (record.width) parts.push(`${record.width}mm`);
        if (record.depth) parts.push(`${record.depth}mm`);
        if (record.height) {
          if (record.heightMax) {
            parts.push(`${record.height}-${record.heightMax}mm`);
          } else {
            parts.push(`${record.height}mm`);
          }
        }
        return parts.length > 0 ? (
          <small>{parts.join(" × ")}</small>
        ) : "-";
      }
    },
    { 
      title: "Màu", 
      dataIndex: "color",
      width: 100,
      render: (val) => val || "-"
    },
    {
      title: "Tồn kho",
      dataIndex: "stockQuantity",
      width: 100,
      render: (qty) => {
        const quantity = qty || 0;
        let color = "green";
        if (quantity === 0) color = "red";
        else if (quantity < 10) color = "orange";
        else if (quantity < 50) color = "blue";
        return <Tag color={color}>{quantity.toLocaleString("vi-VN")}</Tag>;
      },
    },
    {
      title: "Trạng thái",
      dataIndex: "isActive",
      width: 100,
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
        maskClosable={false} //khi click ra ngoai modal se khong dong modal
      />
    </>
  );
}

