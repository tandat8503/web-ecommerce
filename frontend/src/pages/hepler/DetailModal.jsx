import { Modal, Descriptions } from "antd";

export default function DetailModal({ 
  open, 
  onCancel, 
  title, 
  data = {}, 
  fields = [],
  width = 600 
}) {
  return (
    <Modal
      open={open}
      onCancel={onCancel}
      title={title}
      footer={null}
      width={width}
    >
      <Descriptions bordered column={1} size="small">
        {fields.map((f) => {
          const value = data?.[f.name]; // ✅ tránh lỗi null
          return (
            <Descriptions.Item key={f.name} label={f.label}>
              {f.render ? f.render(value, data || {}) : value ?? "-"}
            </Descriptions.Item>
          );
        })}
      </Descriptions>
    </Modal>
  );
}
