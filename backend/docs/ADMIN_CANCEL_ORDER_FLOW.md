# 🔄 LOGIC VÀ CÁC BƯỚC XỬ LÝ HỦY ĐƠN HÀNG (ADMIN)

## 📋 TỔNG QUAN

Khi admin muốn hủy một đơn hàng, hệ thống sẽ thực hiện các bước sau:

### 1️⃣ **KIỂM TRA ĐIỀU KIỆN HỦY ĐƠN**

**Frontend (`AdminOrders.jsx`):**
- Chỉ hiển thị nút hủy khi: `order.status === "PENDING" || order.status === "CONFIRMED"`
- Được tính trong `useAdminOrders.js`:
  ```javascript
  canCancel: order.status === "PENDING" || order.status === "CONFIRMED"
  ```

**Backend (`adminOrderController.js`):**
- Kiểm tra lại điều kiện:
  ```javascript
  if (currentOrder.status !== 'PENDING' && currentOrder.status !== 'CONFIRMED') {
    return res.status(400).json({ 
      message: `Chỉ có thể hủy đơn hàng ở trạng thái PENDING hoặc CONFIRMED` 
    });
  }
  ```

---

## 🔄 FLOW XỬ LÝ CHI TIẾT

### **BƯỚC 1: User bấm nút hủy đơn**

**File:** `frontend/src/pages/admin/order/AdminOrders.jsx`

```javascript
// Nút hủy chỉ hiển thị khi canCancel = true
{record.canCancel && (
  <Button onClick={() => {
    // Hiển thị Modal xác nhận
    Modal.confirm({ ... });
  }}>
    <FaTimes />
  </Button>
)}
```

**Điều kiện hiển thị:**
- ✅ Đơn hàng có trạng thái `PENDING` hoặc `CONFIRMED`
- ❌ Không hiển thị nếu đơn đã `PROCESSING`, `DELIVERED`, hoặc `CANCELLED`

---

### **BƯỚC 2: Hiển thị Modal xác nhận**

**File:** `frontend/src/pages/admin/order/AdminOrders.jsx`

```javascript
Modal.confirm({
  title: "Xác nhận hủy đơn hàng",
  content: `Bạn có chắc muốn hủy đơn hàng ${record.orderNumber}?`,
  okText: "Hủy đơn",
  cancelText: "Hủy",
  okType: "danger", // Màu đỏ để cảnh báo
  onOk: async () => {
    // Gọi hàm hủy đơn
    await handleCancelOrder(record.id);
  }
});
```

**Mục đích:**
- Xác nhận lại ý định của admin
- Tránh hủy nhầm đơn hàng

---

### **BƯỚC 3: Gọi hàm handleCancelOrder**

**File:** `frontend/src/pages/admin/order/useAdminOrders.js`

```javascript
const handleCancelOrder = async (orderId, adminNote = null) => {
  try {
    // 1. Set loading state
    setUpdatingOrderId(orderId);
    
    // 2. Gọi API hủy đơn
    const response = await cancelOrder(orderId, adminNote ? { adminNote } : {});
    
    // 3. Hiển thị thông báo thành công
    toast.success("Hủy đơn hàng thành công");
    
    // 4. Refresh danh sách đơn hàng
    fetchOrders();
  } catch (err) {
    // 5. Hiển thị lỗi nếu có
    toast.error(err.response?.data?.message || "Có lỗi khi hủy đơn hàng");
  } finally {
    // 6. Tắt loading state
    setUpdatingOrderId(null);
  }
};
```

**Các bước xử lý:**
1. ✅ Set `updatingOrderId` để hiển thị loading
2. ✅ Gọi API `cancelOrder` từ `adminOrders.js`
3. ✅ Hiển thị toast success
4. ✅ Refresh danh sách đơn hàng
5. ❌ Nếu lỗi: Hiển thị toast error
6. ✅ Tắt loading state

---

### **BƯỚC 4: Gọi API từ Frontend**

**File:** `frontend/src/api/adminOrders.js`

