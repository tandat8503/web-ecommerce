import { Modal, Form, Spin ,Button} from "antd";
import { useEffect } from "react";

export default function CrudModal({
  open,
  onCancel,
  onSubmit,
  editingRecord, // object: nếu null là tạo mới, có giá trị là edit
  fields, // [{name, label, component, rules}]
  title, // string: tiêu đề của modal
  confirmLoading,
  okText,
}) {
  const [form] = Form.useForm();
  // Khi mở modal -> fill dữ liệu nếu có
  useEffect(() => {
    if (editingRecord)
      form.setFieldsValue(
        editingRecord
      ); //nếu edit thì set giá trị ban đầu của form
    else form.resetFields(); //nếu tạo mới thì reset form
  }, [editingRecord, form, open]);

  const handleOk = async () => {
    try {
      const values = await form.validateFields(); //Nếu bấm OK mà dl để trống → validateFields sẽ throw lỗi (nằm trong catch)
      await onSubmit(values, editingRecord); //Gọi submit từ cha
      //form.resetFields();//reset form sau khi submit
    } catch (err) {
      // lỗi validate thì ignore
      console.log("Validation Failed:", err);
    }
  };

  return (
    <Modal
      title={title}
      open={open}
      onCancel={onCancel}
      footer={[
        <Button key="cancel" onClick={onCancel} disabled={confirmLoading}>
          Hủy
        </Button>,
        <Button
          key="ok"
          type="primary"
          loading={confirmLoading}
          onClick={handleOk}
        >
          {okText || "Lưu"}
        </Button>,
      ]}
    >
      <Spin spinning={confirmLoading}>
        <Form form={form} layout="vertical">
          {fields.map((f) => (
            <Form.Item
              key={f.name}
              name={f.name}
              label={f.label}
              rules={f.rules || []}
              valuePropName={f.valuePropName}//hỗ trợ upload
              getValueFromEvent={f.getValueFromEvent}
            >
              {f.component}
            </Form.Item>
          ))}
        </Form>
      </Spin>
    </Modal>
  );
}
