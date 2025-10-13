import axiosClient from "./axiosClient";

export async function getBanners() {
  return await axiosClient.get("admin/banners");
}

export async function getBannerById(id) {
  return await axiosClient.get(`admin/banners/${id}`);
}

export async function createBanner(data) {
  return await axiosClient.post("admin/banners", data, {
    headers: { "Content-Type": "multipart/form-data" },
  });
}

export async function updateBanner(id, data) {
  return await axiosClient.put(`admin/banners/${id}`, data, {
    headers: { "Content-Type": "multipart/form-data" },
  });
}

export async function deleteBanner(id) {
  return await axiosClient.delete(`admin/banners/${id}`);
}




// Lấy banner hiển thị public (user) trạng thái active
export async function getActiveBanners() {
  return await axiosClient.get("admin/banners/active");
}
