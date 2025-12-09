import { useEffect, useState } from "react";
import { getPublicCategories } from "@/api/adminCategories";
import { Spin } from "antd";
import { Link } from "react-router-dom";
import { 
  onCategoryCreated, 
  onCategoryUpdated, 
  onCategoryDeleted 
} from "@/utils/socket";

export default function Categories() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setLoading(true);
        const res = await getPublicCategories();
        setCategories(res.data?.items || []);
      } catch (err) {
        console.error("Lỗi tải danh mục:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchCategories();
  }, []);

  // ===== SOCKET REAL-TIME: Tự động cập nhật khi admin thay đổi danh mục =====
  useEffect(() => {
    // Lắng nghe khi có danh mục mới được tạo
    const unsubscribeCreated = onCategoryCreated((newCategory) => {
      // Chỉ thêm danh mục mới nếu isActive = true (danh mục công khai)
      // VÀ chưa tồn tại trong danh sách (kiểm tra theo id để tránh duplicate)
      if (newCategory.isActive) {
        setCategories((prev) => {
          // Kiểm tra xem danh mục đã tồn tại chưa (dựa trên id)
          const exists = prev.some((cat) => cat.id === newCategory.id);
          if (exists) {
            // Nếu đã tồn tại → Cập nhật thay vì thêm mới
            return prev.map((cat) =>
              cat.id === newCategory.id ? { ...cat, ...newCategory } : cat
            );
          }
          // Nếu chưa tồn tại → Thêm mới vào đầu danh sách
          return [newCategory, ...prev];
        });
      }
    });

    // Lắng nghe khi có danh mục được cập nhật
    const unsubscribeUpdated = onCategoryUpdated((updatedCategory) => {
      setCategories((prev) => {
        // Kiểm tra xem category có trong state không
        const exists = prev.some((cat) => cat.id === updatedCategory.id);
        
        if (exists) {
          // Nếu có → Cập nhật và filter
          return prev
            .map((cat) => (cat.id === updatedCategory.id ? { ...cat, ...updatedCategory } : cat))
            .filter((cat) => cat.isActive); // Loại bỏ nếu isActive = false
        } else {
          // Nếu không có trong state (đã bị filter trước đó)
          // VÀ isActive = true → Thêm lại vào
          if (updatedCategory.isActive) {
            return [updatedCategory, ...prev];
          }
          return prev; // Nếu isActive = false → Không thêm
        }
      });
    });

    // Lắng nghe khi có danh mục bị xóa
    const unsubscribeDeleted = onCategoryDeleted((data) => {
      setCategories((prev) => prev.filter((cat) => cat.id !== data.id));
    });

    // Cleanup: Ngừng lắng nghe khi component unmount
    return () => {
      unsubscribeCreated();
      unsubscribeUpdated();
      unsubscribeDeleted();
    };
  }, []); // Chỉ chạy 1 lần khi mount

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[400px] bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div className="py-16 bg-gradient-to-br from-pink-50 via-purple-50 to-indigo-50">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header Section */}
        <div className="mb-12">
          <h2 className="text-5xl font-bold bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent mb-4 tracking-wide">
            DANH MỤC 
          </h2>
          <div className="w-24 h-1 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"></div>
        </div>

        {/* Grid Categories */}
        <div 
          className="grid gap-4" 
          style={{ 
            gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))'
          }}
        >
          {categories.map((cat, idx) => (
            <Link 
              key={cat.id}
              to={`/danh-muc/${cat.slug}`}
              className="block"
              style={{ animation: `fadeIn 0.5s ease-out ${idx * 0.05}s both` }}
            >
              <div className="group rounded-xl overflow-hidden bg-white shadow-md hover:shadow-lg transition-all duration-300">
                {/* Image container */}
                <div className="aspect-[4/3] overflow-hidden bg-gray-100">
                  {cat.imageUrl ? (
                    <img 
                      src={cat.imageUrl} 
                      alt={cat.name} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-100 to-purple-100">
                      <span className="text-3xl">📦</span>
                    </div>
                  )}
                </div>
                
                {/* Text container */}
                <div className="p-3 bg-white">
                  <p className="text-xs font-semibold text-gray-800 text-center line-clamp-2">
                    {cat.name}
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
