import { Table, Popconfirm, Tag, Tooltip, Space, Row, Col, Card, Badge, Image, Input, Switch, Upload, Button as AntButton } from "antd";
import { FaPlus, FaEdit, FaTrash, FaEye } from "react-icons/fa";
import { Button } from "@/components/ui/button"; // shadcn/ui
import CrudModal from "@/pages/hepler/CrudModal";
import DetailModal from "@/pages/hepler/DetailModal";
import { TableSkeleton } from "@/components/ui/skeleton";
import { UploadOutlined } from "@ant-design/icons";
import { useAdminBanner } from "./useAdminBanner";

export default function AdminBanner() {
  // Lấy tất cả state và handlers từ custom hook
  const {
    banners,
    loading,
    modalOpen,
    detailOpen,
    editingRecord,
    detailData,
    confirmLoading,
    handleSubmit,
    handleDelete,
    handleView,
    openCreateModal,
    openEditModal,
    closeModal,
    closeDetailModal,
  } = useAdminBanner();

  //  Chuẩn hóa fields để form CRUD đẹp
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

  //  Chuẩn hóa fields cho modal Chi tiết (render theo table)
  const detailFields = [
    { name: "id", label: "ID" },
    { name: "title", label: "Tiêu đề" },
    { name: "isActive", label: "Trạng thái", render: (v) =>
    v ? (
      <Tag color="green" style={{ fontWeight: 600 }}>
        Hoạt động
      </Tag>
    ) : (
      <Tag color="red" style={{ fontWeight: 600 }}>
        Tạm dừng
      </Tag>
    ), },
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
            <Button variant="secondary" className={"cursor-pointer"}  size="sm" onClick={() => handleView(record.id)}>
              <FaEye />
            </Button>
          </Tooltip>
          <Tooltip title="Sửa">
            <Button
              className="bg-blue-500 hover:bg-blue-600 text-white cursor-pointer"
              size="sm"
              onClick={() => openEditModal(record)}
            >
              <FaEdit />
            </Button>
          </Tooltip>
          <Tooltip title="Xóa">
            <Popconfirm
              title="Bạn có chắc muốn xóa banner này?"
              onConfirm={() => handleDelete(record.id)}
            >
              <Button variant="destructive" size="sm" className="cursor-pointer">
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
                <Button variant="default" onClick={openCreateModal}>
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
        onCancel={closeModal}
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
        onCancel={closeDetailModal}
        title="Chi tiết Banner"
        data={detailData}
        fields={detailFields}
        maskClosable={false} //khi click ra ngoai modal se khong dong modal
      />
    </>
  );
}

