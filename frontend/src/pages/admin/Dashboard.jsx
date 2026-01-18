import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Row, Col, Statistic, Select, Skeleton, Empty, Tooltip, Tag, DatePicker, Segmented } from "antd"
import { useState, useEffect, useCallback, useMemo } from "react"
import { Rose, Column, Pie } from "@ant-design/charts"
import dayjs from "dayjs"
import {
  FaShoppingCart,
  FaMoneyBillWave,
  FaBoxOpen,
  FaTags,
  FaTrademark,
  FaChartLine,
  FaSync,
  FaCalendarAlt,
  FaArrowUp,
  FaArrowDown,
  FaFire,
  FaChartPie
} from "react-icons/fa"
import { getCategories } from "@/api/adminCategories"
import { getBrands } from "@/api/adminBrands"
import { getProducts } from "@/api/adminProducts"
import { getOrders, getOrderStats, getRevenueByCategory, getTopProducts } from "@/api/adminOrders"

const { RangePicker } = DatePicker

// Filter mode: preset hoặc custom
const FILTER_MODES = [
  { label: "📅 Nhanh", value: "preset" },
  { label: "🗓️ Tùy chỉnh", value: "custom" },
]

// Period options cho filter preset
const PERIOD_OPTIONS = [
  { label: "Hôm nay", value: "today" },
  { label: "7 ngày", value: "7d" },
  { label: "30 ngày", value: "30d" },
  { label: "90 ngày", value: "90d" },
  { label: "1 năm", value: "1y" },
  { label: "Toàn bộ", value: "all" },
]

// Helper: Format tiền VND
const formatCurrency = (value) => {
  const numValue = Number(value)
  if (isNaN(numValue) || numValue === null || numValue === undefined) {
    return "0 ₫"
  }
  return numValue.toLocaleString("vi-VN", { style: "currency", currency: "VND" })
}

// Helper: Format số lớn (1500000 -> 1.5M)
const formatNumber = (num) => {
  if (num >= 1000000000) {
    return (num / 1000000000).toFixed(1) + "B"
  }
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + "M"
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + "K"
  }
  return num.toString()
}

// Helper: Get period label
const getPeriodLabel = (period, dateRange) => {
  if (dateRange && dateRange[0] && dateRange[1]) {
    return `${dateRange[0].format("DD/MM/YYYY")} - ${dateRange[1].format("DD/MM/YYYY")}`
  }
  const periodMap = {
    "today": "Hôm nay",
    "7d": "7 ngày qua",
    "30d": "30 ngày qua",
    "90d": "90 ngày qua",
    "1y": "1 năm qua",
    "all": "Toàn bộ thời gian",
  }
  return periodMap[period] || "7 ngày qua"
}

