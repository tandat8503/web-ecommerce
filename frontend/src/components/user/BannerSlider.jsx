// ⚡ Import bắt buộc trên cùng
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";

import { useEffect, useState } from "react";
import Slider from "react-slick";
import { Spin } from "antd";
import { getActiveBanners } from "@/api/banner";
import { onBannerCreated, onBannerUpdated, onBannerDeleted } from "@/utils/socket";

// 👉 Nút điều hướng trái
function PrevArrow({ onClick }) {
  return (
    <button
      onClick={onClick}
      className="absolute left-6 top-1/2 -translate-y-1/2 z-20 bg-white/90 text-gray-800 rounded-full shadow-lg w-11 h-11 flex items-center justify-center text-2xl font-bold
                 hover:bg-blue-500 hover:text-white active:bg-blue-600 active:scale-95 transition-all duration-200"
      style={{ border: "none", cursor: "pointer" }}
    >
      ‹
    </button>
  );
}

// 👉 Nút điều hướng phải
function NextArrow({ onClick }) {
  return (
    <button
      onClick={onClick}
      className="absolute right-6 top-1/2 -translate-y-1/2 z-20 bg-white/90 text-gray-800 rounded-full shadow-lg w-11 h-11 flex items-center justify-center text-2xl font-bold
                 hover:bg-blue-500 hover:text-white active:bg-blue-600 active:scale-95 transition-all duration-200"
      style={{ border: "none", cursor: "pointer" }}
    >
      ›
    </button>
  );
}

