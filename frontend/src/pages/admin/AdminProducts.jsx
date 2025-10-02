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
  Image,
  Select,
  InputNumber
} from 'antd';
import { 
  PlusOutlined, 
  EditOutlined, 
  DeleteOutlined, 
  SearchOutlined
} from '@ant-design/icons';
import adminProductsAPI from '@/api/adminProducts';
import adminCategoriesAPI from '@/api/adminCategories';
import adminBrandsAPI from '@/api/adminBrands';

const { Search } = Input;
const { Option } = Select;

export default function AdminProducts() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [form] = Form.useForm();
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0
  });
  const [searchText, setSearchText] = useState('');

  // Fetch products
  const fetchProducts = async (page = 1, search = '') => {
    setLoading(true);
    try {
      const response = await adminProductsAPI.getProducts({
        page,
        limit: pagination.pageSize,
        search
      });
      
      setProducts(response.data.data || []);
      setPagination(prev => ({
        ...prev,
        current: page,
        total: response.data.total || 0
      }));
    } catch (error) {
      message.error('Lỗi khi tải danh sách sản phẩm');
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch categories and brands for select options
  const fetchSelectOptions = async () => {
    try {
      const [categoriesRes, brandsRes] = await Promise.all([
        adminCategoriesAPI.getCategories({ limit: 1000 }),
        adminBrandsAPI.getBrands({ limit: 1000 })
      ]);
      
      setCategories(categoriesRes.data.data || []);
      setBrands(brandsRes.data.data || []);
    } catch (error) {
      console.error('Error fetching select options:', error);
    }
  };

  useEffect(() => {
    fetchProducts();
    fetchSelectOptions();
  }, []);

  // Handle search
  const handleSearch = (value) => {
    setSearchText(value);
    fetchProducts(1, value);
  };

  // Handle pagination
  const handleTableChange = (pagination) => {
    fetchProducts(pagination.current, searchText);
  };

  // Handle create/edit
  const handleSubmit = async (values) => {
    try {
      if (editingProduct) {
        await adminProductsAPI.updateProduct(editingProduct.id, values);
        message.success('Cập nhật sản phẩm thành công');
      } else {
        await adminProductsAPI.createProduct(values);
        message.success('Tạo sản phẩm thành công');
      }
      
      setModalVisible(false);
      setEditingProduct(null);
      form.resetFields();
      fetchProducts(pagination.current, searchText);
    } catch (error) {
      message.error(error.response?.data?.message || 'Có lỗi xảy ra');
    }
  };

  // Handle delete
  const handleDelete = async (id) => {
    try {
      await adminProductsAPI.deleteProduct(id);
      message.success('Xóa sản phẩm thành công');
      fetchProducts(pagination.current, searchText);
    } catch (error) {
      message.error(error.response?.data?.message || 'Có lỗi xảy ra');
    }
  };

  // Handle edit
  const handleEdit = (record) => {
    setEditingProduct(record);
    form.setFieldsValue({
      name: record.name,
      sku: record.sku,
      price: record.price,
      stock: record.stockQuantity,
      description: record.description,
      categoryId: record.categoryId,
      brandId: record.brandId,
      isActive: record.isActive
    });
    setModalVisible(true);
  };

  // Handle create
  const handleCreate = () => {
    setEditingProduct(null);
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
      title: 'SKU',
      dataIndex: 'sku',
      key: 'sku',
      width: 120,
      render: (text) => <code>{text}</code>,
    },
    {
      title: 'Tên sản phẩm',
      dataIndex: 'name',
      key: 'name',
      render: (text) => <strong>{text}</strong>,
    },
    {
      title: 'Danh mục',
      dataIndex: 'category',
      key: 'category',
      render: (category) => category?.name || '-',
    },
    {
      title: 'Thương hiệu',
      dataIndex: 'brand',
      key: 'brand',
      render: (brand) => brand?.name || '-',
    },
    {
      title: 'Giá',
      dataIndex: 'price',
      key: 'price',
      width: 120,
      render: (price) => (
        <span className="font-semibold text-green-600">
          {new Intl.NumberFormat('vi-VN', {
            style: 'currency',
            currency: 'VND'
          }).format(price)}
        </span>
      ),
    },
    {
      title: 'Tồn kho',
      dataIndex: 'stockQuantity',
      key: 'stockQuantity',
      width: 100,
      render: (stock) => (
        <Tag color={stock > 10 ? 'green' : stock > 0 ? 'orange' : 'red'}>
          {stock}
        </Tag>
      ),
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
            title="Bạn có chắc chắn muốn xóa sản phẩm này?"
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
            <h1 className="text-2xl font-bold mb-0">Quản lý Sản phẩm</h1>
            <p className="text-gray-600">Quản lý sản phẩm trong hệ thống</p>
          </Col>
          <Col>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={handleCreate}
              size="large"
            >
              Thêm sản phẩm
            </Button>
          </Col>
        </Row>

        <Row justify="space-between" align="middle" className="mb-4">
          <Col>
            <Search
              placeholder="Tìm kiếm sản phẩm..."
              allowClear
              enterButton={<SearchOutlined />}
              size="large"
              onSearch={handleSearch}
              style={{ width: 300 }}
            />
          </Col>
          <Col>
            <span className="text-gray-600">
              Tổng: {pagination.total} sản phẩm
            </span>
          </Col>
        </Row>

        <Table
          columns={columns}
          dataSource={products}
          rowKey="id"
          loading={loading}
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total: pagination.total,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => 
              `${range[0]}-${range[1]} của ${total} sản phẩm`,
          }}
          onChange={handleTableChange}
          scroll={{ x: 1200 }}
        />
      </Card>

      <Modal
        title={editingProduct ? 'Sửa sản phẩm' : 'Thêm sản phẩm mới'}
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          setEditingProduct(null);
          form.resetFields();
        }}
        footer={null}
        width={800}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="name"
                label="Tên sản phẩm"
                rules={[
                  { required: true, message: 'Vui lòng nhập tên sản phẩm' },
                  { min: 2, message: 'Tên sản phẩm phải có ít nhất 2 ký tự' }
                ]}
              >
                <Input placeholder="Nhập tên sản phẩm" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="sku"
                label="SKU"
                rules={[
                  { required: true, message: 'Vui lòng nhập SKU' }
                ]}
              >
                <Input placeholder="Nhập SKU sản phẩm" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="price"
                label="Giá"
                rules={[
                  { required: true, message: 'Vui lòng nhập giá sản phẩm' },
                  { type: 'number', min: 0, message: 'Giá phải lớn hơn 0' }
                ]}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  placeholder="Nhập giá sản phẩm"
                  formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                  parser={value => value.replace(/\$\s?|(,*)/g, '')}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="stock"
                label="Số lượng tồn kho"
                rules={[
                  { required: true, message: 'Vui lòng nhập số lượng tồn kho' },
                  { type: 'number', min: 0, message: 'Số lượng phải lớn hơn hoặc bằng 0' }
                ]}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  placeholder="Nhập số lượng tồn kho"
                  min={0}
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="categoryId"
                label="Danh mục"
                rules={[
                  { required: true, message: 'Vui lòng chọn danh mục' }
                ]}
              >
                <Select placeholder="Chọn danh mục">
                  {categories.map(category => (
                    <Option key={category.id} value={category.id}>
                      {category.name}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="brandId"
                label="Thương hiệu"
                rules={[
                  { required: true, message: 'Vui lòng chọn thương hiệu' }
                ]}
              >
                <Select placeholder="Chọn thương hiệu">
                  {brands.map(brand => (
                    <Option key={brand.id} value={brand.id}>
                      {brand.name}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="description"
            label="Mô tả"
          >
            <Input.TextArea 
              rows={3} 
              placeholder="Nhập mô tả sản phẩm"
            />
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
                {editingProduct ? 'Cập nhật' : 'Tạo mới'}
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
