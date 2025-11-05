import { useState } from "react";
import { Card, Form, Input, Button, Typography } from "antd";
import { FaKey } from "react-icons/fa";
import { changePassword } from "@/api/userProfile";
import { toast } from "@/lib/utils";

const { Title, Text } = Typography;

export default function ChangePassword() {
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();

  const handleChangePassword = async (values) => {
    try {
      setLoading(true);
      
      const response = await changePassword({
        oldPassword: values.oldPassword,
        newPassword: values.newPassword,
        confirmPassword: values.confirmPassword,
      });
      
      if (response.data.message === "Đổi mật khẩu thành công") {
        toast.success(" Đổi mật khẩu thành công!");
        form.resetFields();
      } else {
        toast.error(` ${response.data.message || "Đổi mật khẩu thất bại"}`);
      }
    } catch (error) {
      console.error("Change password error:", error);
      const errorMessage = error.response?.data?.message || "Đổi mật khẩu thất bại";
      toast.error(` ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <div className="mb-6">
        <Title level={3} className="mb-2">
          Đổi mật khẩu
        </Title>
        <Text className="text-gray-600">
          Thay đổi mật khẩu để bảo mật tài khoản
        </Text>
      </div>

      <Form
        form={form}
        layout="vertical"
        onFinish={handleChangePassword}
        className="max-w-2xl"
      >
        <Form.Item
          name="oldPassword"
          label={
            <span className="text-gray-700 font-medium">
              Mật khẩu hiện tại <span className="text-red-500">*</span>
            </span>
          }
          rules={[
            { required: true, message: "Vui lòng nhập mật khẩu hiện tại!" }
          ]}
        >
          <Input.Password
            placeholder="Nhập mật khẩu hiện tại"
            className="h-12 rounded-lg border-gray-300"
            prefix={<FaKey className="text-gray-400" />}
          />
        </Form.Item>

        <Form.Item
          name="newPassword"
          label={
            <span className="text-gray-700 font-medium">
              Mật khẩu mới <span className="text-red-500">*</span>
            </span>
          }
          rules={[
            { required: true, message: "Vui lòng nhập mật khẩu mới!" },
            { min: 8, message: "Mật khẩu phải có ít nhất 8 ký tự!" }
          ]}
        >
          <Input.Password
            placeholder="Nhập mật khẩu mới"
            className="h-12 rounded-lg border-gray-300"
            prefix={<FaKey className="text-gray-400" />}
          />
        </Form.Item>

        <Form.Item
          name="confirmPassword"
          label={
            <span className="text-gray-700 font-medium">
              Xác nhận mật khẩu mới <span className="text-red-500">*</span>
            </span>
          }
          dependencies={['newPassword']}
          rules={[
            { required: true, message: "Vui lòng xác nhận mật khẩu mới!" },
            ({ getFieldValue }) => ({
              validator(_, value) {
                if (!value || getFieldValue('newPassword') === value) {
                  return Promise.resolve();
                }
                return Promise.reject(new Error('Mật khẩu xác nhận không khớp!'));
              },
            }),
          ]}
        >
          <Input.Password
            placeholder="Nhập lại mật khẩu mới"
            className="h-12 rounded-lg border-gray-300"
            prefix={<FaKey className="text-gray-400" />}
          />
        </Form.Item>

        <Form.Item className="mt-8">
          <Button
            type="primary"
            htmlType="submit"
            loading={loading}
            className="w-full h-12 bg-orange-500 hover:bg-orange-600 border-0 rounded-lg font-medium text-base"
          >
            Đổi mật khẩu
          </Button>
        </Form.Item>
      </Form>
    </Card>
  );
}
