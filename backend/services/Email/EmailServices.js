import nodemailer from 'nodemailer';

// Config Gmail (dễ hiểu – chỉ cần set biến môi trường EMAIL_USER, EMAIL_PASS)
const emailTransporter = nodemailer.createTransport({
  host: 'smtp.gmail.com', // SMTP của Gmail
  port: 587, // Port TLS (STARTTLS) tiêu chuẩn
  secure: false, // false vì dùng TLS (nếu dùng SSL port 465 thì true)
  auth: {
    user: process.env.EMAIL_USER, // Gmail/ứng dụng email của bạn
    pass: process.env.EMAIL_PASS, // App password/ mật khẩu ứng dụng
  },
});

const FROM_EMAIL = '"Nội thất văn phòng" <tandat8503@gmail.com>';

/**
 * Gửi OTP quên mật khẩu
 */
export const sendForgotPasswordEmail = async ({ email, otpCode }) => {
  return emailTransporter.sendMail({
    from: FROM_EMAIL,
    to: email,
    subject: 'Mã OTP đặt lại mật khẩu',
    text: `Xin chào,\n\nMã OTP đặt lại mật khẩu của bạn là: ${otpCode}\nMã có hiệu lực trong 10 phút.`,
    html: `
      <div style="font-family: Arial; line-height: 1.5;">
        <h3>Xin chào,</h3>
        <p>Mã OTP đặt lại mật khẩu của bạn:</p>
        <div style="font-size: 28px; font-weight: bold; letter-spacing: 6px;">${otpCode}</div>
        <p>Mã có hiệu lực trong <b>10 phút</b>. Không chia sẻ mã này cho bất kỳ ai.</p>
        <p>Cảm ơn bạn đã tin dùng Nội thất văn phòng!</p>
      </div>
    `,
  });
};

/**
 * Gửi email mã giảm giá cho user
 */
