import { Modal, Descriptions, Empty } from "antd";

/**
 * DetailModal - Modal component để hiển thị chi tiết record
 * @param {Object} props - Component props
 * @param {boolean} props.open - Modal open state
 * @param {Function} props.onCancel - Cancel handler
 * @param {string} props.title - Modal title
 * @param {Object} props.data - Data to display
 * @param {Array} props.fields - Fields configuration
 * @param {number} props.width - Modal width
 * @param {number} props.columns - Number of columns for descriptions
 * @param {string} props.size - Size of descriptions
 * @param {boolean} props.bordered - Whether descriptions are bordered
 */
export default function DetailModal({ 
  open, 
  onCancel, 
  title, 
  data = {}, 
  fields = [],
  width = 600,
  columns = 1,
  size = "small",
  bordered = true
}) {
  // Kiểm tra nếu không có data hoặc fields
  if (!data || Object.keys(data).length === 0) {
    return (
      <Modal
        open={open}
        onCancel={onCancel}
        title={title}
        footer={null}
        width={width}
      >
        <Empty description="Không có dữ liệu để hiển thị" />
      </Modal>
    );
  }

  return (
    <Modal
      open={open}
      onCancel={onCancel}
      title={title}
      footer={null}
      width={width}
    >
      <Descriptions 
        bordered={bordered} 
        column={columns} 
        size={size}
      >
        {fields.map((field) => {
          const value = data?.[field.name]; // ✅ tránh lỗi null
          return (
            <Descriptions.Item key={field.name} label={field.label}>
              {field.render ? field.render(value, data || {}) : value ?? "-"}
            </Descriptions.Item>
          );
        })}
      </Descriptions>
    </Modal>
  );
}
