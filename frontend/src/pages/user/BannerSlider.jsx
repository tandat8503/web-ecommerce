// ⚡ Phải import 2 file CSS này trên cùng
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";

import { useEffect, useState } from "react";
import Slider from "react-slick";
import { Spin } from "antd";
import { getActiveBanners } from "@/api/banner";

// 👉 Nút điều hướng trái
function PrevArrow({ onClick }) {
  return (
    <button
      onClick={onClick}
      className="absolute left-3 top-1/2 -translate-y-1/2 z-20 bg-white/90 text-gray-800 rounded-full shadow-lg w-10 h-10 flex items-center justify-center text-2xl font-bold
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
      className="absolute right-3 top-1/2 -translate-y-1/2 z-20 bg-white/90 text-gray-800 rounded-full shadow-lg w-10 h-10 flex items-center justify-center text-2xl font-bold
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

  const settings = {
    dots: true,
    infinite: true,
    speed: 700,
    slidesToShow: 1,
    slidesToScroll: 1,
    autoplay: true,
    autoplaySpeed: 3500,
    arrows: true,
    pauseOnHover: true,
    nextArrow: <NextArrow />,
    prevArrow: <PrevArrow />,
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64 bg-white rounded-lg shadow-lg">
        <Spin />
      </div>
    );
  }

  if (!banners.length) {
    return (
      <div className="flex justify-center items-center h-64 bg-gray-100 rounded-lg text-gray-500">
        Không có banner nào đang hoạt động
      </div>
    );
  }

  return (
    <div className="relative w-full max-w-[1200px] mx-auto rounded-2xl overflow-hidden shadow-xl bg-white">
      <Slider {...settings}>
        {banners.map((banner) => (
          <div key={banner.id} className="relative">
            <img
              src={banner.imageUrl}
              alt={banner.title || "Banner"}
              className="w-full h-[380px] object-contain bg-white mx-auto"
            />
            {banner.title && (
              <div className="absolute inset-0 bg-black/30 flex flex-col items-center justify-center text-white text-center px-6">
                <h2 className="text-2xl md:text-4xl font-bold mb-2 drop-shadow-lg">
                  {banner.title}
                </h2>
                {banner.description && (
                  <p className="text-sm md:text-lg">{banner.description}</p>
                )}
              </div>
            )}
          </div>
        ))}
      </Slider>

      {/* ⚙️ CSS cho dots & override slick arrows */}
      <style jsx global>{`
        .slick-prev,
        .slick-next {
          z-index: 20 !important;
        }
        .slick-prev:before,
        .slick-next:before {
          display: none !important;
        }
        .slick-dots {
          bottom: 15px !important;
        }
        .slick-dots li button:before {
          font-size: 12px !important;
          color: #bbb !important;
          opacity: 1 !important;
        }
        .slick-dots li.slick-active button:before {
          color: #1677ff !important;
          opacity: 1 !important;
        }
      `}</style>
    </div>
  );
}
