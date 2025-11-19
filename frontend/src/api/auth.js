import axiosClient from "./axiosClient";

/**
 * Đăng nhập
 */
export async function login(data) {
  return await axiosClient.post("auth/login", data);
}

/**
 * Đăng ký
 */
export async function register(data) {
  return await axiosClient.post("auth/register", data);
}



/**
 * Đăng xuất
 * Lưu ý: Nếu token đã hết hạn, API có thể trả về 401 nhưng logout vẫn thành công ở frontend
 */
export async function logout() {
  try {
    return await axiosClient.post("auth/logout");
  } catch (error) {
    // Nếu token đã hết hạn (401), vẫn coi như logout thành công
    // Frontend sẽ tự clear localStorage và state
    if (error.response?.status === 401) {
      console.log("Token đã hết hạn, logout ở frontend vẫn thành công");
      return { success: true, message: "Logged out (token expired)" };
    }
    throw error;
  }
}

// Google OAuth Login
export async function googleLogin(token) {
  return await axiosClient.post("auth/google", { token });
}

//yêu cầu quên mật khẩu
export async function requestPasswordReset(email) {
  return await axiosClient.post("auth/forgot-password", { email });
}
//xác thực OTP
export async function verifyPasswordOTP(payload) {
  return await axiosClient.post("auth/verify-otp", payload);
}
//đặt lại mật khẩu
export async function resetPassword(payload) {
  return await axiosClient.post("auth/reset-password", payload);
}