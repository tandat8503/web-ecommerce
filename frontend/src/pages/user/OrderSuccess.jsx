import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function OrderSuccess() {
  const navigate = useNavigate();
  const location = useLocation();

  // Lấy orderId từ query nếu có (để chuyển tới chi tiết đơn sau này)
  const params = new URLSearchParams(location.search);
  const orderId = params.get("orderId");

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl border shadow-sm">
        <CardContent className="p-10 text-center space-y-6">
          <div className="mx-auto w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-10 h-10 text-green-600">
              <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12Zm13.36-2.59a.75.75 0 1 0-1.22-.86l-3.93 5.59-1.98-1.98a.75.75 0 0 0-1.06 1.06l2.625 2.625c.32.32.84.28 1.105-.084l5.52-6.35Z" clipRule="evenodd" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-800">Đặt hàng thành công!</h1>
          <p className="text-gray-600">Chúng tôi sẽ liên hệ Quý khách để xác nhận đơn hàng trong thời gian sớm nhất.</p>
          <div className="flex items-center justify-center gap-3">
            <Button variant="outline" className="cursor-pointer" onClick={() => navigate(`/orders`)}>
              Xem đơn hàng của tôi
            </Button>
            <Button className="bg-orange-500 hover:bg-orange-600 cursor-pointer" onClick={() => navigate("/san-pham")}>
              Tiếp tục mua sắm
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