export const sendDiscountEmail = async ({ 
  email, 
  couponCode, 
  couponName,
  discountType, 
  discountValue,
  minimumAmount,
  startDate, 
  endDate 
}) => {
  // Format giá trị giảm giá
  const discountText = discountType === 'PERCENT' 
    ? `${discountValue}%` 
    : `${Number(discountValue).toLocaleString('vi-VN')}đ`;

  // Format giá trị đơn hàng tối thiểu
  const minOrderText = minimumAmount > 0
    ? `${Number(minimumAmount).toLocaleString('vi-VN')}đ`
    : 'Không yêu cầu';

  return emailTransporter.sendMail({
    from: FROM_EMAIL,
    to: email,
    subject: `Bạn nhận được mã giảm giá ${discountText}!`,
    text: `Xin chào,\n\nBạn vừa nhận được mã ${couponCode} giảm ${discountText}.\nÁp dụng từ ${startDate} đến ${endDate}.\nĐơn hàng tối thiểu: ${minOrderText}`,
    html: `
      <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif; padding: 20px;">
        <!-- Header -->
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #2563eb; margin: 0;">Chúc mừng!</h1>
          <p style="color: #666; margin: 10px 0;">Bạn nhận được mã giảm giá đặc biệt</p>
        </div>

        <!-- Coupon Box -->
        <div style="background: #667eea; border-radius: 10px; padding: 30px; text-align: center; margin: 20px 0;">
          <div style="color: white; font-size: 14px; margin-bottom: 10px;">MÃ KHUYẾN MÃI</div>
          <div style="background: white; border: 2px dashed #667eea; border-radius: 8px; padding: 15px; margin: 15px 0;">
            <div style="font-size: 28px; font-weight: bold; color: #667eea; letter-spacing: 3px;">${couponCode}</div>
          </div>
          <div style="color: white; font-size: 32px; font-weight: bold; margin: 10px 0;">${discountText}</div>
        </div>

        <!-- Coupon Name -->
        <div style="text-align: center; margin: 20px 0;">
          <h2 style="color: #333; margin: 0; font-size: 18px;">${couponName}</h2>
        </div>

        <!-- Details -->
        <div style="background: #f5f5f5; border-radius: 8px; padding: 20px; margin: 20px 0;">
          <h3 style="color: #333; margin-top: 0; font-size: 16px;">Chi tiết mã giảm giá</h3>
          <table style="width: 100%;">
            <tr>
              <td style="padding: 8px 0; color: #666;">Loại giảm giá:</td>
              <td style="padding: 8px 0; text-align: right; font-weight: bold; color: #333;">
                ${discountType === 'PERCENT' ? 'Phần trăm' : 'Số tiền cố định'}
              </td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666;">Đơn hàng tối thiểu:</td>
              <td style="padding: 8px 0; text-align: right; font-weight: bold; color: #333;">${minOrderText}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666;">Ngày bắt đầu:</td>
              <td style="padding: 8px 0; text-align: right; font-weight: bold; color: #333;">${startDate}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666;">Ngày hết hạn:</td>
              <td style="padding: 8px 0; text-align: right; font-weight: bold; color: #dc2626;">${endDate}</td>
            </tr>
          </table>
        </div>

        <!-- CTA Button -->
        <div style="text-align: center; margin: 20px 0;">
          <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}" style="display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 25px; font-weight: bold;">
            Mua Sắm Ngay
          </a>
        </div>

        <!-- Note -->
        <div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0;">
          <p style="margin: 0; color: #856404; font-size: 14px;">
            <strong>Lưu ý:</strong> Mã khuyến mãi này chỉ áp dụng một lần và sẽ hết hạn vào <strong>${endDate}</strong>. Hãy nhanh tay sử dụng!
          </p>
        </div>

        <!-- Footer -->
        <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; color: #666; font-size: 14px;">
          <p style="margin: 5px 0;">Cảm ơn bạn đã tin tưởng <strong>Nội thất văn phòng</strong>!</p>
          <p style="margin: 5px 0;">Hotline: <strong>0906.060.606</strong></p>
          <p style="margin: 10px 0 0 0; font-size: 12px; color: #999;">Email này được gửi tự động, vui lòng không trả lời.</p>
        </div>
      </div>
    `,
  });
};

/**
 * Format số tiền VNĐ
 */
const formatPrice = (amount) => {
  if (!amount) return '0₫';
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(Number(amount));
};

/**
 * Format ngày tháng
 */
