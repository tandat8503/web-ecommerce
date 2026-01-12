import crypto from 'crypto';// thư viện để tạo signature
import axios from 'axios';// thư viện để gọi api

/**
giúp website của bạn "nói chuyện" với hệ thống Tingee
để tạo mã QR chuyển khoản và tự động xác nhận khi có tiền về
 */

// Tingee API Configuration
const TINGEE_CONFIG = {
  // API url của tingee 
  BASE_URL: process.env.TINGEE_BASE_URL || 'https://uat-open-api.tingee.vn', // môi trường test
  PRODUCTION_URL: 'https://open-api.tingee.vn', // Địa chỉ server Tingee dùng để chạy thật
  
  // thông tin đăng nhập của tingee cấp khi đăng ký 
  CLIENT_ID: process.env.TINGEE_CLIENT_ID || '631033dfff96932f2c3d7eadbb29c3a1',
  SECRET_TOKEN: process.env.TINGEE_SECRET_TOKEN || 'p6EBf+fD8N3TpngnPilil2gKWoWr4S1eAgZjsh4O1FE=',
  
  // endpoint của tingee để tạo qr code 
  ENDPOINTS: {
    GENERATE_QR: '/v1/generate-viet-qr'//Đường dẫn API để tạo mã QR
  },
  
  // ngân hàng hỗ trợ của tingee
  BANKS: {
    OCB: 'OCB',
    MBB: 'MBB',
    BIDV: 'BIDV',
    ACB: 'ACB',
    CTG: 'CTG',
    PGB: 'PGB',
    STB: 'STB'
  }
};

/**
 * hàm tạo timestamp theo format yyyyMMddHHmmssSSS
  Tạo một chuỗi thời gian chính xác đến mili giây (dùng để định danh yêu cầu)
 */
const generateTimestamp = () => {
  const now = new Date();// lấy thời gian hiện tại
  const year = now.getFullYear();// lấy năm
  const month = String(now.getMonth() + 1).padStart(2, '0');// lấy tháng
  const day = String(now.getDate()).padStart(2, '0');// lấy ngày
  const hours = String(now.getHours()).padStart(2, '0');// lấy giờ
  const minutes = String(now.getMinutes()).padStart(2, '0');// lấy phút
  const seconds = String(now.getSeconds()).padStart(2, '0');// lấy giây
  const milliseconds = String(now.getMilliseconds()).padStart(3, '0');// lấy mili giây
  
  return `${year}${month}${day}${hours}${minutes}${seconds}${milliseconds}`;// trả về timestamp theo format yyyyMMddHHmmssSSS
};

/**
 * Hàm tạo "chữ ký" bảo mật (Signature)
 * Sử dụng thuật toán HMAC-SHA512 để tạo chữ ký
 */
const generateSignature = (timestamp, body) => {
  // Chuyển dữ liệu gửi đi thành chuỗi JSON
  const bodyString = JSON.stringify(body);
  
  // Kết hợp thời gian + dữ liệu gửi đi
  const dataToHash = `${timestamp}:${bodyString}`;
  
  // Tạo chữ ký sử dụng thuật toán HMAC-SHA512
  const signature = crypto
    .createHmac('sha512', TINGEE_CONFIG.SECRET_TOKEN)//Dùng mã bí mật trộn với dữ liệu
    .update(dataToHash)//Cập nhật dữ liệu để tạo chữ ký
    .digest('hex');//Trả về chữ ký
  
  return signature;
};

/**
 * Hàm xác nhận chữ ký (Signature)
 * @param {string} signature - Chữ ký từ header
 * @param {string} timestamp - Thời gian từ header
 * @param {object} body - Dữ liệu gửi đi
 * @returns {boolean} True if signature is valid
 */
export const verifyWebhookSignature = (signature, timestamp, body) => {
  const expectedSignature = generateSignature(timestamp, body);//Tạo chữ ký dựa trên thời gian và dữ liệu
  return signature === expectedSignature;//So sánh chữ ký nhận được với chữ ký tạo ra
};

/**
 * Hàm tạo mã QR cho thanh toán
 * 
 * @param {Object} params - QR Code parameters
 * @param {string} params.bankName - Ngân hàng (OCB, MBB, BIDV, ACB, CTG, PGB, STB)
 * @param {string} params.accountNumber - Số tài khoản
 * @param {number} params.amount - Số tiền
 * @param {string} params.content - Mô tả/chi tiết thanh toán
 * 
 * @returns {Promise<Object>} QR Code data
 * @throws {Error} Nếu gọi API thất bại
 * 
 * @example
 * const qrData = await generateVietQR({
 *   bankName: 'BIDV',
 *   accountNumber: 'V1T40524094111',
 *   amount: 500000,
 *   content: 'Thanh toan don hang #12345'
 * });
 */
