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
  Select,
  Checkbox,
  Button as AntButton,
  Empty,
  Spin,
  Modal,
  Upload,
  message,
  Divider,
  Switch,
  InputNumber
} from "antd";
import { 
  FaPlus, 
  FaEdit, 
  FaTrash, 
  FaEye, 
  FaImages,
  FaUpload,
  FaStar,
  FaStarHalfAlt,
  FaArrowsAlt,
  FaEyeSlash
} from "react-icons/fa";
import { 
  UploadOutlined,
  DeleteOutlined,
  StarOutlined,
  StarFilled,
  DragOutlined,
  EyeOutlined,
  EyeInvisibleOutlined
} from "@ant-design/icons";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TableSkeleton } from "@/components/ui/skeleton";
import { toast } from "react-toastify";
import {
  getProductImages,
  createProductImage,
  updateProductImage,
  deleteProductImage,
  setPrimaryImage,
  reorderImages,
  updateProductPrimaryImage
} from "@/api/adminProductImages";
import { getProducts } from "@/api/adminProducts";
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';

const { Search } = Input;
const { Option } = Select;

export default function AdminProductImages() {
  const [showSkeleton, setShowSkeleton] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [images, setImages] = useState([]);
  const [products, setProducts] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0 });
  const [keyword, setKeyword] = useState("");
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [detailData, setDetailData] = useState(null);
  const [loadingImageId, setLoadingImageId] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [fileList, setFileList] = useState([]);
  const [selectedImages, setSelectedImages] = useState([]);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);

  // Hàm delay
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, 500));

  // debounce search
  const [searchValue, setSearchValue] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => {
      setPagination((prev) => ({ ...prev, page: 1 }));
      setKeyword(searchValue);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchValue]);

  // Load danh sách sản phẩm
  const fetchProducts = async () => {
    try {
      const response = await getProducts({ page: 1, limit: 1000 });
      setProducts(response.data.items || []);
    } catch (error) {
      console.error("Error fetching products:", error);
    }
  };

  // Load danh sách ảnh
  const fetchImages = async () => {
    if (!selectedProduct) return;
    
    setShowSkeleton(true);
    try {
      console.log('Fetching images for product:', selectedProduct.id);
      const response = await getProductImages(selectedProduct.id);
      console.log('API response:', response);
      
      const items = response.data?.items || [];
      
      // Validate và filter dữ liệu để đảm bảo có id
      const validItems = items.filter(item => item && item.id);
      console.log('Valid items:', validItems);
      setImages(validItems);
      
      // Clear selection khi fetch lại dữ liệu
      setSelectedImages([]);
      
      setPagination((prev) => ({
        ...prev,
        total: response.data?.total || 0,
      }));
      await sleep(800);
    } catch (error) {
      console.error("Error fetching images:", error);
      if (error.response?.status === 404) {
        toast.error("Không tìm thấy ảnh cho sản phẩm này");
      } else {
        toast.error("Lỗi khi tải danh sách ảnh");
      }
      setImages([]); // Set empty array nếu có lỗi
    } finally {
      setShowSkeleton(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  useEffect(() => {
    if (selectedProduct) {
      fetchImages();
    }
  }, [selectedProduct, pagination.page, pagination.limit, keyword]);

  // Handle upload single file
  const handleUpload = async (file) => {
    if (!selectedProduct) {
      message.error("Vui lòng chọn sản phẩm trước");
      return false;
    }

    // Validation file
    const isImage = file.type.startsWith('image/');
    if (!isImage) {
      toast.error('Chỉ chấp nhận file ảnh!');
      return false;
    }
    
    const isLt5M = file.size / 1024 / 1024 < 5;
    if (!isLt5M) {
      toast.error('Kích thước ảnh không được vượt quá 5MB!');
      return false;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('image', file);
      formData.append('isPrimary', images.length === 0); // Ảnh đầu tiên làm ảnh chính
      formData.append('sortOrder', images.length);

      await createProductImage(selectedProduct.id, formData);
      toast.success("Upload ảnh thành công");
      fetchImages();
      return false; // Prevent default upload
    } catch (error) {
      toast.error("Lỗi khi upload ảnh");
      console.error("Upload error:", error);
      return false;
    } finally {
      setUploading(false);
    }
  };

  // Handle upload multiple files
  const handleMultipleUpload = async (files) => {
    if (!selectedProduct) {
      message.error("Vui lòng chọn sản phẩm trước");
      return;
    }

    if (!files || files.length === 0) {
      return;
    }

    setUploading(true);
    try {
      // Lấy số lượng ảnh hiện tại để tính sortOrder
      const currentImageCount = images.length;
      let successCount = 0;
      
      // Upload từng file một
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        // Validation file
        const isImage = file.type.startsWith('image/');
        if (!isImage) {
          toast.error(`File ${file.name} không phải là ảnh!`);
          continue;
        }
        
        const isLt5M = file.size / 1024 / 1024 < 5;
        if (!isLt5M) {
          toast.error(`File ${file.name} quá lớn (max 5MB)!`);
          continue;
        }

        const formData = new FormData();
        formData.append('image', file);
        // Chỉ ảnh đầu tiên của batch upload mới làm ảnh chính (nếu chưa có ảnh nào)
        formData.append('isPrimary', currentImageCount === 0 && i === 0);
        // Tính sortOrder dựa trên số lượng ảnh hiện tại + index
        formData.append('sortOrder', currentImageCount + i);

        await createProductImage(selectedProduct.id, formData);
        successCount++;
      }
      
      toast.success(`Upload thành công ${successCount} ảnh`);
      // Chỉ fetch lại sau khi upload xong tất cả
      fetchImages();
    } catch (error) {
      toast.error("Lỗi khi upload ảnh");
      console.error("Upload error:", error);
    } finally {
      setUploading(false);
    }
  };

  // Handle delete single image
  const handleDelete = async (id) => {
    try {
      await deleteProductImage(id);
      toast.success("Xóa ảnh thành công");
      fetchImages();
    } catch (error) {
      toast.error(error.response?.data?.message || "Có lỗi xảy ra");
    }
  };

  // Handle select/deselect image
  const handleSelectImage = (imageId) => {
    setSelectedImages(prev => {
      if (prev.includes(imageId)) {
        return prev.filter(id => id !== imageId);
      } else {
        return [...prev, imageId];
      }
    });
  };

  // Handle select all images
  const handleSelectAll = () => {
    if (selectedImages.length === images.length) {
      setSelectedImages([]);
    } else {
      setSelectedImages(images.map(img => img.id));
    }
  };

  // Handle delete multiple images
  const handleDeleteMultiple = async () => {
    if (selectedImages.length === 0) {
      toast.error("Vui lòng chọn ảnh để xóa");
      return;
    }

    setDeleteModalVisible(true);
  };

  // Confirm delete multiple images
  const confirmDeleteMultiple = async () => {
    try {
      setModalLoading(true);
      
      // Delete từng ảnh một
      for (const imageId of selectedImages) {
        await deleteProductImage(imageId);
      }
      
      toast.success(`Xóa thành công ${selectedImages.length} ảnh`);
      setSelectedImages([]);
      setDeleteModalVisible(false);
      fetchImages();
    } catch (error) {
      toast.error("Lỗi khi xóa ảnh");
      console.error("Error deleting images:", error);
    } finally {
      setModalLoading(false);
    }
  };

  // Handle set primary
  const handleSetPrimary = async (id) => {
    try {
      await setPrimaryImage(selectedProduct.id, id);
      toast.success("Đặt ảnh chính thành công");
      
      // Đồng bộ ảnh chính với product
      await syncPrimaryImageWithProduct(selectedProduct.id, id);
      toast.success("Đã đồng bộ ảnh chính với sản phẩm");
      
      fetchImages();
    } catch (error) {
      toast.error(error.response?.data?.message || "Có lỗi xảy ra");
    }
  };

  // Đồng bộ ảnh chính với product
  const syncPrimaryImageWithProduct = async (productId, imageId) => {
    try {
      console.log('Bắt đầu đồng bộ ảnh chính:', { productId, imageId });
      
      // Lấy thông tin ảnh chính
      const primaryImage = images.find(img => img.id === imageId);
      console.log('Ảnh chính tìm thấy:', primaryImage);
      
      if (!primaryImage) {
        console.warn('Không tìm thấy ảnh chính với id:', imageId);
        return;
      }

      const syncData = {
        imageUrl: primaryImage.imageUrl,
        imagePublicId: primaryImage.imagePublicId
      };
      
      console.log('Dữ liệu đồng bộ:', syncData);

      // Cập nhật ảnh chính cho product
      const response = await updateProductPrimaryImage(productId, syncData);
      console.log('Response từ API:', response);
      
      console.log('Đã đồng bộ ảnh chính với product:', productId);
    } catch (error) {
      console.error('Lỗi khi đồng bộ ảnh chính:', error);
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      // Không hiển thị lỗi cho user vì đây là chức năng phụ
    }
  };

  // Handle reorder
  const handleDragEnd = async (result) => {
    if (!result.destination) return;
    
    // Kiểm tra source và destination có hợp lệ không
    if (result.source.index === result.destination.index) return;
    
    try {
      const newImages = Array.from(images);
      const [reorderedItem] = newImages.splice(result.source.index, 1);
      newImages.splice(result.destination.index, 0, reorderedItem);

      setImages(newImages);

      const imageOrders = newImages.map((img, index) => ({
        id: img.id,
        displayOrder: index + 1
      }));
      
      await reorderImages(selectedProduct.id, imageOrders);
      toast.success("Sắp xếp ảnh thành công");
    } catch (error) {
      console.error("Error reordering images:", error);
      toast.error("Lỗi khi sắp xếp ảnh");
      fetchImages(); // Revert on error
    }
  };

  // Handle update image
  const handleUpdate = async (values) => {
    setModalLoading(true);
    try {
      await updateProductImage(editingRecord.id, values);
      toast.success("Cập nhật ảnh thành công");
      setModalOpen(false);
      setEditingRecord(null);
      fetchImages();
    } catch (error) {
      toast.error(error.response?.data?.message || "Có lỗi xảy ra");
    } finally {
      setModalLoading(false);
    }
  };

  const columns = [
    {
      title: (
        <Checkbox
          checked={selectedImages.length === images.length && images.length > 0}
          indeterminate={selectedImages.length > 0 && selectedImages.length < images.length}
          onChange={handleSelectAll}
        />
      ),
      key: "select",
      width: 50,
      render: (_, record) => (
        <Checkbox
          checked={selectedImages.includes(record.id)}
          onChange={() => handleSelectImage(record.id)}
        />
      ),
    },
    { 
      title: "Thứ tự", 
      dataIndex: "displayOrder", 
      key: "displayOrder", 
      width: 80,
      render: (order) => <Tag color="blue">{order}</Tag>
    },
    {
      title: "Hình ảnh",
      dataIndex: "imageUrl",
      key: "imageUrl",
      width: 120,
      render: (imageUrl) => (
        <Image 
          width={80} 
          height={80} 
          src={imageUrl} 
          style={{ objectFit: "cover", borderRadius: 8 }} 
        />
      ),
    },
    {
      title: "Tên file",
      dataIndex: "fileName",
      key: "fileName",
      render: (name) => <code>{name}</code>
    },
    {
      title: "Kích thước",
      dataIndex: "fileSize",
      key: "fileSize",
      render: (size) => size ? `${(size / 1024).toFixed(1)} KB` : "-"
    },
    {
      title: "Ảnh chính",
      dataIndex: "isPrimary",
      key: "isPrimary",
      width: 100,
      render: (isPrimary, record) => (
        <div className="flex items-center gap-2">
          <Tag color={isPrimary ? "gold" : "default"}>
            {isPrimary ? <FaStar className="inline mr-1" /> : null}
            {isPrimary ? "Chính" : "Phụ"}
          </Tag>
          {isPrimary && (
            <Tag color="green" className="text-xs">
              Đã đồng bộ
            </Tag>
          )}
        </div>
      ),
    },
    {
      title: "Hiển thị",
      dataIndex: "isVisible",
      key: "isVisible",
      width: 100,
      render: (isVisible) => (
        <Tag color={isVisible ? "green" : "red"}>
          {isVisible ? "Hiện" : "Ẩn"}
        </Tag>
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
          <Tooltip title="Đặt làm ảnh chính">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => handleSetPrimary(record.id)}
              disabled={record.isPrimary}
            >
              <FaStar />
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
              title="Bạn có chắc muốn xóa ảnh này?"
              onConfirm={() => handleDelete(record.id)}
              okText="Xóa"
              cancelText="Hủy"
            >
              <Button
                className="bg-red-500 hover:bg-red-600 text-white"
                size="sm"
              >
                <FaTrash />
              </Button>
            </Popconfirm>
          </Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          <FaImages className="inline mr-2" />
          Quản lý hình ảnh sản phẩm
        </h1>
        <p className="text-gray-600">
          Quản lý và sắp xếp hình ảnh cho các sản phẩm
        </p>
      </div>

      {/* Product Selection */}
      <Card className="mb-6">
        <h3 className="text-lg font-semibold mb-4">Chọn sản phẩm</h3>
        <Row gutter={16}>
          <Col span={12}>
            <Select
              placeholder="Chọn sản phẩm để quản lý ảnh"
              style={{ width: "100%" }}
              value={selectedProduct?.id}
              onChange={(productId) => {
                const product = products.find(p => p.id === productId);
                setSelectedProduct(product);
              }}
              showSearch
              filterOption={(input, option) =>
                option.children.toLowerCase().includes(input.toLowerCase())
              }
            >
              {products.map((product) => (
                <Option key={product.id} value={product.id}>
                  {product.name} ({product.sku})
                </Option>
              ))}
            </Select>
          </Col>
          <Col span={12}>
            {selectedProduct && (
              <div className="flex items-center gap-4">
                <Image
                  width={60}
                  height={60}
                  src={selectedProduct.imageUrl}
                  style={{ objectFit: "cover", borderRadius: 8 }}
                />
                <div>
                  <p className="font-semibold">{selectedProduct.name}</p>
                  <p className="text-sm text-gray-500">SKU: {selectedProduct.sku}</p>
                </div>
              </div>
            )}
          </Col>
        </Row>
      </Card>

      {selectedProduct ? (
        <>
          {/* Upload Section */}
          <Card className="mb-6">
            <h3 className="text-lg font-semibold mb-4">Upload ảnh mới</h3>
            <div className="space-y-4">
              {/* Upload ảnh tích hợp */}
              <div>
                <label className="block text-sm font-medium mb-2">Upload ảnh</label>
                <Upload
                  beforeUpload={() => false}
                  fileList={fileList}
                  onChange={({ fileList: newFileList }) => {
                    setFileList(newFileList);
                  }}
                  onDrop={(e) => {
                    const files = Array.from(e.dataTransfer.files);
                    if (files.length > 0) {
                      handleMultipleUpload(files);
                    }
                  }}
                  multiple={true}
                  showUploadList={true}
                  accept="image/*"
                  customRequest={({ file, onSuccess, onError }) => {
                    // Custom request handler để tránh duplicate
                    if (file) {
                      handleMultipleUpload([file]);
                    }
                    onSuccess();
                  }}
                >
                  <Button
                    className="bg-blue-500 hover:bg-blue-600 text-white"
                    disabled={uploading}
                    loading={uploading ? true : undefined}
                    icon={<FaUpload />}
                  >
                    {uploading ? "Đang upload..." : "Chọn ảnh"}
                  </Button>
                </Upload>
                
                {/* Button để trigger upload */}
                {fileList.length > 0 && (
                  <Button
                    className="bg-green-500 hover:bg-green-600 text-white ml-2"
                    disabled={uploading}
                    loading={uploading ? true : undefined}
                    onClick={() => {
                      const files = fileList.map(file => file.originFileObj).filter(Boolean);
                      if (files.length > 0) {
                        handleMultipleUpload(files);
                        setFileList([]); // Clear fileList sau khi upload
                      }
                    }}
                  >
                    {uploading ? "Đang upload..." : `Upload ${fileList.length} ảnh`}
                  </Button>
                )}
              </div>
            </div>
            <p className="text-gray-500 text-sm mt-2">
              Hỗ trợ: JPG, PNG, JPEG, WEBP (tối đa 5MB mỗi file)
            </p>
          </Card>

          {/* Images Table */}
          <Card>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">
                Danh sách ảnh ({images.length})
              </h3>
              <div className="flex gap-2 items-center">
                <Search
                  placeholder="Tìm kiếm ảnh..."
                  value={searchValue}
                  onChange={(e) => setSearchValue(e.target.value)}
                  style={{ width: 300 }}
                />
                {selectedImages.length > 0 && (
                  <Button
                    danger={true}
                    icon={<FaTrash />}
                    onClick={handleDeleteMultiple}
                    disabled={uploading}
                  >
                    Xóa {selectedImages.length} ảnh
                  </Button>
                )}
              </div>
            </div>

            {showSkeleton ? (
              <TableSkeleton />
            ) : images.length > 0 ? (
              <DragDropContext onDragEnd={handleDragEnd}>
                <Droppable 
                  droppableId="images" 
                  isDropDisabled={false} 
                  isCombineEnabled={false}
                  ignoreContainerClipping={false}
                  type="IMAGE"
                >
                  {(provided) => (
                    <div {...provided.droppableProps} ref={provided.innerRef}>
                      <Table
                        columns={columns}
                        dataSource={images}
                        rowKey={(record) => record?.id || Math.random()}
                        pagination={{
                          current: pagination.page,
                          pageSize: pagination.limit,
                          total: pagination.total,
                          onChange: (page, limit) => {
                            setPagination((prev) => ({ ...prev, page, limit }));
                          },
                        }}
                        components={{
                          body: {
                            row: (props) => {
                              // Kiểm tra props.record tồn tại và có id
                              if (!props.record || !props.record.id) {
                                return <tr {...props}>{props.children}</tr>;
                              }
                              
                              return (
                                <Draggable
                                  draggableId={props.record.id.toString()}
                                  index={props.index}
                                >
                                  {(provided) => (
                                    <tr
                                      {...props}
                                      ref={provided.innerRef}
                                      {...provided.draggableProps}
                                      {...provided.dragHandleProps}
                                    >
                                      {props.children}
                                    </tr>
                                  )}
                                </Draggable>
                              );
                            },
                          },
                        }}
                      />
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </DragDropContext>
            ) : (
              <Empty
                description="Chưa có ảnh nào"
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              />
            )}
          </Card>
        </>
      ) : (
        <Card>
          <Empty
            description="Vui lòng chọn sản phẩm để quản lý ảnh"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
        </Card>
      )}

      {/* Edit Modal */}
      <Modal
        title="Chỉnh sửa ảnh"
        open={modalOpen}
        onCancel={() => {
          setModalOpen(false);
          setEditingRecord(null);
        }}
        footer={null}
        width={600}
        destroyOnHidden={true}
      >
        {editingRecord && (
          <div className="space-y-4">
            <div className="text-center">
              <Image
                width={200}
                height={200}
                src={editingRecord.imageUrl}
                style={{ objectFit: "cover", borderRadius: 8 }}
              />
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Tên file
                </label>
                <Input
                  value={editingRecord.fileName}
                  disabled
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">
                  Thứ tự hiển thị
                </label>
                <InputNumber
                  min={1}
                  value={editingRecord.displayOrder}
                  onChange={(value) => {
                    setEditingRecord(prev => ({ ...prev, displayOrder: value }));
                  }}
                  style={{ width: "100%" }}
                />
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={editingRecord.isVisible}
                    onChange={(checked) => {
                      setEditingRecord(prev => ({ ...prev, isVisible: checked }));
                    }}
                  />
                  <span>Hiển thị</span>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={editingRecord.isPrimary}
                    onChange={(checked) => {
                      setEditingRecord(prev => ({ ...prev, isPrimary: checked }));
                    }}
                  />
                  <span>Ảnh chính</span>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setModalOpen(false);
                  setEditingRecord(null);
                }}
              >
                Hủy
              </Button>
              <Button
                onClick={() => handleUpdate(editingRecord)}
                disabled={modalLoading}
              >
                {modalLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : null}
                Cập nhật
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal xác nhận xóa nhiều ảnh */}
      <Modal
        title="Xác nhận xóa ảnh"
        open={deleteModalVisible}
        onCancel={() => setDeleteModalVisible(false)}
        destroyOnHidden={true}
        footer={[
          <Button
            key="cancel"
            onClick={() => setDeleteModalVisible(false)}
            disabled={modalLoading}
          >
            Hủy
          </Button>,
          <Button
            key="delete"
            danger={true}
            onClick={confirmDeleteMultiple}
            loading={modalLoading ? true : undefined}
            icon={<FaTrash />}
          >
            Xóa {selectedImages.length} ảnh
          </Button>,
        ]}
      >
        <div className="text-center py-4">
          <FaTrash className="text-red-500 text-4xl mx-auto mb-4" />
          <p className="text-lg font-medium mb-2">
            Bạn có chắc chắn muốn xóa {selectedImages.length} ảnh đã chọn?
          </p>
          <p className="text-gray-500 text-sm">
            Hành động này không thể hoàn tác.
          </p>
        </div>
      </Modal>
    </div>
  );
}