// Component: Stats Card với icon và gradient
const StatsCard = ({ title, value, icon: Icon, color, loading, suffix, prefix, trend, trendValue }) => {
  const gradientColors = {
    blue: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    green: "linear-gradient(135deg, #11998e 0%, #38ef7d 100%)",
    orange: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
    purple: "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
    red: "linear-gradient(135deg, #ff416c 0%, #ff4b2b 100%)",
    teal: "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)",
  }

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-all duration-300 border-0">
      <div
        className="h-2"
        style={{ background: gradientColors[color] || gradientColors.blue }}
      />
      <CardContent className="p-4">
        {loading ? (
          <Skeleton active paragraph={{ rows: 1 }} />
        ) : (
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-sm text-gray-500 mb-1">{title}</p>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-gray-800">
                  {prefix}{typeof value === "number" ? value.toLocaleString() : value}{suffix}
                </span>
                {trend && (
                  <span className={`text-xs flex items-center gap-1 ${trend === 'up' ? 'text-green-500' : 'text-red-500'}`}>
                    {trend === 'up' ? <FaArrowUp /> : <FaArrowDown />}
                    {trendValue}
                  </span>
                )}
              </div>
            </div>
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center text-white text-xl"
              style={{ background: gradientColors[color] || gradientColors.blue }}
            >
              <Icon />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// Component: Section Header
const SectionHeader = ({ icon: Icon, title, extra }) => (
  <div className="flex items-center justify-between mb-4">
    <div className="flex items-center gap-2">
      <Icon className="text-blue-500 text-lg" />
      <h2 className="text-lg font-semibold text-gray-800">{title}</h2>
    </div>
    {extra}
  </div>
)

export default function Dashboard() {
  // Filter mode: preset hoặc custom
  const [filterMode, setFilterMode] = useState("preset")

  // Preset period filter (mặc định 7 ngày)
  const [globalPeriod, setGlobalPeriod] = useState("7d")

  // Custom date range
  const [dateRange, setDateRange] = useState(null)

  // Loading states
  const [loading, setLoading] = useState(true)
  const [chartsLoading, setChartsLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  // Stats data
  const [stats, setStats] = useState({
    categories: 0,
    brands: 0,
    products: 0,
    orders: 0,
    revenue: 0,
  })

  // Charts data
  const [categoryData, setCategoryData] = useState([])
  const [topProductsData, setTopProductsData] = useState([])
  const [orderStatusData, setOrderStatusData] = useState([])

  // Build query params based on filter mode
  const getQueryParams = useCallback(() => {
    if (filterMode === "custom" && dateRange && dateRange[0] && dateRange[1]) {
      return {
        startDate: dateRange[0].format("YYYY-MM-DD"),
        endDate: dateRange[1].format("YYYY-MM-DD"),
      }
    }

    // Handle "today" special case
    if (globalPeriod === "today") {
      const today = dayjs().format("YYYY-MM-DD")
      return {
        startDate: today,
        endDate: today,
      }
    }

    return { period: globalPeriod }
  }, [filterMode, dateRange, globalPeriod])

  // Fetch all data
  const fetchAllData = useCallback(async (showRefreshing = false) => {
    if (showRefreshing) setRefreshing(true)
    setChartsLoading(true)

    const queryParams = getQueryParams()

    try {
      // Fetch stats và charts song song
      const [
        categoriesRes,
        brandsRes,
        productsRes,
        ordersStatsRes,
        categoryRevenueRes,
        topProductsRes,
        ordersRes
      ] = await Promise.all([
        getCategories({ limit: 1 }),
        getBrands({ limit: 1 }),
        getProducts({ limit: 1 }),
        getOrderStats(queryParams),
        getRevenueByCategory(queryParams),
        getTopProducts({ ...queryParams, limit: 5 }),
        getOrders({ limit: 100 }), // Lấy 100 đơn gần nhất để thống kê trạng thái
      ])

      // Update stats
      setStats({
        categories: categoriesRes.data.total || 0,
        brands: brandsRes.data.total || 0,
        products: productsRes.data.total || 0,
        orders: ordersStatsRes.data.totalOrders || 0,
        revenue: ordersStatsRes.data.totalRevenue || 0,
      })

      // Update charts data
      setCategoryData(categoryRevenueRes.data.data || [])
      setTopProductsData(topProductsRes.data.data || [])

      // Tính toán order status distribution
      if (ordersRes.data.data) {
        const statusCount = {}
        ordersRes.data.data.forEach(order => {
          statusCount[order.status] = (statusCount[order.status] || 0) + 1
        })

        const statusLabels = {
          PENDING: "Chờ xác nhận",
          CONFIRMED: "Đã xác nhận",
          PROCESSING: "Đang giao",
          DELIVERED: "Đã giao",
          CANCELLED: "Đã hủy"
        }

        const statusColors = {
          PENDING: "#faad14",
          CONFIRMED: "#1890ff",
          PROCESSING: "#722ed1",
          DELIVERED: "#52c41a",
          CANCELLED: "#ff4d4f"
        }

        setOrderStatusData(
          Object.entries(statusCount).map(([status, count]) => ({
            type: statusLabels[status] || status,
            value: count,
            color: statusColors[status] || "#999"
          }))
        )
      }

    } catch (error) {
      console.error("Error fetching dashboard data:", error)
    } finally {
      setLoading(false)
      setChartsLoading(false)
      setRefreshing(false)
    }
  }, [getQueryParams])

  // Initial load và khi filter thay đổi
  useEffect(() => {
    fetchAllData()
  }, [fetchAllData])

  // Handle refresh
  const handleRefresh = () => {
    fetchAllData(true)
  }

  // Handle filter mode change
  const handleFilterModeChange = (mode) => {
    setFilterMode(mode)
    if (mode === "preset") {
      setDateRange(null)
    }
  }

  // Handle date range change
  const handleDateRangeChange = (dates) => {
    setDateRange(dates)
  }

  // Current period label
  const currentPeriodLabel = useMemo(() => {
    if (filterMode === "custom" && dateRange && dateRange[0] && dateRange[1]) {
      return `${dateRange[0].format("DD/MM/YYYY")} - ${dateRange[1].format("DD/MM/YYYY")}`
    }
    return getPeriodLabel(globalPeriod, null)
  }, [filterMode, dateRange, globalPeriod])

  // Rose Chart config
  const roseChartConfig = {
    data: categoryData.map(item => ({
      name: item.category,
      value: item.revenue
    })),
    xField: "name",
    yField: "value",
    colorField: "name",
    innerRadius: 0.2,
    axis: false,
    legend: false,
    height: 350,
    label: {
      text: (item) => `${item.name}\n${formatCurrency(item.value)}`,
      position: 'outside',
      style: {
        fontSize: 11,
        fontWeight: 500,
      }
    },
    scale: {
      color: {
        range: ['#667eea', '#764ba2', '#f093fb', '#f5576c', '#4facfe', '#00f2fe', '#11998e', '#38ef7d'],
      },
    },
  }

  // Column Chart config
  const columnChartConfig = {
    data: topProductsData.map(item => ({
      type: item.productName?.length > 20 ? item.productName.substring(0, 20) + '...' : item.productName,
      sales: item.totalQuantity,
      fullName: item.productName,
    })),
    xField: "type",
    yField: "sales",
    colorField: "type",
    height: 350,
    scale: {
      color: {
        range: ['#667eea', '#764ba2', '#f093fb', '#f5576c', '#4facfe'],
      },
    },
    label: {
      text: (d) => `${d.sales} sp`,
      position: 'inside',
      style: {
        fill: '#fff',
        fontWeight: 600,
      }
    },
    tooltip: {
      title: (d) => d.fullName,
    },
    axis: {
      x: {
        label: {
          autoRotate: true,
          autoHide: false,
          style: {
            fontSize: 11,
          }
        }
      }
    }
  }

  // Pie Chart config cho order status
  const pieChartConfig = {
    data: orderStatusData,
    angleField: 'value',
    colorField: 'type',
    radius: 0.8,
    innerRadius: 0.5,
    height: 280,
    label: {
      text: (d) => `${d.type}: ${d.value}`,
      position: 'outside',
      style: {
        fontSize: 11,
      }
    },
    legend: {
      color: {
        position: 'bottom',
        layout: {
          justifyContent: 'center',
        }
      }
    },
    scale: {
      color: {
        range: ['#faad14', '#1890ff', '#722ed1', '#52c41a', '#ff4d4f'],
      },
    },
    tooltip: {
      title: (d) => d.type,
    }
  }

  // Preset range cho RangePicker
  const rangePresets = [
    { label: 'Hôm nay', value: [dayjs().startOf('day'), dayjs().endOf('day')] },
    { label: 'Hôm qua', value: [dayjs().subtract(1, 'day').startOf('day'), dayjs().subtract(1, 'day').endOf('day')] },
    { label: 'Tuần này', value: [dayjs().startOf('week'), dayjs().endOf('week')] },
    { label: 'Tháng này', value: [dayjs().startOf('month'), dayjs().endOf('month')] },
    { label: 'Tháng trước', value: [dayjs().subtract(1, 'month').startOf('month'), dayjs().subtract(1, 'month').endOf('month')] },
    { label: 'Quý này', value: [dayjs().startOf('quarter'), dayjs().endOf('quarter')] },
  ]

  return (
    <div className="space-y-6 p-2">
      {/* Header với Global Filter */}
      <div className="flex flex-col gap-4 bg-gradient-to-r from-blue-600 to-purple-600 p-6 rounded-xl text-white">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold mb-1">📊 Dashboard - Thống kê kinh doanh</h1>
            <p className="text-blue-100 text-sm">
              Tổng quan hoạt động kinh doanh: <strong>{currentPeriodLabel}</strong>
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Tooltip title="Làm mới dữ liệu">
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className={`p-2.5 bg-white/20 backdrop-blur-sm rounded-lg hover:bg-white/30 transition-all ${refreshing ? 'animate-spin' : ''}`}
              >
                <FaSync className="text-white" />
              </button>
            </Tooltip>
          </div>
        </div>

        {/* Filter Controls */}
        <div className="flex flex-col md:flex-row items-start md:items-center gap-3 bg-white/10 backdrop-blur-sm rounded-lg p-3">
          <div className="flex items-center gap-2">
            <FaCalendarAlt className="text-white/80" />
            <span className="text-white/90 text-sm font-medium">Lọc theo:</span>
          </div>

          <Segmented
            value={filterMode}
            onChange={handleFilterModeChange}
            options={FILTER_MODES}
            className="dashboard-filter-mode"
          />

          {filterMode === "preset" ? (
            <Select
              value={globalPeriod}
              onChange={setGlobalPeriod}
              options={PERIOD_OPTIONS}
              style={{ minWidth: 140 }}
              className="dashboard-period-select"
            />
          ) : (
            <RangePicker
              value={dateRange}
              onChange={handleDateRangeChange}
              format="DD/MM/YYYY"
              placeholder={["Từ ngày", "Đến ngày"]}
              presets={rangePresets}
              allowClear
              style={{ minWidth: 280 }}
              className="dashboard-date-picker"
            />
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={8} xl={4}>
          <StatsCard
            title="Tổng doanh thu"
            value={formatNumber(stats.revenue)}
            prefix=""
            suffix=" ₫"
            icon={FaMoneyBillWave}
            color="green"
            loading={loading}
          />
        </Col>
        <Col xs={24} sm={12} lg={8} xl={4}>
          <StatsCard
            title="Đơn hàng"
            value={stats.orders}
            icon={FaShoppingCart}
            color="blue"
            loading={loading}
          />
        </Col>
        <Col xs={24} sm={12} lg={8} xl={4}>
          <StatsCard
            title="Sản phẩm"
            value={stats.products}
            icon={FaBoxOpen}
            color="purple"
            loading={loading}
          />
        </Col>
        <Col xs={24} sm={12} lg={8} xl={4}>
          <StatsCard
            title="Danh mục"
            value={stats.categories}
            icon={FaTags}
            color="orange"
            loading={loading}
          />
        </Col>
        <Col xs={24} sm={12} lg={8} xl={4}>
          <StatsCard
            title="Thương hiệu"
            value={stats.brands}
            icon={FaTrademark}
            color="teal"
            loading={loading}
          />
        </Col>
        <Col xs={24} sm={12} lg={8} xl={4}>
          <StatsCard
            title="Giá trị TB/đơn"
            value={stats.orders > 0 ? formatNumber(Math.round(stats.revenue / stats.orders)) : 0}
            suffix=" ₫"
            icon={FaChartLine}
            color="red"
            loading={loading}
          />
        </Col>
      </Row>

      {/* Charts Row 1 */}
      <Row gutter={[16, 16]}>
        {/* Doanh thu theo danh mục */}
        <Col xs={24} lg={14}>
          <Card className="h-full border-0 shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="pb-2">
              <SectionHeader
                icon={FaChartPie}
                title={`Doanh thu theo danh mục (${currentPeriodLabel})`}
              />
            </CardHeader>
            <CardContent className="pt-0">
              {chartsLoading ? (
                <div className="h-[350px] flex items-center justify-center">
                  <Skeleton.Node active style={{ width: '100%', height: 300 }}>
                    <FaChartPie style={{ fontSize: 40, color: '#bfbfbf' }} />
                  </Skeleton.Node>
                </div>
              ) : categoryData.length > 0 ? (
                <Rose {...roseChartConfig} />
              ) : (
                <Empty
                  description="Chưa có dữ liệu doanh thu theo danh mục"
                  className="py-20"
                />
              )}
            </CardContent>
          </Card>
        </Col>

        {/* Trạng thái đơn hàng */}
        <Col xs={24} lg={10}>
          <Card className="h-full border-0 shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="pb-2">
              <SectionHeader
                icon={FaShoppingCart}
                title="Phân bố trạng thái đơn hàng"
              />
            </CardHeader>
            <CardContent className="pt-0">
              {chartsLoading ? (
                <div className="h-[280px] flex items-center justify-center">
                  <Skeleton.Node active style={{ width: '100%', height: 250 }}>
                    <FaChartPie style={{ fontSize: 40, color: '#bfbfbf' }} />
                  </Skeleton.Node>
                </div>
              ) : orderStatusData.length > 0 ? (
                <Pie {...pieChartConfig} />
              ) : (
                <Empty
                  description="Chưa có dữ liệu đơn hàng"
                  className="py-16"
                />
              )}
            </CardContent>
          </Card>
        </Col>
      </Row>

      {/* Charts Row 2 */}
      <Row gutter={[16, 16]}>
        {/* Top sản phẩm bán chạy */}
        <Col span={24}>
          <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="pb-2">
              <SectionHeader
                icon={FaFire}
                title={`🔥 Top 5 sản phẩm bán chạy nhất (${currentPeriodLabel})`}
                extra={
                  <Tag color="volcano" className="text-sm">
                    Hot Products
                  </Tag>
                }
              />
            </CardHeader>
            <CardContent className="pt-0">
              {chartsLoading ? (
                <div className="h-[350px] flex items-center justify-center">
                  <Skeleton.Node active style={{ width: '100%', height: 300 }}>
                    <FaChartLine style={{ fontSize: 40, color: '#bfbfbf' }} />
                  </Skeleton.Node>
                </div>
              ) : topProductsData.length > 0 ? (
                <Column {...columnChartConfig} />
              ) : (
                <Empty
                  description="Chưa có dữ liệu sản phẩm bán chạy"
                  className="py-20"
                />
              )}
            </CardContent>
          </Card>
        </Col>
      </Row>

      {/* Custom Styles */}
      <style>{`
        .dashboard-period-select .ant-select-selector {
          background: rgba(255,255,255,0.9) !important;
          border: none !important;
          border-radius: 8px !important;
        }
        .dashboard-period-select .ant-select-selection-item {
          font-weight: 500;
        }
        .dashboard-filter-mode.ant-segmented {
          background: rgba(255,255,255,0.2) !important;
        }
        .dashboard-filter-mode .ant-segmented-item {
          color: white !important;
        }
        .dashboard-filter-mode .ant-segmented-item-selected {
          background: rgba(255,255,255,0.9) !important;
          color: #1890ff !important;
        }
        .dashboard-date-picker .ant-picker {
          background: rgba(255,255,255,0.9) !important;
          border: none !important;
          border-radius: 8px !important;
        }
        .dashboard-date-picker input {
          font-weight: 500;
        }
      `}</style>
    </div>
  )
}
