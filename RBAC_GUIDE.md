# Role-Based Access Control (RBAC) - Implementation Guide

## Tổng quan

Hệ thống đã được cập nhật để hỗ trợ 3 roles:
- **ADMIN**: Full quyền tất cả chức năng
- **STAFF**: Chỉ xem Dashboard và quản lý Đơn hàng
- **USER**: Customer thông thường (không truy cập admin)

## Backend Changes

### 1. Auth Middleware (`backend/middleware/auth.js`)

#### New Middlewares:
```javascript
// Check ADMIN or STAFF
export const requireAdminOrStaff = (req, res, next) => {...}

// Check specific roles (generic)
export const requireRoles = (...allowedRoles) => {...}
```

#### Usage Examples:
```javascript
// Only ADMIN
router.get('/admin/users', authenticateToken, requireAdmin, getUsersController);

// ADMIN or STAFF
router.get('/admin/orders', authenticateToken, requireAdminOrStaff, getOrdersController);

// Flexible roles
router.get('/admin/reports', authenticateToken, requireRoles('ADMIN', 'STAFF'), getReportsController);
```

### 2. User Type Classification

```javascript
if (user.role === 'ADMIN') {
  user.userType = 'admin'
} else if (user.role === 'STAFF') {
  user.userType = 'staff'
} else {
  user.userType = 'user'
}
```

## Frontend Changes

### 1. Sidebar Menu Filtering (`frontend/src/layout/admin/Sidebar.jsx`)

Menu items are now filtered based on user role from `localStorage`:

```javascript
const allMenuItems = [
  {
    key: "/admin",
    icon: <FaHome />,
    label: <Link to="/admin">Trang chủ</Link>,
    roles: ['ADMIN', 'STAFF'],  // Both can access
  },
  {
    key: "/admin/orders",
    icon: <FaShoppingCart />,
    label: <Link to="/admin/orders">Quản lý đơn hàng</Link>,
    roles: ['ADMIN', 'STAFF'],  // Both can access
  },
  {
    key: "/admin/products",
    icon: <FaBoxOpen />,
    label: <Link to="/admin/products">Quản lý sản phẩm</Link>,
    roles: ['ADMIN'],  // Only ADMIN
  },
  // ...
];

// Filter based on userRole
const menuItems = useMemo(() => {
  return allMenuItems.filter(item => item.roles.includes(userRole));
}, [userRole]);
```

### 2. Role Detection

```javascript
const userRole = useMemo(() => {
  try {
    const userData = localStorage.getItem('user');
    if (userData) {
      const user = JSON.parse(userData);
      return user.role || 'USER';
    }
  } catch (e) {
    console.error('Error parsing user data:', e);
  }
  return 'USER';
}, []);
```

## Permissions Matrix

| Feature | ADMIN | STAFF | USER |
|---------|-------|-------|------|
| Dashboard | ✅ | ✅ | ❌ |
| Quản lý đơn hàng | ✅ | ✅ | ❌ |
| Quản lý sản phẩm | ✅ | ❌ | ❌ |
| Quản lý người dùng | ✅ | ❌ | ❌ |
| Quản lý danh mục | ✅ | ❌ | ❌ |
| Quản lý thương hiệu | ✅ | ❌ | ❌ |
| Quản lý biến thể | ✅ | ❌ | ❌ |
| Quản lý banner | ✅ | ❌ | ❌ |
| Quản lý mã giảm giá | ✅ | ❌ | ❌ |

## Testing

### 1. Create STAFF User

```bash
cd backend
node scripts/create-staff-user.js
```

Default credentials:
- Email: `staff@example.com`
- Password: `Staff@123`
- Role: `STAFF`

### 2. Login & Verify

1. Login với STAFF credentials
2. Verify menu chỉ hiển thị:
   - ✅ Trang chủ (Dashboard)
   - ✅ Quản lý đơn hàng
3. Try direct access `/admin/products` → Should get 403 Forbidden

### 3. Test Backend Protection

```bash
# Get token from STAFF login
TOKEN="your_staff_token"

# Should work (Dashboard)
curl -H "Authorization: Bearer $TOKEN" http://localhost:5000/api/admin/dashboard

# Should work (Orders)
curl -H "Authorization: Bearer $TOKEN" http://localhost:5000/api/admin/orders

# Should fail 403 (Products - ADMIN only)
curl -H "Authorization: Bearer $TOKEN" http://localhost:5000/api/admin/products
```

## Migration Notes

### If Database Doesn't Have STAFF Role Yet

Update Prisma schema:

```prisma
enum Role {
  USER
  ADMIN
  STAFF  // Add this
}
```

Then run:
```bash
cd backend
npx prisma db push
# or
npx prisma migrate dev --name add_staff_role
```

## Security Considerations

1. **Frontend hiding is NOT security** - it's UX only
2. **Backend middleware is the real protection**
3. Always apply `requireAdmin` or `requireAdminOrStaff` on sensitive routes
4. Never trust role from frontend - always check in backend

## Future Enhancements

### More Granular Permissions

```javascript
const permissions = {
  'view_dashboard': ['ADMIN', 'STAFF'],
  'manage_orders': ['ADMIN', 'STAFF'],
  'edit_order_status': ['ADMIN', 'STAFF'],
  'cancel_order': ['ADMIN'],  // Only ADMIN can cancel
  'manage_products': ['ADMIN'],
  'view_analytics': ['ADMIN', 'STAFF'],
  // ...
};

// Middleware
export const requirePermission = (permission) => {
  return (req, res, next) => {
    if (!permissions[permission].includes(req.user.role)) {
      return res.status(403).json({ message: 'No permission' });
    }
    next();
  };
};
```

### Per-Route Fine Control

```javascript
// STAFF can view orders, but only ADMIN can delete
router.get('/admin/orders', authenticateToken, requireAdminOrStaff, listOrders);
router.post('/admin/orders', authenticateToken, requireAdminOrStaff, createOrder);
router.put('/admin/orders/:id', authenticateToken, requireAdminOrStaff, updateOrder);
router.delete('/admin/orders/:id', authenticateToken, requireAdmin, deleteOrder); // Only ADMIN
```

## Troubleshooting

### Menu không filter

- Check `localStorage.getItem('user')` có chứa `role` field không
- Verify role value: `'ADMIN'`, `'STAFF'`, `'USER'` (case-sensitive)
- Clear localStorage và login lại

### 403 Forbidden ngay cả khi đúng role

- Check backend middleware stack order
- Verify `authenticateToken` chạy trước `requireAdmin`/`requireAdminOrStaff`
- Log `req.user.role` trong middleware

### Token không có role info

- Verify JWT payload khi generate token
- Check `user.role` được select từ database
- Regenerate token sau khi update role

## Contact & Support

Nếu cần customize permissions thêm, check:
1. `backend/middleware/auth.js` - Add new middleware
2. `frontend/src/layout/admin/Sidebar.jsx` - Update menu items
3. Apply middleware to routes cần protect
