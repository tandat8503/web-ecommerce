# 👨‍💼 LUỒNG DỮ LIỆU: ADMIN QUẢN LÝ ĐƠN HÀNG

Tài liệu này giải thích chi tiết cách dữ liệu đi trong hệ thống khi admin quản lý đơn hàng, bao gồm: xem danh sách, xem chi tiết, cập nhật trạng thái, hủy đơn, cập nhật ghi chú, và real-time updates qua WebSocket.

---

## 📋 MỤC LỤC

1. [Tổng quan](#tổng-quan)
2. [Luồng 1: Lấy danh sách đơn hàng](#luồng-1-lấy-danh-sách-đơn-hàng)
3. [Luồng 2: Xem chi tiết đơn hàng](#luồng-2-xem-chi-tiết-đơn-hàng)
4. [Luồng 3: Cập nhật trạng thái đơn hàng](#luồng-3-cập-nhật-trạng-thái-đơn-hàng)
5. [Luồng 4: Hủy đơn hàng](#luồng-4-hủy-đơn-hàng)
6. [Luồng 5: Cập nhật ghi chú admin](#luồng-5-cập-nhật-ghi-chú-admin)
7. [Luồng 6: WebSocket Real-time Updates](#luồng-6-websocket-real-time-updates)
8. [Database Schema](#database-schema)

---

## 🎯 TỔNG QUAN

### **Kiến trúc hệ thống:**
- **Frontend**: ReactJS + Ant Design + Custom Hooks
- **Backend**: Node.js + Express + Prisma ORM
- **Database**: MySQL (orders, order_items, payments, order_status_history)
- **Real-time**: Socket.IO (WebSocket)

### **Các chức năng chính:**
1. ✅ **Lấy danh sách đơn hàng**: Phân trang, lọc theo trạng thái, tìm kiếm
2. ✅ **Xem chi tiết đơn hàng**: Thông tin đầy đủ về đơn hàng
3. ✅ **Cập nhật trạng thái**: PENDING → CONFIRMED → PROCESSING → DELIVERED
4. ✅ **Hủy đơn hàng**: Chỉ cho phép hủy khi PENDING hoặc CONFIRMED
5. ✅ **Cập nhật ghi chú**: Admin có thể thêm ghi chú cho đơn hàng
6. ✅ **Real-time updates**: WebSocket thông báo khi có đơn mới hoặc trạng thái thay đổi

---

## 📊 LUỒNG 1: LẤY DANH SÁCH ĐƠN HÀNG

### **Sơ đồ luồng:**

```
┌─────────────┐
│   ADMIN     │
│ (Frontend)  │
└──────┬──────┘
       │
       │ 1. Admin vào trang quản lý đơn hàng
       ▼
┌─────────────────────────────────────────┐
│  AdminOrders.jsx                        │
│  - Component mount                      │
│  - useAdminOrders() hook chạy           │
└──────┬──────────────────────────────────┘
       │
       │ 2. useEffect → fetchOrders()
       ▼
┌─────────────────────────────────────────┐
│  useAdminOrders.js                      │
│  fetchOrders()                           │
│  - Gọi API getOrders()                  │
│  - Params: page, limit, status, q       │
└──────┬──────────────────────────────────┘
       │
       │ 3. API Call
       ▼
┌─────────────────────────────────────────┐
│  api/adminOrders.js                     │
│  GET /api/admin/orders                  │
│  Query: ?page=1&limit=10&status=PENDING │
└──────┬──────────────────────────────────┘
       │
       │ HTTP Request (Authorization: Bearer token)
       │ Middleware: authenticateToken + requireAdmin
       ▼
┌─────────────────────────────────────────┐
│  Backend: adminOrderController.js        │
│  listOrders()                            │
│                                          │
│  1. Lấy query params: page, limit,      │
│     status, q (search)                  │
│  2. Xây dựng điều kiện lọc (where)      │
│  3. Query DB:                            │
│     - findMany (orders)                 │
│     - count (total)                      │
│  4. Parse shippingAddress (JSON)         │
│  5. Trả về: { items, total, page, limit }│
└──────┬──────────────────────────────────┘
       │
       │ Response JSON
       ▼
┌─────────────────────────────────────────┐
│  Frontend: useAdminOrders.js             │
│  - Nhận response                        │
│  - Map orders: thêm canCancel,           │
│    availableStatuses                    │
│  - setOrders(), setPagination()          │
└──────┬──────────────────────────────────┘
       │
       │ 4. Render danh sách
       ▼
┌─────────────────────────────────────────┐
│  AdminOrders.jsx                        │
│  - Table hiển thị danh sách đơn hàng    │
│  - Columns: Mã đơn, Khách hàng,         │
│    Tổng tiền, Trạng thái, Hành động    │
└─────────────────────────────────────────┘
```

### **Chi tiết từng bước:**

#### **BƯỚC 1: Frontend - Component mount**

**File**: `frontend/src/pages/admin/order/AdminOrders.jsx`

```jsx
export default function AdminOrders() {
  // Lấy tất cả state và functions từ hook
  const {
    orders,           // Danh sách đơn hàng
    loading,          // Đang tải
    pagination,       // Phân trang
    searchValue,      // Tìm kiếm
    statusFilter,     // Lọc theo trạng thái
    // ... các functions
  } = useAdminOrders();

  return (
    <div>
      {/* Search + Filter */}
      <Search
        placeholder="Tìm theo mã đơn, tên khách hàng"
        value={searchValue}
        onChange={(e) => setSearchValue(e.target.value)}
      />
      <Select
        placeholder="Lọc theo trạng thái"
        value={statusFilter}
        onChange={setStatusFilter}
      >
        <Option value="PENDING">Chờ xác nhận</Option>
        <Option value="CONFIRMED">Đã xác nhận</Option>
        {/* ... */}
      </Select>

      {/* Table */}
      <Table
        rowKey="id"
        columns={columns}
        dataSource={orders}
        pagination={{
          current: pagination.page,
          pageSize: pagination.limit,
          total: pagination.total,
          onChange: (page, pageSize) => setPagination({ ...pagination, page, limit: pageSize }),
        }}
      />
    </div>
  );
}
```

#### **BƯỚC 2: Frontend Hook - fetchOrders()**

**File**: `frontend/src/pages/admin/order/useAdminOrders.js`

```javascript
const fetchOrders = useCallback(async () => {
  try {
    setLoading(true);
    
    // Gọi API với các tham số
    const res = await getOrders({
      page: pagination.page,
      limit: pagination.limit,
      status: statusFilter || undefined,
      q: searchValue || undefined,
    });

    // Backend trả về: { items, total, page, limit }
    const items = (res.data.items || []).map(order => {
      const { paymentStatus, paymentMethod } = normalizePaymentInfo(order);
      return {
        ...order,
        paymentStatus,
        paymentMethod,
        // Thêm các field tính toán cho UI
        canCancel: order.status === "PENDING" || order.status === "CONFIRMED",
        availableStatuses: getAvailableStatuses(order.status),
      };
    });

    setOrders(items);
    setPagination(prev => ({ ...prev, total: res.data.total || 0 }));
  } catch (err) {
    toast.error("Không thể tải danh sách đơn hàng");
  } finally {
    setLoading(false);
  }
}, [pagination.page, pagination.limit, statusFilter, searchValue]);

// Tự động fetch khi pagination hoặc filter thay đổi
useEffect(() => {
  fetchOrders();
}, [pagination.page, pagination.limit, statusFilter]);

// Debounce search (500ms)
useEffect(() => {
  const timer = setTimeout(() => {
    if (pagination.page !== 1) {
      setPagination(prev => ({ ...prev, page: 1 }));
    } else {
      fetchOrders();
    }
  }, 500);
  return () => clearTimeout(timer);
}, [searchValue]);
```

#### **BƯỚC 3: API Client**

**File**: `frontend/src/api/adminOrders.js`

```javascript
export async function getOrders(params) {
  return await axiosClient.get("admin/orders", { params });
}
```

**Request**:
- **Method**: `GET`
- **URL**: `/api/admin/orders`
- **Query Params**:
  - `page`: Số trang (mặc định: 1)
  - `limit`: Số đơn mỗi trang (mặc định: 10)
  - `status`: Lọc theo trạng thái (PENDING, CONFIRMED, PROCESSING, DELIVERED, CANCELLED)
  - `q`: Tìm kiếm (theo mã đơn hoặc tên khách hàng)
- **Headers**: `Authorization: Bearer <token>`

#### **BƯỚC 4: Backend Routes**

**File**: `backend/routes/adminOrderRoutes.js`

```javascript
router.use(authenticateToken, requireAdmin);  // Middleware: yêu cầu admin

router.get('/', listOrders);  // Lấy danh sách đơn hàng
```

**Middleware**:
- `authenticateToken`: Kiểm tra user đã đăng nhập
- `requireAdmin`: Kiểm tra user có role = ADMIN

#### **BƯỚC 5: Backend Controller - listOrders()**

**File**: `backend/controller/adminOrderController.js`

```javascript
export const listOrders = async (req, res) => {
  try {
    // 1. Lấy tham số từ query string
    const { page = 1, limit = 10, status, q } = req.query;
    
    // 2. Xây dựng điều kiện lọc
    const conditions = [];
    if (status) conditions.push({ status });  // Lọc theo trạng thái
    if (q) {
      // Tìm kiếm theo số đơn hàng hoặc tên khách hàng
      conditions.push({
        OR: [
          { orderNumber: { contains: q } },
          { user: { firstName: { contains: q } } },
          { user: { lastName: { contains: q } } }
        ]
      });
    }
    const where = conditions.length ? { AND: conditions } : undefined;

    // 3. Query đồng thời: lấy danh sách đơn và tổng số đơn
    const [items, total] = await Promise.all([
      prisma.order.findMany({
        where,
        orderBy: { createdAt: 'desc' },  // Sắp xếp mới nhất trước
        skip: (Number(page) - 1) * Number(limit),  // Bỏ qua số đơn ở trang trước
        take: Number(limit),  // Lấy số đơn mỗi trang
        include: {
          user: { 
            select: { id: true, firstName: true, lastName: true, phone: true } 
          },
          payments: {
            orderBy: { createdAt: 'desc' },
            select: {
              id: true,
              paymentMethod: true,
              paymentStatus: true,
              transactionId: true,
              bankCode: true,
              responseCode: true,
              paidAt: true
            }
          },
          orderItems: {
            select: {
              id: true,
              productId: true,
              variantId: true,
              productName: true,
              productSku: true,
              variantName: true,
              quantity: true,
              unitPrice: true,
              totalPrice: true
            }
          }
        }
      }),
      prisma.order.count({ where })  // Đếm tổng số đơn
    ]);

    // 4. Parse shippingAddress từ JSON string thành object
    const itemsWithParsedAddress = items.map(order => {
      let parsedShippingAddress = order.shippingAddress;
      try {
        if (typeof order.shippingAddress === 'string') {
          parsedShippingAddress = JSON.parse(order.shippingAddress);
        }
      } catch (e) {
        logger.warn('Failed to parse shippingAddress', { orderId: order.id });
      }
      return { ...order, shippingAddress: parsedShippingAddress };
    });

    // 5. Trả về response
    return res.json({
      items: itemsWithParsedAddress,
      total,
      page: Number(page),
      limit: Number(limit)
    });
  } catch (error) {
    return res.status(500).json({ 
      message: 'Server error',
      error: process.env.NODE_ENV !== 'production' ? error.message : undefined
    });
  }
};
```

**Response**:
```json
{
  "items": [
    {
      "id": 123,
      "orderNumber": "00120251030001",
      "status": "PENDING",
      "paymentStatus": "PENDING",
      "paymentMethod": "COD",
      "totalAmount": 500000,
      "user": {
        "id": 1,
        "firstName": "Nguyễn",
        "lastName": "Văn A",
        "phone": "0123456789"
      },
      "payments": [...],
      "orderItems": [...],
      "shippingAddress": {
        "fullName": "Nguyễn Văn A",
        "phone": "0123456789",
        "streetAddress": "123 Đường ABC",
        "ward": "Phường 1",
        "district": "Quận 1",
        "city": "Hồ Chí Minh"
      }
    }
  ],
  "total": 100,
  "page": 1,
  "limit": 10
}
```

---

## 🔍 LUỒNG 2: XEM CHI TIẾT ĐƠN HÀNG

### **Sơ đồ luồng:**

```
┌─────────────┐
│   ADMIN     │
│ (Frontend)  │
└──────┬──────┘
       │
       │ 1. Admin click nút "Xem chi tiết"
       ▼
┌─────────────────────────────────────────┐
│  AdminOrders.jsx                        │
│  - handleViewDetail(orderId)            │
└──────┬──────────────────────────────────┘
       │
       │ 2. Gọi API getOrderById()
       ▼
┌─────────────────────────────────────────┐
│  api/adminOrders.js                     │
│  GET /api/admin/orders/:id              │
└──────┬──────────────────────────────────┘
       │
       │ HTTP Request
       ▼
┌─────────────────────────────────────────┐
│  Backend: adminOrderController.js       │
│  getOrder()                              │
│                                          │
│  1. Lấy order từ DB                     │
│  2. Lấy product/variant cho từng item   │
│     (xử lý null nếu bị xóa)             │
│  3. Parse shippingAddress               │
│  4. Trả về order đầy đủ                 │
└──────┬──────────────────────────────────┘
       │
       │ Response JSON
       ▼
┌─────────────────────────────────────────┐
│  Frontend: useAdminOrders.js             │
│  - Nhận response                        │
│  - setDetailData()                      │
│  - setDetailOpen(true)                  │
└──────┬──────────────────────────────────┘
       │
       │ 3. Hiển thị modal chi tiết
       ▼
┌─────────────────────────────────────────┐
│  AdminOrders.jsx                        │
│  - DetailModal hiển thị thông tin đầy đủ│
└─────────────────────────────────────────┘
```

### **Chi tiết từng bước:**

#### **BƯỚC 1: Frontend - Click nút "Xem chi tiết"**

**File**: `frontend/src/pages/admin/order/AdminOrders.jsx`

```jsx
<Tooltip title="Xem chi tiết">
  <Button onClick={() => handleViewDetail(record.id)}>
    <FaEye />
  </Button>
</Tooltip>
```

#### **BƯỚC 2: Frontend Hook - handleViewDetail()**

**File**: `frontend/src/pages/admin/order/useAdminOrders.js`

```javascript
const handleViewDetail = async (id) => {
  try {
    const res = await getOrderById(id);
    const { paymentStatus, paymentMethod } = normalizePaymentInfo(res.data);
    setDetailData({ ...res.data, paymentStatus, paymentMethod });
    setDetailOpen(true);  // Mở modal chi tiết
  } catch (err) {
    toast.error("Không thể tải chi tiết đơn hàng");
  }
};
```

#### **BƯỚC 3: API Client**

**File**: `frontend/src/api/adminOrders.js`

```javascript
export async function getOrderById(id) {
  return await axiosClient.get(`admin/orders/${id}`);
}
```

**Request**:
- **Method**: `GET`
- **URL**: `/api/admin/orders/:id`
- **Headers**: `Authorization: Bearer <token>`

#### **BƯỚC 4: Backend Controller - getOrder()**

**File**: `backend/controller/adminOrderController.js`

```javascript
export const getOrder = async (req, res) => {
  try {
    const id = Number(req.params.id);
    
    // 1. Lấy order và orderItems riêng để xử lý trường hợp product/variant bị xóa
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        user: { 
          select: { id: true, firstName: true, lastName: true, email: true, phone: true } 
        },
        orderItems: true,  // Lấy orderItems không include product/variant
        payments: true,
        statusHistory: { orderBy: { createdAt: 'asc' } }
      }
    });
    
    if (!order) {
      return res.status(404).json({ message: 'Not found' });
    }

    // 2. Lấy product và variant cho từng orderItem (xử lý null)
    const orderItemsWithProducts = await Promise.all(
      order.orderItems.map(async (item) => {
        let product = null;
        let variant = null;

        // Lấy product nếu tồn tại
        if (item.productId) {
          try {
            product = await prisma.product.findUnique({
              where: { id: item.productId },
              select: { id: true, name: true, imageUrl: true, price: true }
            });
          } catch (err) {
            // Product không tồn tại, giữ null
            logger.warn('Product not found for orderItem', { productId: item.productId });
          }
        }

        // Lấy variant nếu tồn tại
        if (item.variantId) {
          try {
            variant = await prisma.productVariant.findUnique({
              where: { id: item.variantId },
              select: { id: true, name: true, price: true }
            });
          } catch (err) {
            // Variant không tồn tại, giữ null
            logger.warn('Variant not found for orderItem', { variantId: item.variantId });
          }
        }

        return {
          ...item,
          product,
          variant
        };
      })
    );

    // 3. Parse shippingAddress từ JSON string thành object
    let parsedShippingAddress = order.shippingAddress;
    try {
      if (typeof order.shippingAddress === 'string') {
        parsedShippingAddress = JSON.parse(order.shippingAddress);
      }
    } catch (e) {
      logger.warn('Failed to parse shippingAddress', { orderId: order.id });
    }

    // 4. Trả về order đầy đủ
    return res.json({
      ...order,
      shippingAddress: parsedShippingAddress,
      orderItems: orderItemsWithProducts
    });
  } catch (error) {
    return res.status(500).json({ message: 'Server error' });
  }
};
```

**Response**:
```json
{
  "id": 123,
  "orderNumber": "00120251030001",
  "status": "PENDING",
  "paymentStatus": "PENDING",
  "paymentMethod": "COD",
  "totalAmount": 500000,
  "user": {
    "id": 1,
    "firstName": "Nguyễn",
    "lastName": "Văn A",
    "email": "user@example.com",
    "phone": "0123456789"
  },
  "orderItems": [
    {
      "id": 1,
      "productId": 10,
      "variantId": 5,
      "productName": "Bàn học",
      "quantity": 2,
      "unitPrice": 200000,
      "totalPrice": 400000,
      "product": {
        "id": 10,
        "name": "Bàn học",
        "imageUrl": "https://...",
        "price": 200000
      },
      "variant": {
        "id": 5,
        "name": "Màu trắng",
        "price": 200000
      }
    }
  ],
  "payments": [...],
  "statusHistory": [...],
  "shippingAddress": {
    "fullName": "Nguyễn Văn A",
    "phone": "0123456789",
    "streetAddress": "123 Đường ABC",
    "ward": "Phường 1",
    "district": "Quận 1",
    "city": "Hồ Chí Minh"
  }
}
```

---

## 🔄 LUỒNG 3: CẬP NHẬT TRẠNG THÁI ĐƠN HÀNG

### **Sơ đồ luồng:**

```
┌─────────────┐
│   ADMIN     │
│ (Frontend)  │
└──────┬──────┘
       │
       │ 1. Admin chọn trạng thái mới từ dropdown
       ▼
┌─────────────────────────────────────────┐
│  AdminOrders.jsx                        │
│  - Select onChange                      │
│  - handleStatusChange(orderId, status)  │
└──────┬──────────────────────────────────┘
       │
       │ 2. Validate (VNPay phải đã thanh toán)
       │ 3. Gọi API updateOrder()
       ▼
┌─────────────────────────────────────────┐
│  api/adminOrders.js                     │
│  PUT /api/admin/orders/:id               │
│  Body: { status: "CONFIRMED" }           │
└──────┬──────────────────────────────────┘
       │
       │ HTTP Request
       ▼
┌─────────────────────────────────────────┐
│  Backend: adminOrderController.js        │
│  updateOrder()                           │
│                                          │
│  1. Validate trạng thái                 │
│  2. Kiểm tra quy tắc chuyển trạng thái  │
│  3. TRANSACTION:                         │
│     - Nếu CONFIRMED: Trừ tồn kho        │
│     - UPDATE orders (status)            │
│     - INSERT order_status_history       │
│  4. Emit WebSocket (order:status:updated)│
│  5. Gửi email thông báo cho user        │
└──────┬──────────────────────────────────┘
       │
       │ Response JSON
       ▼
┌─────────────────────────────────────────┐
│  Frontend: useAdminOrders.js             │
│  - Nhận response                        │
│  - fetchOrders() (refresh danh sách)    │
│  - toast.success()                      │
└─────────────────────────────────────────┘
```

### **Chi tiết từng bước:**

#### **BƯỚC 1: Frontend - Chọn trạng thái mới**

**File**: `frontend/src/pages/admin/order/AdminOrders.jsx`

```jsx
<Select
  value={record.status}
  onChange={(value) => handleStatusChange(record.id, value)}
  disabled={updatingId === record.id}
>
  <Option value={record.status} disabled>
    {getStatusLabel(record.status)} (hiện tại)
  </Option>
  {record.availableStatuses.map((s) => (
    <Option key={s.value} value={s.value}>
      {s.label}
    </Option>
  ))}
</Select>
```

**Lưu ý**: Nếu đơn hàng thanh toán bằng VNPay và chưa thanh toán thành công, option "Đã xác nhận" sẽ bị disable.

#### **BƯỚC 2: Frontend Hook - handleStatusChange()**

**File**: `frontend/src/pages/admin/order/useAdminOrders.js`

```javascript
const handleStatusChange = async (orderId, newStatus) => {
  try {
    // Tìm đơn hàng trong danh sách để kiểm tra payment status
    const order = orders.find(o => o.id === orderId);
    
    // Validate: Nếu chuyển sang CONFIRMED và thanh toán bằng VNPay
    if (newStatus === 'CONFIRMED' && order?.paymentMethod === 'VNPAY') {
      // Kiểm tra paymentStatus phải là PAID
      if (order?.paymentStatus !== 'PAID') {
        const paymentStatusLabel = order?.paymentStatus === 'FAILED' 
          ? 'thất bại' 
          : 'chưa thanh toán';
        toast.error(`Không thể xác nhận đơn hàng. Thanh toán VNPay ${paymentStatusLabel}.`);
        return;  // Dừng lại, không gọi API
      }
    }

    setUpdatingId(orderId);  // Hiển thị loading
    await updateOrder(orderId, { status: newStatus });
    toast.success("Cập nhật trạng thái thành công");
    fetchOrders();  // Refresh danh sách
  } catch (err) {
    toast.error(err.response?.data?.message || "Có lỗi khi cập nhật");
    fetchOrders();  // Refresh để đảm bảo UI đồng bộ
  } finally {
    setUpdatingId(null);
  }
};
```

#### **BƯỚC 3: API Client**

**File**: `frontend/src/api/adminOrders.js`

```javascript
export async function updateOrder(id, data) {
  return await axiosClient.put(`admin/orders/${id}`, data);
}
```

**Request**:
- **Method**: `PUT`
- **URL**: `/api/admin/orders/:id`
- **Body**:
  ```json
  {
    "status": "CONFIRMED"
  }
  ```
- **Headers**: `Authorization: Bearer <token>`

#### **BƯỚC 4: Backend Controller - updateOrder()**

**File**: `backend/controller/adminOrderController.js`

```javascript
export const updateOrder = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { status } = req.body;

    // 1. Validate: Trạng thái là bắt buộc
    if (!status) {
      return res.status(400).json({ message: 'Trạng thái không hợp lệ' });
    }

    // 2. Validate: Trạng thái phải hợp lệ
    const validStatuses = ['PENDING', 'CONFIRMED', 'PROCESSING', 'DELIVERED', 'CANCELLED'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: 'Trạng thái không hợp lệ' });
    }

    // 3. Lấy thông tin đơn hàng hiện tại
    const currentOrder = await prisma.order.findUnique({
      where: { id },
      select: { 
        status: true,
        userId: true,  // Cần để gửi WebSocket
        orderItems: {
          select: {
            productId: true,
            variantId: true,
            quantity: true
          }
        }
      }
    });

    if (!currentOrder) {
      return res.status(404).json({ message: 'Đơn hàng không tồn tại' });
    }

    // 4. Không cho phép cập nhật đơn đã giao hoặc đã hủy
    if (currentOrder.status === 'DELIVERED' || currentOrder.status === 'CANCELLED') {
      return res.status(400).json({ 
        message: `Không thể cập nhật đơn hàng với trạng thái: ${currentOrder.status}` 
      });
    }

    // 5. Không cho phép chọn trạng thái hiện tại
    if (status === currentOrder.status) {
      return res.status(400).json({ 
        message: `Đơn hàng đã có trạng thái: ${status}` 
      });
    }

    // 6. Kiểm tra quy tắc chuyển trạng thái
    const statusTransitions = {
      PENDING: ['CONFIRMED'],        // Chờ xác nhận → Đã xác nhận
      CONFIRMED: ['PROCESSING'],     // Đã xác nhận → Đang giao
      PROCESSING: ['DELIVERED']      // Đang giao → Đã giao
    };

    const allowedStatuses = statusTransitions[currentOrder.status] || [];
    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({ 
        message: `Không thể chuyển trạng thái từ ${currentOrder.status} sang ${status}` 
      });
    }

    // 7. Cập nhật trong transaction
    const updated = await prisma.$transaction(async (tx) => {
      // 7.1 Nếu chuyển sang CONFIRMED (từ PENDING), trừ tồn kho
      if (status === 'CONFIRMED' && currentOrder.status === 'PENDING') {
        const orderItems = await tx.orderItem.findMany({
          where: { orderId: id },
          include: {
            variant: {
              select: { id: true, stockQuantity: true }
            }
          }
        });

        // Trừ tồn kho cho từng item
        for (const item of orderItems) {
          if (item.variantId && item.variant) {
            const currentStock = item.variant.stockQuantity;
            if (currentStock < item.quantity) {
              throw new Error(`Sản phẩm "${item.productName}" chỉ còn ${currentStock} sản phẩm`);
            }
            await tx.productVariant.update({
              where: { id: item.variantId },
              data: { stockQuantity: { decrement: item.quantity } }
            });
          }
        }
      }

      // 7.2 Cập nhật trạng thái đơn hàng
      const order = await tx.order.update({
        where: { id },
        data: { status }
      });

      // 7.3 Lưu lịch sử thay đổi trạng thái
      await tx.orderStatusHistory.create({
        data: { orderId: id, status }
      });

      return order;
    });

    // 8. Gửi WebSocket thông báo đến user
    emitOrderStatusUpdate(currentOrder.userId, {
      id: updated.id,
      orderNumber: updated.orderNumber,
      status: updated.status,
      statusLabel: getStatusLabel(updated.status)
    });

    // 9. Gửi email thông báo cho user
    try {
      const orderForEmail = await prisma.order.findUnique({
        where: { id },
        include: {
          orderItems: { select: { productName: true, variantName: true, quantity: true, unitPrice: true, totalPrice: true } },
          user: { select: { email: true } }
        }
      });

      if (orderForEmail?.user?.email) {
        // Parse shippingAddress
        let shippingAddressParsed = orderForEmail.shippingAddress;
        try {
          if (typeof orderForEmail.shippingAddress === 'string') {
            shippingAddressParsed = JSON.parse(orderForEmail.shippingAddress);
          }
        } catch (e) {
          logger.warn('Failed to parse shippingAddress for email', { orderId: id });
        }

        const shippingAddressString = typeof shippingAddressParsed === 'object' 
          ? `${shippingAddressParsed.fullName || ''}\n${shippingAddressParsed.phone || ''}\n${shippingAddressParsed.streetAddress || ''}\n${shippingAddressParsed.ward || ''}, ${shippingAddressParsed.district || ''}, ${shippingAddressParsed.city || ''}`
          : orderForEmail.shippingAddress;

        const emailOrderItems = orderForEmail.orderItems.map(item => ({
          productName: item.productName,
          variantName: item.variantName,
          quantity: item.quantity,
          unitPrice: Number(item.unitPrice),
          totalPrice: Number(item.totalPrice),
        }));

        const orderData = {
          ...orderForEmail,
          orderItems: emailOrderItems,
          shippingAddress: shippingAddressString,
        };

        // Gửi email theo trạng thái
        switch (status) {
          case 'CONFIRMED':
            await sendOrderConfirmedEmail({
              email: orderForEmail.user.email,
              order: orderData
            });
            break;
          case 'PROCESSING':
            await sendOrderShippingEmail({
              email: orderForEmail.user.email,
              order: orderData
            });
            break;
          case 'DELIVERED':
            await sendOrderDeliveredEmail({
              email: orderForEmail.user.email,
              order: orderData
            });
            break;
        }
      }
    } catch (emailError) {
      logger.warn('Failed to send order status email', { orderId: id, status });
    }

    return res.json(updated);
  } catch (error) {
    return res.status(500).json({ message: 'Server error' });
  }
};
```

**Quy tắc chuyển trạng thái:**
- `PENDING` → `CONFIRMED` (trừ tồn kho)
- `CONFIRMED` → `PROCESSING`
- `PROCESSING` → `DELIVERED`
- Không cho phép chuyển ngược lại hoặc nhảy bước

**Response**:
```json
{
  "id": 123,
  "orderNumber": "00120251030001",
  "status": "CONFIRMED",
  "userId": 1,
  "createdAt": "2025-01-30T10:00:00.000Z",
  "updatedAt": "2025-01-30T10:15:00.000Z"
}
```

---

## ❌ LUỒNG 4: HỦY ĐƠN HÀNG

### **Sơ đồ luồng:**

```
┌─────────────┐
│   ADMIN     │
│ (Frontend)  │
└──────┬──────┘
       │
       │ 1. Admin click nút "Hủy đơn"
       │    (Popconfirm xác nhận)
       ▼
┌─────────────────────────────────────────┐
│  AdminOrders.jsx                        │
│  - handleCancelOrder(orderId)           │
└──────┬──────────────────────────────────┘
       │
       │ 2. Gọi API cancelOrder()
       ▼
┌─────────────────────────────────────────┐
│  api/adminOrders.js                     │
│  PUT /api/admin/orders/:id/cancel      │
└──────┬──────────────────────────────────┘
       │
       │ HTTP Request
       ▼
┌─────────────────────────────────────────┐
│  Backend: adminOrderController.js       │
│  cancelOrder()                           │
│                                          │
│  1. Validate: Chỉ cho phép hủy khi      │
│     PENDING hoặc CONFIRMED              │
│  2. TRANSACTION:                         │
│     - UPDATE orders (status: CANCELLED) │
│     - UPDATE orders (paymentStatus)     │
│     - INSERT order_status_history       │
│     - Nếu CONFIRMED: Hoàn trả tồn kho   │
│  3. Emit WebSocket                      │
│  4. Gửi email thông báo hủy đơn         │
└──────┬──────────────────────────────────┘
       │
       │ Response JSON
       ▼
┌─────────────────────────────────────────┐
│  Frontend: useAdminOrders.js             │
│  - Nhận response                        │
│  - fetchOrders() (refresh danh sách)    │
│  - toast.success()                      │
└─────────────────────────────────────────┘
```

### **Chi tiết từng bước:**

#### **BƯỚC 1: Frontend - Click nút "Hủy đơn"**

**File**: `frontend/src/pages/admin/order/AdminOrders.jsx`

```jsx
<Popconfirm
  title="Hủy đơn hàng"
  description={`Bạn có chắc muốn hủy đơn hàng ${record.orderNumber}?`}
  onConfirm={() => handleCancelOrder(record.id)}
  okText="Hủy đơn"
  cancelText="Không"
  okButtonProps={{ danger: true }}
>
  <Button variant="destructive" size="sm">
    <FaTimes />
  </Button>
</Popconfirm>
```

#### **BƯỚC 2: Frontend Hook - handleCancelOrder()**

**File**: `frontend/src/pages/admin/order/useAdminOrders.js`

```javascript
const handleCancelOrder = async (orderId) => {
  try {
    setUpdatingId(orderId);
    await cancelOrder(orderId, {});  // Backend không nhận adminNote
    toast.success("Hủy đơn hàng thành công");
    fetchOrders();  // Refresh danh sách
  } catch (err) {
    toast.error(err.response?.data?.message || "Có lỗi khi hủy đơn");
  } finally {
    setUpdatingId(null);
  }
};
```

#### **BƯỚC 3: API Client**

**File**: `frontend/src/api/adminOrders.js`

```javascript
export async function cancelOrder(id, data = {}) {
  return await axiosClient.put(`admin/orders/${id}/cancel`, data);
}
```

**Request**:
- **Method**: `PUT`
- **URL**: `/api/admin/orders/:id/cancel`
- **Body**: `{}` (không cần dữ liệu)
- **Headers**: `Authorization: Bearer <token>`

#### **BƯỚC 4: Backend Controller - cancelOrder()**

**File**: `backend/controller/adminOrderController.js`

```javascript
export const cancelOrder = async (req, res) => {
  try {
    const id = Number(req.params.id);

    // 1. Lấy thông tin đơn hàng hiện tại
    const currentOrder = await prisma.order.findUnique({
      where: { id },
      select: { 
        status: true,
        paymentStatus: true,
        userId: true,
        orderItems: {
          select: {
            productId: true,
            variantId: true,
            quantity: true
          }
        }
      }
    });

    if (!currentOrder) {
      return res.status(404).json({ message: 'Đơn hàng không tồn tại' });
    }

    // 2. Chỉ cho phép hủy đơn ở trạng thái PENDING hoặc CONFIRMED
    if (currentOrder.status !== 'PENDING' && currentOrder.status !== 'CONFIRMED') {
      return res.status(400).json({ 
        message: `Chỉ có thể hủy đơn hàng ở trạng thái PENDING hoặc CONFIRMED. Trạng thái hiện tại: ${currentOrder.status}` 
      });
    }

    // 3. Cập nhật trong transaction
    const updated = await prisma.$transaction(async (tx) => {
      // 3.1 Cập nhật trạng thái đơn hàng thành CANCELLED
      const order = await tx.order.update({
        where: { id },
        data: { 
          status: 'CANCELLED',
          paymentStatus: currentOrder.paymentStatus === 'PAID' ? 'PAID' : 'FAILED'  // Giữ PAID nếu đã thanh toán
        }
      });

      // 3.2 Lưu lịch sử thay đổi trạng thái
      await tx.orderStatusHistory.create({
        data: { orderId: id, status: 'CANCELLED' }
      });

      // 3.3 Hoàn trả tồn kho chỉ khi đơn đã ở CONFIRMED (đã trừ tồn kho)
      // Nếu đơn ở PENDING (chưa trừ tồn kho), không cần hoàn trả
      if (currentOrder.status === 'CONFIRMED') {
        const orderItems = await tx.orderItem.findMany({
          where: { orderId: id },
          include: {
            variant: {
              select: { id: true }
            }
          }
        });

        for (const item of orderItems) {
          if (item.variantId && item.variant) {
            await tx.productVariant.update({
              where: { id: item.variantId },
              data: { stockQuantity: { increment: item.quantity } }
            });
          }
        }
      }

      return order;
    });

    // 4. Gửi WebSocket thông báo đến user
    emitOrderStatusUpdate(currentOrder.userId, {
      id: updated.id,
      orderNumber: updated.orderNumber,
      status: 'CANCELLED',
      statusLabel: getStatusLabel('CANCELLED')
    });

    // 5. Gửi email thông báo hủy đơn cho user
    try {
      const orderForEmail = await prisma.order.findUnique({
        where: { id },
        include: {
          orderItems: { select: { productName: true, variantName: true, quantity: true, unitPrice: true, totalPrice: true } },
          user: { select: { email: true } }
        }
      });

      if (orderForEmail?.user?.email) {
        // Parse shippingAddress
        let shippingAddressParsed = orderForEmail.shippingAddress;
        try {
          if (typeof orderForEmail.shippingAddress === 'string') {
            shippingAddressParsed = JSON.parse(orderForEmail.shippingAddress);
          }
        } catch (e) {
          logger.warn('Failed to parse shippingAddress for email', { orderId: id });
        }

        const shippingAddressString = typeof shippingAddressParsed === 'object' 
          ? `${shippingAddressParsed.fullName || ''}\n${shippingAddressParsed.phone || ''}\n${shippingAddressParsed.streetAddress || ''}\n${shippingAddressParsed.ward || ''}, ${shippingAddressParsed.district || ''}, ${shippingAddressParsed.city || ''}`
          : orderForEmail.shippingAddress;

        const emailOrderItems = orderForEmail.orderItems.map(item => ({
          productName: item.productName,
          variantName: item.variantName,
          quantity: item.quantity,
          unitPrice: Number(item.unitPrice),
          totalPrice: Number(item.totalPrice),
        }));

        const orderData = {
          ...orderForEmail,
          orderItems: emailOrderItems,
          shippingAddress: shippingAddressString,
        };

        const reason = req.body.reason || 'Đơn hàng đã bị hủy bởi quản trị viên.';

        await sendOrderCancelledEmail({
          email: orderForEmail.user.email,
          order: orderData,
          reason: reason
        });
      }
    } catch (emailError) {
      logger.warn('Failed to send order cancelled email', { orderId: id });
    }

    return res.json({ 
      message: 'Hủy đơn hàng thành công',
      order: updated 
    });
  } catch (error) {
    return res.status(500).json({ message: 'Lỗi server' });
  }
};
```

**Lưu ý quan trọng:**
- Chỉ cho phép hủy khi `status = PENDING` hoặc `CONFIRMED`
- Nếu đơn ở `CONFIRMED` (đã trừ tồn kho) → Hoàn trả tồn kho
- Nếu đơn ở `PENDING` (chưa trừ tồn kho) → Không cần hoàn trả
- Payment status: Giữ `PAID` nếu đã thanh toán, ngược lại → `FAILED`

---

## 📝 LUỒNG 5: CẬP NHẬT GHI CHÚ ADMIN

### **Sơ đồ luồng:**

```
┌─────────────┐
│   ADMIN     │
│ (Frontend)  │
└──────┬──────┘
       │
       │ 1. Admin click nút "Cập nhật ghi chú"
       ▼
┌─────────────────────────────────────────┐
│  AdminOrders.jsx                        │
│  - openNotesModal(order)                │
│  - CrudModal hiển thị form             │
└──────┬──────────────────────────────────┘
       │
       │ 2. Admin nhập ghi chú và submit
       ▼
┌─────────────────────────────────────────┐
│  useAdminOrders.js                      │
│  - handleUpdateNotes(values)            │
│  - Gọi API updateOrderNotes()           │
└──────┬──────────────────────────────────┘
       │
       │ 3. API Call
       ▼
┌─────────────────────────────────────────┐
│  api/adminOrders.js                     │
│  PUT /api/admin/orders/:id/notes         │
│  Body: { notes: "..." }                 │
└──────┬──────────────────────────────────┘
       │
       │ HTTP Request
       ▼
┌─────────────────────────────────────────┐
│  Backend: adminOrderController.js       │
│  updateOrderNotes()                      │
│                                          │
│  1. Kiểm tra đơn hàng có tồn tại        │
│  2. UPDATE orders (adminNote)           │
│  3. Trả về order đã cập nhật            │
└──────┬──────────────────────────────────┘
       │
       │ Response JSON
       ▼
┌─────────────────────────────────────────┐
│  Frontend: useAdminOrders.js             │
│  - Nhận response                        │
│  - fetchOrders() (refresh danh sách)    │
│  - toast.success()                      │
│  - Đóng modal                           │
└─────────────────────────────────────────┘
```

### **Chi tiết từng bước:**

#### **BƯỚC 1: Frontend - Mở modal ghi chú**

**File**: `frontend/src/pages/admin/order/AdminOrders.jsx`

```jsx
<Tooltip title="Cập nhật ghi chú">
  <Button onClick={() => openNotesModal(record)}>
    <FaEdit />
  </Button>
</Tooltip>

<CrudModal
  open={modalOpen}
  onCancel={closeModal}
  onSubmit={handleUpdateNotes}
  editingRecord={editingOrder}
  fields={notesFields}
  title="Cập nhật ghi chú đơn hàng"
/>
```

#### **BƯỚC 2: Frontend Hook - handleUpdateNotes()**

**File**: `frontend/src/pages/admin/order/useAdminOrders.js`

```javascript
const handleUpdateNotes = async (values) => {
  try {
    setModalLoading(true);
    await updateOrderNotes(editingOrder.id, values.notes || "");
    toast.success("Cập nhật ghi chú thành công");
    setModalOpen(false);
    setEditingOrder(null);
    fetchOrders();  // Refresh danh sách
  } catch (err) {
    toast.error(err.response?.data?.message || "Có lỗi khi cập nhật");
  } finally {
    setModalLoading(false);
  }
};
```

#### **BƯỚC 3: API Client**

**File**: `frontend/src/api/adminOrders.js`

```javascript
export async function updateOrderNotes(id, notes) {
  return await axiosClient.put(`admin/orders/${id}/notes`, { notes });
}
```

**Request**:
- **Method**: `PUT`
- **URL**: `/api/admin/orders/:id/notes`
- **Body**:
  ```json
  {
    "notes": "Ghi chú của admin về đơn hàng này"
  }
  ```
- **Headers**: `Authorization: Bearer <token>`

#### **BƯỚC 4: Backend Controller - updateOrderNotes()**

**File**: `backend/controller/adminOrderController.js`

```javascript
export const updateOrderNotes = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { notes } = req.body;

    // 1. Kiểm tra đơn hàng có tồn tại không
    const found = await prisma.order.findUnique({ where: { id } });
    if (!found) {
      return res.status(404).json({ message: 'Not found' });
    }

    // 2. Cập nhật ghi chú admin
    const updated = await prisma.order.update({
      where: { id },
      data: { adminNote: notes || null }
    });

    return res.json(updated);
  } catch (error) {
    return res.status(500).json({ message: 'Server error' });
  }
};
```

**Response**:
```json
{
  "id": 123,
  "orderNumber": "00120251030001",
  "adminNote": "Ghi chú của admin về đơn hàng này",
  ...
}
```

---

## 🔔 LUỒNG 6: WEBSOCKET REAL-TIME UPDATES

### **Sơ đồ luồng:**

```
┌─────────────┐
│   BACKEND   │
│ (Server)    │
└──────┬──────┘
       │
       │ 1. Có sự kiện: đơn mới hoặc trạng thái thay đổi
       │    - emitNewOrder() (khi user đặt hàng)
       │    - emitOrderStatusUpdate() (khi admin cập nhật)
       ▼
┌─────────────────────────────────────────┐
│  socket.js                               │
│  - Emit event đến admin room            │
│  - Event: 'order:new' hoặc              │
│    'order:status:updated'               │
└──────┬──────────────────────────────────┘
       │
       │ WebSocket Event
       ▼
┌─────────────────────────────────────────┐
│  Frontend: useAdminOrders.js              │
│  - useAdminSocket() hook                 │
│  - onOrderStatusUpdate()                │
│  - Lắng nghe events                     │
└──────┬──────────────────────────────────┘
       │
       │ 2. Nhận event → Cập nhật UI
       ▼
┌─────────────────────────────────────────┐
│  AdminOrders.jsx                        │
│  - Tự động refresh danh sách            │
│  - Cập nhật trạng thái đơn hàng         │
└─────────────────────────────────────────┘
```

### **Chi tiết:**

#### **BƯỚC 1: Backend - Emit WebSocket Event**

**File**: `backend/config/socket.js`

```javascript
// Khi có đơn hàng mới
export const emitNewOrder = (orderData) => {
  io.to('admin').emit('order:new', orderData);
};

// Khi trạng thái đơn hàng thay đổi
export const emitOrderStatusUpdate = (userId, orderData) => {
  // Gửi đến user (để user biết trạng thái đơn đã thay đổi)
  io.to(`user:${userId}`).emit('order:status:updated', orderData);
  
  // Gửi đến admin (để admin cập nhật UI real-time)
  io.to('admin').emit('order:status:updated', orderData);
};
```

#### **BƯỚC 2: Frontend - Lắng nghe WebSocket**

**File**: `frontend/src/pages/admin/order/useAdminOrders.js`

```javascript
// Lắng nghe đơn hàng mới
useAdminSocket((data) => {
  console.log('📦 Socket: Nhận được đơn hàng mới:', data);
  
  // Nếu đang ở trang khác trang 1 → Reset về trang 1
  if (pagination.page !== 1) {
    setPagination(prev => ({ ...prev, page: 1 }));
  } else {
    // Nếu đang ở trang 1 → Refresh ngay lập tức
    fetchOrders();
  }
}, [pagination.page, fetchOrders]);

// Lắng nghe cập nhật trạng thái đơn hàng
const handleOrderStatusUpdate = useCallback((data) => {
  console.log('🔄 Socket: Order status updated trong admin', data);
  
  const orderId = data.orderId || data.id;
  
  // Cập nhật đơn hàng trong danh sách
  setOrders(prev => {
    const updated = prev.map(order => {
      if (order.id === orderId) {
        return {
          ...order,
          status: data.status,
          canCancel: data.status === "PENDING" || data.status === "CONFIRMED",
          availableStatuses: getAvailableStatuses(data.status),
        };
      }
      return order;
    });
    
    // Nếu đơn hàng không có trong danh sách hiện tại → Refresh
    const orderExists = prev.some(o => o.id === orderId);
    if (!orderExists && pagination.page === 1) {
      fetchOrders();
    }
    
    return updated;
  });
}, [pagination.page, fetchOrders, getStatusLabel]);

useEffect(() => {
  const unsubscribeStatusUpdated = onOrderStatusUpdate(handleOrderStatusUpdate);
  return () => {
    unsubscribeStatusUpdated();
  };
}, [handleOrderStatusUpdate]);
```

**Lợi ích:**
- ✅ Admin nhận thông báo real-time khi có đơn mới
- ✅ UI tự động cập nhật khi trạng thái đơn hàng thay đổi
- ✅ Không cần refresh trang thủ công

---

## 🗄️ DATABASE SCHEMA

### **Bảng `orders`:**

```prisma
model Order {
  id               Int                  @id @default(autoincrement())
  orderNumber      String               @unique
  userId           Int
  status           OrderStatus          @default(PENDING)
  paymentStatus    PaymentStatus        @default(PENDING)
  subtotal         Decimal
  shippingFee      Decimal
  discountAmount   Decimal
  totalAmount      Decimal
  shippingAddress  String               @db.LongText  // JSON string
  paymentMethod    PaymentMethod
  customerNote     String?
  adminNote        String?              // Ghi chú của admin
  createdAt        DateTime             @default(now())
  updatedAt        DateTime             @updatedAt
  
  orderItems       OrderItem[]
  payments         Payment[]
  statusHistory    OrderStatusHistory[]
  user             User                 @relation(fields: [userId], references: [id])
}
```

### **Bảng `order_status_history`:**

```prisma
model OrderStatusHistory {
  id        Int       @id @default(autoincrement())
  orderId   Int
  status    OrderStatus
  createdAt DateTime  @default(now())
  
  order     Order     @relation(fields: [orderId], references: [id])
}
```

### **Luồng dữ liệu trong Database:**

#### **Khi admin cập nhật trạng thái:**

```
1. UPDATE orders (status: CONFIRMED)
2. INSERT order_status_history (status: CONFIRMED)
3. Nếu CONFIRMED: UPDATE product_variants (stockQuantity: decrement)
```

#### **Khi admin hủy đơn:**

```
1. UPDATE orders (status: CANCELLED, paymentStatus: FAILED/PAID)
2. INSERT order_status_history (status: CANCELLED)
3. Nếu CONFIRMED: UPDATE product_variants (stockQuantity: increment)
```

#### **Khi admin cập nhật ghi chú:**

```
1. UPDATE orders (adminNote: "...")
```

---

## 📝 TÓM TẮT

### **Các luồng chính:**

1. **Lấy danh sách đơn hàng:**
   - Frontend → API → Backend → Database → Response → Frontend
   - Hỗ trợ phân trang, lọc, tìm kiếm

2. **Xem chi tiết đơn hàng:**
   - Frontend → API → Backend → Database (với product/variant) → Response → Modal

3. **Cập nhật trạng thái:**
   - Frontend → API → Backend → Transaction (trừ tồn kho nếu CONFIRMED) → WebSocket → Email → Response

4. **Hủy đơn hàng:**
   - Frontend → API → Backend → Transaction (hoàn trả tồn kho nếu CONFIRMED) → WebSocket → Email → Response

5. **Cập nhật ghi chú:**
   - Frontend → API → Backend → Database → Response

6. **WebSocket Real-time:**
   - Backend emit event → Frontend lắng nghe → Cập nhật UI tự động

---

## 🔐 BẢO MẬT

1. ✅ **Authentication**: Tất cả routes yêu cầu `authenticateToken`
2. ✅ **Authorization**: Chỉ admin mới có thể truy cập (`requireAdmin`)
3. ✅ **Validation**: Kiểm tra quy tắc chuyển trạng thái
4. ✅ **Transaction**: Đảm bảo tính toàn vẹn dữ liệu (atomic operations)
5. ✅ **Stock Management**: Kiểm tra tồn kho trước khi trừ, hoàn trả khi hủy

---

## 📚 TÀI LIỆU THAM KHẢO

- `backend/controller/adminOrderController.js`: Controller xử lý đơn hàng admin
- `backend/routes/adminOrderRoutes.js`: Routes admin đơn hàng
- `frontend/src/pages/admin/order/AdminOrders.jsx`: Component quản lý đơn hàng
- `frontend/src/pages/admin/order/useAdminOrders.js`: Hook quản lý đơn hàng
- `frontend/src/api/adminOrders.js`: API client admin đơn hàng
- `backend/config/socket.js`: WebSocket configuration

