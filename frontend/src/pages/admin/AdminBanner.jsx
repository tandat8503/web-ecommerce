import { useEffect, useState } from "react";
import { Table, Popconfirm, Tag, Tooltip, Space, Row, Col, Card, Badge, Image, Input, Select } from "antd";
import { FaPlus, FaEdit, FaTrash, FaEye } from "react-icons/fa";
import { Button } from "@/components/ui/button"; // shadcn/ui
import CrudModal from "@/pages/hepler/CrudModal";
import DetailModal from "@/pages/hepler/DetailModal";
import { toast } from "react-toastify";
import { TableSkeleton } from "@/components/ui/skeleton";

import {
  getBanners,
  getBannerById,
  createBanner,
  updateBanner,
  deleteBanner,
} from "@/api/banner.js";

export default function AdminBanner() {
  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [detailData, setDetailData] = useState(null);
  const [confirmLoading, setConfirmLoading] = useState(false);

  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  const fetchBanners = async () => {
    setLoading(true);
    try {
      const [res] = await Promise.all([getBanners(), sleep(800)]);
      setBanners(res.data.data);
    } catch (err) {
        console.error(err);
      toast.error("Lỗi tải banner");
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchBanners();
  }, []);

  const handleSubmit = async (values, record) => {
    setConfirmLoading(true);
    try {
      const formData = new FormData();
      Object.keys(values).forEach((key) => {
        if (values[key] !== undefined) formData.append(key, values[key]);
      });
      if (values.image && values.image.file) {
        formData.append("image", values.image.file.originFileObj);
      }

      if (record) {
        await updateBanner(record.id, formData);
        toast.success("Cập nhật thành công");
      } else {
        await createBanner(formData);
        toast.success("Tạo mới thành công");
      }
      setModalOpen(false);
      fetchBanners();
    } catch (err) {
        console.error(err);
      toast.error("Lỗi khi lưu banner");
    }
    setConfirmLoading(false);
  };

  const handleDelete = async (id) => {
    try {
      await deleteBanner(id);
      toast.success("Xóa thành công");
      fetchBanners();
    } catch (err) {
        console.error(err);
      toast.error("Lỗi khi xóa banner");
    }
  };

  const handleView = async (id) => {
    try {
      const res = await getBannerById(id);
      setDetailData(res.data.data);
      setDetailOpen(true);
    } catch (err) {
      console.error(err);
      toast.error("Không tải được chi tiết banner");
    }
  };

  // ✅ Chuẩn hóa fields để form CRUD đẹp
  const formFields = [
    {
      name: "title",
      label: "Tiêu đề",
      component: <Input placeholder="Nhập tiêu đề banner" />,
      rules: [{ required: true, message: "Vui lòng nhập tiêu đề" }],
    },
    {
      name: "linkUrl",
      label: "Link",
      component: <Input placeholder="Nhập link liên kết" />,
    },
    {
      name: "sortOrder",
      label: "Thứ tự",
      component: <Input type="number" placeholder="Nhập thứ tự hiển thị" />,
    },
    {
      name: "isActive",
      label: "Trạng thái",
      component: (
        <Select placeholder="Chọn trạng thái">
          <Select.Option value={true}>Hiển thị</Select.Option>
          <Select.Option value={false}>Ẩn</Select.Option>
        </Select>
      ),
    },
    {
      name: "image",
      label: "Ảnh banner",
      valuePropName: "file",
      getValueFromEvent: (e) =>
        Array.isArray(e) ? e : e && e.target.files ? e.target.files[0] : null,
      component: <Input type="file" accept="image/*" />,
    },
  ];

  // ✅ Chuẩn hóa fields cho modal Chi tiết (render theo table)
  const detailFields = [
    { name: "id", label: "ID" },
    { name: "title", label: "Tiêu đề" },
    { name: "linkUrl", label: "Link" },
    { name: "sortOrder", label: "Thứ tự" },
    { name: "isActive", label: "Trạng thái", render: (v) => (v ? "Hiển thị" : "Ẩn") },
    { name: "imageUrl", label: "Ảnh", render: (v) => <Image width={200} src={v} /> },
  ];

  const columns = [
    { title: "ID", dataIndex: "id", width: 80 },
    { title: "Tiêu đề", dataIndex: "title" },
    { title: "Ảnh", dataIndex: "imageUrl", render: (url) => <Image width={100} src={url} /> },
    { title: "Link", dataIndex: "linkUrl" },
    { title: "Thứ tự", dataIndex: "sortOrder" },
    {
      title: "Trạng thái",
      dataIndex: "isActive",
      render: (val, record) => (
        <Popconfirm
          title={`Bạn có chắc muốn ${val ? "ẩn" : "hiển thị"} banner này?`}
          okText="Xác nhận"
          cancelText="Hủy"
          onConfirm={() => handleSubmit({ isActive: !val }, record)}
        >
          <Tag color={val ? "green" : "red"} className="cursor-pointer">
            {val ? "Hiển thị" : "Ẩn"}
          </Tag>
        </Popconfirm>
      ),
    },
    {
      title: "Hành động",
      render: (_, record) => (
        <Space>
          <Tooltip title="Xem chi tiết">
            <Button variant="secondary" size="sm" onClick={() => handleView(record.id)}>
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
              title="Bạn có chắc muốn xóa banner này?"
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
          text="Quản lý Banner" 
          color="#667eea"
          style={{
            background: 'linear-gradient(45deg, #667eea, #764ba2, #f093fb, #667eea)',
            backgroundSize: '300% 300%',
            animation: 'gradientShift 4s ease infinite',
            fontWeight: 'bold',
            boxShadow: '0 6px 20px rgba(102, 126, 234, 0.4)',
            textShadow: '0 2px 4px rgba(0,0,0,0.3)',
            fontSize: '16px',
            padding: '8px 20px',
            height: '40px',
            lineHeight: '24px'
          }}
        >    
                <Card className="shadow rounded-2xl">
              <div className="flex justify-between mb-4">
                <Button
                  variant="default"
                  onClick={() => {
                    setEditingRecord(null);
                    setModalOpen(true);
                  }}
                >
                  <FaPlus /> Thêm Banner
                </Button>
              </div>

              {loading ? (
                <TableSkeleton columnsCount={6} rowsCount={6} />
              ) : (
                <Table
                  rowKey="id"
                  columns={columns}
                  dataSource={banners}
                  loading={false}
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
        title={editingRecord ? "Cập nhật Banner" : "Thêm Banner"}
        confirmLoading={confirmLoading}
        fields={formFields}
        okText={editingRecord ? "Cập nhật" : "Thêm"}   

      />

      {/* Modal Detail */}
      <DetailModal
        open={detailOpen}
        onCancel={() => setDetailOpen(false)}
        title="Chi tiết Banner"
        data={detailData}
        fields={detailFields}
      />
    </>
  );
}
