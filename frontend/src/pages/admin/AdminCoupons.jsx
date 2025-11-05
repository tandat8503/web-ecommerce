import { useEffect, useState } from "react";
import { Table, Input, Space, Popconfirm, Row, Col, Card, Tag, Tooltip, Badge, Select, InputNumber, DatePicker, Switch } from "antd";
import { FaPlus, FaEdit, FaTrash, FaEye } from "react-icons/fa";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TableSkeleton } from "@/components/ui/skeleton";
import CrudModal from "@/pages/hepler/CrudModal";
import DetailModal from "@/pages/hepler/DetailModal";
import { toast } from "@/lib/utils";
import { getCoupons, createCoupon, updateCoupon, deleteCoupon, getCouponById } from "@/api/adminCoupons";
import { formatPrice } from "@/lib/utils";
import dayjs from "dayjs";

const { Search } = Input;
const { Option } = Select;
const { RangePicker } = DatePicker;

export default function AdminCoupons() {
  // ===========================
  // STATE MANAGEMENT
  // ===========================
  const [showSkeleton, setShowSkeleton] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [coupons, setCoupons] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0 });
  const [keyword, setKeyword] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [detailData, setDetailData] = useState(null);
  const [loadingCouponId, setLoadingCouponId] = useState(null);

  // ===========================
  // SEARCH DEBOUNCE
  // ===========================
  const [searchValue, setSearchValue] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => {
      setPagination((prev) => ({ ...prev, page: 1 }));
      setKeyword(searchValue);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchValue]);

  // ===========================
  // API CALLS
  // ===========================
  const fetchCoupons = async () => {
    setShowSkeleton(true);
    try {
      const response = await getCoupons({
        page: pagination.page,
        limit: pagination.limit,
        q: keyword,
        status: statusFilter,
      });
      
      // Backend trả về: { items: [...], total: number, page: number, limit: number }
      const couponsData = response.data?.items || response.data || [];
      const totalData = response.data?.total || 0;
      
      setCoupons(couponsData);
      setPagination((prev) => ({ ...prev, total: totalData }));
      
      // Delay để hiển thị skeleton
      await new Promise(resolve => setTimeout(resolve, 800));
    } catch (error) {
      toast.error("Lỗi khi tải danh sách mã giảm giá");
      console.error("Error fetching coupons:", error);
    } finally {
      setShowSkeleton(false);
    }
  };

  useEffect(() => {
    fetchCoupons();
  }, [pagination.page, pagination.limit, keyword, statusFilter]);

  // ===========================
  // CRUD HANDLERS
  // ===========================
  const handleSubmit = async (values, editingRecord) => {
    setModalLoading(true);
    try {
      // Xử lý dữ liệu trước khi gửi
      const submitData = {
        ...values,
        startDate: values.dateRange?.[0]?.format('YYYY-MM-DD') || values.startDate,
        endDate: values.dateRange?.[1]?.format('YYYY-MM-DD') || values.endDate,
        isActive: values.isActive ? "true" : "false",
      };

      delete submitData.dateRange; // Xóa dateRange khỏi data gửi đi
      
      // ✅ Xử lý dữ liệu cho update: chỉ gửi field có giá trị
      if (editingRecord) {
        // Cho update: chỉ gửi field có giá trị, không gửi field rỗng
        const updateData = {};
        
        if (submitData.code && submitData.code.trim() !== '') updateData.code = submitData.code;
        if (submitData.name && submitData.name.trim() !== '') updateData.name = submitData.name;
        if (submitData.discountType && submitData.discountType !== '') updateData.discountType = submitData.discountType;
        if (submitData.discountValue !== undefined && submitData.discountValue !== null) updateData.discountValue = Number(submitData.discountValue);
        if (submitData.minimumAmount !== undefined && submitData.minimumAmount !== null) updateData.minimumAmount = Number(submitData.minimumAmount);
        if (submitData.usageLimit !== undefined && submitData.usageLimit !== null) updateData.usageLimit = Number(submitData.usageLimit);
        if (submitData.startDate && submitData.startDate !== '') updateData.startDate = submitData.startDate;
        if (submitData.endDate && submitData.endDate !== '') updateData.endDate = submitData.endDate;
        if (submitData.isActive !== undefined) updateData.isActive = submitData.isActive;

        console.log('Update data being sent:', updateData);
        await updateCoupon(editingRecord.id, updateData);
        toast.success("Cập nhật mã giảm giá thành công");
      } else {
        // Cho create: gửi tất cả field required
        if (submitData.discountValue !== undefined && submitData.discountValue !== null) {
          submitData.discountValue = Number(submitData.discountValue);
        }
        if (submitData.minimumAmount !== undefined && submitData.minimumAmount !== null) {
          submitData.minimumAmount = Number(submitData.minimumAmount);
        }
        if (submitData.usageLimit !== undefined && submitData.usageLimit !== null) {
          submitData.usageLimit = Number(submitData.usageLimit);
        }

        console.log('Create data being sent:', submitData);
        await createCoupon(submitData);
        toast.success("Tạo mã giảm giá thành công");
      }
      
      setModalOpen(false);
      setEditingRecord(null);
      fetchCoupons();
    } catch (error) {
      console.error('Submit error:', error);
      toast.error(error.response?.data?.message || "Có lỗi xảy ra");
    } finally {
      setModalLoading(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteCoupon(id);
      toast.success("Xóa mã giảm giá thành công");
      fetchCoupons();
    } catch (error) {
      toast.error(error.response?.data?.message || "Có lỗi xảy ra");
    }
  };

  const handleViewDetail = async (id) => {
    setLoadingCouponId(id);
    try {
      const response = await getCouponById(id);
      // Backend trả về: { message: "...", data: coupon }
      const couponData = response.data?.data || response.data;
      setDetailData(couponData);
      setDetailOpen(true);
    } catch (error) {
      toast.error("Lỗi khi tải chi tiết mã giảm giá");
    } finally {
      setLoadingCouponId(null);
    }
  };

  // ===========================
  // UTILITY FUNCTIONS
  // ===========================
  const getCouponStatus = (coupon) => {
    // Chỉ theo backend: isActive = true/false
    return coupon.isActive 
      ? { status: 'active', color: 'green', text: 'Hoạt động' }
      : { status: 'inactive', color: 'red', text: 'Tạm dừng' };
  };

  const processEditingRecord = (record) => {
    if (!record) return null;
    
    // ✅ Xử lý dữ liệu để hiển thị trong form
    const processedRecord = {
      ...record,
      // Xử lý dateRange
      dateRange: record.startDate && record.endDate ? [dayjs(record.startDate), dayjs(record.endDate)] : null,
      // Xử lý isActive
      isActive: record.isActive === true || record.isActive === "true",
      // Đảm bảo các số được convert đúng
      discountValue: record.discountValue ? Number(record.discountValue) : undefined,
      minimumAmount: record.minimumAmount ? Number(record.minimumAmount) : undefined,
      usageLimit: record.usageLimit ? Number(record.usageLimit) : undefined,
    };
    
    console.log('Processed editing record:', processedRecord);
    return processedRecord;
  };

  // ===========================
  // TABLE COLUMNS CONFIGURATION
  // ===========================
  const columns = [
    { title: "ID", dataIndex: "id", key: "id", width: 80 },
    { 
      title: "Mã giảm giá", 
      dataIndex: "code", 
      key: "code", 
      render: (code) => (
        <Tag color="purple" style={{ fontSize: '12px', fontWeight: 'bold', borderRadius: '6px', padding: '4px 8px' }}>
          {code}
        </Tag>
      )
    },
    { title: "Tên", dataIndex: "name", key: "name", render: (t) => <strong>{t}</strong> },
    {
      title: "Giá  giảm",
      dataIndex: "discountValue",
      key: "discountValue",
      width: 120,
      render: (value, record) => (
        <Tag color="orange" style={{ fontSize: '12px', fontWeight: 'bold' }}>
          {record.discountType === 'PERCENT' ? `${value}%` : formatPrice(value)}
        </Tag>
      ),
    },
    {
      title: "Đơn tối thiểu",
      dataIndex: "minimumAmount",
      key: "minimumAmount",
      width: 120,
      render: (amount) => amount ? formatPrice(amount) : 'Không giới hạn',
    },
    {
      title: "Giới hạn sử dụng",
      dataIndex: "usageLimit",
      key: "usageLimit",
      width: 120,
      render: (limit) => limit ? (
        <Tag color="magenta" style={{ fontSize: '12px', fontWeight: 'bold' }}>
          {limit} lượt sử dụng
        </Tag>
      ) : (
        <Tag color="default" style={{ fontSize: '12px', fontStyle: 'italic' }}>
          Không giới hạn
        </Tag>
      ),
    },
    {
      title: "Thời gian",
      key: "dateRange",
      width: 200,
      render: (_, record) => (
        <div style={{ fontSize: '12px' }}>
          <div>Từ: {dayjs(record.startDate).format('DD/MM/YYYY')}</div>
          <div>Đến: {dayjs(record.endDate).format('DD/MM/YYYY')}</div>
        </div>
      ),
    },
    {
      title: "Trạng thái",
      key: "status",
      width: 120,
      render: (_, record) => {
        const statusInfo = getCouponStatus(record);
        return <Tag color={statusInfo.color}>{statusInfo.text}</Tag>;
      },
    },
    {
      title: "Ngày tạo",
      dataIndex: "createdAt",
      key: "createdAt",
      width: 120,
      render: (d) => dayjs(d).format('DD/MM/YYYY'),
    },
    {
      title: "Thao tác",
      render: (_, record) => (
        <Space>
          <Tooltip title="Xem chi tiết">
            <Button variant="secondary" size="sm" onClick={() => handleViewDetail(record.id)} disabled={loadingCouponId === record.id}>
              {loadingCouponId === record.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <FaEye />}
            </Button>
          </Tooltip>
          <Tooltip title="Sửa">
            <Button className="bg-blue-500 hover:bg-blue-600 text-white" size="sm" onClick={() => { setEditingRecord(record); setModalOpen(true); }}>
              <FaEdit />
            </Button>
          </Tooltip>
          <Tooltip title="Xóa">
            <Popconfirm title="Bạn có chắc muốn xóa mã giảm giá này?" onConfirm={() => handleDelete(record.id)}>
              <Button variant="destructive" size="sm"><FaTrash /></Button>
            </Popconfirm>
          </Tooltip>
        </Space>
      ),
    },
  ];

  // ===========================
  // FORM FIELDS CONFIGURATION
  // ===========================
  const fields = [
    {
      name: "code",
      label: "Mã giảm giá",
      component: <Input placeholder="Nhập mã giảm giá (VD: WELCOME10)" />,
      rules: [
        { required: true, message: "Vui lòng nhập mã giảm giá" },
        { min: 2, message: "Mã giảm giá phải có ít nhất 2 ký tự" },
        { max: 30, message: "Mã giảm giá không được quá 30 ký tự" }
      ],
    },
    {
      name: "name",
      label: "Tên mã giảm giá",
      component: <Input placeholder="Nhập tên mã giảm giá" />,
      rules: [
        { required: true, message: "Vui lòng nhập tên mã giảm giá" },
        { min: 3, message: "Tên mã giảm giá phải có ít nhất 3 ký tự" },
        { max: 150, message: "Tên mã giảm giá không được quá 150 ký tự" }
      ],
    },
    {
      name: "discountType",
      label: "Loại giảm giá",
      component: (
        <Select placeholder="Chọn loại giảm giá">
          <Option value="PERCENT">Phần trăm (%)</Option>
          <Option value="AMOUNT">Số tiền (VND)</Option>
        </Select>
      ),
      rules: [{ required: true, message: "Vui lòng chọn loại giảm giá" }],
    },
    {
      name: "discountValue",
      label: "Giá trị giảm giá",
      component: <InputNumber placeholder="Nhập giá trị giảm giá" style={{ width: "100%" }} min={0.01} precision={2} />,
      rules: [
        { required: true, message: "Vui lòng nhập giá trị giảm giá" },
        { type: 'number', min: 0.01, message: "Giá trị giảm giá phải là số dương" }
      ],
    },
    {
      name: "minimumAmount",
      label: "Đơn hàng tối thiểu (VND)",
      component: <InputNumber placeholder="Nhập đơn hàng tối thiểu" style={{ width: "100%" }} min={0} precision={0} />,
      rules: [{ type: 'number', min: 0, message: "Giá trị đơn hàng tối thiểu không được âm" }],
    },
    {
      name: "usageLimit",
      label: "Giới hạn sử dụng",
      component: <InputNumber placeholder="Nhập số lần sử dụng tối đa" style={{ width: "100%" }} min={1} precision={0} />,
      rules: [
        { type: 'number', min: 1, message: "Giới hạn sử dụng phải ít nhất 1" },
        { type: 'integer', message: "Giới hạn sử dụng phải là số nguyên" }
      ],
    },
    {
      name: "dateRange",
      label: "Thời gian hiệu lực",
      component: <RangePicker style={{ width: "100%" }} showTime={false} />,
      rules: [
        { required: true, message: "Vui lòng chọn thời gian hiệu lực" },
        {
          validator: (_, value) => {
            if (!value || !value[0] || !value[1]) {
              return Promise.reject(new Error('Vui lòng chọn cả ngày bắt đầu và kết thúc'));
            }
            if (value[1].isBefore(value[0])) {
              return Promise.reject(new Error('Ngày kết thúc phải sau ngày bắt đầu'));
            }
            return Promise.resolve();
          }
        }
      ],
    },
    {
      name: "isActive",
      label: "Trạng thái hoạt động",
      component: <Switch checkedChildren="Hoạt động" unCheckedChildren="Tạm dừng" />,
      valuePropName: "checked",
    },
  ];

  // ===========================
  // DETAIL FIELDS CONFIGURATION
  // ===========================
  const detailFields = [
    { name: "id", label: "ID" },
    { 
      name: "code", 
      label: "Mã giảm giá",
      render: (code) => (
        <Tag color="purple" style={{ fontSize: '12px', fontWeight: 'bold', borderRadius: '6px', padding: '4px 8px' }}>
          {code}
        </Tag>
      )
    },
    { name: "name", label: "Tên mã giảm giá" },
    {
      name: "discountType",
      label: "Loại giảm giá",
      render: (type) => (
        <Tag color={type === 'PERCENT' ? 'blue' : 'green'}>
          {type === 'PERCENT' ? 'Phần trăm' : 'Số tiền'}
        </Tag>
      ),
    },
    {
      name: "discountValue",
      label: "Giá trị giảm",
      render: (value, record) => (
        <span style={{ fontSize: '12px', fontWeight: 'bold' }}>
          {record.discountType === 'PERCENT' ? `${value}%` : formatPrice(value)}
        </span>
      ),
    },
    {
      name: "minimumAmount",
      label: "Đơn hàng tối thiểu",
      render: (amount) => amount ? formatPrice(amount) : 'Không giới hạn',
    },
    {
      name: "usageLimit",
      label: "Giới hạn sử dụng",
      render: (limit) => limit ? (
        <Tag color="magenta" style={{ fontSize: '12px', fontWeight: 'bold' }}>
          {limit} lượt sử dụng
        </Tag>
      ) : (
        <Tag color="default" style={{ fontSize: '12px', fontStyle: 'italic' }}>
          Không giới hạn
        </Tag>
      ),
    },
    {
      name: "startDate",
      label: "Ngày bắt đầu",
      render: (date) => dayjs(date).format('DD/MM/YYYY HH:mm'),
    },
    {
      name: "endDate",
      label: "Ngày kết thúc",
      render: (date) => dayjs(date).format('DD/MM/YYYY HH:mm'),
    },
    {
      name: "isActive",
      label: "Trạng thái",
      render: (isActive) => <Tag color={isActive ? "green" : "red"}>{isActive ? "Hoạt động" : "Tạm dừng"}</Tag>,
    },
    {
      name: "createdAt",
      label: "Ngày tạo",
      render: (date) => dayjs(date).format('DD/MM/YYYY HH:mm'),
    },
  ];

  // ===========================
  // RENDER COMPONENT
  // ===========================
  return (
    <>
      {/* CSS Animation */}
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
            text="Quản lý Mã giảm giá"
            color="#667eea"
            style={{
              background: "linear-gradient(45deg, #667eea, #764ba2, #f093fb, #667eea)",
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
              {/* Header với các nút điều khiển */}
              <div className="flex justify-between mb-4">
                <div className="flex gap-4">
                  <Button variant="default" onClick={() => { setEditingRecord(null); setModalOpen(true); }}>
                    <FaPlus /> Thêm mã giảm giá
                  </Button>
                  <Search
                    placeholder="Tìm kiếm mã giảm giá..."
                    allowClear
                    size="large"
                    value={searchValue}
                    onChange={(e) => setSearchValue(e.target.value)}
                    style={{ width: 300 }}
                  />
                  <Select
                    placeholder="Lọc theo trạng thái"
                    allowClear
                    style={{ width: 200 }}
                    value={statusFilter}
                    onChange={setStatusFilter}
                  >
                    <Option value="true">Đang hoạt động</Option>
                    <Option value="false">Tạm dừng</Option>
                  </Select>
                </div>
                <div>Tổng: {pagination.total} mã giảm giá</div>
              </div>

              {/* Bảng dữ liệu */}
              {showSkeleton ? (
                <TableSkeleton />
              ) : (
                <Table
                  columns={columns}
                  dataSource={coupons}
                  rowKey="id"
                  pagination={{
                    current: pagination.page,
                    pageSize: pagination.limit,
                    total: pagination.total,
                    showSizeChanger: true,
                    showQuickJumper: true,
                    showTotal: (total, range) => `${range[0]}-${range[1]} của ${total} mã giảm giá`,
                    onChange: (page, pageSize) => {
                      setPagination((prev) => ({ ...prev, page, limit: pageSize || prev.limit }));
                    },
                  }}
                  scroll={{ x: 1200 }}
                />
              )}
            </Card>
          </Badge.Ribbon>
        </Col>
      </Row>

      {/* Modal CRUD */}
      <CrudModal
        open={modalOpen}
        onCancel={() => { setModalOpen(false); setEditingRecord(null); }}
        onSubmit={handleSubmit}
        editingRecord={processEditingRecord(editingRecord)}
        fields={fields}
        title={editingRecord ? "Sửa mã giảm giá" : "Thêm mã giảm giá"}
        confirmLoading={modalLoading}
        okText={editingRecord ? "Cập nhật" : "Tạo mới"}
        width={800}
      />

      {/* Modal Detail */}
      <DetailModal
        open={detailOpen}
        onCancel={() => setDetailOpen(false)}
        title="Chi tiết mã giảm giá"
        data={detailData}
        fields={detailFields}
        width={600}
      />
    </>
  );
}

