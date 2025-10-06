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
} from "antd";
import { FaPlus, FaEdit, FaTrash, FaEye } from "react-icons/fa";
import { Button } from "@/components/ui/button"; // shadcn/ui
import { TableSkeleton } from "@/components/ui/skeleton";
import CrudModal from "@/pages/hepler/CrudModal";
import DetailModal from "@/pages/hepler/DetailModal";
import { toast } from "react-toastify";
import {
  getBrands,
  createBrand,
  updateBrand,
  deleteBrand,
  getBrandById,
} from "@/api/adminBrands";
import { debugAuth, isTokenValid, isAdmin } from "@/utils/authUtils";

const { Search } = Input;

export default function AdminBrands() {
  const [showSkeleton, setShowSkeleton] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [brands, setBrands] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 5, total: 0 });
  const [keyword, setKeyword] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [detailData, setDetailData] = useState(null);
  const [loadingBrandId, setLoadingBrandId] = useState(null);

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

  // Load danh sách brands
  const fetchBrands = async () => {
    setShowSkeleton(true);
    
    // Debug authentication trước khi gọi API
    const authStatus = debugAuth();
    console.log('🔍 Auth status before API call:', authStatus);
    
    try {
      const response = await getBrands({
        page: pagination.page,
        limit: pagination.limit,
        search: keyword,
      });
      setBrands(response.data.items || []); // backend trả items
      setPagination((prev) => ({
        ...prev,
        total: response.data.total || 0,
      }));
      // ép skeleton hiển thị ít nhất 500ms (hoặc 800ms )
    await sleep(800);
    } catch (error) {
      console.error("Error fetching brands:", error);
      
      // Xử lý lỗi cụ thể
      if (error.response?.status === 401) {
        toast.error("❌ Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
        // Token sẽ được xử lý bởi axios interceptor
      } else if (error.response?.status === 403) {
        toast.error("❌ Bạn không có quyền truy cập trang này.");
      } else if (error.response?.status >= 500) {
        toast.error("❌ Lỗi server. Vui lòng thử lại sau.");
      } else {
        toast.error("❌ Lỗi khi tải danh sách thương hiệu");
      }
    } finally {
      setShowSkeleton(false);
    }
  };

  useEffect(() => {
    fetchBrands();
  }, [pagination.page, pagination.limit, keyword]);

  // Handle create/edit
  const handleSubmit = async (values, editingRecord) => {
    setModalLoading(true);
    try {
      if (editingRecord) {
        await updateBrand(editingRecord.id, values);
        toast.success("Cập nhật thương hiệu thành công");
      } else {
        await createBrand(values);
        toast.success("Tạo thương hiệu thành công");
      }
      setModalOpen(false);
      setEditingRecord(null);
      fetchBrands();
    } catch (error) {
      toast.error(error.response?.data?.message || "Có lỗi xảy ra");
    } finally {
      setModalLoading(false);
    }
  };

  // Handle delete
  const handleDelete = async (id) => {
    try {
      await deleteBrand(id);
      toast.success("Xóa thương hiệu thành công");
      fetchBrands();
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
    setLoadingBrandId(id);
    try {
      const response = await getBrandById(id);
      setDetailData(response.data);
      setDetailOpen(true);
    } catch (error) {
      toast.error("Lỗi khi tải chi tiết thương hiệu");
    } finally {
      setLoadingBrandId(null);
    }
  };

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

  // Modal fields
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

  // Detail fields
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
                    onChange={(e) => setSearchValue(e.target.value)}
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
        title={editingRecord ? "Sửa thương hiệu" : "Thêm thương hiệu"}
        confirmLoading={modalLoading}
        okText={editingRecord ? "Cập nhật" : "Tạo mới"}
      />

      {/* Modal Detail */}
      <DetailModal
        open={detailOpen}
        onCancel={() => setDetailOpen(false)}
        title="Chi tiết thương hiệu"
        data={detailData}
        fields={detailFields}
        width={600}
      />
    </>
  );
}