```javascript
export async function cancelOrder(id, data) {
  return await axiosClient.put(`admin/orders/${id}/cancel`, data);
}
```

**Request:**
- **Method:** `PUT`
- **URL:** `/api/admin/orders/:id/cancel`
- **Body:** `{ adminNote: "Lý do hủy..." }` (optional)

**Response (Success):**
```json
{
  "message": "Hủy đơn hàng thành công",
  "order": {
    "id": 15,
    "orderNumber": "00620251105001",
    "status": "CANCELLED",
    "paymentStatus": "FAILED",
    ...
  }
}
```

**Response (Error):**
```json
{
  "message": "Chỉ có thể hủy đơn hàng ở trạng thái PENDING hoặc CONFIRMED"
}
```

---

### **BƯỚC 5: Backend xử lý hủy đơn**

**File:** `backend/controller/adminOrderController.js`

#### **5.1. Validate đơn hàng**

```javascript
// Kiểm tra đơn hàng có tồn tại không
const currentOrder = await prisma.order.findUnique({ where: { id } });
if (!currentOrder) {
  return res.status(404).json({ message: 'Đơn hàng không tồn tại' });
}

// Kiểm tra trạng thái có thể hủy không
if (currentOrder.status !== 'PENDING' && currentOrder.status !== 'CONFIRMED') {
  return res.status(400).json({ 
    message: `Chỉ có thể hủy đơn hàng ở trạng thái PENDING hoặc CONFIRMED` 
  });
}
```

#### **5.2. Thực hiện hủy đơn trong Transaction**

```javascript
const updated = await prisma.$transaction(async (tx) => {
  // 1. Cập nhật trạng thái đơn hàng thành CANCELLED
  const order = await tx.order.update({
    where: { id },
    data: { 
      status: 'CANCELLED',
      paymentStatus: 'FAILED' // Cập nhật trạng thái thanh toán
    }
  });

  // 2. Lưu lịch sử thay đổi trạng thái
  await tx.orderStatusHistory.create({
    data: { orderId: id, status: 'CANCELLED' }
  });

  // 3. Hoàn trả tồn kho cho các sản phẩm
  for (const item of currentOrder.orderItems) {
    if (item.variantId) {
      // Hoàn trả tồn kho cho variant
      await tx.productVariant.update({
        where: { id: item.variantId },
        data: { stockQuantity: { increment: item.quantity } }
      });
    } else {
      // Hoàn trả tồn kho cho product
      await tx.product.update({
        where: { id: item.productId },
        data: { stockQuantity: { increment: item.quantity } }
      });
    }
  }

  // 4. Cập nhật adminNote nếu có
  if (adminNote) {
    await tx.order.update({
      where: { id },
      data: { adminNote }
    });
  }

  return order;
});
```

**Các thao tác trong Transaction:**
1. ✅ Cập nhật `status = 'CANCELLED'`
2. ✅ Cập nhật `paymentStatus = 'FAILED'`
3. ✅ Lưu lịch sử thay đổi trạng thái
4. ✅ Hoàn trả tồn kho cho tất cả sản phẩm trong đơn
5. ✅ Cập nhật `adminNote` nếu có

**Lưu ý:** Tất cả các thao tác này phải thành công, nếu một thao tác lỗi thì toàn bộ sẽ rollback.

#### **5.3. Gửi WebSocket thông báo**

```javascript
emitOrderStatusUpdate(currentOrder.userId, {
  orderId: updated.id,
  orderNumber: updated.orderNumber,
  status: 'CANCELLED'
});
```

**Mục đích:**
- Thông báo real-time cho user về việc đơn hàng bị hủy
- User nhận được thông báo ngay lập tức, không cần refresh trang

---

### **BƯỚC 6: Frontend nhận kết quả và cập nhật UI**

**File:** `frontend/src/pages/admin/order/useAdminOrders.js`

```javascript
// Sau khi API thành công
toast.success("Hủy đơn hàng thành công");
fetchOrders(); // Refresh danh sách đơn hàng
```

