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
  Upload,
  Checkbox,
  Button as AntButton
} from "antd";
import { UploadOutlined } from "@ant-design/icons";
import { FaPlus, FaEdit, FaTrash, FaEye } from "react-icons/fa";
import { Button } from "@/components/ui/button"; // shadcn/ui
import { TableSkeleton } from "@/components/ui/skeleton";
import CrudModal from "@/pages/hepler/CrudModal";
import DetailModal from "@/pages/hepler/DetailModal";
import { toast } from "@/lib/utils";
import {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  getCategoryById,
} from "@/api/adminCategories";

const { Search } = Input;

export default function AdminCategories() {
  const [showSkeleton, setShowSkeleton] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [categories, setCategories] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 5, total: 0 });
  const [keyword, setKeyword] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [detailData, setDetailData] = useState(null);
  const [loadingCategoryId, setLoadingCategoryId] = useState(null);

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

  // Load danh sách categories
  const fetchCategories = async () => {
    setShowSkeleton(true);
    try {
      const response = await getCategories({
        page: pagination.page,
        limit: pagination.limit,
        q: keyword,
      });
      setCategories(response.data.items || []);
      setPagination((prev) => ({
        ...prev,
        total: response.data.total || 0,
      }));

       // ép skeleton hiển thị ít nhất 500ms (hoặc 800ms tuỳ bạn muốn chậm bao nhiêu)
    await sleep(800);
    
    } catch (error) {
      toast.error("Lỗi khi tải danh sách danh mục");
      console.error("Error fetching categories:", error);
    } finally {
      setShowSkeleton(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, [pagination.page, pagination.limit, keyword]);

  const handleSubmit = async (values, editingRecord) => {
  setModalLoading(true);
  try {
    const formData = new FormData();
    formData.append("name", values.name);
    formData.append("description", values.description || "");
    formData.append("isActive", values.isActive ? "true" : "false");

    // Nếu có ảnh được chọn
    if (values.image && values.image[0]?.originFileObj) {
      formData.append("image", values.image[0].originFileObj);
    }

    if (editingRecord) {
      await updateCategory(editingRecord.id, formData);
      toast.success("Cập nhật danh mục thành công");
    } else {
      await createCategory(formData);
      toast.success("Tạo danh mục thành công");
    }

    setModalOpen(false);
    setEditingRecord(null);
    fetchCategories();
  } catch (error) {
    toast.error(error.response?.data?.message || "Có lỗi xảy ra");
  } finally {
    setModalLoading(false);
  }
};


  // Handle delete
  const handleDelete = async (id) => {
    try {
      await deleteCategory(id);
      toast.success("Xóa danh mục thành công");
      fetchCategories();
    } catch (error) {
      toast.error(error.response?.data?.message || "Có lỗi xảy ra");
    }
  };

  // Handle view detail
  const handleViewDetail = async (id) => {
    setLoadingCategoryId(id);
    try {
      const response = await getCategoryById(id);
      setDetailData(response.data);
      setDetailOpen(true);
    } catch (error) {
      toast.error("Lỗi khi tải chi tiết danh mục");
    } finally {
      setLoadingCategoryId(null);
    }
  };

  // Cột bảng
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
    { title: "Mô tả", dataIndex: "description", key: "description", ellipsis: true },
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

  // Trường cho modal CRUD (Upload ảnh giống Banner)
  const fields = [
    {
      name: "name",
      label: "Tên danh mục",
      component: <Input placeholder="Nhập tên danh mục" />,
      rules: [{ required: true, message: "Vui lòng nhập tên" }],
    },
    {
      name: "description",
      label: "Mô tả",
      component: <Input.TextArea rows={3} placeholder="Nhập mô tả" />,
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

  // Trường cho modal chi tiết
  const detailFields = [
    { name: "id", label: "ID" },
    { name: "name", label: "Tên danh mục" },
    { name: "slug", label: "Slug" },
    { name: "description", label: "Mô tả" },
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
          <Badge.Ribbon text="Quản lý Danh mục"  color="#667eea"
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
            }}>
            <Card className="shadow rounded-2xl">
              <div className="flex justify-between mb-4">
                <div className="flex gap-4">
                  <Button variant="default" onClick={() => setModalOpen(true)}>
                    <FaPlus /> Thêm danh mục
                  </Button>

                  <Search
                    placeholder="Tìm kiếm danh mục..."
                    allowClear
                    size="large"
                    value={searchValue}
                    onChange={(e) => setSearchValue(e.target.value)}
                    style={{ width: 300 }}
                  />
                </div>
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
        title={editingRecord ? "Sửa danh mục" : "Thêm danh mục"}
        confirmLoading={modalLoading}
        okText={editingRecord ? "Cập nhật" : "Tạo mới"}
      />

      {/* Modal Detail */}
      <DetailModal
        open={detailOpen}
        onCancel={() => setDetailOpen(false)}
        title="Chi tiết danh mục"
        data={detailData}
        fields={detailFields}
        width={600}
      />
    </>
  );
}