const formatDate = (date) => {
  if (!date) return '';
  const d = new Date(date);
  return d.toLocaleDateString('vi-VN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

/**
 * Template email chung cho đơn hàng
 */
const getOrderEmailTemplate = ({ orderNumber, orderDate, orderItems, subtotal, shippingFee, discountAmount, totalAmount, shippingAddress, paymentMethod, status, statusText, message, trackingCode }) => {
  const itemsHtml = orderItems.map(item => `
    <tr>
      <td style="padding: 12px; border-bottom: 1px solid #eee;">
        <strong>${item.productName}</strong>
        ${item.variantName ? `<br><small style="color: #666;">${item.variantName}</small>` : ''}
      </td>
      <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
      <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right;">${formatPrice(item.unitPrice)}</td>
      <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right;"><strong>${formatPrice(item.totalPrice)}</strong></td>
    </tr>
  `).join('');

  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f5f5f5; padding: 20px;">
      <div style="background-color: white; border-radius: 8px; padding: 30px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
        <!-- Header -->
        <div style="text-align: center; margin-bottom: 30px; border-bottom: 2px solid #2563eb; padding-bottom: 20px;">
          <h1 style="color: #2563eb; margin: 0;">Nội thất văn phòng</h1>
          <p style="color: #666; margin: 5px 0 0 0;">Thông báo đơn hàng</p>
        </div>

        <!-- Status Badge -->
        <div style="text-align: center; margin-bottom: 20px;">
          <span style="display: inline-block; padding: 10px 20px; background-color: #2563eb; color: white; border-radius: 20px; font-weight: bold;">
            ${statusText}
          </span>
        </div>

        <!-- Message -->
        ${message ? `<div style="background-color: #eff6ff; border-left: 4px solid #2563eb; padding: 15px; margin-bottom: 20px; border-radius: 4px;">
          <p style="margin: 0; color: #1e40af;">${message}</p>
        </div>` : ''}

        <!-- Order Info -->
        <div style="background-color: #f9fafb; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          <h2 style="color: #1f2937; margin-top: 0; font-size: 18px;">Thông tin đơn hàng</h2>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; color: #666; width: 40%;">Mã đơn hàng:</td>
              <td style="padding: 8px 0; font-weight: bold; color: #1f2937;"><strong>${orderNumber}</strong></td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666;">Ngày đặt:</td>
              <td style="padding: 8px 0; color: #1f2937;">${formatDate(orderDate)}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666;">Phương thức thanh toán:</td>
              <td style="padding: 8px 0; color: #1f2937;">
                ${paymentMethod === 'VNPAY' ? 'VNPay' : 
                  paymentMethod === 'TINGEE' ? 'Chuyển khoản QR (Tingee)' : 
                  'Thanh toán khi nhận hàng (COD)'}
              </td>
            </tr>
            ${trackingCode ? `
            <tr>
              <td style="padding: 8px 0; color: #666;">Mã vận đơn:</td>
              <td style="padding: 8px 0; color: #1f2937; font-weight: bold;">${trackingCode}</td>
            </tr>
            ` : ''}
          </table>
        </div>

        <!-- Order Items -->
        <div style="margin-bottom: 20px;">
          <h2 style="color: #1f2937; margin-top: 0; font-size: 18px;">Chi tiết sản phẩm</h2>
          <table style="width: 100%; border-collapse: collapse; border: 1px solid #e5e7eb;">
            <thead>
              <tr style="background-color: #f9fafb;">
                <th style="padding: 12px; text-align: left; border-bottom: 2px solid #e5e7eb;">Sản phẩm</th>
                <th style="padding: 12px; text-align: center; border-bottom: 2px solid #e5e7eb;">Số lượng</th>
                <th style="padding: 12px; text-align: right; border-bottom: 2px solid #e5e7eb;">Đơn giá</th>
                <th style="padding: 12px; text-align: right; border-bottom: 2px solid #e5e7eb;">Thành tiền</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>
        </div>

        <!-- Order Summary -->
        <div style="background-color: #f9fafb; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          <h2 style="color: #1f2937; margin-top: 0; font-size: 18px;">Tổng kết đơn hàng</h2>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; color: #666;">Tạm tính:</td>
              <td style="padding: 8px 0; text-align: right; color: #1f2937;">${formatPrice(subtotal)}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666;">Phí vận chuyển:</td>
              <td style="padding: 8px 0; text-align: right; color: #1f2937;">${formatPrice(shippingFee)}</td>
            </tr>
            ${discountAmount > 0 ? `
            <tr>
              <td style="padding: 8px 0; color: #666;">Giảm giá:</td>
              <td style="padding: 8px 0; text-align: right; color: #10b981;">-${formatPrice(discountAmount)}</td>
            </tr>
            ` : ''}
            <tr style="border-top: 2px solid #e5e7eb;">
              <td style="padding: 12px 0; font-weight: bold; color: #1f2937; font-size: 18px;">Tổng cộng:</td>
              <td style="padding: 12px 0; text-align: right; font-weight: bold; color: #2563eb; font-size: 20px;">${formatPrice(totalAmount)}</td>
            </tr>
          </table>
        </div>

        <!-- Shipping Address -->
        <div style="background-color: #f9fafb; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          <h2 style="color: #1f2937; margin-top: 0; font-size: 18px;">Địa chỉ giao hàng</h2>
          <p style="color: #1f2937; margin: 0; white-space: pre-line;">${shippingAddress}</p>
        </div>

        <!-- Footer -->
        <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #666; font-size: 14px;">
          <p style="margin: 5px 0;">Cảm ơn bạn đã tin dùng Nội thất văn phòng!</p>
          <p style="margin: 5px 0;">Nếu có thắc mắc, vui lòng liên hệ hotline: <strong>0906.060.606</strong></p>
        </div>
      </div>
    </div>
  `;
};

/**
 * Gửi email xác nhận đặt hàng (khi tạo đơn mới)
 */
export const sendOrderConfirmationEmail = async ({ email, order }) => {
  const orderItems = order.orderItems || [];
  
  return emailTransporter.sendMail({
    from: FROM_EMAIL,
    to: email,
    subject: `Xác nhận đơn hàng #${order.orderNumber}`,
    text: `Cảm ơn bạn đã đặt hàng! Đơn hàng #${order.orderNumber} của bạn đã được tiếp nhận.`,
    html: getOrderEmailTemplate({
      orderNumber: order.orderNumber,//số đơn hàng
      orderDate: order.createdAt,//ngày đặt hàng
      orderItems,//danh sách sản phẩm
      subtotal: order.subtotal,//tổng tiền
      shippingFee: order.shippingFee,//phí vận chuyển
      discountAmount: order.discountAmount,//giảm giá
      totalAmount: order.totalAmount,//tổng tiền
      shippingAddress: order.shippingAddress,//địa chỉ giao hàng
      paymentMethod: order.paymentMethod,//phương thức thanh toán
      status: order.status,//trạng thái đơn hàng
      statusText: 'Đơn hàng đã được tiếp nhận',
      message: 'Cảm ơn bạn đã đặt hàng! Chúng tôi đã nhận được đơn hàng của bạn và đang xử lý.',
      trackingCode: null,//mã vận đơn
    }),
  });
};

