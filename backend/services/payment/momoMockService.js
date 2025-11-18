import crypto from 'crypto';
import axios from 'axios';

// MoMo config (hardcode cho demo)
const partnerCode = "MOMO";
const accessKey = "F8BBA842ECF85";
const secretkey = "K951B6PE1waDMi640xX08PD3vg6EkVlz";
const apiUrl = "https://test-payment.momo.vn/v2/gateway/api/create";
// Redirect URL: Backend sẽ xử lý và redirect về frontend
const redirectUrl = "http://localhost:5000/api/payment/momo/result";
// IPN URL: Dùng localhost nếu test với MoMo Developer App (không cần ngrok)
// Nếu dùng app MoMo thông thường, vẫn cần ngrok: https://xxx.ngrok-free.dev/api/payment/momo/callback
const ipnUrl ="http://localhost:5000/api/payment/momo/callback";

// Tạo chữ ký
export const createSignature = (params) => {
  const { signature, lang, ...paramsForSignature } = params;
  const rawData = Object.keys(paramsForSignature)
    .sort()
    .map(key => `${key}=${paramsForSignature[key]}`)
    .join('&');
  return crypto.createHmac('sha256', secretkey).update(rawData).digest('hex');
};

// Xác thực chữ ký
export const verifySignature = (params, signature) => {
  return createSignature(params) === signature;
};

// Tạo payment URL từ MoMo
export const createPayment = async (orderNumber, amount, orderInfo) => {
  const requestId = partnerCode + Date.now();
  const momoOrderId = `${orderNumber}_${Date.now()}`;
  
  const requestBody = {
    partnerCode,
    accessKey,
    requestId,
    amount: Math.round(Number(amount)),
    orderId: momoOrderId,
    orderInfo: orderInfo || "pay with MoMo",
    redirectUrl,
    ipnUrl,
    extraData: "",
    requestType: "captureWallet",
    lang: "vi"
  };
  
  requestBody.signature = createSignature(requestBody);
  
  console.log('📡 Gọi MoMo API:', {
    partnerCode,
    orderId: momoOrderId,
    amount: Math.round(Number(amount)),
    ipnUrl,
    orderInfo: orderInfo || "pay with MoMo"
  });
  
  const response = await axios.post(apiUrl, requestBody, {
    headers: { 'Content-Type': 'application/json' }
  });
  
  console.log('📥 Response từ MoMo:', {
    resultCode: response.data.resultCode,
    message: response.data.message,
    hasPayUrl: !!response.data.payUrl
  });
  
  if (response.data.resultCode !== 0) {
    console.error('❌ MoMo API Error:', {
      resultCode: response.data.resultCode,
      message: response.data.message,
      orderId: momoOrderId
    });
    throw new Error(`MoMo Error: ${response.data.message} (Code: ${response.data.resultCode})`);
  }
  
  if (!response.data.payUrl) {
    console.error('❌ MoMo không trả về payment URL');
    throw new Error('MoMo không trả về payment URL');
  }
  
  const expiresAt = new Date();
  expiresAt.setMinutes(expiresAt.getMinutes() + 15);
  
  console.log('✅ Tạo payment thành công:', {
    orderId: momoOrderId,
    payUrl: response.data.payUrl.substring(0, 60) + '...',
    expiresAt: expiresAt.toISOString()
  });
  
  return {
    paymentUrl: response.data.payUrl,
    requestId,
    momoOrderId,
    expiresAt
  };
};

export default { createPayment, verifySignature, createSignature };