**Kết quả:**
- ✅ Hiển thị toast success
- ✅ Refresh danh sách đơn hàng
- ✅ Đơn hàng đã hủy sẽ không còn nút hủy (vì `canCancel = false`)
- ✅ Trạng thái đơn hàng thay đổi thành "Đã hủy" (màu đỏ)

---

## 📊 SƠ ĐỒ FLOW

```
┌─────────────────┐
│  Admin bấm nút  │
│     hủy đơn     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Modal xác nhận │
│   (Ant Design)  │
└────────┬────────┘
         │
    [OK] │ [Cancel]
         │
         ▼
┌─────────────────┐
│ handleCancelOrder│
│  (useAdminOrders)│
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  cancelOrder()  │
│  (adminOrders.js)│
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  PUT /admin/    │
│ orders/:id/cancel│
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ cancelOrder()   │
│ (Controller)    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Transaction:   │
│ 1. Update status│
│ 2. Update payment│
│ 3. Save history │
│ 4. Restore stock│
│ 5. Update note  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ WebSocket emit  │
│ (Real-time)     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Response JSON  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Frontend:      │
│ - Toast success │
│ - Refresh list  │
│ - Update UI     │
└─────────────────┘
```

---

## 🎨 UI/UX CONSIDERATIONS

### **1. Hiển thị nút hủy:**
- ✅ Chỉ hiển thị khi `canCancel = true`
- ✅ Màu đỏ (destructive) để cảnh báo
- ✅ Icon `FaTimes` (X) để dễ nhận biết
- ✅ Disabled khi đang xử lý (`updatingOrderId === record.id`)

### **2. Loading state:**
- ✅ Hiển thị "..." khi đang xử lý
- ✅ Disable nút khi đang xử lý
- ✅ Không cho phép bấm nhiều lần

### **3. Feedback:**
- ✅ Toast success khi thành công
- ✅ Toast error khi có lỗi
- ✅ Modal xác nhận trước khi hủy
- ✅ Real-time update qua WebSocket

---

## ⚠️ LƯU Ý QUAN TRỌNG

1. **Transaction:** Tất cả các thao tác (update status, restore stock, save history) phải thành công, nếu một thao tác lỗi thì toàn bộ sẽ rollback.

2. **Hoàn trả tồn kho:** Phải hoàn trả đúng số lượng đã trừ khi tạo đơn.

3. **WebSocket:** Gửi thông báo real-time để user biết đơn hàng bị hủy.

4. **Validation:** Kiểm tra trạng thái đơn hàng ở cả frontend và backend để đảm bảo an toàn.

5. **Error handling:** Xử lý lỗi đầy đủ và hiển thị thông báo rõ ràng cho admin.

---

## 🔍 DEBUGGING

Nếu có vấn đề, kiểm tra:

1. **Console logs:**
   - `🔴 Nút hủy được bấm` → Nút có hoạt động
   - `✅ Modal xác nhận OK` → Modal có hiển thị
   - `🔄 Bắt đầu hủy đơn hàng` → API có được gọi
   - `✅ Hủy đơn hàng thành công` → API thành công

2. **Network tab:**
   - Kiểm tra request `PUT /admin/orders/:id/cancel`
   - Xem response status code
   - Xem response body

3. **Backend logs:**
   - Kiểm tra logger trong `adminOrderController.js`
   - Xem có lỗi gì trong transaction không

---

## 📝 TÓM TẮT

**Flow đơn giản:**
1. Admin bấm nút hủy → Modal xác nhận
2. Admin bấm OK → Gọi API hủy đơn
3. Backend xử lý → Update status, restore stock, save history
4. Backend gửi WebSocket → User nhận thông báo
5. Frontend nhận response → Toast success, refresh list

**Điều kiện hủy:**
- ✅ Chỉ đơn ở trạng thái `PENDING` hoặc `CONFIRMED`
- ❌ Không thể hủy đơn đã `PROCESSING`, `DELIVERED`, hoặc `CANCELLED`