/**
 * Gửi email thông báo đơn hàng đã được xác nhận
 */
export const sendOrderConfirmedEmail = async ({ email, order }) => {
  const orderItems = order.orderItems || [];//danh sách sản phẩm
  //gửi email xác nhận đơn hàng
  return emailTransporter.sendMail({
    from: FROM_EMAIL,
    to: email,
    subject: `Đơn hàng #${order.orderNumber} đã được xác nhận`,
    text: `Đơn hàng #${order.orderNumber} của bạn đã được xác nhận và đang được chuẩn bị.`,
    html: getOrderEmailTemplate({
      orderNumber: order.orderNumber,//số đơn hàng
      orderDate: order.createdAt,//ngày đặt hàng
      orderItems,//danh sách sản phẩm
      subtotal: order.subtotal,//tổng tiền
      shippingFee: order.shippingFee,//phí vận chuyển
      discountAmount: order.discountAmount,//giảm giá
      totalAmount: order.totalAmount,//tổng tiền
      shippingAddress: order.shippingAddress,//địa chỉ giao hàng
      paymentMethod: order.paymentMethod,//phương thức thanh toán
      status: order.status,//trạng thái đơn hàng
      statusText: 'Đơn hàng đã được xác nhận',
      message: 'Đơn hàng của bạn đã được xác nhận và đang được chuẩn bị. Chúng tôi sẽ thông báo khi đơn hàng được giao.',
      trackingCode: order.trackingCode || null,//mã vận đơn
    }),
  });
};

/**
 * Gửi email thông báo đơn hàng đang giao
 */
