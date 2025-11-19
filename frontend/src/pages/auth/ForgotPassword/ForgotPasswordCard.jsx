import { useEffect } from "react";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useForgotPassword } from "./useForgotPassword";


const steps = [
  { title: "Quên mật khẩu", subtitle: "Nhập email để nhận mã OTP" },
  { title: "Đặt lại mật khẩu", subtitle: "Nhập OTP và mật khẩu mới" },
];

export default function ForgotPasswordCard({ open, onClose }) {
  const {
    formData,
    step,
    loading,
    onChange,
    handleRequestOtp,
    handleResetPassword,
    resetFlow,
  } = useForgotPassword();

  useEffect(() => {
    // nếu open là false thì reset lại formData và step
    if (!open) {
      resetFlow();
    }
  }, [open, resetFlow]);// reset lại formData và step khi open thay đổi

  // nếu open là false thì không hiển thị card
  if (!open) return null;

  const isEmailStep = step === 0;// nếu step là 0 thì hiển thị step email

  // hàm để submit form
  const handleSubmit = async () => {
    // nếu step là 0 thì gửi OTP
    if (isEmailStep) {
      await handleRequestOtp();// gửi OTP
    } else {
      // nếu step là 1 thì đặt lại mật khẩu
      const success = await handleResetPassword();
      if (success) onClose();// đóng card
    }
  };

  const handleClose = () => {
    resetFlow();// reset lại formData và step
    onClose?.();// đóng card
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <Card className="w-full max-w-md rounded-3xl shadow-2xl border-none">
        <CardHeader className="space-y-3 text-center">
          <div className="flex items-center justify-center gap-2 text-xs font-semibold text-muted-foreground">
            <span
              className={`h-2 w-12 rounded-full ${
                isEmailStep ? "bg-blue-500" : "bg-blue-200"
              }`}
            />
            <span
              className={`h-2 w-12 rounded-full ${
                !isEmailStep ? "bg-purple-500" : "bg-purple-200"
              }`}
            />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">
              {steps[step].subtitle}
            </p>
            <h2 className="text-2xl font-semibold">{steps[step].title}</h2>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {isEmailStep ? (
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                placeholder="A@gmail.com"
                value={formData.email}
                onChange={(e) => onChange("email", e.target.value)}
                disabled={loading}
              />
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <Label>Mã OTP</Label>
                <Input
                  placeholder="123456"
                  maxLength={6}
                  value={formData.otpCode}
                  onChange={(e) => onChange("otpCode", e.target.value)}
                  disabled={loading}
                />
              </div>
              <div className="space-y-2">
                <Label>Mật khẩu mới</Label>
                <Input
                  type="password"
                  placeholder="••••••••"
                  value={formData.newPassword}
                  onChange={(e) => onChange("newPassword", e.target.value)}
                  disabled={loading}
                />
              </div>
              <div className="space-y-2">
                <Label>Nhập lại mật khẩu</Label>
                <Input
                  type="password"
                  placeholder="••••••••"
                  value={formData.confirmPassword}
                  onChange={(e) => onChange("confirmPassword", e.target.value)}
                  disabled={loading}
                />
              </div>
            </>
          )}
        </CardContent>
        <CardFooter className="flex flex-col gap-3">
          {!isEmailStep && (
            <Button
              variant="ghost"
              className="text-sm text-muted-foreground"
              onClick={() => onChange("otpCode", "")}
              disabled={loading}
            >
              Bạn chưa nhận được OTP? Kiểm tra thư rác hoặc thử lại.
            </Button>
          )}
          <div className="flex gap-3 w-full">
            <Button
              variant="outline"
              className="flex-1"
              onClick={handleClose}
              disabled={loading}
            >
              Hủy
            </Button>
            <Button
              className="flex-1 bg-gradient-to-r from-blue-500 to-purple-500 text-white"
              onClick={handleSubmit}
              disabled={loading}
            >
              {loading
                ? "Đang xử lý..."
                : isEmailStep
                ? "Gửi mã OTP"
                : "Đặt lại mật khẩu"}
            </Button>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}