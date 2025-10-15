import { useEffect, useState } from "react";
import { getPublicCategories } from "@/api/adminCategories";
import { Spin } from "antd";


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

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[400px] bg-gray-50">
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-slate-100 via-blue-100 to-indigo-200 py-8">
      <div className="max-w-7xl mx-auto px-4">
        {/* Tiêu đề */}
        <h2 className="text-2xl font-bold text-gray-800 mb-6">DANH MỤC</h2>
        
        {/* Container responsive với grid */}
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-4">
          {categories.map((category) => (
            <CategoryCard key={category.id} category={category} />
          ))}
        </div>
      </div>

      {/* CSS cho responsive và hiệu ứng */}
      <style jsx global>{`
        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        
        /* Responsive breakpoints */
        @media (max-width: 640px) {
          .grid {
            grid-template-columns: repeat(3, 1fr);
            gap: 0.75rem;
          }
        }
        
        @media (min-width: 640px) and (max-width: 768px) {
          .grid {
            grid-template-columns: repeat(4, 1fr);
            gap: 1rem;
          }
        }
        
        @media (min-width: 768px) and (max-width: 1024px) {
          .grid {
            grid-template-columns: repeat(6, 1fr);
            gap: 1rem;
          }
        }
        
        @media (min-width: 1024px) and (max-width: 1280px) {
          .grid {
            grid-template-columns: repeat(8, 1fr);
            gap: 1rem;
          }
        }
        
        @media (min-width: 1280px) {
          .grid {
            grid-template-columns: repeat(10, 1fr);
            gap: 1rem;
          }
        }
      `}</style>
    </div>
  );
}

// 👉 Component card danh mục responsive với kích thước lớn hơn
function CategoryCard({ category }) {
  return (
    <div className="bg-white rounded-lg p-4 shadow-sm hover:shadow-lg transition-all duration-300 cursor-pointer group aspect-square flex flex-col items-center justify-center">
      {/* Icon/Ảnh danh mục */}
      <div className="flex justify-center mb-3">
        {category.imageUrl ? (
          <img
            src={category.imageUrl}
            alt={category.name}
            className="w-16 h-16 object-contain group-hover:scale-110 transition-transform duration-300"
          />
        ) : (
          <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-blue-200 rounded-lg flex items-center justify-center group-hover:from-blue-200 group-hover:to-blue-300 transition-all duration-300">
            <span className="text-blue-600 text-2xl">📦</span>
          </div>
        )}
      </div>
      
      {/* Tên danh mục */}
      <div className="text-center flex-1 flex items-center justify-center">
        <p className="text-sm text-gray-700 font-medium leading-tight group-hover:text-blue-600 transition-colors duration-300 line-clamp-2">
          {category.name}
        </p>
      </div>
    </div>
  );
}
