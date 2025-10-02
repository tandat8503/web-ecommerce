import { useEffect, useState } from "react";
import {
  Table,
  Input,
  Space,
  Popconfirm,
  message,
  Row,
  Col,
  Card,
  Tag,
  Image,
  Tooltip,
  Badge,
  Select,
  InputNumber
} from "antd";
import {
  FaPlus,
  FaEdit,
  FaTrash,
  FaEye
} from "react-icons/fa";
import { Button } from "@/components/ui/button"; // shadcn/ui button
import { TableSkeleton } from "@/components/ui/skeleton";
import CrudModal from "@/pages/hepler/CrudModal";
import DetailModal from "@/pages/hepler/DetailModal";
import { toast } from "react-toastify";
import {
  getProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  getProductById,
} from "@/api/adminProducts";
import {
  getCategories,
} from "@/api/adminCategories";
import {
  getBrands,
} from "@/api/adminBrands";

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

  // debounce search
  const [searchValue, setSearchValue] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => {
      setPagination((prev) => ({ ...prev, page: 1 })); // reset về trang 1
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
        search: keyword,
      });
      setProducts(response.data.data || []);
      setPagination((prev) => ({
        ...prev,
        total: response.data.total || 0,
      }));
    } catch (error) {
      toast.error("Lỗi khi tải danh sách sản phẩm");
      console.error("Error fetching products:", error);
    } finally {
      setShowSkeleton(false);
    }
  };

  // Load categories và brands cho select options
  const fetchSelectOptions = async () => {
    try {
      const [categoriesRes, brandsRes] = await Promise.all([
        getCategories({ limit: 1000 }),
        getBrands({ limit: 1000 })
      ]);
      setCategories(categoriesRes.data.data || []);
      setBrands(brandsRes.data.data || []);
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
      if (editingRecord) {
        await updateProduct(editingRecord.id, values);
        toast.success("Cập nhật sản phẩm thành công");
      } else {
        await createProduct(values);
        toast.success("Tạo sản phẩm thành công");
      }
      setModalOpen(false);
      setEditingRecord(null);
      fetchProducts();
    } catch (error) {
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

  // Handle edit
  const handleEdit = (record) => {
    setEditingRecord(record);
    setModalOpen(true);
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

  const columns = [
    {
      title: "ID",
      dataIndex: "id",
      key: "id",
      width: 80,
    },
    {
      title: "Hình ảnh",
      dataIndex: "imageUrl",
      key: "imageUrl",
      width: 100,
      render: (imageUrl) => (
        imageUrl ? (
          <Image
            width={60}
            height={60}
            src={imageUrl}
            style={{ objectFit: 'cover', borderRadius: 8 }}
            fallback="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAMIAAADDCAYAAADQvc6UAAABRWlDQ1BJQ0MgUHJvZmlsZQAAKJFjYGASSSwoyGFhYGDIzSspCnJ3UoiIjFJgf8LAwSDCIMogwMCcmFxc4BgQ4ANUwgCjUcG3awyMIPqyLsis7PPOq3QdDFcvjV3jOD1boQVTPQrgSkktTgbSf4A4LbmgqISBgTEFyFYuLykAsTuAbJEioKOA7DkgdjqEvQHEToKwj4DVhAQ5A9k3gGyB5IxEoBmML4BsnSQk8XQkNtReEOBxcfXxUQg1Mjc0rHgQGS3kSq0LGI7HcSm4vBQJ8gDOKi4tS0YjK2CTGUQBXh/wwMCTUyMFgWH6eA1ccl4GBgBkeEqQgxJhGBjY2BgYUiFCzQYG9gYGhlYpCxKJAdUOS09i2CgxrHAxWCxMWC2a0oA4cEicvVcZQYGMJkMDiGlpSZmFgYc/0kIz7pLAIBUlYyq3nf8cRkYGuUQzA1YHgA0f4UwA0oUhgAAADhlWElmTU0AKgAAAAgAAYdpAAQAAAABAAAAGgAAAAAAAqACAAQAAAABAAAAwqADAAQAAAABAAAAwwAAAAD9b/HnAAAHlklEQVR4Ae3dP3Ik1RnG4W+FgYxN"
          />
        ) : (
          <div style={{ 
            width: 60, 
            height: 60, 
            backgroundColor: '#f0f0f0', 
            borderRadius: 8,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#999'
          }}>
            No Image
          </div>
        )
      ),
    },
    {
      title: "Tên sản phẩm",
      dataIndex: "name",
      key: "name",
      render: (text) => <strong>{text}</strong>,
    },
    {
      title: "Danh mục",
      dataIndex: "category",
      key: "category",
      render: (category) => category ? <Tag color="blue">{category.name}</Tag> : '-',
    },
    {
      title: "Thương hiệu",
      dataIndex: "brand",
      key: "brand",
      render: (brand) => brand ? <Tag color="green">{brand.name}</Tag> : '-',
    },
    {
      title: "Giá",
      dataIndex: "price",
      key: "price",
      render: (price) => price ? `$${price.toLocaleString()}` : '-',
    },
    {
      title: "Trạng thái",
      dataIndex: "isActive",
      key: "isActive",
      width: 100,
      render: (isActive) => (
        <Tag color={isActive ? "green" : "red"}>
          {isActive ? "Hoạt động" : "Tạm dừng"}
        </Tag>
      ),
    },
    {
      title: "Ngày tạo",
      dataIndex: "createdAt",
      key: "createdAt",
      width: 120,
      render: (date) => new Date(date).toLocaleDateString("vi-VN"),
    },
    {
      title: "Hành động",
      key: "actions",
      width: 150,
      render: (_, record) => (
        <Space>
          <Tooltip title="Xem chi tiết">
            <Button
              size="small"
              icon={<FaEye />}
              onClick={() => handleViewDetail(record.id)}
              loading={loadingProductId === record.id}
            />
          </Tooltip>
          <Tooltip title="Chỉnh sửa">
            <Button
              size="small"
              icon={<FaEdit />}
              onClick={() => handleEdit(record)}
            />
          </Tooltip>
          <Popconfirm
            title="Bạn có chắc chắn muốn xóa sản phẩm này?"
            onConfirm={() => handleDelete(record.id)}
            okText="Xóa"
            cancelText="Hủy"
          >
            <Tooltip title="Xóa">
              <Button
                size="small"
                danger
                icon={<FaTrash />}
              />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  // Định nghĩa fields cho CrudModal
  const fields = [
    {
      name: "name",
      label: "Tên sản phẩm",
      component: <Input placeholder="Nhập tên sản phẩm" />,
      rules: [
        { required: true, message: "Vui lòng nhập tên sản phẩm" },
        { min: 2, message: "Tên sản phẩm phải có ít nhất 2 ký tự" },
      ],
    },
    {
      name: "description",
      label: "Mô tả",
      component: <Input.TextArea rows={3} placeholder="Nhập mô tả sản phẩm" />,
    },
    {
      name: "price",
      label: "Giá",
      component: <InputNumber placeholder="Nhập giá sản phẩm" style={{ width: '100%' }} />,
      rules: [
        { required: true, message: "Vui lòng nhập giá sản phẩm" },
        { type: 'number', min: 0, message: "Giá phải lớn hơn 0" },
      ],
    },
    {
      name: "categoryId",
      label: "Danh mục",
      component: (
        <Select placeholder="Chọn danh mục" allowClear>
          {categories.map(category => (
            <Option key={category.id} value={category.id}>
              {category.name}
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
        <Select placeholder="Chọn thương hiệu" allowClear>
          {brands.map(brand => (
            <Option key={brand.id} value={brand.id}>
              {brand.name}
            </Option>
          ))}
        </Select>
      ),
      rules: [{ required: true, message: "Vui lòng chọn thương hiệu" }],
    },
    {
      name: "imageUrl",
      label: "URL hình ảnh",
      component: <Input placeholder="Nhập URL hình ảnh" />,
    },
    {
      name: "isActive",
      label: "Trạng thái",
      component: <input type="checkbox" />,
      valuePropName: "checked",
    },
  ];

  // Định nghĩa fields cho DetailModal
  const detailFields = [
    { name: "id", label: "ID" },
    { name: "name", label: "Tên sản phẩm" },
    { name: "description", label: "Mô tả" },
    { name: "price", label: "Giá", render: (value) => value ? `$${value.toLocaleString()}` : '-' },
    { name: "category", label: "Danh mục", render: (value) => value?.name || '-' },
    { name: "brand", label: "Thương hiệu", render: (value) => value?.name || '-' },
    { 
      name: "imageUrl", 
      label: "Hình ảnh",
      render: (value) => value ? <Image width={100} src={value} /> : "Không có hình ảnh"
    },
    { 
      name: "isActive", 
      label: "Trạng thái",
      render: (value) => (
        <Tag color={value ? "green" : "red"}>
          {value ? "Hoạt động" : "Tạm dừng"}
        </Tag>
      )
    },
    { 
      name: "createdAt", 
      label: "Ngày tạo",
      render: (value) => new Date(value).toLocaleDateString("vi-VN")
    },
  ];

  return (
    <div className="space-y-6">
      <Card>
        <Row justify="space-between" align="middle" className="mb-4">
          <Col>
            <h1 className="text-2xl font-bold mb-0">Quản lý Sản phẩm</h1>
            <p className="text-gray-600">Quản lý sản phẩm trong hệ thống</p>
          </Col>
          <Col>
            <Button
              type="primary"
              icon={<FaPlus />}
              onClick={handleCreate}
              size="large"
            >
              Thêm sản phẩm
            </Button>
          </Col>
        </Row>

        <Row justify="space-between" align="middle" className="mb-4">
          <Col>
            <Search
              placeholder="Tìm kiếm sản phẩm..."
              allowClear
              size="large"
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              style={{ width: 300 }}
            />
          </Col>
          <Col>
            <span className="text-gray-600">
              Tổng: {pagination.total} sản phẩm
            </span>
          </Col>
        </Row>

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
            scroll={{ x: 1200 }}
          />
        )}
      </Card>

      {/* CrudModal cho Create/Edit */}
      <CrudModal
        open={modalOpen}
        onCancel={() => {
          setModalOpen(false);
          setEditingRecord(null);
        }}
        onSubmit={handleSubmit}
        editingRecord={editingRecord}
        fields={fields}
        title={editingRecord ? "Sửa sản phẩm" : "Thêm sản phẩm mới"}
        confirmLoading={modalLoading}
        okText={editingRecord ? "Cập nhật" : "Tạo mới"}
      />

      {/* DetailModal cho View */}
      <DetailModal
        open={detailOpen}
        onCancel={() => setDetailOpen(false)}
        title="Chi tiết sản phẩm"
        data={detailData}
        fields={detailFields}
        width={600}
      />
    </div>
  );
}