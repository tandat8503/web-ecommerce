import { Card, CardContent } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from "recharts"
import { Row, Col, Statistic } from "antd"
import { useState, useEffect } from "react"
import adminCategoriesAPI from "@/api/adminCategories"
import adminBrandsAPI from "@/api/adminBrands"
import adminProductsAPI from "@/api/adminProducts"

const chartData = [
  { name: "Hà Nội", value: 120 },
  { name: "Hồ Chí Minh", value: 200 },
  { name: "Đà Nẵng", value: 80 },
  { name: "Hải Phòng", value: 60 },
]

export default function Dashboard() {
  const [stats, setStats] = useState({
    categories: 0,
    brands: 0,
    products: 0,
    orders: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const [categoriesRes, brandsRes, productsRes] = await Promise.all([
        adminCategoriesAPI.getCategories({ limit: 1 }),
        adminBrandsAPI.getBrands({ limit: 1 }),
        adminProductsAPI.getProducts({ limit: 1 })
      ]);

      setStats({
        categories: categoriesRes.data.total || 0,
        brands: brandsRes.data.total || 0,
        products: productsRes.data.total || 0,
        orders: 0 // Chưa có API orders
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
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
                valueStyle={{ color: '#3f8600' }}
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
                valueStyle={{ color: '#cf1322' }}
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
                valueStyle={{ color: '#1890ff' }}
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
                valueStyle={{ color: '#722ed1' }}
                loading={loading}
              />
            </CardContent>
          </Card>
        </Col>
      </Row>

      {/* Biểu đồ */}
      <Card>
        <CardContent className="p-6">
          <h2 className="text-lg font-semibold mb-4">Biểu đồ dân số (demo)</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="value" fill="#4f46e5" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Bảng dữ liệu */}
      <Card>
        <CardContent className="p-6">
          <h2 className="text-lg font-semibold mb-4">Danh sách tỉnh</h2>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tỉnh</TableHead>
                <TableHead>Dân số</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {chartData.map((item, i) => (
                <TableRow key={i}>
                  <TableCell>{item.name}</TableCell>
                  <TableCell>{item.value.toLocaleString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
