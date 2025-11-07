import { Modal, Form, Spin, Button } from "antd";
import { useEffect } from "react";

/**
 * CrudModal - Modal component cho Create/Update operations
 * @param {Object} props - Component props
 * @param {boolean} props.open - Modal open state
 * @param {Function} props.onCancel - Cancel handler
 * @param {Function} props.onSubmit - Submit handler
 * @param {Object} props.editingRecord - Record being edited (null for create)
 * @param {Array} props.fields - Form fields configuration
 * @param {string} props.title - Modal title
 * @param {boolean} props.confirmLoading - Loading state
 * @param {string} props.okText - OK button text
 * @param {string} props.cancelText - Cancel button text
 * @param {number} props.width - Modal width
 * @param {boolean} props.destroyOnClose - Destroy modal on close
 */
export default function CrudModal({
  open,
  onCancel,
  onSubmit,
  editingRecord, // object: nếu null là tạo mới, có giá trị là edit
  fields, // [{name, label, component, rules, valuePropName, getValueFromEvent}]
  title, // string: tiêu đề của modal
  confirmLoading,
  okText = "Lưu",
  cancelText = "Hủy",
  width = 600,
  destroyOnClose = true,
}) {
  const [form] = Form.useForm();

  // Khi mở modal -> fill dữ liệu nếu có
  useEffect(() => {
    if (open) {
      if (editingRecord) {
        // Set tất cả các field với giá trị mặc định để tránh controlled/uncontrolled warning
        const initialValues = { ...editingRecord };
        // Đảm bảo tất cả các field đều có giá trị (không phải undefined)
        Object.keys(initialValues).forEach(key => {
          if (initialValues[key] === undefined) {
            initialValues[key] = null;
          }
        });
        form.setFieldsValue(initialValues); // nếu edit thì set giá trị ban đầu của form
      } else {
        form.resetFields(); // nếu tạo mới thì reset form
      }
    }
  }, [editingRecord, form, open]);

  const handleOk = async () => {
    try {
      const values = await form.validateFields(); // Nếu bấm OK mà dl để trống → validateFields sẽ throw lỗi (nằm trong catch)
      await onSubmit(values, editingRecord); // Gọi submit từ cha
    } catch (err) {
      // lỗi validate thì ignore
      console.log("Validation Failed:", err);
    }
  };

  const handleCancel = () => {
    form.resetFields();
    onCancel();
  };

  return (
    <Modal
      title={title}
      open={open}
      onCancel={handleCancel}
      width={width}
      destroyOnHidden={destroyOnClose}
      footer={[
        <Button key="cancel" onClick={handleCancel} disabled={confirmLoading}>
          {cancelText}
        </Button>,
        <Button
          key="ok"
          type="primary"
          loading={confirmLoading}
          onClick={handleOk}
        >
          {okText}
        </Button>,
      ]}
    >
      <Spin spinning={confirmLoading}>
        <Form form={form} layout="vertical">
          <Form.Item noStyle shouldUpdate={(prevValues, currentValues) => prevValues.categoryId !== currentValues.categoryId}>
            {() => {
              const categoryId = form.getFieldValue('categoryId');
              return fields?.map((field) => {
                // Nếu field có shouldRender function, kiểm tra điều kiện
                if (field.shouldRender && !field.shouldRender(categoryId)) {
                  return null;
                }
                return (
                  <Form.Item
                    key={field.name}
                    name={field.name}
                    label={field.label}
                    rules={field.rules || []}
                    valuePropName={field.valuePropName} // hỗ trợ upload
                    getValueFromEvent={field.getValueFromEvent}
                    initialValue={field.initialValue}
                  >
                    {field.component}
                  </Form.Item>
                );
              });
            }}
          </Form.Item>
        </Form>
      </Spin>
    </Modal>
  );
}
