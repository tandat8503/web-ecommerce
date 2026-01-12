import React from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import TingeeQRPayment from './TingeeQRPayment';


/**
 
 * kiểm bên trang qr chạy ra thông báo thành công bấm về đơn hàng thì
gọi trang này,đón khách, đọc link, dắt khách đi trang khác).
 */
const TingeePaymentPage = () => {
    const [searchParams] = useSearchParams();//Lấy thông tin từ URL
    const navigate = useNavigate();//Dùng để điều hướng

    const orderId = searchParams.get('orderId');//Lấy ID đơn hàng
    const amount = searchParams.get('amount');//Lấy số tiền
    const orderNumber = searchParams.get('orderNumber');//Lấy mã đơn hàng

    // Validate params
    if (!orderId || !amount || !orderNumber) {
        return (
            <div className="min-h-screen bg-gray-50 p-4">

                <div className="max-w-2xl mx-auto mt-8">
                    <div className="bg-white rounded-lg p-8 text-center">
                        <h2 className="text-xl font-bold text-red-600 mb-4">Thông tin không hợp lệ</h2>
                        <p className="text-gray-600 mb-6">Không tìm thấy thông tin đơn hàng</p>
                        <button
                            onClick={() => navigate('/orders')}
                            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                        >
                            Xem đơn hàng của tôi
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    const handlePaymentSuccess = () => {
        navigate(`/orders/${orderId}`);
    };

    const handleCancel = () => {
        navigate('/orders');
    };

    return (
        <div className="min-h-screen bg-gray-50 p-4">


            <div className="max-w-2xl mx-auto mt-8">
                <h1 className="text-2xl font-bold text-center mb-6">Thanh toán đơn hàng</h1>

                <TingeeQRPayment
                    orderId={parseInt(orderId)}//ID đơn hàng
                    amount={parseFloat(amount)}//Số tiền cần thanh toán
                    orderNumber={orderNumber}//Mã đơn hàng
                    onPaymentSuccess={handlePaymentSuccess}//Callback khi thanh toán thành công
                    onCancel={handleCancel}//Callback khi hủy thanh toán
                />
            </div>
        </div>
    );
};

export default TingeePaymentPage;
