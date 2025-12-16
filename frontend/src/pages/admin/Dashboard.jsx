import { Card, CardContent } from "@/components/ui/card"
import { Row, Col, Statistic, Select } from "antd"
import { useState, useEffect } from "react"
import { Rose, Column } from "@ant-design/charts"
import { getCategories } from "@/api/adminCategories"
import { getBrands } from "@/api/adminBrands"
import { getProducts } from "@/api/adminProducts"
import { getOrderStats, getRevenueByCategory, getTopProducts } from "@/api/adminOrders"

export default function Dashboard() {
  const [stats, setStats] = useState({
    categories: 0,
    brands: 0,
    products: 0,
    orders: 0,
  })
  const [categoryData, setCategoryData] = useState([]) // dữ liệu doanh thu theo danh mục (cho Rose Chart)
  const [categoryPeriod, setCategoryPeriod] = useState("30d") // period cho biểu đồ doanh thu theo danh mục
  const [topProductsData, setTopProductsData] = useState([]) // dữ liệu sản phẩm bán chạy nhất
  const [productsPeriod, setProductsPeriod] = useState("30d") // period cho biểu đồ sản phẩm bán chạy
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchStats()
  }, [])

  // Fetch lại doanh thu theo danh mục khi period thay đổi
  useEffect(() => {
    fetchCategoryRevenue()
  }, [categoryPeriod])

  // Fetch lại top products khi period thay đổi
  useEffect(() => {
    fetchTopProducts()
  }, [productsPeriod])

  const fetchCategoryRevenue = async () => {
    try {
      const categoryRevenueRes = await getRevenueByCategory({ period: categoryPeriod })
      setCategoryData(categoryRevenueRes.data.data || [])
    } catch (error) {
      console.error("Error fetching category revenue:", error)
    }
  }

  const fetchTopProducts = async () => {
    try {
      const topProductsRes = await getTopProducts({ period: productsPeriod, limit: 5 })
      setTopProductsData(topProductsRes.data.data || [])
    } catch (error) {
      console.error("Error fetching top products:", error)
    }
  }

  const fetchStats = async () => {
    try {
      const [categoriesRes, brandsRes, productsRes, ordersStatsRes, categoryRevenueRes, topProductsRes] = await Promise.all([
        getCategories({ limit: 1 }),
        getBrands({ limit: 1 }),
        getProducts({ limit: 1 }),
        // Lấy thống kê đơn hàng + doanh thu theo ngày trong 30 ngày gần nhất
        getOrderStats({ period: "30d", groupBy: "day" }),
        // Lấy doanh thu theo danh mục trong 30 ngày gần nhất (cho Rose Chart)
        getRevenueByCategory({ period: "30d" }),
        // Lấy top 5 sản phẩm bán chạy nhất trong 30 ngày gần nhất
        getTopProducts({ period: "30d", limit: 5 }),
      ])

      setStats({
        categories: categoriesRes.data.total || 0,
        brands: brandsRes.data.total || 0,
        products: productsRes.data.total || 0,
        orders: ordersStatsRes.data.totalOrders || 0,
      })

      setCategoryData(categoryRevenueRes.data.data || []) // API trả về { data: [{ category, revenue }, ...] }
      setTopProductsData(topProductsRes.data.data || []) // API trả về { data: [{ productName, totalQuantity }, ...] }
    } catch (error) {
      console.error("Error fetching stats:", error)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (value) => {
    // Chuyển về số và định dạng VNĐ
    const numValue = Number(value);
    if (isNaN(numValue) || numValue === null || numValue === undefined) {
      return "0 ₫";
    }
    return numValue.toLocaleString("vi-VN", { style: "currency", currency: "VND" });
  };

  // Format label cho period
  const getPeriodLabel = (period) => {
    const periodMap = {
      "7d": "7 ngày gần nhất",
      "30d": "30 ngày gần nhất",
      "90d": "90 ngày gần nhất",
      "1y": "1 năm gần nhất",
      "all": "Toàn bộ",
    };
    return periodMap[period] || "30 ngày gần nhất";
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold mb-4">Dashboard - Thống kê</h1>

      {/* Thẻ thống kê */}
      <Row gutter={16}>
        <Col span={6}>
          <Card>
            <CardContent className="p-4">
              <Statistic
                title="Tổng số danh mục"
                value={stats.categories}
                valueStyle={{ color: "#3f8600" }}
                loading={loading}
              />
            </CardContent>
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <CardContent className="p-4">
              <Statistic
                title="Tổng số thương hiệu"
                value={stats.brands}
                valueStyle={{ color: "#cf1322" }}
                loading={loading}
              />
            </CardContent>
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <CardContent className="p-4">
              <Statistic
                title="Tổng số sản phẩm"
                value={stats.products}
                valueStyle={{ color: "#1890ff" }}
                loading={loading}
              />
            </CardContent>
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <CardContent className="p-4">
              <Statistic
                title="Tổng số đơn hàng"
                value={stats.orders}
                valueStyle={{ color: "#722ed1" }}
                loading={loading}
              />
            </CardContent>
          </Card>
        </Col>
      </Row>

      {/* Biểu đồ doanh thu theo danh mục */}
      <Row gutter={16}>
        <Col span={24}>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">Doanh thu theo danh mục ({getPeriodLabel(categoryPeriod)})</h2>
                <Select
                  value={categoryPeriod}
                  onChange={setCategoryPeriod}
                  style={{ width: 150 }}
                  options={[
                    { label: "7 ngày", value: "7d" },
                    { label: "30 ngày", value: "30d" },
                    { label: "90 ngày", value: "90d" },
                    { label: "1 năm", value: "1y" },
                    { label: "Toàn bộ", value: "all" },
                  ]}
                />
              </div>
              {categoryData.length > 0 ? (
                <Rose
                  data={categoryData.map(item => ({ 
                    name: item.category, 
                    value: item.revenue 
                  }))}
                  xField="name" //trục x là tên danh mục
                  yField="value" //trục y là doanh thu
                  colorField="name" //màu sắc theo danh mục
                  innerRadius={0.2} //khoảng cách giữa vòng tròn và vòng tròn nội tiếp
                  axis={false} //không hiển thị trục x và y
                  legend={false} //không hiển thị legend
                  height={400} //chiều cao của biểu đồ
                  label={{
                    text: (item) => `${item.name}\n${formatCurrency(item.value)}`,
                    position: 'outside',
                  }} 
                />
              ) : (
                <div style={{ textAlign: 'center', color: '#999', padding: '20px' }}>
                  <p>Chưa có dữ liệu doanh thu theo danh mục</p>
                </div>
              )}
            </CardContent>
          </Card>
        </Col>
      </Row>

      {/* Biểu đồ sản phẩm bán chạy nhất */}
      <Row gutter={16}>
        <Col span={24}>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">Top 5 sản phẩm bán chạy nhất ({getPeriodLabel(productsPeriod)})</h2>
                <Select
                  value={productsPeriod}
                  onChange={setProductsPeriod}
                  style={{ width: 150 }}
                  options={[
                    { label: "7 ngày", value: "7d" },
                    { label: "30 ngày", value: "30d" },
                    { label: "90 ngày", value: "90d" },
                    { label: "1 năm", value: "1y" },
                    { label: "Toàn bộ", value: "all" },
                  ]}
                />
              </div>
              {topProductsData.length > 0 ? (
                <Column
                  data={topProductsData.map(item => ({
                    type: item.productName,
                    sales: item.totalQuantity,
                  }))}
                  xField="type"
                  yField="sales"
                  colorField="type"
                  scale={{
                    color: {
                      range: ['#f4664a', '#faad14', '#a0d911', '#52c41a', '#13c2c2', '#1890ff', '#2f54eb', '#722ed1'],
                    },
                  }}
                />
              ) : (
                <div style={{ textAlign: 'center', color: '#999', padding: '40px' }}>
                  <p>Chưa có dữ liệu sản phẩm bán chạy</p>
                </div>
              )}
            </CardContent>
          </Card>
        </Col>
      </Row>

    </div>
  )
}
