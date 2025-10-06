import { useState, useEffect } from "react";
import {
  Modal,
  Upload,
  Image,
  Button,
  Space,
  Popconfirm,
  message,
  Row,
  Col,
  Card,
  Tag,
  Tooltip,
  InputNumber,
  Switch,
  Divider,
  Empty,
  Spin
} from "antd";
import {
  UploadOutlined,
  DeleteOutlined,
  StarOutlined,
  StarFilled,
  DragOutlined,
  EyeOutlined
} from "@ant-design/icons";
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { toast } from "react-toastify";
import {
  getProductImages,
  createProductImage,
  updateProductImage,
  deleteProductImage,
  setPrimaryImage,
  reorderImages
} from "@/api/adminProductImages";

export default function ProductImageModal({ 
  open, 
  onCancel, 
  productId, 
  productName 
}) {
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [fileList, setFileList] = useState([]);
  const [hasChanges, setHasChanges] = useState(false);
  const [saving, setSaving] = useState(false);

  // Load ảnh khi modal mở
  useEffect(() => {
    if (open && productId) {
      fetchImages();
    }
  }, [open, productId]);

  const fetchImages = async () => {
    setLoading(true);
    try {
      const response = await getProductImages(productId);
      setImages(response.data.items || []);
      setHasChanges(false); // Reset changes khi load lại
    } catch (error) {
      toast.error("Lỗi khi tải danh sách ảnh");
      console.error("Error fetching images:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (file) => {
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
      formData.append('isPrimary', images.length === 0 ? 'true' : 'false'); // Ảnh đầu tiên làm primary
      formData.append('sortOrder', images.length);

      await createProductImage(productId, formData);
      toast.success("Upload ảnh thành công");
      fetchImages();
      setFileList([]);
      return false; // Prevent default upload
    } catch (error) {
      toast.error("Lỗi khi upload ảnh");
      console.error("Error uploading image:", error);
      return false;
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (imageId) => {
    try {
      await deleteProductImage(imageId);
      toast.success("Xóa ảnh thành công");
      fetchImages();
      setHasChanges(true);
    } catch (error) {
      toast.error("Lỗi khi xóa ảnh");
      console.error("Error deleting image:", error);
    }
  };

  const handleSetPrimary = async (imageId) => {
    try {
      await setPrimaryImage(productId, imageId);
      toast.success("Đã set ảnh chính");
      fetchImages();
      setHasChanges(true);
    } catch (error) {
      toast.error("Lỗi khi set ảnh chính");
      console.error("Error setting primary image:", error);
    }
  };

  const handleReorder = async (newImages) => {
    try {
      const imageOrders = newImages.map((img, index) => ({
        id: img.id,
        sortOrder: index
      }));
      
      await reorderImages(productId, imageOrders);
      setImages(newImages);
      toast.success("Đã sắp xếp lại thứ tự ảnh");
      setHasChanges(true);
    } catch (error) {
      toast.error("Lỗi khi sắp xếp ảnh");
      console.error("Error reordering images:", error);
    }
  };

  // Hàm xử lý lưu thay đổi
  const handleSaveChanges = async () => {
    setSaving(true);
    try {
      // Lưu tất cả thay đổi
      await fetchImages(); // Refresh để lấy dữ liệu mới nhất
      setHasChanges(false);
      toast.success("✅ Đã lưu tất cả thay đổi thành công!");
    } catch (error) {
      toast.error("❌ Lỗi khi lưu thay đổi");
      console.error("Error saving changes:", error);
    } finally {
      setSaving(false);
    }
  };

  // Hàm xử lý đóng modal
  const handleCancel = () => {
    if (hasChanges) {
      // Có thể thêm confirm dialog ở đây nếu cần
      setHasChanges(false);
    }
    onCancel();
  };

  const onDragEnd = (result) => {
    if (!result.destination) return;

    const newImages = Array.from(images);
    const [reorderedItem] = newImages.splice(result.source.index, 1);
    newImages.splice(result.destination.index, 0, reorderedItem);

    setImages(newImages);
    handleReorder(newImages);
  };

  const uploadProps = {
    name: 'image',
    multiple: true,
    fileList,
    beforeUpload: (file) => {
      // Kiểm tra kích thước (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        message.error('Kích thước file không được vượt quá 5MB');
        return false;
      }
      
      // Kiểm tra định dạng
      if (!file.type.startsWith('image/')) {
        message.error('Chỉ chấp nhận file ảnh');
        return false;
      }

      handleUpload(file);
      return false; // Ngăn upload tự động
    },
    onChange: ({ fileList }) => setFileList(fileList),
    showUploadList: false,
    accept: 'image/*'
  };

  return (
    <Modal
      title={
        <div className="flex items-center gap-2">
          <span>Quản lý ảnh sản phẩm: {productName}</span>
          {hasChanges && (
            <Tag color="orange" className="animate-pulse">
              ⚠️ Có thay đổi chưa lưu
            </Tag>
          )}
        </div>
      }
      open={open}
      onCancel={onCancel}
      width={1000}
      footer={[
        <Button key="close" onClick={handleCancel}>
          Đóng
        </Button>,
        <Button 
          key="save" 
          type="primary" 
          loading={saving}
          disabled={!hasChanges}
          onClick={handleSaveChanges}
          className="bg-green-500 hover:bg-green-600"
        >
          {saving ? "Đang lưu..." : "💾 Lưu thay đổi"}
        </Button>
      ]}
    >
      <div className="space-y-4">
        {/* Upload Section */}
        <Card title="Upload ảnh mới" size="small">
          <Upload {...uploadProps}>
            <Button 
              icon={<UploadOutlined />} 
              loading={uploading}
              disabled={uploading}
            >
              Chọn ảnh để upload
            </Button>
          </Upload>
          <p className="text-gray-500 text-sm mt-2">
            Hỗ trợ: JPG, PNG, JPEG, WEBP (tối đa 5MB)
          </p>
        </Card>

        <Divider />

        {/* Images List */}
        <Card title={`Danh sách ảnh (${images.length})`} size="small">
          {loading ? (
            <div className="text-center py-8">
              <Spin size="large" />
              <p className="mt-2">Đang tải ảnh...</p>
            </div>
          ) : images.length === 0 ? (
            <Empty description="Chưa có ảnh nào" />
          ) : (
            <DragDropContext onDragEnd={onDragEnd}>
              <Droppable 
                droppableId="images" 
                direction="horizontal"
                isDropDisabled={false}
                isCombineEnabled={false}
                type="IMAGE"
              >
                {(provided) => (
                  <div
                    {...provided.droppableProps}
                    ref={provided.innerRef}
                    className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4"
                  >
                    {images.map((image, index) => (
                      <Draggable key={image.id} draggableId={image.id.toString()} index={index}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            className={`${snapshot.isDragging ? 'opacity-50' : ''}`}
                          >
                            <Card
                              size="small"
                              hoverable
                              className={`relative ${image.isPrimary ? 'ring-2 ring-blue-500' : ''}`}
                              cover={
                                <div className="relative">
                                  <Image
                                    src={image.imageUrl}
                                    alt={`Ảnh ${index + 1}`}
                                    className="w-full h-32 object-cover"
                                    preview={{
                                      mask: <EyeOutlined />
                                    }}
                                  />
                                  {image.isPrimary && (
                                    <div className="absolute top-2 left-2">
                                      <Tag color="blue" icon={<StarFilled />}>
                                        Ảnh chính
                                      </Tag>
                                    </div>
                                  )}
                                  <div className="absolute top-2 right-2">
                                    <Tag color="default">
                                      #{image.sortOrder + 1}
                                    </Tag>
                                  </div>
                                  <div className="absolute bottom-2 left-2">
                                    <Tag color="default" icon={<DragOutlined />}>
                                      Kéo thả
                                    </Tag>
                                  </div>
                                </div>
                              }
                              actions={[
                                <Tooltip title="Set làm ảnh chính">
                                  <Button
                                    type={image.isPrimary ? "primary" : "default"}
                                    icon={image.isPrimary ? <StarFilled /> : <StarOutlined />}
                                    size="small"
                                    onClick={() => handleSetPrimary(image.id)}
                                  />
                                </Tooltip>,
                                <Tooltip title="Xóa ảnh">
                                  <Popconfirm
                                    title="Bạn có chắc muốn xóa ảnh này?"
                                    onConfirm={() => handleDelete(image.id)}
                                  >
                                    <Button
                                      type="text"
                                      danger
                                      icon={<DeleteOutlined />}
                                      size="small"
                                    />
                                  </Popconfirm>
                                </Tooltip>
                              ]}
                            >
                              <div className="text-center">
                                <p className="text-xs text-gray-500">
                                  {image.isPrimary ? 'Ảnh chính' : 'Ảnh phụ'}
                                </p>
                              </div>
                            </Card>
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>
          )}
        </Card>

        {/* Instructions */}
        <Card size="small" className="bg-blue-50">
          <h4 className="text-blue-800 mb-2">Hướng dẫn sử dụng:</h4>
          <ul className="text-blue-700 text-sm space-y-1">
            <li>• Ảnh đầu tiên sẽ tự động được set làm ảnh chính</li>
            <li>• Click vào ngôi sao để set ảnh chính</li>
            <li>• Click vào mắt để xem ảnh full size</li>
            <li>• Ảnh chính sẽ hiển thị trong danh sách sản phẩm</li>
            <li>• Có thể kéo thả để sắp xếp thứ tự ảnh</li>
          </ul>
        </Card>
      </div>
    </Modal>
  );
}
