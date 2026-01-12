import api from './axiosClient';

/**
 * Service quản lý các lệnh gọi API liên quan đến thanh toán Tingee
 */
export const tingeeAPI = {
    /**
     * Gửi yêu cầu tạo mã QR thanh toán
     * @param {Object} data { orderId, bankName, accountNumber }
     */
    generateQR: (data) => {
        return api.post('/payment/tingee/generate-qr', data);
    },

    /**
     * Lấy danh sách ngân hàng Tingee hỗ trợ (nếu cần)
     */
    getBanks: () => {
        return api.get('/payment/tingee/banks');
    }
};
