import { Row, Col, Card, Typography } from "antd";
import BannerSlider from "../../components/user/BannerSlider";
import Navbar from "../../components/user/Navbar";
import Categories from "../../components/user/Categories";
import About from "../../components/user/About";
import Collection from "../../components/user/Collection";
import CategoryProducts from "../../components/user/CategoryProducts";
import FeaturedProductsSection from "../../components/user/FeaturedProductsSection";
const { Title, Paragraph } = Typography;

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4">
        {/* Banner */}
        <div className="mb-8">
          <BannerSlider />
        </div>

       
        {/* Trang giới thiệu */}
        <div className="mb-8">
          <About />
        </div>

          {/* Sản phẩm nổi bật */}
          <div className="my-16">
          <FeaturedProductsSection />
        </div>

        {/* Danh mục sản phẩm */}
        <div className="mt-5">
          <Categories />
        </div>

      

        {/* Sản phẩm theo danh mục */}
        <div className="my-16">
          <CategoryProducts />
        </div>
      
        {/* Bộ sưu tập */}
        <div className="my-16">
          <Collection />
        </div>

        
       
      </div>
    </div>
  );
}
