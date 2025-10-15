import { Typography } from "antd";

const { Title } = Typography;

const Collection = () => {
  const officeCollections = [
    {
      id: 1,
      title: "Bàn làm việc hiện đại",
      category: "Bàn",
      image: "https://images.unsplash.com/photo-1497366216548-37526070297c?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80",
      size: "w-[32%] h-[40%]"
    },
    {
      id: 2,
      title: "Ghế văn phòng cao cấp",
      category: "Ghế",
      image: "https://images.unsplash.com/photo-1506439773649-6e0eb8cfb237?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80",
      size: "w-[32%] h-[30%]"
    },
    {
      id: 3,
      title: "Ghế sofa",
      category: "Ghế",
      image: "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80",
      size: "w-[32%] grow"
    },
    {
      id: 4,
      title: "Kệ sách văn phòng",
      category: "Kệ",
      image: "https://godecorvn.com/wp-content/uploads/2021/08/Huong-dan-chon-gia-sach-treo-tuong-bang-go-1.jpg",
      size: "w-[32%] h-1/4"
    },
    {
      id: 5,
      title: "Sofa văn phòng",
      category: "Sofa",
      image: "https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80",
      size: "w-[32%] h-[40%]"
    },
    {
      id: 6,
      title: "Bàn họp chuyên nghiệp",
      category: "Bàn họp",
      image: "https://smlife.vn/wp-content/uploads/2023/09/ban-hop-tron-8-nguoi-hien-dai-smlifevn.webp",
      size: "w-[32%] grow"
    }
  ];

  return (
    <div className="py-16 bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="max-w-7xl mx-auto px-4">
        {/* Tiêu đề chính */}
        <div className="text-center mb-12">
          <Title level={1} className="text-4xl font-bold text-gray-800 mb-4">
            BỘ SƯU TẬP 
          </Title>
          <div className="w-24 h-1 bg-gradient-to-r from-blue-500 to-purple-500 mx-auto rounded-full"></div>
          <p className="text-gray-600 text-lg mt-4 max-w-2xl mx-auto">
            Khám phá bộ sưu tập nội thất văn phòng cao cấp, hiện đại và chuyên nghiệp
          </p>
        </div>

        {/* Flex layout theo cấu trúc 6 khối */}
        <div className="flex flex-col gap-[2%] flex-wrap h-[600px]">
          {officeCollections.map((item) => (
            <div
              key={item.id}
              className={`${item.size} group cursor-pointer`}
            >
              <div className="relative h-full w-full rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-500 transform hover:scale-105">
                <img
                  src={item.image}
                  alt={item.title}
                  className="w-full h-full object-cover object-center transition-transform duration-700 group-hover:scale-110"
                  style={{ minHeight: '100%', minWidth: '100%' }}
                />
                
                {/* Overlay gradient */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                
                {/* Content overlay */}
                <div className="absolute bottom-0 left-0 right-0 p-6 transform translate-y-full group-hover:translate-y-0 transition-transform duration-500">
                  <div className="bg-white/20 backdrop-blur-sm rounded-lg p-3">
                    <span className="text-blue-200 text-xs font-semibold uppercase tracking-wide">
                      {item.category}
                    </span>
                    <Title level={3} className="text-white font-bold text-xl mb-2">
                      {item.title}
                    </Title>
                   
                  </div>
                </div>

                {/* Hover effect border */}
                <div className="absolute inset-0 border-2 border-white/30 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              </div>
            </div>
          ))}
        </div>

       
      </div>
    </div>
  );
};

export default Collection;
