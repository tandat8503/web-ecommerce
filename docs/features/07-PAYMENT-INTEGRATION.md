# Payment Integration - Tích Hợp Thanh Toán VNPay

## 📋 Tổng Quan

Hệ thống thanh toán hỗ trợ:
- **COD (Cash on Delivery)**: Thanh toán khi nhận hàng
- **VNPay**: Cổng thanh toán trực tuyến
- Payment URL generation
- Payment callback handling
- Payment verification
- Refund logic

---

## 🔧 VNPay Configuration

### Environment Variables

```env
# VNPay Configuration
VNPAY_TMN_CODE=your-tmn-code          # Mã website (Terminal ID)
VNPAY_HASH_SECRET=your-hash-secret    # Secret key
VNPAY_URL=https://sandbox.vnpayment.vn/paymentv2/vpcpay.html  # Sandbox URL
VNPAY_RETURN_URL=http://localhost:5173/payment/vnpay-return   # Frontend callback URL

# Production
# VNPAY_URL=https://vnpayment.vn/paymentv2/vpcpay.html
```

### Cách Đăng Ký VNPay

1. **Đăng ký tài khoản**: https://sandbox.vnpayment.vn/
2. **Lấy thông tin**:
   - TMN Code (Terminal ID)
   - Hash Secret
3. **Cấu hình Return URL**: URL frontend nhận kết quả thanh toán

---

## 🔧 Backend Implementation

### 1. Service: `services/payment/vnpayService.js`

