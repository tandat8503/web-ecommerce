import { useEffect, useState } from "react";
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
} from "antd";
import { FaPlus, FaEdit, FaTrash, FaEye } from "react-icons/fa";
import { Button } from "@/components/ui/button";
import CrudModal from "@/pages/hepler/CrudModal";
import DetailModal from "@/pages/hepler/DetailModal";
import { toast } from "react-toastify";
import { TableSkeleton } from "@/components/ui/skeleton";
import {
  getSpecifications,
  getSpecificationById,
  createSpecification,
  updateSpecification,
  deleteSpecification,
} from "@/api/adminProductSpecification";
import { getProducts } from "@/api/adminProducts";

export default function AdminProductSpecification() {
  const [specs, setSpecs] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [detailData, setDetailData] = useState(null);
  const [confirmLoading, setConfirmLoading] = useState(false);

  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0 });
  const [keyword, setKeyword] = useState("");

  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  // Load danh sách specifications
  const fetchSpecifications = async (
    page = pagination.page,
    limit = pagination.limit,
    keyword = ""
  ) => {
    setLoading(true);
    try {
      const [res] = await Promise.all([
        getSpecifications({ page, limit, keyword }),
        sleep(500),
      ]);
      setSpecs(res.data.data.specifications);
      setPagination(res.data.data.pagination);
    } catch (err) {
      console.error(err);
      toast.error("Lỗi tải danh sách thông số");
    }
    setLoading(false);
  };

  const fetchProducts = async () => {
    try {
      const res = await getProducts();
      setProducts(res.data.items);
    } catch (err) {
      console.error(err);
      toast.error("Lỗi tải danh sách sản phẩm");
    }
  };

  useEffect(() => {
    fetchSpecifications();
    fetchProducts();
  }, []);

  // Submit thêm/sửa
  const handleSubmit = async (values, record) => {
    setConfirmLoading(true);
    try {
      if (record) {
        await updateSpecification(record.id, values);
        toast.success("Cập nhật thông số thành công");
      } else {
        await createSpecification(values);
        toast.success("Thêm thông số thành công");
      }
      setModalOpen(false);
      fetchSpecifications();
    } catch (err) {
      console.error(err);
      toast.error("Lỗi khi lưu thông số");
    }
    setConfirmLoading(false);
  };

  const handleDelete = async (id) => {
    try {
      await deleteSpecification(id);
      toast.success("Xóa thành công");
      fetchSpecifications();
    } catch (err) {
      console.error(err);
      toast.error("Lỗi khi xóa");
    }
  };

  const handleView = async (id) => {
    try {
      const res = await getSpecificationById(id);
      setDetailData(res.data.data);
      setDetailOpen(true);
    } catch (err) {
      console.error(err);
      toast.error("Không tải được chi tiết");
    }
  };

  // ✅ Fields CRUD
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
      name: "specName",
      label: "Tên thông số (tech)",
      component: <Input placeholder="VD: case_diameter" />,
      rules: [{ required: true, message: "Vui lòng nhập tên thông số" }],
    },
    {
      name: "displayName",
      label: "Tên hiển thị",
      component: <Input placeholder="VD: Đường kính mặt" />,
      rules: [{ required: true, message: "Vui lòng nhập tên hiển thị" }],
    },
    {
      name: "specValue",
      label: "Giá trị",
      component: <Input placeholder="VD: 42" />,
      rules: [{ required: true, message: "Vui lòng nhập giá trị" }],
    },
    {
      name: "specUnit",
      label: "Đơn vị",
      component: <Input placeholder="VD: mm, gram..." />,
    },
    {
      name: "sortOrder",
      label: "Thứ tự hiển thị",
      component: <Input type="number" />,
    },
  ];

  // ✅ Fields Detail Modal
  const detailFields = [
    { name: "id", label: "ID" },
    { name: "productId", label: "Sản phẩm" },
    { name: "specName", label: "Tên thông số" },
    { name: "displayName", label: "Tên hiển thị" },
    { name: "specValue", label: "Giá trị" },
    { name: "specUnit", label: "Đơn vị" },
    { name: "sortOrder", label: "Thứ tự" },
     {
      name: "createdAt",
      label: "Ngày tạo",
      render: (v) => {
        const d = new Date(v);
        const date = d.toLocaleDateString("vi-VN"); // 6/10/2025
        const time = d.toLocaleTimeString("vi-VN"); // 10:23:28
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

  // ✅ Table Columns
  const columns = [
    { title: "ID", dataIndex: "id", width: 70 },
    {
      title: "Sản phẩm",
      dataIndex: ["product", "name"],
      render: (text) => <Tag color="blue">{text}</Tag>,
    },
    { title: "Tên thông số", dataIndex: "specName" },
    { title: "Tên hiển thị", dataIndex: "displayName" },
    { title: "Giá trị", dataIndex: "specValue" },
    { title: "Đơn vị", dataIndex: "specUnit" },
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
              title="Bạn có chắc muốn xóa?"
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
            0% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
            100% { background-position: 0% 50%; }
          }
        `}
      </style>
      <Row gutter={[16, 16]}>
        <Col span={24}>
          <Badge.Ribbon text="Quản lý Thông số kỹ thuật" color="#764ba2"
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
                  <Button
                    variant="default"
                    onClick={() => {
                      setEditingRecord(null);
                      setModalOpen(true);
                    }}
                  >
                    <FaPlus /> Thêm Thông số
                  </Button>
                  <Input.Search
                    placeholder="Tìm theo tên, giá trị, sản phẩm..."
                    allowClear
                    onSearch={(val) => {
                      setKeyword(val);
                      fetchSpecifications(1, pagination.limit, val);
                    }}
                    style={{ width: 300 }}
                  />
                </div>
              </div>

              {loading ? (
                <TableSkeleton columnsCount={7} rowsCount={6} />
              ) : (
                <Table
                  rowKey="id"
                  columns={columns}
                  dataSource={specs}
                  pagination={{
                    current: pagination.page,
                    pageSize: pagination.limit,
                    total: pagination.total,
                    showSizeChanger: true,
                    onChange: (page, pageSize) => {
                      fetchSpecifications(page, pageSize, keyword);
                    },
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
        onCancel={() => setModalOpen(false)}
        onSubmit={handleSubmit}
        editingRecord={editingRecord}
        title={editingRecord ? "Cập nhật Thông số" : "Thêm Thông số"}
        confirmLoading={confirmLoading}
        fields={formFields}
        okText={editingRecord ? "Cập nhật" : "Thêm"}
      />

      {/* Modal Chi tiết */}
      <DetailModal
        open={detailOpen}
        onCancel={() => setDetailOpen(false)}
        title="Chi tiết Thông số kỹ thuật"
        data={detailData}
        fields={detailFields}
      />
    </>
  );
}