export default function BannerActive() {
  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(false);

  // Fetch banners lần đầu
  useEffect(() => {
    const fetchBanners = async () => {
      try {
        setLoading(true);
        const res = await getActiveBanners();
        setBanners(res.data?.data || []);
      } catch (err) {
        console.error("Lỗi tải banner:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchBanners();
  }, []);

  /**
   * ✅ SOCKET: Cập nhật slider real-time khi admin CRUD banner
   * 
   
   */
  useEffect(() => {
    // ===== BANNER MỚI =====
    // Backend emit 'banner:created' → Callback này được gọi với newBanner
    const unsubscribeCreated = onBannerCreated((newBanner) => {
      // newBanner = { id, title, imageUrl, isActive, ... } từ backend
      if (newBanner.isActive) {
        setBanners(prev => {//prev là danh sách banners hiện tại
    //tìm xem banner đã tồn tại chưa bằng cách tìm id của banner trong danh sách prev
          const exists = prev.find(b => b.id === newBanner.id); 
          if (exists) {
//nếu id của banner trùng với id của banner mới thì trả về banner mới,nếu không thì trả về banner cũ
            return prev.map(b => b.id === newBanner.id ? newBanner : b);
          } else {
//ngược lại thì thêm banner mới vào danh sách prev và sắp xếp theo thời gian tạo,sắp xếp theo thời gian tạo từ mới nhất đến cũ nhất
            return [...prev, newBanner].sort((a, b) => 
              new Date(b.createdAt) - new Date(a.createdAt)
            );
          }
        });
      }
    });

    // ===== BANNER CẬP NHẬT =====
    // Backend emit 'banner:updated' → Callback này được gọi với updatedBanner
    const unsubscribeUpdated = onBannerUpdated((updatedBanner) => {
      setBanners(prev => {
        const exists = prev.find(b => b.id === updatedBanner.id);
        
        if (updatedBanner.isActive) {
          // Banner active → Cập nhật hoặc thêm vào danh sách
          if (exists) {
            return prev.map(b => b.id === updatedBanner.id ? updatedBanner : b);
          } else {
            // Banner được bật lại → Thêm vào danh sách
            return [...prev, updatedBanner].sort((a, b) => 
              new Date(b.createdAt) - new Date(a.createdAt)
            );
          }
        } else {
          // Banner bị tắt → Xóa khỏi danh sách
          return prev.filter(b => b.id !== updatedBanner.id);
        }
      });
    });

    // ===== BANNER XÓA =====
    // Backend emit 'banner:deleted' → Callback này được gọi với { id }
    const unsubscribeDeleted = onBannerDeleted((data) => {
      // data = { id, deletedAt } từ backend
      setBanners(prev => prev.filter(b => b.id !== data.id));
    });

    // ===== CLEANUP =====
    // Khi component unmount → Ngừng lắng nghe để tránh memory leak
    return () => {
      unsubscribeCreated(); // socket.off('banner:created', callback)
      unsubscribeUpdated();  // socket.off('banner:updated', callback)
      unsubscribeDeleted();  // socket.off('banner:deleted', callback)
    };
  }, []); // Chỉ chạy 1 lần khi component mount

  const settings = {
    dots: true,
    infinite: true,
    speed: 1000, // Tăng tốc độ chuyển slide để mượt mà hơn
    slidesToShow: 1,
    slidesToScroll: 1,
    autoplay: true,
    autoplaySpeed: 6000, // Tăng thời gian hiển thị mỗi slide
    arrows: true,
    pauseOnHover: true,
    fade: false,
    cssEase: "cubic-bezier(0.25, 0.46, 0.45, 0.94)", // Hiệu ứng mượt mà hơn, bỏ bounce
    nextArrow: <NextArrow />,
    prevArrow: <PrevArrow />,
  };

  if (loading)
    return (
      <div className="flex justify-center items-center h-[400px] bg-gray-50">
        <Spin />
      </div>
    );

  if (!banners.length)
    return (
      <div className="flex justify-center items-center h-[400px] bg-gray-100 text-gray-500">
        Không có banner nào đang hoạt động
      </div>
    );

  return (
    <div className="relative w-full overflow-hidden top-5">
      <Slider {...settings}>
        {banners.map((banner, index) => (
          <div key={banner.id} className="relative">
            {/* Container với hiệu ứng sóng */}
            <div className="relative overflow-hidden rounded-2xl mx-2 my-4 shadow-lg">
              {/* Ảnh với hiệu ứng sóng nhẹ nhàng */}
              <img
                src={banner.imageUrl}
                alt={banner.title || "Banner"}
                className="w-full h-[85vh] object-cover transition-all duration-500 ease-out hover:scale-105 wave-image"
                style={{
                  objectPosition: 'center center'
                }}
              />
              
              {/* Overlay gradient đơn giản cho text */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent"></div>
              
              {/* Hiệu ứng sóng overlay */}
              <div className="wave-overlay"></div>
              <div className="wave-overlay-2"></div>
            </div>
            
            {/* Overlay nội dung đơn giản */}
            <div className="absolute inset-0 flex flex-col justify-end text-white text-center px-6 z-10 pb-16">
              <div className="animate-fadeInUp">
                {/* Title đơn giản */}
                <h2 className="text-3xl md:text-5xl font-bold mb-4 drop-shadow-lg max-w-[800px] leading-tight mx-auto">
                  {banner.title}
                </h2>
                
                {/* Description đơn giản */}
                {banner.description && (
                  <p className="text-lg md:text-xl opacity-90 max-w-[600px] leading-relaxed mx-auto">
                    {banner.description}
                  </p>
                )}
              </div>
            </div>
          </div>
        ))}
      </Slider>

      {/* ⚙️ CSS với hiệu ứng sóng nhẹ nhàng */}
      <style jsx global>{`
        /* ===== NAVIGATION BUTTONS ===== */
        .slick-prev,
        .slick-next {
          z-index: 20 !important;
        }
        .slick-prev:before,
        .slick-next:before {
          display: none !important;
        }

        /* ===== DOTS NAVIGATION ĐƠN GIẢN ===== */
        .slick-dots {
          bottom: 25px !important;
        }
        .slick-dots li button:before {
          font-size: 12px !important;
          color: #ccc !important;
          opacity: 1 !important;
        }
        .slick-dots li.slick-active button:before {
          color: #3b82f6 !important;
          opacity: 1 !important;
        }

        /* ===== HIỆU ỨNG SÓNG CHO ẢNH ===== */
        .wave-image {
          animation: waveMotion 8s ease-in-out infinite;
        }

        @keyframes waveMotion {
          0%, 100% {
            transform: scale(1) translateX(0px) translateY(0px);
            filter: brightness(1) contrast(1);
          }
          25% {
            transform: scale(1.02) translateX(2px) translateY(-1px);
            filter: brightness(1.05) contrast(1.02);
          }
          50% {
            transform: scale(1.01) translateX(-1px) translateY(1px);
            filter: brightness(1.02) contrast(1.05);
          }
          75% {
            transform: scale(1.03) translateX(-2px) translateY(-1px);
            filter: brightness(1.03) contrast(1.03);
          }
        }

        /* ===== HIỆU ỨNG SÓNG OVERLAY ===== */
        .wave-overlay {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: linear-gradient(45deg, transparent 30%, rgba(59, 130, 246, 0.05) 50%, transparent 70%);
          animation: waveFlow 12s ease-in-out infinite;
          pointer-events: none;
        }

        .wave-overlay-2 {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: linear-gradient(135deg, transparent 0%, rgba(147, 197, 253, 0.03) 25%, transparent 50%, rgba(59, 130, 246, 0.04) 75%, transparent 100%);
          animation: waveFlow2 15s ease-in-out infinite reverse;
          pointer-events: none;
        }

        @keyframes waveFlow {
          0%, 100% {
            transform: translateX(-100%) translateY(0) rotate(0deg);
            opacity: 0.2;
          }
          50% {
            transform: translateX(100%) translateY(-8px) rotate(90deg);
            opacity: 0.4;
          }
        }

        @keyframes waveFlow2 {
          0%, 100% {
            transform: translateX(100%) translateY(0) rotate(0deg);
            opacity: 0.1;
          }
          50% {
            transform: translateX(-100%) translateY(12px) rotate(-90deg);
            opacity: 0.3;
          }
        }

        /* ===== HIỆU ỨNG FADE IN UP CHO TEXT ===== */
        @keyframes fadeInUp {
          0% {
            opacity: 0;
            transform: translateY(20px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-fadeInUp {
          animation: fadeInUp 0.6s ease-out;
        }

        /* ===== HIỆU ỨNG CHUYỂN ĐỔI SLIDE MƯỢT MÀ ===== */
        .slick-slide {
          transition: all 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94) !important;
        }

        .slick-slide.slick-active {
          transform: scale(1.01);
        }

        /* ===== HIỆU ỨNG HOVER CHO SÓNG ===== */
        .wave-image:hover {
          animation-duration: 4s; /* Nhanh hơn khi hover */
        }

        .wave-image:hover + .wave-overlay {
          animation-duration: 6s;
        }

        .wave-image:hover + .wave-overlay + .wave-overlay-2 {
          animation-duration: 8s;
        }
      `}</style>
    </div>
  );
}