```javascript
import crypto from 'crypto';
import querystring from 'qs';
import logger from '../../utils/logger.js';

// VNPay config
const getVNPayConfig = () => {
  return {
    vnp_TmnCode: process.env.VNPAY_TMN_CODE,
    vnp_HashSecret: process.env.VNPAY_HASH_SECRET,
    vnp_Url: process.env.VNPAY_URL || 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html',
    vnp_ReturnUrl: process.env.VNPAY_RETURN_URL || 'http://localhost:5173/payment/vnpay-return'
  };
};

/**
 * Sort object by key
 */
const sortObject = (obj) => {
  const sorted = {};
  const keys = Object.keys(obj).sort();
  keys.forEach(key => {
    sorted[key] = obj[key];
  });
  return sorted;
};

/**
 * Create payment URL
 * @param {Object} params
 * @param {Number} params.orderId - Order ID
 * @param {Number} params.amount - Amount in VND
 * @param {String} params.orderInfo - Order description
 * @param {String} params.ipAddr - Client IP address
 * @returns {String} Payment URL
 */
export const createPaymentUrl = (params) => {
  try {
    const { orderId, amount, orderInfo, ipAddr } = params;
    const config = getVNPayConfig();

    if (!config.vnp_TmnCode || !config.vnp_HashSecret) {
      throw new Error('VNPay configuration is missing');
    }

    const date = new Date();
    const createDate = formatDate(date);
    const expireDate = formatDate(new Date(date.getTime() + 15 * 60 * 1000)); // 15 minutes

    // VNPay parameters
    let vnp_Params = {
      vnp_Version: '2.1.0',
      vnp_Command: 'pay',
      vnp_TmnCode: config.vnp_TmnCode,
      vnp_Locale: 'vn',
      vnp_CurrCode: 'VND',
      vnp_TxnRef: `${orderId}_${Date.now()}`, // Unique transaction reference
      vnp_OrderInfo: orderInfo || `Thanh toan don hang ${orderId}`,
      vnp_OrderType: 'other',
      vnp_Amount: amount * 100, // VNPay requires amount in smallest unit (VND * 100)
      vnp_ReturnUrl: config.vnp_ReturnUrl,
      vnp_IpAddr: ipAddr,
      vnp_CreateDate: createDate,
      vnp_ExpireDate: expireDate
    };

    // Sort params
    vnp_Params = sortObject(vnp_Params);

    // Create signature
    const signData = querystring.stringify(vnp_Params, { encode: false });
    const hmac = crypto.createHmac('sha512', config.vnp_HashSecret);
    const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');
    vnp_Params['vnp_SecureHash'] = signed;

    // Create payment URL
    const paymentUrl = config.vnp_Url + '?' + querystring.stringify(vnp_Params, { encode: false });

    logger.info('VNPay payment URL created', { orderId, amount, txnRef: vnp_Params.vnp_TxnRef });

    return paymentUrl;
  } catch (error) {
    logger.error('Create VNPay payment URL error', { error: error.message, params });
    throw error;
  }
};

/**
 * Verify payment callback
 * @param {Object} vnpParams - VNPay callback params
 * @returns {Object} Verification result
 */
export const verifyPaymentCallback = (vnpParams) => {
  try {
    const config = getVNPayConfig();
    const secureHash = vnpParams['vnp_SecureHash'];

    // Remove hash params
    delete vnpParams['vnp_SecureHash'];
    delete vnpParams['vnp_SecureHashType'];

    // Sort params
    const sortedParams = sortObject(vnpParams);

    // Create signature
    const signData = querystring.stringify(sortedParams, { encode: false });
    const hmac = crypto.createHmac('sha512', config.vnp_HashSecret);
    const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');

    // Verify signature
    if (secureHash !== signed) {
      logger.error('VNPay signature verification failed', { 
        expected: signed, 
        received: secureHash 
      });
      return {
        success: false,
        message: 'Chữ ký không hợp lệ'
      };
    }

    // Check response code
    const responseCode = vnpParams['vnp_ResponseCode'];
    const txnRef = vnpParams['vnp_TxnRef'];
    const amount = vnpParams['vnp_Amount'] / 100; // Convert back to VND

    if (responseCode === '00') {
      logger.info('VNPay payment successful', { txnRef, amount });
      return {
        success: true,
        message: 'Thanh toán thành công',
        data: {
          txnRef,
          amount,
          transactionNo: vnpParams['vnp_TransactionNo'],
          bankCode: vnpParams['vnp_BankCode'],
          payDate: vnpParams['vnp_PayDate']
        }
      };
    } else {
      logger.warn('VNPay payment failed', { txnRef, responseCode });
      return {
        success: false,
        message: getResponseMessage(responseCode),
        responseCode
      };
    }
  } catch (error) {
    logger.error('Verify VNPay callback error', { error: error.message });
    return {
      success: false,
      message: 'Lỗi khi xác thực thanh toán'
    };
  }
};

/**
 * Format date for VNPay (yyyyMMddHHmmss)
 */
const formatDate = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  
  return `${year}${month}${day}${hours}${minutes}${seconds}`;
};

/**
 * Get response message from code
 */
const getResponseMessage = (code) => {
  const messages = {
    '00': 'Giao dịch thành công',
    '07': 'Trừ tiền thành công. Giao dịch bị nghi ngờ (liên quan tới lừa đảo, giao dịch bất thường).',
    '09': 'Giao dịch không thành công do: Thẻ/Tài khoản của khách hàng chưa đăng ký dịch vụ InternetBanking tại ngân hàng.',
    '10': 'Giao dịch không thành công do: Khách hàng xác thực thông tin thẻ/tài khoản không đúng quá 3 lần',
    '11': 'Giao dịch không thành công do: Đã hết hạn chờ thanh toán. Xin quý khách vui lòng thực hiện lại giao dịch.',
    '12': 'Giao dịch không thành công do: Thẻ/Tài khoản của khách hàng bị khóa.',
    '13': 'Giao dịch không thành công do Quý khách nhập sai mật khẩu xác thực giao dịch (OTP).',
    '24': 'Giao dịch không thành công do: Khách hàng hủy giao dịch',
    '51': 'Giao dịch không thành công do: Tài khoản của quý khách không đủ số dư để thực hiện giao dịch.',
    '65': 'Giao dịch không thành công do: Tài khoản của Quý khách đã vượt quá hạn mức giao dịch trong ngày.',
    '75': 'Ngân hàng thanh toán đang bảo trì.',
    '79': 'Giao dịch không thành công do: KH nhập sai mật khẩu thanh toán quá số lần quy định.',
    '99': 'Các lỗi khác'
  };
  
  return messages[code] || 'Lỗi không xác định';
};

export default {
  createPaymentUrl,
  verifyPaymentCallback
};
```

### 2. Controller: `controller/paymentController.js`

