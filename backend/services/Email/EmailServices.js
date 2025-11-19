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
 * Gửi email mã giảm giá cho user (ví dụ khi sắp có chương trình mới)
 */
export const sendDiscountEmail = async ({ email, couponCode, percent, expiredAt }) => {
  return emailTransporter.sendMail({
    from: FROM_EMAIL,
    to: email,
    subject: 'Bạn có mã giảm giá mới!',
    text: `Xin chào,\n\nBạn vừa nhận được mã ${couponCode} giảm ${percent}%.\nÁp dụng trước ngày ${expiredAt}.`,
    html: `
      <div style="font-family: Arial; line-height: 1.5;">
        <h3>Xin chào,</h3>
        <p>Chúng tôi tặng bạn mã giảm giá đặc biệt:</p>
        <div style="padding: 12px; border: 2px dashed #ff6b35; display: inline-block; font-size: 24px; font-weight: bold; letter-spacing: 4px;">
          ${couponCode}
        </div>
        <p>Giảm <b>${percent}%</b> cho đơn hàng tiếp theo. Mã có hiệu lực tới: <b>${expiredAt}</b>.</p>
        <p>Mua sắm vui vẻ nhé!</p>
      </div>
    `,
  });
};