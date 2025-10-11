import { useEffect, useState } from "react";
import { Table, Popconfirm, Tag, Tooltip, Space, Row, Col, Card, Badge, Image, Input, Switch, Upload, Button as AntButton } from "antd";
import { FaPlus, FaEdit, FaTrash, FaEye, FaUpload } from "react-icons/fa";
import { Button } from "@/components/ui/button"; // shadcn/ui
import CrudModal from "@/pages/hepler/CrudModal";
import DetailModal from "@/pages/hepler/DetailModal";
import { toast } from "react-toastify";
import { TableSkeleton } from "@/components/ui/skeleton";
import { UploadOutlined } from "@ant-design/icons";

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
      
      // Xử lý từng field riêng biệt
      if (values.title) formData.append('title', values.title);
      if (values.isActive !== undefined) {
        formData.append('isActive', values.isActive ? 'true' : 'false');
      }
      
      // Thêm file ảnh nếu có
      if (values.image && values.image[0]?.originFileObj) {
        formData.append('image', values.image[0].originFileObj);
      }

      if (record) {
        await updateBanner(record.id, formData);
        toast.success("Cập nhật banner thành công");
      } else {
        await createBanner(formData);
        toast.success("Tạo banner thành công");
      }
      setModalOpen(false);
      setEditingRecord(null);
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
    name: "isActive",
    label: "Trạng thái",
    component: (
      <Switch checkedChildren="Hoạt động" unCheckedChildren="Tạm dừng" />
    ),
    valuePropName: "checked", 
  },
    {
      name: "image",
      label: "Ảnh banner",
      valuePropName: "fileList",
      getValueFromEvent: (e) => (Array.isArray(e) ? e : e?.fileList),
      component: (
        <Upload 
          name="image" 
          listType="picture" 
          maxCount={1} 
          beforeUpload={() => false}
          accept="image/*"
        >
          <AntButton icon={<UploadOutlined />}>Chọn ảnh banner</AntButton>
        </Upload>
      ),
      //rules: [{ required: true, message: "Vui lòng chọn ảnh banner" }],
    },
  ];

  // ✅ Chuẩn hóa fields cho modal Chi tiết (render theo table)
  const detailFields = [
    { name: "id", label: "ID" },
    { name: "title", label: "Tiêu đề" },
    { name: "isActive", label: "Trạng thái", render: (v) => (v ? "Hiển thị" : "Ẩn") },
    { name: "imageUrl", label: "Ảnh", render: (v) => <Image width={200} src={v} /> },
    {
      name: "createdAt",
      label: "Ngày tạo",
      render: (v) => {
        const d = new Date(v);
        const date = d.toLocaleDateString("vi-VN");   // 6/10/2025
        const time = d.toLocaleTimeString("vi-VN");   // 10:23:28
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

  const columns = [
    { title: "ID", dataIndex: "id", width: 80 },
    { title: "Tiêu đề", dataIndex: "title" },
    { 
      title: "Ảnh", 
      dataIndex: "imageUrl", 
      render: (url) => <Image width={100} height={60} src={url} style={{ objectFit: 'cover' }} /> 
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
