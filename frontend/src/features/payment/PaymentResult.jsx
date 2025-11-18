import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useMoMoPayment } from './useMoMoPayment';
import { CheckCircle, XCircle } from 'lucide-react';

/**
 * Trang hiển thị kết quả thanh toán
 * - MoMo redirect về đây sau khi user thanh toán
 * - Kiểm tra trạng thái thanh toán từ backend
 * - Hiển thị kết quả thành công/thất bại
 */
export default function PaymentResult() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { checkStatus } = useMoMoPayment();
  
  const [status, setStatus] = useState('success'); // success, failed
  const [paymentInfo, setPaymentInfo] = useState(null);

  // Lấy query params từ URL (backend redirect về đây với các params này)
  const orderId = searchParams.get('orderId');
  const statusParam = searchParams.get('status'); // 'success' hoặc 'failed' từ backend
  const errorParam = searchParams.get('error'); // 'payment_not_found', 'server_error', etc.
  const messageParam = searchParams.get('message'); // Thông báo từ backend

  useEffect(() => {
    // Nếu có error param mà không có orderId, hiển thị lỗi ngay
    if (errorParam && !orderId) {
      setStatus('failed');
      return;
    }

    if (!orderId) {
      navigate('/');
      return;
    }

    // Kiểm tra trạng thái thanh toán từ backend (chính xác nhất)
    const checkPaymentStatus = async () => {
      try {
        const data = await checkStatus(orderId);
        setPaymentInfo(data);

        // Hiển thị trạng thái theo DB (chính xác 100%)
        if (data.paymentStatus === 'PAID') {
          setStatus('success');
        } else if (data.paymentStatus === 'FAILED') {
          setStatus('failed');
        } else {
          // PENDING: Chưa thanh toán xong, coi như thất bại
          // (vì MoMo đã redirect về đây, nếu vẫn PENDING tức là có vấn đề)
          setStatus('failed');
        }
      } catch (error) {
        console.error('Error checking payment status:', error);
        // Nếu lỗi, dùng status từ query param hoặc mặc định là failed
        if (statusParam) {
          setStatus(statusParam);
        } else {
          setStatus('failed');
        }
      }
    };

    // Luôn check status từ backend để đảm bảo chính xác
    checkPaymentStatus();
  }, [orderId, statusParam, errorParam, checkStatus, navigate]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        
        {/* Thanh toán thành công */}
        {status === 'success' && (
          <div className="text-center">
            <CheckCircle className="w-16 h-16 mx-auto text-green-500 mb-4" />
            <h2 className="text-2xl font-bold text-gray-800 mb-2">
              Thanh toán thành công!
            </h2>
            <p className="text-gray-600 mb-4">
              Đơn hàng của bạn đã được thanh toán
            </p>
            
            {paymentInfo && (
              <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left">
                <div className="flex justify-between mb-2">
                  <span className="text-gray-600">Mã đơn hàng:</span>
                  <span className="font-medium">#{orderId}</span>
                </div>
                <div className="flex justify-between mb-2">
                  <span className="text-gray-600">Số tiền:</span>
                  <span className="font-medium text-green-600">
                    {paymentInfo.amount?.toLocaleString('vi-VN')}đ
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Thời gian:</span>
                  <span className="font-medium">
                    {paymentInfo.paidAt ? new Date(paymentInfo.paidAt).toLocaleString('vi-VN') : 'N/A'}
                  </span>
                </div>
              </div>
            )}

            <button
              onClick={() => navigate('/orders')}
              className="w-full bg-blue-500 text-white py-3 rounded-lg hover:bg-blue-600 transition"
            >
              Xem đơn hàng của tôi
            </button>
          </div>
        )}

        {/* Thanh toán thất bại */}
        {status === 'failed' && (
          <div className="text-center">
            <XCircle className="w-16 h-16 mx-auto text-red-500 mb-4" />
            <h2 className="text-2xl font-bold text-gray-800 mb-2">
              Thanh toán thất bại
            </h2>
            <p className="text-gray-600 mb-4">
              {messageParam || 'Giao dịch đã bị hủy hoặc không thành công'}
            </p>
            
            {errorParam && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 text-sm text-red-700">
                {errorParam === 'payment_not_found' && 'Không tìm thấy thông tin thanh toán'}
                {errorParam === 'server_error' && 'Đã xảy ra lỗi hệ thống. Vui lòng thử lại sau.'}
              </div>
            )}

            <button
              onClick={() => navigate('/orders')}
              className="w-full bg-blue-500 text-white py-3 rounded-lg hover:bg-blue-600 transition"
            >
              Quay về đơn hàng
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

