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
  Tooltip,
  Badge
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
  getUsers,
  createUser,
  updateUser,
  deleteUser,
  getUserById,
} from "@/api/adminUser";

export default function AdminUser() {
  const [showSkeleton, setShowSkeleton] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [users, setUsers] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 5, total: 0 });
  const [keyword, setKeyword] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [detailData, setDetailData] = useState(null);
  const [loadingUserId, setLoadingUserId] = useState(null);


  // debounce search
  const [searchValue, setSearchValue] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => {
      setPagination((prev) => ({ ...prev, page: 1 })); // reset về trang 1
      setKeyword(searchValue);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchValue]);

  // Load danh sách user
  const fetchUsers = async () => {
    try {
      setShowSkeleton(true);
      
      // Tạo delay tối thiểu để người dùng thấy skeleton
      const [res] = await Promise.all([
        getUsers({
          page: pagination.page,
          limit: pagination.limit,
          keyword,
        }),
        new Promise(resolve => setTimeout(resolve, 1000)) // Delay 1 giây
      ]);
      
      setUsers(res.data.data.users);
      setPagination((prev) => ({
        ...prev,
        total: res.data.data.pagination.total,
      }));
    } catch (err) {
      console.log(err);
      message.error("Không thể tải danh sách user");
    } finally {
      setShowSkeleton(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [pagination.page, pagination.limit, keyword]);

  // Submit form thêm/sửa
  const handleSubmit = async (values, record) => {
    try {
      setModalLoading(true);
      if (record) {
        await updateUser(record.id, values);
        toast.success("Cập nhật user thành công");
      } else {
        await createUser(values);
        toast.success("Tạo user thành công (mặc định mật khẩu 123456)");
      }
      setModalOpen(false);
      fetchUsers();
    } catch (err) {
      console.log(err);
      
      // Xử lý lỗi cụ thể
      if (err.response?.data?.message) {
        const errorMessage = err.response.data.message;
        
        if (errorMessage.includes("Email đã tồn tại")) {
          toast.error("Email này đã được sử dụng. Vui lòng chọn email khác.");
        } else if (errorMessage.includes("Số điện thoại đã được sử dụng")) {
          toast.error("Số điện thoại này đã được sử dụng. Vui lòng chọn số điện thoại khác.");
        } else if (errorMessage.includes("Thiếu thông tin bắt buộc")) {
          toast.error("Vui lòng điền đầy đủ thông tin bắt buộc.");
        } else if (errorMessage.includes("User không tồn tại")) {
          toast.error("Không tìm thấy người dùng này.");
        } else {
          toast.error(` ${errorMessage}`);
        }
      } else {
        toast.error(" Có lỗi khi lưu user. Vui lòng thử lại.");
      }
    } finally {
      setModalLoading(false);
    }
  };

  // Xóa user
  const handleDelete = async (id) => {
    try {
      await deleteUser(id);
      toast.success("Xóa user thành công");
      fetchUsers();
    } catch (err) {
      console.log(err);
      message.error("Xóa thất bại");
    }
  };

  // Xem chi tiết user
  const handleViewDetail = async (id) => {
    try {
      const res = await getUserById(id);
      setDetailData(res.data.data);
      setDetailOpen(true);
    } catch (err) {
      console.log(err);
      toast.error("Không thể tải chi tiết user");
    }
  };

  const handleToggleStatus = async (id, currentStatus) => {
  try {
    setLoadingUserId(id);
    await updateUser(id, { isActive: !currentStatus });
    toast.success("Cập nhật trạng thái thành công");
    fetchUsers();
  } catch (err) {
    console.error(err);
    toast.error("Cập nhật trạng thái thất bại");
  } finally {
    setLoadingUserId(null);
  }
};


  // Cấu hình form fields cho CrudModal
  const formFields = [
    {
      name: "email",
      label: "Email",
      component: <Input type="email" />,
      rules: [
        { required: true, message: "Bắt buộc" },
        { type: "email", message: "Email không hợp lệ" }
      ],
    },
    {
      name: "firstName",
      label: "Họ",
      component: <Input />,
      rules: [{ required: true, message: "Bắt buộc" }],
    },
    {
      name: "lastName",
      label: "Tên",
      component: <Input />,
      rules: [{ required: true, message: "Bắt buộc" }],
    },
    {
      name: "phone",
      label: "Số điện thoại",
      component: <Input placeholder="Nhập số điện thoại" />,
      rules: [
        { required: true, message: "Bắt buộc" },
        { 
          pattern: /^[0-9]{10,11}$/, 
          message: "Số điện thoại phải có 10-11 chữ số" 
        }
      ],
    },
  ];

  // Table columns
  const columns = [
    { title: "ID", dataIndex: "id", width: 70 },
    { title: "Email", dataIndex: "email" },
    { title: "Họ", dataIndex: "firstName" },
    { title: "Tên", dataIndex: "lastName" },
    { title: "SĐT", dataIndex: "phone" },
    {
  title: "Trạng thái",
  dataIndex: "isActive",
  render: (val, record) => {
    const isLoading = loadingUserId === record.id;

    return (
      <Popconfirm
        title={`Bạn có chắc muốn ${val ? "vô hiệu hóa" : "kích hoạt"} user này?`}
        okText="Xác nhận"
        cancelText="Hủy"
        onConfirm={() => handleToggleStatus(record.id, val)}
      >
        {isLoading ? (
          <Tag color="blue" className="flex items-center gap-1 cursor-wait">
            <div className="w-3 h-3 bg-gray-300 rounded animate-pulse"></div>
            Đang cập nhật...
          </Tag>
        ) : (
          <Tag
            color={val ? "green" : "red"}
            className="cursor-pointer"
          >
            {val ? "Hoạt động" : "Vô hiệu hóa"}
          </Tag>
        )}
      </Popconfirm>
    );
  },
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
            <Popconfirm
              title="Bạn có chắc muốn xóa user này?"
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
          text="Quản lý người dùng" 
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
              <div className="flex gap-4">
                <Button
                  variant="default"
                  onClick={() => {
                    setEditingRecord(null);
                    setModalOpen(true);
                  }}
                >
                  <FaPlus /> Thêm user
                </Button>
                <Input.Search
                  placeholder="Tìm theo email, tên, SĐT"
                  value={searchValue}
                  onChange={(e) => setSearchValue(e.target.value)}
                  allowClear
                  style={{ maxWidth: 300 }}
                />
              </div>
            </div>
            {showSkeleton ? (
              <TableSkeleton rows={pagination.limit} columns={6} />
            ) : (
              <Table
                rowKey="id"
                columns={columns}
                dataSource={users}
                pagination={{
                  current: pagination.page,
                  pageSize: pagination.limit,
                  total: pagination.total,
                  onChange: (page, pageSize) =>
                    setPagination({ ...pagination, page, limit: pageSize }),
                }}
              />
            )}
          </Card>
        </Badge.Ribbon>
      </Col>

      {/* Modal thêm/sửa */}
      <CrudModal
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onSubmit={handleSubmit}
        editingRecord={editingRecord}
        fields={formFields}
        title={editingRecord ? "Sửa user" : "Thêm user"}
        confirmLoading={modalLoading}
        okText={editingRecord ? "Cập nhật" : "Thêm mới"}
      />

      {/* Modal chi tiết */}
      <DetailModal
        open={detailOpen}
        onCancel={() => setDetailOpen(false)}
        title="Chi tiết người dùng"
        data={detailData}
        fields={[
          { name: "id", label: "ID" },
          { name: "email", label: "Email" },
          { name: "firstName", label: "Họ" },
          { name: "lastName", label: "Tên" },
          { name: "phone", label: "SĐT" },
          {
            name: "isActive",
            label: "Trạng thái",
            render: (val) => (val ? "Hoạt động" : "vô hiệu hóa"),
          },
          { name: "createdAt", label: "Ngày tạo" },
        ]}
      />
      </Row>
    </>
  );
}