export const sendOrderShippingEmail = async ({ email, order }) => {
  const orderItems = order.orderItems || [];//danh sách sản phẩm
  
  return emailTransporter.sendMail({
    from: FROM_EMAIL,
    to: email,
    subject: `Đơn hàng #${order.orderNumber} đang được giao`,
    text: `Đơn hàng #${order.orderNumber} của bạn đã được giao cho đơn vị vận chuyển.${order.trackingCode ? ` Mã vận đơn: ${order.trackingCode}` : ''}`,
    html: getOrderEmailTemplate({
      orderNumber: order.orderNumber,//số đơn hàng
      orderDate: order.createdAt,//ngày đặt hàng
      orderItems,//danh sách sản phẩm
      subtotal: order.subtotal,//tổng tiền
      shippingFee: order.shippingFee,//phí vận chuyển
      discountAmount: order.discountAmount,//giảm giá
      totalAmount: order.totalAmount,//tổng tiền
      shippingAddress: order.shippingAddress,//địa chỉ giao hàng
      paymentMethod: order.paymentMethod,//phương thức thanh toán
      status: order.status,//trạng thái đơn hàng
      statusText: 'Đơn hàng đang được giao',
      message: `Đơn hàng của bạn đã được giao cho đơn vị vận chuyển.${order.trackingCode ? ` Bạn có thể theo dõi đơn hàng bằng mã vận đơn: <strong>${order.trackingCode}</strong>` : ' Vui lòng chờ đợi trong vài ngày tới.'}`,
      trackingCode: order.trackingCode || null,//mã vận đơn
    }),
  });
};

/**
 * Gửi email thông báo đơn hàng giao thành công
 */
export const sendOrderDeliveredEmail = async ({ email, order }) => {
  const orderItems = order.orderItems || [];
  
  return emailTransporter.sendMail({
    from: FROM_EMAIL,
    to: email,
    subject: `Đơn hàng #${order.orderNumber} đã được giao thành công`,
    text: `Đơn hàng #${order.orderNumber} của bạn đã được giao thành công. Cảm ơn bạn đã mua sắm!`,
    html: getOrderEmailTemplate({
      orderNumber: order.orderNumber,
      orderDate: order.createdAt,
      orderItems,
      subtotal: order.subtotal,
      shippingFee: order.shippingFee,
      discountAmount: order.discountAmount,
      totalAmount: order.totalAmount,
      shippingAddress: order.shippingAddress,
      paymentMethod: order.paymentMethod,
      status: order.status,
      statusText: 'Giao hàng thành công',
      message: 'Đơn hàng của bạn đã được giao thành công! Cảm ơn bạn đã tin dùng dịch vụ của chúng tôi. Nếu có bất kỳ thắc mắc nào, vui lòng liên hệ với chúng tôi.',
      trackingCode: order.trackingCode || null,
    }),
  });
};

/**
 * Gửi email thông báo đơn hàng đã bị hủy
 */
export const sendOrderCancelledEmail = async ({ email, order, reason }) => {
  const orderItems = order.orderItems || [];
  
  return emailTransporter.sendMail({
    from: FROM_EMAIL,
    to: email,
    subject: `Đơn hàng #${order.orderNumber} đã bị hủy`,
    text: `Đơn hàng #${order.orderNumber} của bạn đã bị hủy.${reason ? ` Lý do: ${reason}` : ''}`,
    html: getOrderEmailTemplate({
      orderNumber: order.orderNumber,
      orderDate: order.createdAt,
      orderItems,
      subtotal: order.subtotal,
      shippingFee: order.shippingFee,
      discountAmount: order.discountAmount,
      totalAmount: order.totalAmount,
      shippingAddress: order.shippingAddress,
      paymentMethod: order.paymentMethod,
      status: order.status,
      statusText: 'Đơn hàng đã bị hủy',
      message: `Đơn hàng của bạn đã bị hủy.${reason ? ` <br><strong>Lý do:</strong> ${reason}` : ''} Nếu bạn đã thanh toán, chúng tôi sẽ hoàn tiền trong vòng 3-5 ngày làm việc.`,
      trackingCode: null,
    }),
  });
};

