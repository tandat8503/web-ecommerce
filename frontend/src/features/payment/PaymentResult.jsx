import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { getPaymentStatus } from '@/api/payment';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';

/**
 * Trang hiển thị kết quả thanh toán
 * - VNPay redirect về đây sau khi user thanh toán
 * - Kiểm tra trạng thái thanh toán từ backend
 * - Hiển thị kết quả thành công/thất bại với UI đẹp
 */
export default function PaymentResult() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const [status, setStatus] = useState('loading'); // loading, success, failed
  const [paymentInfo, setPaymentInfo] = useState(null);
  const [loading, setLoading] = useState(true);

  // Lấy query params từ URL (backend redirect về đây với các params này)
  const orderId = searchParams.get('orderId');
  const statusParam = searchParams.get('status'); // 'success' hoặc 'failed' từ backend
  const errorParam = searchParams.get('error'); // 'payment_not_found', 'server_error', etc.
  const messageParam = searchParams.get('message'); // Thông báo từ backend

  useEffect(() => {
    // Nếu có error param mà không có orderId, hiển thị lỗi ngay
    if (errorParam && !orderId) {
      setStatus('failed');
      setLoading(false);
      return;
    }

    if (!orderId) {
      navigate('/');
      return;
    }

    // Kiểm tra trạng thái thanh toán từ backend (chính xác nhất)
    const checkPaymentStatus = async () => {
      try {
        setLoading(true);
        const response = await getPaymentStatus(orderId);
        const data = response.data?.data || response.data;
        setPaymentInfo(data);

        // Hiển thị trạng thái theo DB (chính xác 100%)
        if (data.paymentStatus === 'PAID') {
          setStatus('success');
        } else if (data.paymentStatus === 'FAILED') {
          setStatus('failed');
        } else {
          // PENDING: Chưa thanh toán xong, coi như thất bại
          // (vì đã redirect về đây, nếu vẫn PENDING tức là có vấn đề)
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
      } finally {
        setLoading(false);
      }
    };

    // Luôn check status từ backend để đảm bảo chính xác
    checkPaymentStatus();
  }, [orderId, statusParam, errorParam, navigate]);

  // Xác định phương thức thanh toán từ paymentInfo
  const paymentMethod = paymentInfo?.paymentMethod || 'VNPAY';
  const isVNPay = paymentMethod === 'VNPAY';

  // Hiển thị text dễ hiểu cho mã phản hồi VNPay (ví dụ '00' -> 'Thanh toán thành công')
  const getResponseLabel = (code) => {
    if (!code) return 'N/A';
    if (code === '00') return 'Thanh toán thành công';
    return code;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl p-8 animate-fadeIn">
        
        {/* Loading state */}
        {loading && (
          <div className="text-center py-12">
            <Loader2 className="w-16 h-16 mx-auto text-blue-500 mb-4 animate-spin" />
            <h2 className="text-xl font-semibold text-gray-700 mb-2">
              Đang kiểm tra kết quả thanh toán...
            </h2>
            <p className="text-gray-500 text-sm">
              Vui lòng đợi trong giây lát
            </p>
          </div>
        )}

        {/* Thanh toán thành công */}
        {!loading && status === 'success' && (
          <div className="text-center">
            <div className="mb-6">
              <div className="relative inline-block">
                <CheckCircle className="w-20 h-20 mx-auto text-green-500 mb-4 animate-bounce" />
                <div className="absolute inset-0 bg-green-200 rounded-full blur-xl opacity-50 animate-pulse"></div>
              </div>
            </div>
            
            <h2 className="text-3xl font-bold text-gray-800 mb-2">
              Thanh toán thành công!
            </h2>
            <p className="text-gray-600 mb-6">
              {isVNPay ? 'Giao dịch VNPay đã được xử lý thành công' : 
               'Đơn hàng của bạn đã được thanh toán'}
            </p>
            
            {paymentInfo && (
              <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-6 mb-6 text-left border border-gray-200">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 font-medium">Mã đơn hàng:</span>
                    <span className="font-bold text-gray-800">#{orderId}</span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 font-medium">Số tiền:</span>
                    <span className="font-bold text-green-600 text-lg">
                      {paymentInfo.amount?.toLocaleString('vi-VN')}đ
                    </span>
                  </div>
                  
                  {paymentInfo.transactionId && (
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 font-medium">Mã giao dịch:</span>
                      <span className="font-mono text-sm text-gray-700">
                        {paymentInfo.vnpayTransactionNo || paymentInfo.transactionId}
                      </span>
                    </div>
                  )}
                  
                  {isVNPay && paymentInfo.bankCode && (
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 font-medium">Ngân hàng:</span>
                      <span className="font-medium text-gray-700">
                        {paymentInfo.bankCode}
                      </span>
                    </div>
                  )}
                  
                  {isVNPay && paymentInfo.responseCode && (
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 font-medium">Mã phản hồi:</span>
                      <span className="font-medium text-gray-700">
                        {getResponseLabel(paymentInfo.responseCode)}
                      </span>
                    </div>
                  )}
                  
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 font-medium">Thời gian:</span>
                    <span className="font-medium text-gray-700">
                      {paymentInfo.paidAt ? new Date(paymentInfo.paidAt).toLocaleString('vi-VN') : 'N/A'}
                    </span>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-3">
              <button
                onClick={() => navigate(`/orders/${orderId}`)}
                className="w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white py-3 rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all shadow-lg hover:shadow-xl font-semibold"
              >
                Xem chi tiết đơn hàng
              </button>
              <button
                onClick={() => navigate('/orders')}
                className="w-full bg-gray-100 text-gray-700 py-3 rounded-lg hover:bg-gray-200 transition font-medium"
              >
                Danh sách đơn hàng
              </button>
            </div>
          </div>
        )}

        {/* Thanh toán thất bại */}
        {!loading && status === 'failed' && (
          <div className="text-center">
            <div className="mb-6">
              <div className="relative inline-block">
                <XCircle className="w-20 h-20 mx-auto text-red-500 mb-4" />
                <div className="absolute inset-0 bg-red-200 rounded-full blur-xl opacity-50"></div>
              </div>
            </div>
            
            <h2 className="text-3xl font-bold text-gray-800 mb-2">
              Thanh toán thất bại
            </h2>
            <p className="text-gray-600 mb-6">
              {messageParam || 
               (isVNPay ? 'Giao dịch VNPay đã bị hủy hoặc không thành công' :
                'Giao dịch đã bị hủy hoặc không thành công')}
            </p>
            
            {errorParam && (
              <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4 mb-6 text-sm text-red-700">
                {errorParam === 'invalid_signature' && (
                  <div>
                    <strong>Lỗi xác thực:</strong> Chữ ký không hợp lệ. Vui lòng liên hệ hỗ trợ.
                  </div>
                )}
                {errorParam === 'payment_not_found' && (
                  <div>
                    <strong>Không tìm thấy:</strong> Thông tin thanh toán không tồn tại trong hệ thống.
                  </div>
                )}
                {errorParam === 'server_error' && (
                  <div>
                    <strong>Lỗi hệ thống:</strong> Đã xảy ra lỗi. Vui lòng thử lại sau hoặc liên hệ hỗ trợ.
                  </div>
                )}
              </div>
            )}

            {paymentInfo && paymentInfo.transactionId && (
              <div className="bg-gray-50 rounded-xl p-4 mb-6 text-left border border-gray-200">
                <div className="text-sm text-gray-600 mb-1">Mã giao dịch:</div>
                <div className="font-mono text-sm text-gray-800">
                  {paymentInfo.transactionId}
                </div>
              </div>
            )}

            <div className="space-y-3">
              <button
                onClick={() => navigate(`/orders/${orderId}`)}
                className="w-full bg-gradient-to-r from-orange-500 to-orange-600 text-white py-3 rounded-lg hover:from-orange-600 hover:to-orange-700 transition-all shadow-lg hover:shadow-xl font-semibold"
              >
                Thanh toán lại
              </button>
              <button
                onClick={() => navigate('/orders')}
                className="w-full bg-gray-100 text-gray-700 py-3 rounded-lg hover:bg-gray-200 transition font-medium"
              >
                Quay về đơn hàng
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

