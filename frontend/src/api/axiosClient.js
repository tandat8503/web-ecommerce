// cấu hình axios client để sử dụng trong toàn bộ ứng dụng
import axios from "axios";

const axiosClient = axios.create({
  baseURL: "http://localhost:5000/api",
  headers: {
    "Content-Type": "application/json",
  },
});

//Thêm token tự động nếu có,là cơ chế tự động gắn token vào tất cả request gửi đến API.
//Interceptor chỉ có nhiệm vụ đọc token đã lưu khi gửi request.
//Nếu bỏ đoạn lưu token trong Login.jsx, thì interceptor sẽ không tìm thấy token để gắn vào request
//→ các API yêu cầu đăng nhập sẽ báo 401 Unauthorized.
axiosClient.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Tạo axios client riêng cho API public (không cần token)
export const publicAxiosClient = axios.create({
  baseURL: "http://localhost:5000/api",
  headers: {
    "Content-Type": "application/json",
  },
});

export default axiosClient;
