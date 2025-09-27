import { useState, useEffect } from "react";
import { Card, Form, Input, Button, Typography } from "antd";
import { FaUser, FaEnvelope, FaPhone } from "react-icons/fa";
import {  updateProfile } from "@/api/userProfile";
import { toast } from "react-toastify";

const { Title, Text } = Typography;

export default function Profile({ user, setUser }) {
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();

  // Set form values when user data changes
  useEffect(() => {
    if (user) {
      form.setFieldsValue({
        fullName: `${user.firstName} ${user.lastName}`,
        email: user.email,
        phone: user.phone || "",
      });
    }
  }, [user, form]);

  const handleUpdateProfile = async (values) => {
    try {
      setLoading(true);
      
      const updateData = {
        firstName: values.fullName.split(' ')[0] || values.fullName,
        lastName: values.fullName.split(' ').slice(1).join(' ') || '',
        phone: values.phone || "",
      };
      
      console.log("Updating profile with data:", updateData);
      
      const response = await updateProfile(updateData);
      
      if (response.data.code === 200) {
        const updatedUser = response.data.data.user;
        setUser(updatedUser);
        localStorage.setItem("user", JSON.stringify(updatedUser));
        
        // Dispatch custom event to notify other components
        window.dispatchEvent(new CustomEvent('userUpdated'));
        
        toast.success(" Cập nhật thông tin thành công!");
      } else {
        toast.error(` ${response.data.message || "Cập nhật thất bại"}`);
      }
    } catch (error) {
      console.error("Update profile error:", error);
      const errorMessage = error.response?.data?.message || "Cập nhật thông tin thất bại";
      toast.error(`${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <div className="mb-6">
        <Title level={3} className="mb-2">
          Hồ sơ cá nhân
        </Title>
        <Text className="text-gray-600">
          Quản lý thông tin hồ sơ của bạn
        </Text>
      </div>

      <Form
        form={form}
        layout="vertical"
        onFinish={handleUpdateProfile}
        className="max-w-2xl"
      >
        <Form.Item
          name="fullName"
          label={
            <span className="text-gray-700 font-medium">
              Họ và tên <span className="text-red-500">*</span>
            </span>
          }
          rules={[
            { required: true, message: "Vui lòng nhập họ và tên!" },
            { min: 2, message: "Họ và tên phải có ít nhất 2 ký tự!" }
          ]}
        >
          <Input
            placeholder="Nhập họ và tên của bạn"
            className="h-12 rounded-lg border-gray-300"
            prefix={<FaUser className="text-gray-400" />}
          />
        </Form.Item>

        <Form.Item
          name="email"
          label={
            <span className="text-gray-700 font-medium">
              Email <span className="text-red-500">*</span>
            </span>
          }
        >
          <Input
            placeholder="Email của bạn"
            className="h-12 rounded-lg border-gray-300"
            prefix={<FaEnvelope className="text-gray-400" />}
            disabled
          />
        </Form.Item>

        <Form.Item
          name="phone"
          label={
            <span className="text-gray-700 font-medium">
              Số điện thoại
            </span>
          }
          rules={[
            { pattern: /^[0-9]{10,11}$/, message: "Số điện thoại phải có 10-11 chữ số!" }
          ]}
        >
          <Input
            placeholder="Nhập số điện thoại của bạn"
            className="h-12 rounded-lg border-gray-300"
            prefix={<FaPhone className="text-gray-400" />}
          />
        </Form.Item>

        <Form.Item className="mt-8">
          <Button
            type="primary"
            htmlType="submit"
            loading={loading}
            className="w-full h-12 bg-orange-500 hover:bg-orange-600 border-0 rounded-lg font-medium text-base"
          >
            Cập nhật thông tin
          </Button>
        </Form.Item>
      </Form>
    </Card>
  );
}
