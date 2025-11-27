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
  Select,
  InputNumber,
  Form,
  Button as AntButton,
  Switch,
  Upload,
} from "antd";
import { FaPlus, FaEdit, FaTrash, FaEye, FaImages } from "react-icons/fa";
import { UploadOutlined } from '@ant-design/icons';
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TableSkeleton } from "@/components/ui/skeleton";
import CrudModal from "@/pages/hepler/CrudModal";
import DetailModal from "@/pages/hepler/DetailModal";
import ProductImageModal from "../ProductImageModal";
import { useAdminProducts } from "./useAdminProducts";
import { formatPrice } from "@/lib/utils";

const { Search } = Input;
const { Option } = Select;

export default function AdminProducts() {
  // Lấy tất cả state và handlers từ custom hook
  const {
    products,
    categories,
    brands,
    showSkeleton,
    modalLoading,
    pagination,
    searchValue,
    modalOpen,
    detailOpen,
    editingRecord,
    detailData,
    loadingProductId,
    imageModalOpen,
    selectedProduct,
    handleSubmit,
    handleDelete,
    handleCreate,
    openEditModal,
    closeModal,
    handleViewDetail,
    closeDetailModal,
    handleManageImages,
    closeImageModal,
    handlePaginationChange,
    handleSearchChange,
    fetchProducts,
    isChairCategory,
    isTableOrCabinetCategory,
  } = useAdminProducts();

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
              color: "#999",
            }}
          >
            No Image
          </div>
        ),
    },
    { title: "Tên sản phẩm", dataIndex: "name", key: "name", render: (t) => <strong>{t}</strong> },
    { title: "Danh mục", dataIndex: "category", render: (c) => c ? <Tag color="blue">{c.name}</Tag> : "-" },
    { title: "Thương hiệu", dataIndex: "brand", render: (b) => b ? <Tag color="green">{b.name}</Tag> : "-" },
    { 
      title: "Giá", 
      dataIndex: "price", 
      render: (p, record) => (
        <div>
          <div style={{ fontWeight: 'bold' }}>{formatPrice(p)}</div>
          {record.salePrice && (
            <div style={{ color: '#ff4d4f', fontSize: '12px' }}>
              Sale: {formatPrice(record.salePrice)}
            </div>
          )}
        </div>
      )
    },
    {
      title: "Nổi bật",
      dataIndex: "isFeatured",
      key: "isFeatured",
      width: 100,
      render: (isFeatured) => (
        <Tag color={isFeatured ? 'red' : 'purple'}>
          {isFeatured ? '⭐ Nổi bật' : 'Bình thường'}
        </Tag>
      ),
    },
    {
      title: "Trạng thái",
      dataIndex: "status",
      key: "status",
      width: 100,
      render: (status) => {
        const statusConfig = {
          'ACTIVE': { color: 'green', text: 'Hoạt động' },
          'INACTIVE': { color: 'red', text: 'Tạm dừng' },
          'OUT_OF_STOCK': { color: 'orange', text: 'Hết hàng' }
        };
        const config = statusConfig[status] || { color: 'default', text: 'Không xác định' };
        return <Tag color={config.color}>{config.text}</Tag>;
      },
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
              disabled={loadingProductId === record.id}
            >
              {loadingProductId === record.id ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <FaEye />
              )}
            </Button>
          </Tooltip>
          <Tooltip title="Quản lý ảnh">
            <Button
              className="bg-green-500 hover:bg-green-600 text-white"
              size="sm"
              onClick={() => handleManageImages(record)}
            >
              <FaImages />
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
                title="Bạn có chắc muốn xóa sản phẩm này?"
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

  // ✅ Modal fields CHỈ CHO PRODUCT (Thông tin chung + Giá)
  // Dimension & Stock đã chuyển sang ProductVariant
  const fields = [
    {
      name: "name",
      label: "Tên sản phẩm",
      component: <Input placeholder="Nhập tên sản phẩm" />,
      rules: [{ required: true, message: "Vui lòng nhập tên sản phẩm" }],
    },
    {
      name: "slug",
      label: "Slug (URL)",
      component: <Input placeholder="Auto generate nếu để trống" />,
    },
    {
      name: "description",
      label: "Mô tả",
      component: <Input.TextArea rows={4} placeholder="Nhập mô tả sản phẩm" />,
    },
    {
      name: "image",
      label: "Hình ảnh sản phẩm",
      valuePropName: "file",
      getValueFromEvent: (e) => {
        if (Array.isArray(e)) {
          return e;
        }
        return e?.fileList?.[0]?.originFileObj;
      },
      component: (
        <Upload
          listType="picture"
          maxCount={1}
          beforeUpload={() => false}
          accept="image/*"
        >
          <AntButton icon={<UploadOutlined />}>Chọn hình ảnh</AntButton>
        </Upload>
      ),
    },
    {
      name: "price",
      label: "Giá bán (VNĐ)",
      component: <InputNumber placeholder="Nhập giá bán" style={{ width: "100%" }} min={0} />,
      rules: [{ required: true, message: "Vui lòng nhập giá" }],
    },
    {
      name: "salePrice",
      label: "Giá khuyến mãi (VNĐ)",
      component: <InputNumber placeholder="Nhập giá khuyến mãi" style={{ width: "100%" }} min={0} />,
    },
    {
      name: "costPrice",
      label: "Giá nhập (VNĐ)",
      component: <InputNumber placeholder="Nhập giá nhập" style={{ width: "100%" }} min={0} />,
    },
    {
      name: "categoryId",
      label: "Danh mục",
      component: (
        <Select placeholder="Chọn danh mục">
          {categories.map((c) => (
            <Option key={c.id} value={c.id}>
              {c.name}
            </Option>
          ))}
        </Select>
      ),
      rules: [{ required: true, message: "Vui lòng chọn danh mục" }],
    },
    {
      name: "brandId",
      label: "Thương hiệu",
      component: (
        <Select placeholder="Chọn thương hiệu">
          {brands.map((b) => (
            <Option key={b.id} value={b.id}>
              {b.name}
            </Option>
          ))}
        </Select>
      ),
      rules: [{ required: true, message: "Vui lòng chọn thương hiệu" }],
    },
    {
      name: "metaTitle",
      label: "Tiêu đề SEO",
      component: <Input placeholder="Nhập tiêu đề SEO" maxLength={200} />,
    },
    {
      name: "metaDescription",
      label: "Mô tả SEO",
      component: <Input.TextArea rows={2} placeholder="Nhập mô tả SEO" maxLength={500} />,
    },
    {
      name: "isActive",
      label: "Trạng thái hoạt động",
      component: <Switch checkedChildren="Hoạt động" unCheckedChildren="Tạm dừng" />,
      valuePropName: "checked",
    },
    {
      name: "isFeatured",
      label: "Sản phẩm nổi bật",
      component: <Switch checkedChildren="⭐ Nổi bật" unCheckedChildren="Bình thường" />,
      valuePropName: "checked",
    },
  ];
  
  // ℹ️ GHI CHÚ: 
  // - Tồn kho (stock), Kích thước (dimensions), Bảo hành (warranty) đã chuyển sang ProductVariant
  // - Quản lý Variant: Vào menu "Quản lý biến thể" hoặc /admin/product-variants

  // ✅ Detail fields - CHỈ HIỂN THỊ THÔNG TIN PRODUCT
  const detailFields = [
    { name: "id", label: "ID" },
    { name: "name", label: "Tên sản phẩm" },
    { name: "slug", label: "Slug (URL)", render: (v) => v || "-" },
    { name: "description", label: "Mô tả", render: (v) => v || "-" },
    { name: "price", label: "Giá bán", render: (v) => v ? formatPrice(v) : "-" },
    { name: "salePrice", label: "Giá khuyến mãi", render: (v) => v ? formatPrice(v) : "-" },
    { name: "costPrice", label: "Giá nhập", render: (v) => v ? formatPrice(v) : "-" },
    { name: "metaTitle", label: "Tiêu đề SEO", render: (v) => v || "-" },
    { name: "metaDescription", label: "Mô tả SEO", render: (v) => v || "-" },
    { name: "category", label: "Danh mục", render: (v) => v?.name || "-" },
    { name: "brand", label: "Thương hiệu", render: (v) => v?.name || "-" },
    {
      name: "imageUrl",
      label: "Hình ảnh",
      render: (v) => (v ? <Image width={100} src={v} /> : "Không có"),
    },
    {
      name: "isFeatured",
      label: "Sản phẩm nổi bật",
      render: (isFeatured) => (
        <Tag color={isFeatured ? 'red' : 'purple'}>
          {isFeatured ? '⭐ Nổi bật' : 'Bình thường'}
        </Tag>
      ),
    },
    {
      name: "status",
      label: "Trạng thái",
      render: (status) => {
        const statusConfig = {
          'ACTIVE': { color: 'green', text: 'Hoạt động' },
          'INACTIVE': { color: 'red', text: 'Tạm dừng' },
          'OUT_OF_STOCK': { color: 'orange', text: 'Hết hàng' }
        };
        const config = statusConfig[status] || { color: 'default', text: 'Không xác định' };
        return <Tag color={config.color}>{config.text}</Tag>;
      },
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
            text="Quản lý Sản phẩm"
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
                    <FaPlus /> Thêm sản phẩm
                  </Button>
                  <Search
                    placeholder="Tìm kiếm sản phẩm (FullText search)..."
                    allowClear
                    size="large"
                    value={searchValue}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    onSearch={(value) => {
                      handleSearchChange(value);
                    }}
                    style={{ width: 300 }}
                    enterButton
                  />
                </div>
                <div>Tổng: {pagination.total} sản phẩm</div>
              </div>

              {showSkeleton ? (
                <TableSkeleton />
              ) : (
                <Table
                  columns={columns}
                  dataSource={products}
                  rowKey="id"
                  pagination={{
                    current: pagination.page,
                    pageSize: pagination.limit,
                    total: pagination.total,
                    showSizeChanger: true,
                    showQuickJumper: true,
                    showTotal: (total, range) =>
                      `${range[0]}-${range[1]} của ${total} sản phẩm`,
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
        title={editingRecord ? "Sửa sản phẩm" : "Thêm sản phẩm"}
        confirmLoading={modalLoading}
        okText={editingRecord ? "Cập nhật" : "Tạo mới"}
      />

      {/* Modal Detail */}
      <DetailModal
        open={detailOpen}
        onCancel={closeDetailModal}
        title="Chi tiết sản phẩm"
        data={detailData}
        fields={detailFields}
        width={600}
      />

      {/* Modal Quản lý ảnh */}
      <ProductImageModal
        open={imageModalOpen}
        onCancel={closeImageModal}
        productId={selectedProduct?.id}
        productName={selectedProduct?.name}
        onImageUpdated={() => {
          // Refresh danh sách sản phẩm khi có thay đổi ảnh
          fetchProducts();
        }}
      />
    </>
  );
}

