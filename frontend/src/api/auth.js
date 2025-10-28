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
 */
export async function logout() {
  return await axiosClient.post("auth/logout");
}

// Google OAuth Login
export async function googleLogin(token) {
  return await axiosClient.post("auth/google", { token });
}
