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
  Tooltip
} from "antd";
import {
  FaPlus,
  FaEdit,
  FaTrash,
  FaEye
} from "react-icons/fa";
import { Button } from "@/components/ui/button";
import { TableSkeleton } from "@/components/ui/skeleton";
import CrudModal from "@/pages/hepler/CrudModal";
import DetailModal from "@/pages/hepler/DetailModal";
import { useAdminCRUD } from "@/hooks/useAdminCRUD";
import {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  getCategoryById,
} from "@/api/adminCategories";

const { Search } = Input;

export default function AdminCategoriesOptimized() {
  // Sử dụng custom hook
  const {
    data: categories,
    pagination,
    searchValue,
    setSearchValue,
    showSkeleton,
    modalLoading,
    loadingItemId,
    modalOpen,
    detailOpen,
    editingRecord,
    detailData,
    handleCreate,
    handleEdit,
    handleViewDetail,
    handleSubmit,
    handleDelete,
    handleModalClose,
    handleDetailClose,
    handlePaginationChange,
  } = useAdminCRUD({
    getList: getCategories,
    getById: getCategoryById,
    create: createCategory,
    update: updateCategory,
    delete: deleteCategory,
  });

  const columns = [
    {
      title: "ID",
      dataIndex: "id",
      key: "id",
      width: 80,
    },
    {
      title: "Hình ảnh",
      dataIndex: "imageUrl",
      key: "imageUrl",
      width: 100,
      render: (imageUrl) => (
        imageUrl ? (
          <Image
            width={60}
            height={60}
            src={imageUrl}
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
            No Image
          </div>
        )
      ),
    },
    {
      title: "Tên danh mục",
      dataIndex: "name",
      key: "name",
      render: (text) => <strong>{text}</strong>,
    },
    {
      title: "Slug",
      dataIndex: "slug",
      key: "slug",
      render: (text) => <code>{text}</code>,
    },
    {
      title: "Mô tả",
      dataIndex: "description",
      key: "description",
      ellipsis: true,
    },
    {
      title: "Trạng thái",
      dataIndex: "isActive",
      key: "isActive",
      width: 100,
      render: (isActive) => (
        <Tag color={isActive ? "green" : "red"}>
          {isActive ? "Hoạt động" : "Tạm dừng"}
        </Tag>
      ),
    },
    {
      title: "Ngày tạo",
      dataIndex: "createdAt",
      key: "createdAt",
      width: 120,
      render: (date) => new Date(date).toLocaleDateString("vi-VN"),
    },
    {
      title: "Hành động",
      key: "actions",
      width: 150,
      render: (_, record) => (
        <Space>
          <Tooltip title="Xem chi tiết">
            <Button
              size="small"
              icon={<FaEye />}
              onClick={() => handleViewDetail(record.id)}
              loading={loadingItemId === record.id}
            />
          </Tooltip>
          <Tooltip title="Chỉnh sửa">
            <Button
              size="small"
              icon={<FaEdit />}
              onClick={() => handleEdit(record)}
            />
          </Tooltip>
          <Popconfirm
            title="Bạn có chắc chắn muốn xóa danh mục này?"
            onConfirm={() => handleDelete(record.id)}
            okText="Xóa"
            cancelText="Hủy"
          >
            <Tooltip title="Xóa">
              <Button
                size="small"
                danger
                icon={<FaTrash />}
              />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  // Định nghĩa fields cho CrudModal
  const fields = [
    {
      name: "name",
      label: "Tên danh mục",
      component: <Input placeholder="Nhập tên danh mục" />,
      rules: [
        { required: true, message: "Vui lòng nhập tên danh mục" },
        { min: 2, message: "Tên danh mục phải có ít nhất 2 ký tự" },
      ],
    },
    {
      name: "description",
      label: "Mô tả",
      component: <Input.TextArea rows={3} placeholder="Nhập mô tả danh mục" />,
    },
    {
      name: "imageUrl",
      label: "URL hình ảnh",
      component: <Input placeholder="Nhập URL hình ảnh" />,
    },
    {
      name: "isActive",
      label: "Trạng thái",
      component: <input type="checkbox" />,
      valuePropName: "checked",
    },
  ];

  // Định nghĩa fields cho DetailModal
  const detailFields = [
    { name: "id", label: "ID" },
    { name: "name", label: "Tên danh mục" },
    { name: "slug", label: "Slug" },
    { name: "description", label: "Mô tả" },
    { 
      name: "imageUrl", 
      label: "Hình ảnh",
      render: (value) => value ? <Image width={100} src={value} /> : "Không có hình ảnh"
    },
    { 
      name: "isActive", 
      label: "Trạng thái",
      render: (value) => (
        <Tag color={value ? "green" : "red"}>
          {value ? "Hoạt động" : "Tạm dừng"}
        </Tag>
      )
    },
    { 
      name: "createdAt", 
      label: "Ngày tạo",
      render: (value) => new Date(value).toLocaleDateString("vi-VN")
    },
  ];

  return (
    <div className="space-y-6">
      <Card>
        <Row justify="space-between" align="middle" className="mb-4">
          <Col>
            <h1 className="text-2xl font-bold mb-0">Quản lý Danh mục (Optimized)</h1>
            <p className="text-gray-600">Quản lý danh mục sản phẩm - Sử dụng Custom Hooks</p>
          </Col>
          <Col>
            <Button
              type="primary"
              icon={<FaPlus />}
              onClick={handleCreate}
              size="large"
            >
              Thêm danh mục
            </Button>
          </Col>
        </Row>

        <Row justify="space-between" align="middle" className="mb-4">
          <Col>
            <Search
              placeholder="Tìm kiếm danh mục..."
              allowClear
              size="large"
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              style={{ width: 300 }}
            />
          </Col>
          <Col>
            <span className="text-gray-600">
              Tổng: {pagination.total} danh mục
            </span>
          </Col>
        </Row>

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
              onChange: handlePaginationChange,
            }}
            scroll={{ x: 1000 }}
          />
        )}
      </Card>

      {/* CrudModal cho Create/Edit */}
      <CrudModal
        open={modalOpen}
        onCancel={handleModalClose}
        onSubmit={handleSubmit}
        editingRecord={editingRecord}
        fields={fields}
        title={editingRecord ? "Sửa danh mục" : "Thêm danh mục mới"}
        confirmLoading={modalLoading}
        okText={editingRecord ? "Cập nhật" : "Tạo mới"}
      />

      {/* DetailModal cho View */}
      <DetailModal
        open={detailOpen}
        onCancel={handleDetailClose}
        title="Chi tiết danh mục"
        data={detailData}
        fields={detailFields}
        width={600}
      />
    </div>
  );
}
