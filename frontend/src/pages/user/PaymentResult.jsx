import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getPaymentStatus } from "@/api/payment";

export default function PaymentResult() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [paymentStatus, setPaymentStatus] = useState(null);
  const [orderId, setOrderId] = useState(null);

  useEffect(() => {
    const checkPaymentStatus = async () => {
      try {
        // MoMo sẽ redirect về với các query params:
        // - resultCode: "0" = thành công, khác 0 = thất bại
        // - orderId: ID order từ MoMo (momoOrderId)
        // - message: Thông báo từ MoMo
        // - orderIdParam: Có thể có orderId từ frontend khi redirect
        
        const resultCode = searchParams.get("resultCode");
        const message = searchParams.get("message");
        const momoOrderId = searchParams.get("orderId"); // MoMo trả về orderId (thực ra là momoOrderId)
        const orderIdParam = searchParams.get("orderIdParam"); // Nếu frontend truyền kèm
        
        console.log("📋 PaymentResult - Query params:", {
          resultCode,
          message,
          momoOrderId,
          orderIdParam,
          allParams: Object.fromEntries(searchParams.entries())
        });

        // Nếu có resultCode từ MoMo, xử lý ngay (ưu tiên)
        if (resultCode !== null) {
          console.log("✅ Có resultCode từ MoMo:", resultCode);
          
          if (resultCode === "0" || resultCode === 0) {
            // Thanh toán thành công
            setPaymentStatus("PAID");
            toast.success("Thanh toán thành công!");
            
            // Nếu có orderIdParam, dùng nó; không thì dùng momoOrderId
            const finalOrderId = orderIdParam || momoOrderId;
            if (finalOrderId) {
              setOrderId(finalOrderId);
            }
          } else {
            // Thanh toán thất bại
            setPaymentStatus("FAILED");
            const errorMsg = message || `Thanh toán thất bại (Code: ${resultCode})`;
            toast.error(errorMsg);
            
            const finalOrderId = orderIdParam || momoOrderId;
            if (finalOrderId) {
              setOrderId(finalOrderId);
            }
          }
          setLoading(false);
          return;
        }

        // Nếu không có resultCode, thử lấy orderId từ params và kiểm tra trạng thái từ backend
        const orderIdToCheck = orderIdParam || momoOrderId;
        
        if (orderIdToCheck) {
          console.log("🔄 Kiểm tra trạng thái từ backend với orderId:", orderIdToCheck);
          try {
            const res = await getPaymentStatus(orderIdToCheck);
            console.log("📦 Payment status từ backend:", res.data);
            
            setPaymentStatus(res.data?.paymentStatus || "PENDING");
            setOrderId(orderIdToCheck);
          } catch (statusError) {
            console.error("❌ Lỗi khi kiểm tra trạng thái:", statusError);
            // Nếu không tìm thấy order, vẫn hiển thị PENDING
            setPaymentStatus("PENDING");
            setOrderId(orderIdToCheck);
          }
        } else {
          console.warn("⚠️ Không tìm thấy orderId trong query params");
          toast.error("Không tìm thấy thông tin đơn hàng");
          setPaymentStatus("UNKNOWN");
        }
      } catch (error) {
        console.error("❌ Lỗi kiểm tra trạng thái thanh toán:", error);
        toast.error("Không thể kiểm tra trạng thái thanh toán");
        setPaymentStatus("UNKNOWN");
      } finally {
        setLoading(false);
      }
    };

    checkPaymentStatus();
  }, [searchParams]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl border shadow-sm">
          <CardContent className="p-10 text-center space-y-6">
            <div className="animate-spin mx-auto w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full"></div>
            <p className="text-gray-600">Đang kiểm tra kết quả thanh toán...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isSuccess = paymentStatus === "PAID";
  const isFailed = paymentStatus === "FAILED";

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl border shadow-sm">
        <CardContent className="p-10 text-center space-y-6">
          {/* Icon */}
          <div className={`mx-auto w-16 h-16 rounded-full flex items-center justify-center ${
            isSuccess ? "bg-green-100" : isFailed ? "bg-red-100" : "bg-yellow-100"
          }`}>
            {isSuccess ? (
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-10 h-10 text-green-600">
                <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12Zm13.36-2.59a.75.75 0 1 0-1.22-.86l-3.93 5.59-1.98-1.98a.75.75 0 0 0-1.06 1.06l2.625 2.625c.32.32.84.28 1.105-.084l5.52-6.35Z" clipRule="evenodd" />
              </svg>
            ) : isFailed ? (
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-10 h-10 text-red-600">
                <path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25Zm-1.72 6.97a.75.75 0 1 0-1.06 1.06L10.94 12l-1.72 1.72a.75.75 0 1 0 1.06 1.06L12 13.06l1.72 1.72a.75.75 0 1 0 1.06-1.06L13.06 12l1.72-1.72a.75.75 0 1 0-1.06-1.06L12 10.94l-1.72-1.72Z" clipRule="evenodd" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-10 h-10 text-yellow-600">
                <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12ZM12 8.25a.75.75 0 0 1 .75.75v3.75a.75.75 0 0 1-1.5 0V9a.75.75 0 0 1 .75-.75Zm0 8.25a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Z" clipRule="evenodd" />
              </svg>
            )}
          </div>

          {/* Title */}
          <h1 className={`text-2xl font-bold ${
            isSuccess ? "text-green-600" : isFailed ? "text-red-600" : "text-yellow-600"
          }`}>
            {isSuccess 
              ? "Thanh toán thành công!" 
              : isFailed 
              ? "Thanh toán thất bại" 
              : "Đang xử lý thanh toán"}
          </h1>

          {/* Message */}
          <p className="text-gray-600">
            {isSuccess 
              ? "Đơn hàng của bạn đã được thanh toán thành công. Chúng tôi sẽ xử lý và giao hàng trong thời gian sớm nhất."
              : isFailed
              ? "Thanh toán không thành công. Vui lòng thử lại hoặc chọn phương thức thanh toán khác."
              : "Vui lòng đợi trong giây lát, chúng tôi đang xử lý giao dịch của bạn."}
          </p>

          {/* Actions */}
          <div className="flex items-center justify-center gap-3">
            {orderId && (
              <Button 
                variant="outline" 
                className="cursor-pointer" 
                onClick={() => navigate(`/orders/${orderId}`)}
              >
                Xem chi tiết đơn hàng
              </Button>
            )}
            <Button 
              variant="outline" 
              className="cursor-pointer" 
              onClick={() => navigate("/orders")}
            >
              Xem đơn hàng của tôi
            </Button>
            {isFailed && (
              <Button 
                className="bg-orange-500 hover:bg-orange-600 cursor-pointer" 
                onClick={() => navigate("/checkout")}
              >
                Thử lại thanh toán
              </Button>
            )}
            {isSuccess && (
              <Button 
                className="bg-orange-500 hover:bg-orange-600 cursor-pointer" 
                onClick={() => navigate("/san-pham")}
              >
                Tiếp tục mua sắm
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

