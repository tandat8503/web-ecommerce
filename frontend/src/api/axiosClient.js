// cấu hình axios client để sử dụng trong toàn bộ ứng dụng
import axios from "axios";

// Hardcode API URL - không sử dụng environment variables
// ✅ Lấy API URL từ biến môi trường Vite (hoặc fallback về localhost nếu chạy dev)
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api/";

const axiosClient = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
    withCredentials: true, // 🔹 quan trọng: cho phép gửi cookie / credential

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

// Interceptor để xử lý response lỗi
axiosClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // Chỉ log lỗi, không tự động xóa token hoặc redirect
    if (error.response?.status === 401) {
      console.error('Token expired or invalid:', error.response?.data?.message);
      // Không xóa token tự động - để component tự xử lý
      // Token có thể vẫn hợp lệ nhưng API endpoint không cho phép
    }
    return Promise.reject(error);
  }
);

// Tạo axios client riêng cho API public (không cần token)
export const publicAxiosClient = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
    withCredentials: true, // 🔹 quan trọng: cho phép gửi cookie / credential

});

export default axiosClient;