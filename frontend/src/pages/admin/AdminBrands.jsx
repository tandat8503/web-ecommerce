import { useState, useEffect } from 'react';
import { 
  Table, 
  Button, 
  Input, 
  Space, 
  Modal, 
  Form, 
  message, 
  Popconfirm, 
  Card,
  Row,
  Col,
  Tag,
  Image
} from 'antd';
import { 
  PlusOutlined, 
  EditOutlined, 
  DeleteOutlined, 
  SearchOutlined
} from '@ant-design/icons';
import adminBrandsAPI from '@/api/adminBrands';

const { Search } = Input;

export default function AdminBrands() {
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingBrand, setEditingBrand] = useState(null);
  const [form] = Form.useForm();
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0
  });
  const [searchText, setSearchText] = useState('');

  // Fetch brands
  const fetchBrands = async (page = 1, search = '') => {
    setLoading(true);
    try {
      const response = await adminBrandsAPI.getBrands({
        page,
        limit: pagination.pageSize,
        search
      });
      
      setBrands(response.data.data || []);
      setPagination(prev => ({
        ...prev,
        current: page,
        total: response.data.total || 0
      }));
    } catch (error) {
      message.error('Lỗi khi tải danh sách thương hiệu');
      console.error('Error fetching brands:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBrands();
  }, []);

  // Handle search
  const handleSearch = (value) => {
    setSearchText(value);
    fetchBrands(1, value);
  };

  // Handle pagination
  const handleTableChange = (pagination) => {
    fetchBrands(pagination.current, searchText);
  };

  // Handle create/edit
  const handleSubmit = async (values) => {
    try {
      if (editingBrand) {
        await adminBrandsAPI.updateBrand(editingBrand.id, values);
        message.success('Cập nhật thương hiệu thành công');
      } else {
        await adminBrandsAPI.createBrand(values);
        message.success('Tạo thương hiệu thành công');
      }
      
      setModalVisible(false);
      setEditingBrand(null);
      form.resetFields();
      fetchBrands(pagination.current, searchText);
    } catch (error) {
      message.error(error.response?.data?.message || 'Có lỗi xảy ra');
    }
  };

  // Handle delete
  const handleDelete = async (id) => {
    try {
      await adminBrandsAPI.deleteBrand(id);
      message.success('Xóa thương hiệu thành công');
      fetchBrands(pagination.current, searchText);
    } catch (error) {
      message.error(error.response?.data?.message || 'Có lỗi xảy ra');
    }
  };

  // Handle edit
  const handleEdit = (record) => {
    setEditingBrand(record);
    form.setFieldsValue({
      name: record.name,
      country: record.country,
      logoUrl: record.logoUrl,
      isActive: record.isActive
    });
    setModalVisible(true);
  };

  // Handle create
  const handleCreate = () => {
    setEditingBrand(null);
    form.resetFields();
    setModalVisible(true);
  };

  const columns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 80,
    },
    {
      title: 'Logo',
      dataIndex: 'logoUrl',
      key: 'logoUrl',
      width: 100,
      render: (logoUrl) => (
        logoUrl ? (
          <Image
            width={60}
            height={60}
            src={logoUrl}
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
            No Logo
          </div>
        )
      ),
    },
    {
      title: 'Tên thương hiệu',
      dataIndex: 'name',
      key: 'name',
      render: (text) => <strong>{text}</strong>,
    },
    {
      title: 'Quốc gia',
      dataIndex: 'country',
      key: 'country',
      render: (country) => country ? <Tag color="blue">{country}</Tag> : '-',
    },
    {
      title: 'Trạng thái',
      dataIndex: 'isActive',
      key: 'isActive',
      width: 100,
      render: (isActive) => (
        <Tag color={isActive ? 'green' : 'red'}>
          {isActive ? 'Hoạt động' : 'Tạm dừng'}
        </Tag>
      ),
    },
    {
      title: 'Ngày tạo',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 120,
      render: (date) => new Date(date).toLocaleDateString('vi-VN'),
    },
    {
      title: 'Hành động',
      key: 'actions',
      width: 150,
      render: (_, record) => (
        <Space>
          <Button
            type="primary"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            Sửa
          </Button>
          <Popconfirm
            title="Bạn có chắc chắn muốn xóa thương hiệu này?"
            onConfirm={() => handleDelete(record.id)}
            okText="Xóa"
            cancelText="Hủy"
          >
            <Button
              danger
              size="small"
              icon={<DeleteOutlined />}
            >
              Xóa
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <Card>
        <Row justify="space-between" align="middle" className="mb-4">
          <Col>
            <h1 className="text-2xl font-bold mb-0">Quản lý Thương hiệu</h1>
            <p className="text-gray-600">Quản lý thương hiệu sản phẩm</p>
          </Col>
          <Col>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={handleCreate}
              size="large"
            >
              Thêm thương hiệu
            </Button>
          </Col>
        </Row>

        <Row justify="space-between" align="middle" className="mb-4">
          <Col>
            <Search
              placeholder="Tìm kiếm thương hiệu..."
              allowClear
              enterButton={<SearchOutlined />}
              size="large"
              onSearch={handleSearch}
              style={{ width: 300 }}
            />
          </Col>
          <Col>
            <span className="text-gray-600">
              Tổng: {pagination.total} thương hiệu
            </span>
          </Col>
        </Row>

        <Table
          columns={columns}
          dataSource={brands}
          rowKey="id"
          loading={loading}
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total: pagination.total,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => 
              `${range[0]}-${range[1]} của ${total} thương hiệu`,
          }}
          onChange={handleTableChange}
          scroll={{ x: 1000 }}
        />
      </Card>

      <Modal
        title={editingBrand ? 'Sửa thương hiệu' : 'Thêm thương hiệu mới'}
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          setEditingBrand(null);
          form.resetFields();
        }}
        footer={null}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
        >
          <Form.Item
            name="name"
            label="Tên thương hiệu"
            rules={[
              { required: true, message: 'Vui lòng nhập tên thương hiệu' },
              { min: 2, message: 'Tên thương hiệu phải có ít nhất 2 ký tự' }
            ]}
          >
            <Input placeholder="Nhập tên thương hiệu" />
          </Form.Item>

          <Form.Item
            name="country"
            label="Quốc gia"
          >
            <Input placeholder="Nhập quốc gia" />
          </Form.Item>

          <Form.Item
            name="logoUrl"
            label="URL logo"
          >
            <Input placeholder="Nhập URL logo" />
          </Form.Item>

          <Form.Item
            name="isActive"
            label="Trạng thái"
            valuePropName="checked"
            initialValue={true}
          >
            <input type="checkbox" /> Hoạt động
          </Form.Item>

          <Form.Item className="mb-0">
            <Space>
              <Button type="primary" htmlType="submit">
                {editingBrand ? 'Cập nhật' : 'Tạo mới'}
              </Button>
              <Button onClick={() => setModalVisible(false)}>
                Hủy
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