```javascript
import { createPaymentUrl, verifyPaymentCallback } from '../services/payment/vnpayService.js';
import prisma from '../config/prisma.js';
import logger from '../utils/logger.js';

/**
 * Create VNPay payment URL
 * POST /api/payment/vnpay/create
 */
export const createVNPayPayment = async (req, res) => {
  try {
    const { orderId } = req.body;
    const ipAddr = req.headers['x-forwarded-for'] || 
                   req.connection.remoteAddress || 
                   req.socket.remoteAddress ||
                   '127.0.0.1';

    // Get order
    const order = await prisma.order.findUnique({
      where: { id: Number(orderId) }
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy đơn hàng'
      });
    }

    // Check if order belongs to user
    if (order.userId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Không có quyền thanh toán đơn hàng này'
      });
    }

    // Check payment status
    if (order.paymentStatus === 'PAID') {
      return res.status(400).json({
        success: false,
        message: 'Đơn hàng đã được thanh toán'
      });
    }

    // Create payment URL
    const paymentUrl = createPaymentUrl({
      orderId: order.id,
      amount: Number(order.totalAmount),
      orderInfo: `Thanh toan don hang #${order.orderNumber}`,
      ipAddr
    });

    logger.info('VNPay payment URL created', { 
      orderId: order.id, 
      userId: req.user.id 
    });

    return res.json({
      success: true,
      message: 'Tạo link thanh toán thành công',
      data: {
        paymentUrl
      }
    });
  } catch (error) {
    logger.error('Create VNPay payment error', { error: error.message });
    return res.status(500).json({
      success: false,
      message: 'Lỗi khi tạo link thanh toán'
    });
  }
};

/**
 * VNPay IPN (Instant Payment Notification) callback
 * GET /api/payment/vnpay/ipn
 */
export const vnpayIPN = async (req, res) => {
  try {
    const vnpParams = req.query;
    
    logger.info('VNPay IPN received', { params: vnpParams });

    // Verify callback
    const verifyResult = verifyPaymentCallback(vnpParams);

    if (!verifyResult.success) {
      return res.status(200).json({
        RspCode: '97',
        Message: 'Checksum failed'
      });
    }

    // Extract order ID from txnRef
    const txnRef = vnpParams['vnp_TxnRef'];
    const orderId = parseInt(txnRef.split('_')[0]);

    // Get order
    const order = await prisma.order.findUnique({
      where: { id: orderId }
    });

    if (!order) {
      return res.status(200).json({
        RspCode: '01',
        Message: 'Order not found'
      });
    }

    // Check if already updated
    if (order.paymentStatus === 'PAID') {
      return res.status(200).json({
        RspCode: '02',
        Message: 'Order already confirmed'
      });
    }

    // Update order payment status
    await prisma.order.update({
      where: { id: orderId },
      data: {
        paymentStatus: 'PAID',
        status: 'CONFIRMED'
      }
    });

    // Create notification
    await prisma.notification.create({
      data: {
        userId: order.userId,
        title: 'Thanh toán thành công',
        message: `Đơn hàng #${order.orderNumber} đã được thanh toán thành công`,
        type: 'PAYMENT'
      }
    });

    logger.info('VNPay payment confirmed', { orderId, txnRef });

    return res.status(200).json({
      RspCode: '00',
      Message: 'Confirm Success'
    });
  } catch (error) {
    logger.error('VNPay IPN error', { error: error.message });
    return res.status(200).json({
      RspCode: '99',
      Message: 'Unknown error'
    });
  }
};

/**
 * VNPay return URL handler (for frontend)
 * This is handled by frontend, backend just provides verification
 * GET /api/payment/vnpay/verify
 */
export const verifyVNPayReturn = async (req, res) => {
  try {
    const vnpParams = req.query;

    // Verify callback
    const verifyResult = verifyPaymentCallback(vnpParams);

    if (!verifyResult.success) {
      return res.json({
        success: false,
        message: verifyResult.message
      });
    }

    // Extract order ID
    const txnRef = vnpParams['vnp_TxnRef'];
    const orderId = parseInt(txnRef.split('_')[0]);

    // Get order
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        orderNumber: true,
        paymentStatus: true,
        totalAmount: true
      }
    });

    return res.json({
      success: true,
      message: 'Thanh toán thành công',
      data: {
        order,
        payment: verifyResult.data
      }
    });
  } catch (error) {
    logger.error('Verify VNPay return error', { error: error.message });
    return res.status(500).json({
      success: false,
      message: 'Lỗi khi xác thực thanh toán'
    });
  }
};
```

### 3. Routes: `routes/paymentRoutes.js`

```javascript
import express from 'express';
import {
  createVNPayPayment,
  vnpayIPN,
  verifyVNPayReturn
} from '../controller/paymentController.js';
import { authenticate } from '../middleware/authMiddleware.js';

