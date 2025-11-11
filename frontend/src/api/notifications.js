import axiosClient from "./axiosClient";

// Lấy danh sách thông báo
export async function getNotifications() {
  return await axiosClient.get("notifications");
}

// Đếm số lượng chưa đọc
export async function getUnreadCount() {
  return await axiosClient.get("notifications/unread-count");
}

// Đánh dấu đã đọc
export async function markAsRead(id) {
  return await axiosClient.put(`notifications/${id}/read`);
}

// Đánh dấu tất cả đã đọc
export async function markAllAsRead() {
  return await axiosClient.put("notifications/read-all");
}

// Xóa thông báo
export async function deleteNotification(id) {
  return await axiosClient.delete(`notifications/${id}`);
}

