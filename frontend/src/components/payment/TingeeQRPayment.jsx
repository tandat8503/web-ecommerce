import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, XCircle, RefreshCw } from 'lucide-react';
import { formatPrice } from '@/lib/utils';
import { tingeeAPI } from '@/api/tingeeAPI';
import api from '@/api/axiosClient';

/**
 
 * Hiển thị mã QR Code để thanh toán qua chuyển khoản ngân hàng.
 * Tự động polling để kiểm tra trạng thái thanh toán.
 * (tạo QR, check tiền, báo thành công tại chỗ khi thanh toán
 * 
 * @param {Object} props
 * @param {number} props.orderId - ID đơn hàng
 * @param {number} props.amount - Số tiền cần thanh toán
 * @param {string} props.orderNumber - Mã đơn hàng
 * @param {Function} props.onPaymentSuccess - Callback khi thanh toán thành công
 * @param {Function} props.onCancel - Callback khi hủy thanh toán
 */
const TingeeQRPayment = ({ orderId, amount, orderNumber, onPaymentSuccess, onCancel, onSuccessDetected }) => {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);//Lưu thông báo lỗi nếu không tạo được QR 
    const [qrData, setQrData] = useState(null);//Lưu dữ liệu QR từ Tingee trả về (link ảnh, STK...)
    const [paymentStatus, setPaymentStatus] = useState('pending'); // trạng thái thanh toán (pending, checking, success, failed)
    const [countdown, setCountdown] = useState(600); //đồng hồ đếm ngược 10 phút = 600 giây
    const [successOrderData, setSuccessOrderData] = useState(null); // Lưu thông tin đơn hàng khi đã thanh toán xong từ DB

    //1. Tạo QR code
    useEffect(() => {
        generateQRCode();//Gọi hàm tạo mã QR
    }, [orderId]);//khi orderId thay đổi thì tạo QR code lại

    //2. Đếm ngược thời gian
    useEffect(() => {
        if (countdown <= 0) return;//nếu hết thời gian thì dừng

        const timer = setInterval(() => {
            setCountdown(prev => prev - 1);//Mỗi 1 giây trừ đi 1 giây
        }, 1000);

        return () => clearInterval(timer);//Xóa bộ đếm khi đóng trang để tránh tốn tài nguyên
    }, [countdown]);

    //3. Kiểm tra trạng thái thanh toán (Polling)
    useEffect(() => {
        if (!qrData || paymentStatus !== 'pending') return;

        const interval = setInterval(() => {
            checkPaymentStatus(false);//Gọi kiểm tra ngầm, không hiện loading
        }, 2000);

        return () => clearInterval(interval);//Xóa bộ đếm khi đóng trang để tránh tốn tài nguyên
    }, [qrData, paymentStatus]);//khi qrData hoặc paymentStatus thay đổi thì kiểm tra lại

    /**
     * Hàm yêu cầu Backend tạo mã QR từ Tingee
     */
    const generateQRCode = async () => {
        try {
            setLoading(true);//Bật loading
            setError(null);//Reset error

            const response = await tingeeAPI.generateQR({
                orderId,
                bankName: import.meta.env.VITE_TINGEE_BANK_NAME || 'CTG', // CTG = VietinBank Lấy tên ngân hàng từ cấu hình
                accountNumber: import.meta.env.VITE_TINGEE_ACCOUNT_NUMBER || '102874786011'//STK từ cấu hình
            });

            if (response.data.success) {
                setQrData(response.data.data);//Lưu dữ liệu QR từ Tingee
            } else {
                throw new Error(response.data.message || 'Không thể tạo mã QR');
            }
        } catch (err) {
            console.error('lỗi tạo QR:', err);
            setError(err.response?.data?.message || err.message || 'Không thể tạo mã QR');
        } finally {
            setLoading(false);
        }
    };

    /**
     * Kiểm tra trạng thái thanh toán trong db
     * @param {boolean} isManual - Nếu true thì hiện hiệu ứng loading
     */
    const checkPaymentStatus = async (isManual = false) => {
        try {
            // Chỉ hiện trạng thái 'checking' (hiệu ứng xoay) nếu user bấm nút thủ công
            if (isManual) {
                setPaymentStatus('checking');
            }

            const response = await api.get(`/orders/${orderId}`);

            console.log(' Kiểm tra trạng thái thanh toán:', {
                orderId,
                paymentStatus: response.data.order.paymentStatus,
                isManual
            });
            // Nếu Backend báo đơn hàng đã chuyển sang trạng thái PAID (Đã trả tiền)
            if (response.data.order.paymentStatus === 'PAID') {
                console.log(' Thanh toán thành công!');

                // Đọc thông báo số tiền (Giọng nói)
                const amount = response.data.order.totalAmount;
                if ('speechSynthesis' in window) {
                    const msg = new SpeechSynthesisUtterance();
                    msg.text = `Cảm ơn bạn. Thanh toán thành công số tiền ${amount.toLocaleString('vi-VN')} đồng.`;
                    msg.lang = 'vi-VN';
                    msg.rate = 1.1;
                    window.speechSynthesis.speak(msg);
                }

                // Lưu lại toàn bộ thông tin đơn hàng thật từ DB
                setSuccessOrderData(response.data.order);
                setPaymentStatus('success');//Chuyển giao diện sang màn hình "Thành công"

                // Thông báo cho cha
                onSuccessDetected?.();

                //Khi thanh toán thành công, dispatch event để MyOrders component refresh
                window.dispatchEvent(new Event('order:status:updated'));
            } else {
                setPaymentStatus('pending');//Duy trì trạng thái chờ
            }
        } catch (err) {
            console.error('lỗi kiểm tra thanh toán:', err);
            setPaymentStatus('pending');
        }
    };

    /**
     * Format thời gian còn lại 
     */
    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    // Loading state
    if (loading) {
        return (
            <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                    <Loader2 className="h-12 w-12 animate-spin text-blue-600 mb-4" />
                    <p className="text-gray-600">Đang tạo mã QR thanh toán...</p>
                </CardContent>
            </Card>
        );
    }

    // Error state
    if (error) {
        return (
            <Card>
                <CardContent className="py-8">
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
                        <XCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                        <p className="text-sm text-red-800">{error}</p>
                    </div>
                    <div className="flex gap-3 mt-4">
                        <Button onClick={generateQRCode} className="flex-1">
                            <RefreshCw className="mr-2 h-4 w-4" />
                            Thử lại
                        </Button>
                        <Button variant="outline" onClick={onCancel} className="flex-1">
                            Hủy
                        </Button>
                    </div>
                </CardContent>
            </Card>
        );
    }

    // Success state
    if (paymentStatus === 'success') {
        return (
            <div className="flex flex-col items-center justify-center space-y-6 animate-in fade-in zoom-in duration-300">
                {/* Thành công Icon */}
                <div className="relative">
                    <div className="h-24 w-24 bg-green-100 rounded-full flex items-center justify-center">
                        <CheckCircle2 className="h-16 w-16 text-green-500" />
                    </div>
                    <div className="absolute inset-0 h-24 w-24 bg-green-500 rounded-full animate-ping opacity-20"></div>
                </div>

                {/* Tiêu đề */}
                <div className="text-center space-y-2">
                    <h2 className="text-2xl font-extrabold text-gray-900">Thanh toán thành công!</h2>
                    <p className="text-gray-500 font-medium tracking-wide text-sm px-4">
                        Giao dịch Tingee đã được xử lý thành công
                    </p>
                </div>

                {/* Chi tiết giao dịch thực từ DB */}
                <div className="w-full bg-gray-50/80 backdrop-blur-sm border border-gray-100 rounded-2xl p-6 space-y-4 shadow-sm">
                    <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-500 font-medium">Mã đơn hàng:</span>
                        <span className="text-gray-900 font-bold">#{successOrderData?.orderNumber || orderNumber}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm border-t border-gray-100 pt-3">
                        <span className="text-gray-500 font-medium">Số tiền:</span>
                        <span className="text-green-600 font-bold text-lg">{formatPrice(successOrderData?.totalAmount || amount)}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm border-t border-gray-100 pt-3">
                        <span className="text-gray-500 font-medium">Mã giao dịch:</span>
                        <span className="text-gray-900 font-semibold">{successOrderData?.paymentSummary?.transactionId || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm border-t border-gray-100 pt-3">
                        <span className="text-gray-500 font-medium">Ngân hàng:</span>
                        <span className="text-gray-900 font-semibold uppercase">
                            {successOrderData?.bankInfo?.bankCode || qrData?.bankName || import.meta.env.VITE_TINGEE_BANK_NAME || 'CTG'}
                        </span>
                    </div>
                    <div className="flex justify-between items-center text-sm border-t border-gray-100 pt-3">
                        <span className="text-gray-500 font-medium">Trạng thái:</span>
                        <span className="text-green-600 font-semibold">Đã thanh toán</span>
                    </div>
                    <div className="flex justify-between items-center text-sm border-t border-gray-100 pt-3">
                        <span className="text-gray-500 font-medium">Thời gian:</span>
                        <span className="text-gray-900 font-semibold">
                            {successOrderData?.paymentSummary?.paidAt
                                ? new Date(successOrderData.paymentSummary.paidAt).toLocaleString('vi-VN')
                                : 'Đang cập nhật...'}
                        </span>
                    </div>
                </div>

                {/* Các nút hành động */}
                <div className="w-full space-y-3 pt-2">
                    <Button
                        onClick={() => onPaymentSuccess?.()}
                        className="w-full py-6 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-200 transition-all active:scale-95"
                    >
                        Xem chi tiết đơn hàng
                    </Button>
                    <Button
                        onClick={() => window.location.href = '/orders'}
                        variant="ghost"
                        className="w-full py-6 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl transition-all active:scale-95 border border-transparent"
                    >
                        Danh sách đơn hàng
                    </Button>
                </div>
            </div>
        );
    }

    // QR của Tingee
    return (
        <div className="space-y-4">
            <Card>
                <CardHeader>
                    <CardTitle className="text-center">Quét mã QR để thanh toán</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    {/* hiển thị  QR Code ra màn hình để thanh toán */}
                    <div className="flex justify-center">
                        <div className="bg-white p-4 rounded-lg border-2 border-gray-200">
                            <img
                                src={qrData.qrCodeImage}
                                alt="QR Code"
                                className="w-64 h-64 object-contain"
                            />
                        </div>
                    </div>

                    {/* Thông tin thanh toán */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-2">
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Ngân hàng:</span>
                            <span className="font-semibold">{qrData.bankName}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Số tài khoản:</span>
                            <span className="font-semibold font-mono">{qrData.qrAccount || '102874786011'}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Số tiền:</span>
                            <span className="font-bold text-orange-600 text-lg">{formatPrice(qrData.amount)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Nội dung:</span>
                            <span className="font-semibold text-blue-600">{qrData.content}</span>
                        </div>
                    </div>

                    {/* Hướng dẫn thanh toán */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <div className="text-sm space-y-2">
                            <p className="font-semibold text-blue-900">Hướng dẫn thanh toán:</p>
                            <ol className="list-decimal list-inside space-y-1 text-gray-700">
                                <li>Mở app ngân hàng của bạn</li>
                                <li>Chọn chức năng quét mã QR</li>
                                <li>Quét mã QR phía trên</li>
                                <li>Kiểm tra thông tin và xác nhận chuyển khoản</li>
                            </ol>
                            <p className="text-orange-600 font-semibold mt-3">
                                Vui lòng KHÔNG thay đổi nội dung chuyển khoản!
                            </p>
                        </div>
                    </div>

                    {/* Đếm ngược & Trạng thái */}
                    <div className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
                        <div className="flex items-center gap-2">
                            {paymentStatus === 'checking' ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                                    <span className="text-sm text-blue-600">Đang kiểm tra thanh toán...</span>
                                </>
                            ) : (
                                <>
                                    <div className="h-2 w-2 bg-orange-500 rounded-full animate-pulse" />
                                    <span className="text-sm text-gray-600">Chờ thanh toán</span>
                                </>
                            )}
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-500">Hết hạn sau:</span>
                            <span className={`font-mono font-bold ${countdown < 60 ? 'text-red-600' : 'text-gray-900'}`}>
                                {formatTime(countdown)}
                            </span>
                        </div>
                    </div>

                    {/* Nút hành động */}
                    <div className="flex justify-center pt-2">
                        <Button
                            onClick={onCancel}
                            variant="ghost"
                            className="text-gray-400 hover:text-gray-600 text-sm"
                        >
                            Hủy giao dịch
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Lưu ý */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-xs text-gray-700">
                    <strong>Lưu ý:</strong> Sau khi chuyển khoản thành công, hệ thống sẽ tự động xác nhận đơn hàng trong vòng 1-2 phút.
                    Bạn cũng có thể click "Kiểm tra thanh toán" để cập nhật trạng thái ngay lập tức.
                </p>
            </div>
        </div>
    );
};

export default TingeeQRPayment;