export const generateVietQR = async ({ bankName, accountNumber, amount, content }) => {
  try {
    // 1.Kiểm tra xem ngân hàng nhập vào có đúng danh sách hỗ trợ không
    if (!Object.values(TINGEE_CONFIG.BANKS).includes(bankName)) {
      throw new Error(`Ngân hàng không hợp lệ : ${Object.values(TINGEE_CONFIG.BANKS).join(', ')}`);
    }

    // 2. Lấy thời gian hiện tại
    const timestamp = generateTimestamp();
    
    // 3. Chuẩn bị dữ liệu gửi đi
    const requestBody = {
      bankName,
      accountNumber,
      amount,
      content
    };
    
    // 4.Tạo chữ ký bảo mật cho đơn hàng
    const signature = generateSignature(timestamp, requestBody);
    
    // 5.Chuẩn bị header
    const headers = {
      'accept': 'application/json',
      'Content-Type': 'application/json',
      'x-client-id': TINGEE_CONFIG.CLIENT_ID,//Gửi ID của bạn cho Tingee biết
      'x-request-timestamp': timestamp,//Gửi thời gian hiện tại cho Tingee biết
      'x-signature': signature//Gửi chữ ký cho Tingee biết
    };
    
    // 6.Debug logging
    console.log(' Tingee API Request:', {
      url: `${TINGEE_CONFIG.BASE_URL}${TINGEE_CONFIG.ENDPOINTS.GENERATE_QR}`,
      clientId: TINGEE_CONFIG.CLIENT_ID,
      timestamp,
      body: requestBody
    });
    
    // 7.Gửi yêu cầu thật sự lên server Tingee
    const response = await axios.post(
      `${TINGEE_CONFIG.BASE_URL}${TINGEE_CONFIG.ENDPOINTS.GENERATE_QR}`,
      requestBody,
      { headers }
    );
    
    // 8.Kiểm tra response
//Nếu Tingee trả về mã '00' là thành công, trả dữ liệu QR về cho giao diện    
    if (response.data.code === '00') {
      return {
        success: true,
        data: response.data.data,
        message: 'tạo QR thành công'
      };
    } else {
      throw new Error(response.data.message || 'tạo QR thất bại');
    }
    
  } catch (error) {
    console.error('tạo QR thất bại:', error.response?.data || error.message);
    throw new Error(error.response?.data?.message || error.message || 'tạo QR thất bại');
  }
};

/**
 * Xử lý webhook từ Tingee
 * Hàm này chạy khi Tingee chủ động báo cho bạn là: "Khách vừa trả tiền rồi đấy!"
 */
export const processWebhook = async (headers, body) => {
  try {
    const signature = headers['x-signature'];//Lấy chữ ký từ header
    const timestamp = headers['x-request-timestamp'];//Lấy thời gian từ header
    
  //1. Kiểm tra xem chữ ký Tingee gửi có khớp với dữ liệu không (tránh giả mạo)
    if (!verifyWebhookSignature(signature, timestamp, body)) {
      return {
        code: '09',
        message: 'chữ ký không hợp lệ'
      };
    }
    
// 2. Lấy các thông tin giao dịch mà Tingee vừa báo về
    const {
      clientId,
      transactionCode,//Mã giao dịch
      amount,//Số tiền
      content,//Mô tả/chi tiết thanh toán
      bank,//Ngân hàng
      accountNumber,
      vaAccountNumber,
      transactionDate,//Ngày giao dịch
      additionalData
    } = body;
    
    console.log('Tingee Webhook nhận được:', {
      transactionCode,
      amount,
      content,
      bank,
      transactionDate
    });
    
    // Return success
    return {
      code: '00',
      message: 'thanh toán thành công'
    };
    
  } catch (error) {
    console.error('Webhook thất bại:', error);
    return {
      code: '99',
      message: error.message || 'thanh toán thất bại'
    };
  }
};

/**
 * Lấy danh sách ngân hàng được hỗ trợ
 */
export const getSupportedBanks = () => {
  return [
    { code: 'OCB', name: 'Ngân hàng TMCP Phương Đông' },
    { code: 'MBB', name: 'Ngân hàng TMCP Quân Đội' },
    { code: 'BIDV', name: 'Ngân hàng TMCP Đầu tư và Phát triển Việt Nam' },
    { code: 'ACB', name: 'Ngân hàng TMCP Á Châu' },
    { code: 'CTG', name: 'Ngân hàng TMCP Công Thương Việt Nam' },
    { code: 'PGB', name: 'Ngân hàng TMCP Xăng dầu Petrolimex' },
    { code: 'STB', name: 'Ngân hàng TMCP Sài Gòn Thương Tín' }
  ];
};

export default {
  generateVietQR,//Tạo QR code
  processWebhook,//Xử lý webhook
  verifyWebhookSignature,//Xác nhận chữ ký
  getSupportedBanks,//Lấy danh sách ngân hàng
  TINGEE_CONFIG//Cấu hình Tingee
};
