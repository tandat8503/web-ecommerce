import { useState } from "react";
import {
  requestPasswordReset,
  verifyPasswordOTP,
  resetPassword,
} from "@/api/auth";
import { toast } from "@/lib/utils";

const INITIAL_STATE = {
  email: "",
  otpCode: "",
  newPassword: "",
  confirmPassword: "",
};

export const useForgotPassword = () => {
  const [formData, setFormData] = useState(INITIAL_STATE);
  const [step, setStep] = useState(0);// 0: email, 1: otp, 2: mật khẩu
  const [loading, setLoading] = useState(false);

  // onChange: hàm để set giá trị cho formData
  const onChange = (name, value) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };
// resetFlow: hàm để reset lại formData và step
  const resetFlow = () => {
    setFormData(INITIAL_STATE);
    setStep(0);
    setLoading(false);
  };

  // hàm để gửi OTP
  const handleRequestOtp = async () => {
    if (!formData.email) {
      toast.error("Vui lòng nhập email");
      return;
    }

    try {
      setLoading(true);
      await requestPasswordReset(formData.email);
      toast.success("Đã gửi OTP (nếu email hợp lệ).");
      setStep(1);// chuyển sang step 1
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Không thể gửi OTP. Thử lại sau."
      );
    } finally {
      setLoading(false);
    }
  };
// hàm để đặt lại mật khẩu
  const handleResetPassword = async () => {
    if (!formData.otpCode || formData.otpCode.length !== 6) {
      toast.error("Mã OTP phải gồm 6 chữ số.");
      return false;
    }

    if (!formData.newPassword || formData.newPassword.length < 6) {
      toast.error("Mật khẩu phải có ít nhất 6 ký tự.");
      return false;
    }

    if (formData.newPassword !== formData.confirmPassword) {
      toast.error("Mật khẩu xác nhận không khớp.");
      return false;
    }

    try {
      setLoading(true);
      const verifyRes = await verifyPasswordOTP({
        email: formData.email,
        otpCode: formData.otpCode,
      });
      const resetToken = verifyRes.data?.data?.resetToken;// lấy resetToken từ response
// hàm để đặt lại mật khẩu
      await resetPassword({
        resetToken,// resetToken để đặt lại mật khẩu
        newPassword: formData.newPassword,// mật khẩu mới
      });
      toast.success("Đặt lại mật khẩu thành công.");
      setFormData(INITIAL_STATE);// reset formData
      setStep(0);// reset step
      return true;
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Không thể đặt lại mật khẩu."
      );
      return false;
    } finally {
      setLoading(false);
    }
  };

  //hàm để quay lại step trước
  const goBack = () => setStep((prev) => Math.max(prev - 1, 0));// nếu step là 0 thì không quay lại

  return {
    formData,// formData để lưu giá trị của form
    step,// step để hiển thị step hiện tại
    loading,// loading để hiển thị loading
    onChange,// onChange để set giá trị cho formData
    handleRequestOtp,// handleRequestOtp để gửi OTP
    handleResetPassword,// handleResetPassword để đặt lại mật khẩu  
    goBack,// goBack để quay lại step trước
    resetFlow,// resetFlow để reset lại formData và step
  };
};