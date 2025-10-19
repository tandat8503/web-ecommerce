import { useEffect, useState } from "react";
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
  Upload,
  Button as AntButton,
  Switch,
} from "antd";
import { FaPlus, FaEdit, FaTrash, FaEye, FaImages } from "react-icons/fa";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TableSkeleton } from "@/components/ui/skeleton";
import CrudModal from "@/pages/hepler/CrudModal";
import DetailModal from "@/pages/hepler/DetailModal";
import ProductImageModal from "./ProductImageModal";
import { toast } from "react-toastify";
import {
  getProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  getProductById,
} from "@/api/adminProducts";
import { getCategories } from "@/api/adminCategories";
import { getBrands } from "@/api/adminBrands";
import { UploadOutlined } from "@ant-design/icons";

const { Search } = Input;
const { Option } = Select;

export default function AdminProducts() {
  const [showSkeleton, setShowSkeleton] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 5, total: 0 });
  const [keyword, setKeyword] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [detailData, setDetailData] = useState(null);
  const [loadingProductId, setLoadingProductId] = useState(null);
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);

  // Hàm delay
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  // debounce search
  const [searchValue, setSearchValue] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => {
      setPagination((prev) => ({ ...prev, page: 1 }));
      setKeyword(searchValue);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchValue]);

  // Load danh sách products
  const fetchProducts = async () => {
    setShowSkeleton(true);
    try {
      const response = await getProducts({
        page: pagination.page,
        limit: pagination.limit,
        q: keyword, // Thay đổi từ 'search' thành 'q' để nhất quán
      });
      setProducts(response.data.items || []);
      setPagination((prev) => ({
        ...prev,
        total: response.data.total || 0,
      }));
      // ép skeleton hiển thị ít nhất 800ms
      await sleep(800);
    } catch (error) {
      toast.error("Lỗi khi tải danh sách sản phẩm");
      console.error("Error fetching products:", error);
    } finally {
      setShowSkeleton(false);
    }
  };

  // fetch categories & brands
  const fetchSelectOptions = async () => {
    try {
      const [categoriesRes, brandsRes] = await Promise.all([
        getCategories({ limit: 1000 }),
        getBrands({ limit: 1000 }),
      ]);
      setCategories(categoriesRes.data.items || []);
      setBrands(brandsRes.data.items || []);
    } catch (error) {
      console.error("Error fetching select options:", error);
    }
  };

  useEffect(() => {
    fetchProducts();
    fetchSelectOptions();
  }, [pagination.page, pagination.limit, keyword]);


  // Handle create/edit
  const handleSubmit = async (values, editingRecord) => {
    setModalLoading(true);
    try {
      // Tạo FormData để gửi file
      const formData = new FormData();
      
      // Xử lý từng field riêng biệt
      if (values.name) formData.append('name', values.name);
      if (values.sku) formData.append('sku', values.sku);
      if (values.description) formData.append('description', values.description);
      if (values.price) formData.append('price', values.price);
      if (values.stock !== undefined) formData.append('stock', values.stock);
      if (values.categoryId) formData.append('categoryId', values.categoryId);
      if (values.brandId) formData.append('brandId', values.brandId);
      
      // Xử lý trạng thái - gửi status field thay vì isActive
      if (values.isActive !== undefined) {
        formData.append('status', values.isActive ? 'ACTIVE' : 'INACTIVE');
      }
      
      // Xử lý sản phẩm nổi bật
      if (values.isFeatured !== undefined) {
        formData.append('isFeatured', values.isFeatured ? 'true' : 'false');
      }
      
      // Thêm file nếu có
      if (values.image && values.image[0]?.originFileObj) {
        formData.append('image', values.image[0].originFileObj);
      }

      if (editingRecord) {
        await updateProduct(editingRecord.id, formData);
        toast.success("Cập nhật sản phẩm thành công");
      } else {
        await createProduct(formData);
        toast.success("Tạo sản phẩm thành công");
      }
      setModalOpen(false);
      setEditingRecord(null);
      fetchProducts();
    } catch (error) {
      console.error('Error updating product:', error);
      toast.error(error.response?.data?.message || "Có lỗi xảy ra");
    } finally {
      setModalLoading(false);
    }
  };

  // Handle delete
  const handleDelete = async (id) => {
    try {
      await deleteProduct(id);
      toast.success("Xóa sản phẩm thành công");
      fetchProducts();
    } catch (error) {
      toast.error(error.response?.data?.message || "Có lỗi xảy ra");
    }
  };

  // Handle create
  const handleCreate = () => {
    setEditingRecord(null);
    setModalOpen(true);
  };

  // Handle view detail
  const handleViewDetail = async (id) => {
    setLoadingProductId(id);
    try {
      const response = await getProductById(id);
      setDetailData(response.data);
      setDetailOpen(true);
    } catch (error) {
      toast.error("Lỗi khi tải chi tiết sản phẩm");
    } finally {
      setLoadingProductId(null);
    }
  };

  // Handle manage images
  const handleManageImages = (product) => {
    setSelectedProduct(product);
    setImageModalOpen(true);
  };

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
    { title: "SKU", dataIndex: "sku", key: "sku", render: (t) => <code>{t}</code> },
    { title: "Danh mục", dataIndex: "category", render: (c) => c ? <Tag color="blue">{c.name}</Tag> : "-" },
    { title: "Thương hiệu", dataIndex: "brand", render: (b) => b ? <Tag color="green">{b.name}</Tag> : "-" },
    { title: "Giá", dataIndex: "price", render: (p) => p ? `$${p.toLocaleString()}` : "-" },
    { title: "Tồn kho", dataIndex: "stockQuantity", render: (s) => s || 0 },
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
              onClick={() => {
                setEditingRecord(record);
                setModalOpen(true);
              }}
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

  // Modal fields
  const fields = [
    {
      name: "name",
      label: "Tên sản phẩm",
      component: <Input placeholder="Nhập tên sản phẩm" />,
      rules: [{ required: true, message: "Vui lòng nhập tên sản phẩm" }],
    },
    {
      name: "sku",
      label: "SKU",
      component: <Input placeholder="Nhập SKU" />,
      rules: [{ required: true, message: "Vui lòng nhập SKU" }],
    },
    {
      name: "description",
      label: "Mô tả",
      component: <Input.TextArea rows={3} placeholder="Nhập mô tả" />,
    },
    {
      name: "price",
      label: "Giá",
      component: <InputNumber placeholder="Nhập giá" style={{ width: "100%" }} />,
      rules: [{ required: true, message: "Vui lòng nhập giá" }],
    },
    {
      name: "stock",
      label: "Tồn kho",
      component: <InputNumber placeholder="Nhập số lượng tồn kho" style={{ width: "100%" }} />,
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

  // Detail fields
  const detailFields = [
    { name: "id", label: "ID" },
    { name: "name", label: "Tên sản phẩm" },
    { name: "sku", label: "SKU" },
    { name: "description", label: "Mô tả" },
    { name: "price", label: "Giá", render: (v) => v ? `$${v.toLocaleString()}` : "-" },
    { name: "stockQuantity", label: "Tồn kho", render: (v) => v || 0 },
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
                    <FaPlus /> Thêm sản phẩm
                  </Button>
                  <Search
                    placeholder="Tìm kiếm sản phẩm..."
                    allowClear
                    size="large"
                    value={searchValue}
                    onChange={(e) => setSearchValue(e.target.value)}
                    style={{ width: 300 }}
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
                    onChange: (page, pageSize) => {
                      setPagination((prev) => ({
                        ...prev,
                        page,
                        limit: pageSize || prev.limit,
                      }));
                    },
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
        onCancel={() => {
          setModalOpen(false);
          setEditingRecord(null);
        }}
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
        onCancel={() => setDetailOpen(false)}
        title="Chi tiết sản phẩm"
        data={detailData}
        fields={detailFields}
        width={600}
      />

      {/* Modal Quản lý ảnh */}
      <ProductImageModal
        open={imageModalOpen}
        onCancel={() => {
          setImageModalOpen(false);
          setSelectedProduct(null);
        }}
        productId={selectedProduct?.id}
        productName={selectedProduct?.name}
      />
    </>
  );
}