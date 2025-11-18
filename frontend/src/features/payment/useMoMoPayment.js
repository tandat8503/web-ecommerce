import { useState } from 'react';
import { createMoMoPayment, getPaymentStatus } from '@/api/payment';

/**
 * Custom hook xử lý thanh toán MoMo
 * Hỗ trợ: Tạo payment URL, redirect, và check status
 */
export const useMoMoPayment = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [paymentData, setPaymentData] = useState(null);

  // Tạo payment và chuyển đến trang thanh toán MoMo
  const initiatePayment = async (orderId) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await createMoMoPayment(orderId);
      const payload = response.data;
      
      if (payload?.success && payload?.data?.paymentUrl) {
        setPaymentData(payload.data);
        
        // Redirect đến trang thanh toán MoMo
        // MoMo sẽ hiển thị QR code hoặc deep link app
        window.location.href = payload.data.paymentUrl;
        
        return payload.data;
      } else {
        throw new Error(payload?.message || 'Không tạo được payment URL');
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Kiểm tra trạng thái thanh toán (polling)
  const checkStatus = async (orderId) => {
    try {
      const response = await getPaymentStatus(orderId);
      return response.data;
    } catch (err) {
      setError(err.response?.data?.message || err.message);
      throw err;
    }
  };

  return {
    loading,
    error,
    paymentData,
    initiatePayment,
    checkStatus
  };
};

