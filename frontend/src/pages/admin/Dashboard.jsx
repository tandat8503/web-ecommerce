import { Card, CardContent } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from "recharts"
import { Row, Col } from "antd"

const chartData = [
  { name: "Hà Nội", value: 120 },
  { name: "Hồ Chí Minh", value: 200 },
  { name: "Đà Nẵng", value: 80 },
  { name: "Hải Phòng", value: 60 },
]

export default function Dashboard() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold mb-4">Dashboard - Thống kê</h1>

      {/* Thẻ thống kê */}
      <Row gutter={16}>
        <Col span={6}>
          <Card>
            <CardContent className="p-4">
              <p className="text-gray-600">Tổng số người dùng</p>
              <p className="text-xl font-bold text-green-600">2</p>
            </CardContent>
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <CardContent className="p-4">
              <p className="text-gray-600">Đơn hàng mới</p>
              <p className="text-xl font-bold text-red-600">0</p>
            </CardContent>
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <CardContent className="p-4">
              <p className="text-gray-600">Sản phẩm bán chạy</p>
              <p className="text-xl font-bold text-blue-600">0</p>
            </CardContent>
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <CardContent className="p-4">
              <p className="text-gray-600">Doanh thu hôm nay</p>
              <p className="text-xl font-bold text-green-700">0 VNĐ</p>
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
