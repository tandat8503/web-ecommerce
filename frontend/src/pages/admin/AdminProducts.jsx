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
} from "antd";
import { FaPlus, FaEdit, FaTrash, FaEye } from "react-icons/fa";
import { Loader2 } from "lucide-react";
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
import { getCategories } from "@/api/adminCategories";
import { getBrands } from "@/api/adminBrands";

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

  // fetch list products
  const fetchProducts = async () => {
    setShowSkeleton(true);
    try {
      const response = await getProducts({
        page: pagination.page,
        limit: pagination.limit,
        search: keyword,
      });
      setProducts(response.data.items || []);
      setPagination((prev) => ({
        ...prev,
        total: response.data.total || 0,
      }));
      // ép skeleton hiển thị ít nhất 500ms (hoặc 800ms tuỳ bạn muốn chậm bao nhiêu)
      await sleep(800);
    } catch (error) {
      toast.error("Lỗi khi tải danh sách sản phẩm");
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

  // CRUD actions
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

  const handleDelete = async (id) => {
    try {
      await deleteProduct(id);
      toast.success("Xóa sản phẩm thành công");
      fetchProducts();
    } catch (error) {
      toast.error(error.response?.data?.message || "Có lỗi xảy ra");
    }
  };

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
    { title: "ID", dataIndex: "id", key: "id", width: 80 },
    {
      title: "Hình ảnh",
      dataIndex: "imageUrl",
      key: "imageUrl",
      render: (v) =>
        v ? (
          <Image width={60} height={60} src={v} style={{ borderRadius: 8 }} />
        ) : (
          <div className="w-[60px] h-[60px] bg-gray-100 text-gray-400 flex items-center justify-center rounded">
            No Image
          </div>
        ),
    },
    { title: "Tên sản phẩm", dataIndex: "name", key: "name", render: (t) => <strong>{t}</strong> },
    { title: "Danh mục", dataIndex: "category", render: (c) => c ? <Tag color="blue">{c.name}</Tag> : "-" },
    { title: "Thương hiệu", dataIndex: "brand", render: (b) => b ? <Tag color="green">{b.name}</Tag> : "-" },
    { title: "Giá", dataIndex: "price", render: (p) => p ? `$${p.toLocaleString()}` : "-" },
    { title: "Trạng thái", dataIndex: "isActive", render: (v) => <Tag color={v ? "green" : "red"}>{v ? "Hoạt động" : "Tạm dừng"}</Tag> },
    { title: "Ngày tạo", dataIndex: "createdAt", render: (d) => new Date(d).toLocaleDateString("vi-VN") },
    {
      title: "Thao tác",
      render: (_, record) => (
        <Space>
          <Tooltip title="Chi tiết">
            <Button
              size="sm"
              variant="secondary"
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
            <Popconfirm
              title="Bạn có chắc chắn muốn xóa sản phẩm này?"
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

  const fields = [
    { name: "name", label: "Tên sản phẩm", component: <Input placeholder="Tên sản phẩm" />, rules: [{ required: true, message: "Bắt buộc nhập" }] },
    { name: "description", label: "Mô tả", component: <Input.TextArea rows={3} placeholder="Mô tả" /> },
    { name: "price", label: "Giá", component: <InputNumber placeholder="Giá" style={{ width: "100%" }} />, rules: [{ required: true, message: "Nhập giá" }] },
    {
      name: "categoryId",
      label: "Danh mục",
      component: (
        <Select placeholder="Chọn danh mục">
          {categories.map((c) => <Option key={c.id} value={c.id}>{c.name}</Option>)}
        </Select>
      ),
      rules: [{ required: true, message: "Chọn danh mục" }],
    },
    {
      name: "brandId",
      label: "Thương hiệu",
      component: (
        <Select placeholder="Chọn thương hiệu">
          {brands.map((b) => <Option key={b.id} value={b.id}>{b.name}</Option>)}
        </Select>
      ),
      rules: [{ required: true, message: "Chọn thương hiệu" }],
    },
    { name: "imageUrl", label: "URL hình ảnh", component: <Input placeholder="Nhập URL hình ảnh" /> },
    { name: "isActive", label: "Trạng thái", component: <input type="checkbox" />, valuePropName: "checked" },
  ];

  const detailFields = [
    { name: "id", label: "ID" },
    { name: "name", label: "Tên sản phẩm" },
    { name: "description", label: "Mô tả" },
    { name: "price", label: "Giá", render: (v) => v ? `$${v.toLocaleString()}` : "-" },
    { name: "category", label: "Danh mục", render: (v) => v?.name || "-" },
    { name: "brand", label: "Thương hiệu", render: (v) => v?.name || "-" },
    { name: "imageUrl", label: "Hình ảnh", render: (v) => v ? <Image width={100} src={v} /> : "Không có hình ảnh" },
    { name: "isActive", label: "Trạng thái", render: (v) => <Tag color={v ? "green" : "red"}>{v ? "Hoạt động" : "Tạm dừng"}</Tag> },
    { name: "createdAt", label: "Ngày tạo", render: (v) => new Date(v).toLocaleDateString("vi-VN") },
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
            }}
          >
            <Card className="shadow rounded-2xl">
              <div className="flex justify-between mb-4">
                <div className="flex gap-4">
                  <Button variant="default" onClick={() => { setEditingRecord(null); setModalOpen(true); }}>
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
                    showTotal: (total, range) => `${range[0]}-${range[1]} của ${total} sản phẩm`,
                    onChange: (page, pageSize) => {
                      setPagination((prev) => ({
                        ...prev,
                        page,
                        limit: pageSize || prev.limit,
                      }));
                    },
                  }}
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
    </>
  );
}
