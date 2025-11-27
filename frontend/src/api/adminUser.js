import axiosClient from "./axiosClient";

/**
 * Lấy danh sách người dùng
 */
export async function getUsers(params) {
  return await axiosClient.get("admin/users", { params });
}

/**
 * Lấy chi tiết 1 người dùng
 */
export async function getUserById(id) {
  return await axiosClient.get(`admin/users/${id}`);
}

/**
 * Thêm mới người dùng
 */
export async function createUser(data) {
  return await axiosClient.post("admin/users", data);
}

/**
 * Cập nhật người dùng
 */
export async function updateUser(id, data) {
  return await axiosClient.put(`admin/users/${id}`, data);
}

