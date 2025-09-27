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
 * Lấy thông tin profile
 */
export async function getProfile() {
  return await axiosClient.get("auth/profile");
}

/**
 * Đăng xuất
 */
export async function logout() {
  return await axiosClient.post("auth/logout");
}