const router = express.Router();

// VNPay routes
router.post('/vnpay/create', authenticate, createVNPayPayment);
router.get('/vnpay/ipn', vnpayIPN); // No auth - called by VNPay
router.get('/vnpay/verify', verifyVNPayReturn);

export default router;
```

---

## 🎨 Frontend Implementation

### 1. API Service: `src/api/payment.js`

```javascript
import axiosClient from './axiosClient';

export const createVNPayPayment = (orderId) => {
  return axiosClient.post('/payment/vnpay/create', { orderId });
};

export const verifyVNPayReturn = (params) => {
  return axiosClient.get('/payment/vnpay/verify', { params });
};
```

### 2. Payment Flow in Checkout

```jsx
// In Checkout.jsx or useCheckout.js
import { createVNPayPayment } from '@/api/payment';
import { createOrder } from '@/api/orders';

const handlePlaceOrder = async () => {
  try {
    // Create order first
    const orderResponse = await createOrder(orderData);
    const { orderId } = orderResponse.data.data;

    // If VNPay payment
    if (paymentMethod === 'VNPAY') {
      const paymentResponse = await createVNPayPayment(orderId);
      const { paymentUrl } = paymentResponse.data.data;
      
      // Redirect to VNPay
      window.location.href = paymentUrl;
    } else {
      // COD - redirect to order detail
      navigate(`/orders/${orderId}`);
    }
  } catch (error) {
    toast.error('Lỗi khi đặt hàng');
  }
};
```

### 3. VNPay Return Page: `src/pages/payment/VNPayReturn.jsx`

```jsx
import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { verifyVNPayReturn } from '@/api/payment';
import { CheckCircle, XCircle } from 'lucide-react';

