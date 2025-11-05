import crypto from 'crypto';
import axios from 'axios';

// ============================================
// MOMO SERVICE - Code ngắn gọn, hardcode test keys
// Dùng cho demo luận văn - KHÔNG cần file .env
// ============================================

// Test keys từ tài liệu MoMo (hardcode - chỉ dùng cho demo)
// KHÔNG cần file .env, tất cả đều hardcode
const partnerCode = "MOMO";
const accessKey = "F8BBA842ECF85";
const secretkey = "K951B6PE1waDMi640xX08PD3vg6EkVlz";
const apiUrl = "https://test-payment.momo.vn/v2/gateway/api/create";
const redirectUrl = "http://localhost:5173/payment/result";
const ipnUrl = "http://localhost:5000/api/payment/momo/callback";

// ============================================
// TẠO CHỮ KÝ SỐ
// ============================================
export const createSignature = (params) => {
  const { signature, lang, ...paramsForSignature } = params;
  const rawData = Object.keys(paramsForSignature)
    .sort()
    .map(key => `${key}=${paramsForSignature[key]}`)
    .join('&');
  return crypto.createHmac('sha256', secretkey).update(rawData).digest('hex');
};

// ============================================
// XÁC THỰC CHỮ KÝ
// ============================================
export const verifySignature = (params, signature) => {
  return createSignature(params) === signature;
};

// ============================================
// TẠO PAYMENT URL
// ============================================
export const createPayment = async (orderNumber, amount, orderInfo) => {
  // Tạo ID
  const requestId = partnerCode + Date.now();
  const momoOrderId = `${orderNumber}_${Date.now()}`;
  const amountInt = Math.round(Number(amount));
  
  // Tạo request body (tất cả hardcode, không dùng .env)
  const requestBody = {
    partnerCode,
    accessKey,
    requestId,
    amount: amountInt,
    orderId: momoOrderId,
    orderInfo: orderInfo || "pay with MoMo",
    redirectUrl,
    ipnUrl,
    extraData: "",
    requestType: "captureWallet",
    lang: "vi"
  };
  
  // Tạo signature
  requestBody.signature = createSignature(requestBody);
  
  // Gọi API MoMo - Đúng đường dẫn như trong hình: https://test-payment.momo.vn/v2/gateway/api/create
  console.log('📡 Gọi MoMo API:', apiUrl);
  console.log('📦 Request body:', JSON.stringify(requestBody, null, 2));
  
  const response = await axios.post(apiUrl, requestBody, {
    headers: { 'Content-Type': 'application/json' }
  });
  
  console.log('📥 MoMo API Response:', {
    resultCode: response.data.resultCode,
    message: response.data.message,
    hasPayUrl: !!response.data.payUrl
  });
  
  if (response.data.resultCode !== 0) {
    throw new Error(`MoMo Error: ${response.data.message}`);
  }
  
  // payUrl từ MoMo - đây chính là URL để frontend redirect đến giao diện quét QR
  const payUrl = response.data.payUrl;
  
  if (!payUrl) {
    throw new Error('MoMo không trả về payment URL');
  }
  
  console.log('✅ MoMo payUrl:', payUrl);
  
  // Tính thời gian hết hạn (15 phút)
  const expiresAt = new Date();
  expiresAt.setMinutes(expiresAt.getMinutes() + 15);
  
  return {
    paymentUrl: payUrl, // URL này frontend sẽ redirect để hiển thị giao diện QR của MoMo
    requestId,
    momoOrderId,
    expiresAt,
  };
};

export default {
  createPayment,
  verifySignature,
  createSignature,
};

