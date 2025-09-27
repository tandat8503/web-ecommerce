import axiosClient from "./axiosClient";

/**
 * Lấy thông tin profile chi tiết
 */
export async function getUserProfile() {
  return await axiosClient.get("users/profile");
}

/**
 * Cập nhật thông tin profile (có thể kèm upload avatar)  
 */
export async function updateProfile(data, avatarFile = null) {
  const formData = new FormData();
  
  // Thêm thông tin profile
  if (data.firstName) formData.append('firstName', data.firstName);
  if (data.lastName) formData.append('lastName', data.lastName);
  if (data.phone) formData.append('phone', data.phone);
  if (data.removeAvatar) formData.append('removeAvatar', data.removeAvatar);
  
  // Thêm file avatar nếu có
  if (avatarFile) {
    formData.append('image', avatarFile);
  }
  
  return await axiosClient.put("users/profile", formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
}

/**
 * Đổi mật khẩu
 */
export async function changePassword(data) {
  return await axiosClient.put("users/profile/change-password", data);
}

/**
 * Lấy lịch sử đăng nhập
 */
export async function getLoginHistory() {
  return await axiosClient.get("users/login-history");
}

/**
 * Upload avatar riêng (nếu cần)
 */
export async function uploadAvatar(file) {
  const formData = new FormData();
  formData.append('image', file);
  
  return await axiosClient.put("users/profile", formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
}

/**
 * Xóa avatar
 */
export async function removeAvatar() {
  const formData = new FormData();
  formData.append('removeAvatar', 'true');
  
  return await axiosClient.put("users/profile", formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
}