export default function VNPayReturn() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [verifying, setVerifying] = useState(true);
  const [result, setResult] = useState(null);

  useEffect(() => {
    const verifyPayment = async () => {
      try {
        // Convert searchParams to object
        const params = {};
        searchParams.forEach((value, key) => {
          params[key] = value;
        });

        const response = await verifyVNPayReturn(params);
        setResult(response.data);
      } catch (error) {
        setResult({
          success: false,
          message: 'Lỗi khi xác thực thanh toán'
        });
      } finally {
        setVerifying(false);
      }
    };

    verifyPayment();
  }, [searchParams]);

  if (verifying) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Đang xác thực thanh toán...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        {result?.success ? (
          <>
            <div className="text-center mb-6">
              <CheckCircle className="w-20 h-20 text-green-500 mx-auto mb-4" />
              <h1 className="text-2xl font-bold text-green-600 mb-2">
                Thanh Toán Thành Công!
              </h1>
              <p className="text-gray-600">
                Đơn hàng #{result.data.order.orderNumber} đã được thanh toán
              </p>
            </div>

            <div className="border-t pt-4 space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Mã giao dịch:</span>
                <span className="font-semibold">{result.data.payment.transactionNo}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Số tiền:</span>
                <span className="font-semibold text-green-600">
                  {result.data.payment.amount.toLocaleString('vi-VN')}đ
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Ngân hàng:</span>
                <span className="font-semibold">{result.data.payment.bankCode}</span>
              </div>
            </div>

            <button
              onClick={() => navigate(`/orders/${result.data.order.id}`)}
              className="w-full mt-6 bg-blue-600 text-white py-3 rounded hover:bg-blue-700"
            >
              Xem Chi Tiết Đơn Hàng
            </button>
          </>
        ) : (
          <>
            <div className="text-center mb-6">
              <XCircle className="w-20 h-20 text-red-500 mx-auto mb-4" />
              <h1 className="text-2xl font-bold text-red-600 mb-2">
                Thanh Toán Thất Bại
              </h1>
              <p className="text-gray-600">{result?.message}</p>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => navigate('/cart')}
                className="w-full bg-blue-600 text-white py-3 rounded hover:bg-blue-700"
              >
                Quay Lại Giỏ Hàng
              </button>
              <button
                onClick={() => navigate('/')}
                className="w-full border border-gray-300 py-3 rounded hover:bg-gray-50"
              >
                Về Trang Chủ
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
```

---

## 🧪 Testing

### Test Create Payment URL
```bash
curl -X POST http://localhost:5000/api/payment/vnpay/create \
  -H "Authorization: Bearer USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{ "orderId": 1 }'
```

### Test VNPay Callback (Simulate)
```bash
# This is called by VNPay, not manually
# Example callback URL:
http://localhost:5000/api/payment/vnpay/ipn?vnp_Amount=300000000&vnp_BankCode=NCB&vnp_ResponseCode=00&...
```

---

## 🚀 Flow Diagram

```
VNPay Payment Flow:

1. User chọn VNPay → Click "Đặt hàng"
2. Frontend: POST /orders (create order)
3. Backend: Create order with status PENDING
4. Frontend: POST /payment/vnpay/create
5. Backend: Generate VNPay payment URL
6. Frontend: Redirect to VNPay
7. User: Nhập thông tin thẻ → Thanh toán
8. VNPay: Redirect về frontend return URL
9. Frontend: GET /payment/vnpay/verify
10. Backend: Verify signature
11. Frontend: Show success/fail page
12. VNPay: Call IPN (background)
13. Backend: Update order status to PAID
14. Backend: Create notification

COD Payment Flow:

1. User chọn COD → Click "Đặt hàng"
2. Frontend: POST /orders
3. Backend: Create order with UNPAID status
4. Frontend: Redirect to order detail
5. Order status: PENDING
6. Admin: Confirm order → CONFIRMED
7. Shipper: Deliver → DELIVERED
8. Backend: Update payment status to PAID
```

---

## 📝 VNPay Response Codes

| Code | Meaning |
|------|---------|
| 00 | Giao dịch thành công |
| 07 | Trừ tiền thành công (nghi ngờ gian lận) |
| 09 | Chưa đăng ký InternetBanking |
| 10 | Xác thực sai quá 3 lần |
| 11 | Hết hạn chờ thanh toán |
| 12 | Thẻ bị khóa |
| 13 | Sai OTP |
| 24 | Khách hàng hủy giao dịch |
| 51 | Tài khoản không đủ số dư |
| 65 | Vượt quá hạn mức giao dịch |
| 75 | Ngân hàng bảo trì |
| 79 | Sai mật khẩu quá số lần |
| 99 | Lỗi khác |

---

## 🔒 Security Best Practices

### 1. Signature Verification
```javascript
// Always verify VNPay signature
const verifyResult = verifyPaymentCallback(vnpParams);
if (!verifyResult.success) {
  // Reject payment
}
```

### 2. Amount Validation
```javascript
// Verify amount matches order
const paidAmount = vnpParams['vnp_Amount'] / 100;
if (paidAmount !== order.totalAmount) {
  // Reject - amount mismatch
}
```

### 3. Idempotency
```javascript
// Check if already processed
if (order.paymentStatus === 'PAID') {
  return; // Already processed
}
```

### 4. IP Whitelist (Production)
```javascript
// Only accept IPN from VNPay IPs
const vnpayIPs = ['113.52.45.78', '113.52.45.79'];
if (!vnpayIPs.includes(req.ip)) {
  return res.status(403).json({ message: 'Forbidden' });
}
```

---

## 🐛 Troubleshooting

### 1. Signature Mismatch
```
Lỗi: vnp_SecureHash không khớp
Giải pháp:
- Kiểm tra VNPAY_HASH_SECRET
- Đảm bảo sort params đúng thứ tự
- Kiểm tra encoding (UTF-8)
```

### 2. Payment URL không hoạt động
```
Lỗi: Redirect về VNPay bị lỗi
Giải pháp:
- Kiểm tra VNPAY_TMN_CODE
- Kiểm tra VNPAY_URL (sandbox vs production)
- Kiểm tra amount (phải * 100)
```

### 3. IPN không được gọi
```
Lỗi: Order không tự động update
Giải pháp:
- Kiểm tra IPN URL có public không
- Kiểm tra firewall/CORS
- Xem log VNPay dashboard
```

---

## ✅ Checklist

- [x] VNPay configuration
- [x] Create payment URL
- [x] Signature generation
- [x] Payment callback verification
- [x] IPN handler
- [x] Return URL handler
- [x] Order status update
- [x] COD support
- [x] Frontend payment flow
- [x] Success/Fail pages
- [x] Notifications
- [x] Security (signature, amount validation)
- [x] Error handling
- [x] Logging
