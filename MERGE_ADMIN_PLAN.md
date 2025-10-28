# 📋 KẾ HOẠCH TÍCH HỢP ADMIN VÀO USER

## 🎯 **MỤC TIÊU**
Tích hợp bảng `AdminUser` vào bảng `User` để tạo một hệ thống quản lý user thống nhất.

## 🔄 **CHANGES SUMMARY**

### **1. Schema Changes**
- ❌ Xóa bảng `AdminUser`
- ✅ Thêm field `role` vào `User` với enum `UserRole`
- ✅ Enum mới: `UserRole { CUSTOMER, ADMIN }`

### **2. Database Migration Strategy**
```sql
-- Bước 1: Backup dữ liệu admin_users
CREATE TABLE admin_users_backup AS SELECT * FROM admin_users;

-- Bước 2: Thêm cột role vào bảng users
ALTER TABLE users ADD COLUMN role ENUM('CUSTOMER', 'ADMIN') DEFAULT 'CUSTOMER';

-- Bước 3: Migrate dữ liệu admin sang users
INSERT INTO users (email, password, first_name, last_name, role, is_active, created_at, updated_at)
SELECT email, password, first_name, last_name, 
       'ADMIN' AS role,  -- Tất cả admin_users → ADMIN role
       is_active, created_at, updated_at
FROM admin_users;

-- Bước 4: Xóa bảng admin_users
DROP TABLE admin_users;
```

## 📝 **CODE CHANGES**

### **1. Authentication Middleware**
```javascript
// backend/middleware/auth.js
// CŨ (2 queries):
const admin = await prisma.adminUser.findUnique({...});
const user = await prisma.user.findUnique({...});

// MỚI (1 query):
const user = await prisma.user.findUnique({
  where: { id },
  select: {
    id: true,
    email: true,
    firstName: true,
    lastName: true,
    role: true,  // ← Thêm role field
    isActive: true
  }
});

// Phân quyền dựa trên role
if (user.role === 'ADMIN') {
  req.user = user;
  req.user.userType = 'admin';
} else {
  req.user = user;
  req.user.userType = 'user';
}
```

### **2. Login Controller**
```javascript
// backend/controller/authController.js
// CŨ (2 queries):
let user = await prisma.adminUser.findUnique({...});
if (!user) user = await prisma.user.findUnique({...});

// MỚI (1 query):
const user = await prisma.user.findUnique({
  where: { email: email.toLowerCase() }
});
// Check role để phân biệt admin/user
```

### **3. RequireAdmin Middleware**
```javascript
// backend/middleware/auth.js
export const requireAdmin = (req, res, next) => {
  const { role } = req.user;
  
  // Chỉ ADMIN mới có quyền truy cập
  if (role === 'ADMIN') return next();
  
  // CUSTOMER không có quyền admin
  return res.status(403).json({
    success: false,
    message: 'Không có quyền truy cập. Chỉ ADMIN mới được phép.'
  });
};
```

## 🔒 **PHÂN QUYỀN (Authorization)**

### **Role-Based Access Control**
```javascript
// ADMIN: Full quyền
- Cập nhật tất cả settings
- Quản lý admin khác
- Xóa dữ liệu
- Export dữ liệu

// STAFF: Quyền hạn chế
- Quản lý sản phẩm, đơn hàng
- Không được xóa admin khác
- Không được thay đổi settings hệ thống

// CUSTOMER: Chỉ có quyền user
- Xem sản phẩm
- Đặt hàng
- Quản lý profile
- Không được truy cập admin panel
```

## 🎯 **LỢI ÍCH**

### **✅ Ưu điểm:**
1. **Đơn giản hóa** - 1 bảng thay vì 2
2. **Dễ maintain** - Code gọn hơn, logic tập trung
3. **Linh hoạt** - Dễ thêm role mới (SUPER_ADMIN, MODERATOR...)
4. **Scalable** - Có thể thêm phân quyền chi tiết hơn
5. **Chuẩn** - Theo best practices của industry

### **⚠️ Lưu ý:**
1. **Migration an toàn** - Backup trước khi migrate
2. **Test kỹ** - Đảm bảo authentication vẫn hoạt động
3. **Update seed** - Thêm data mẫu cho role STAFF/ADMIN
4. **Update frontend** - Điều chỉnh logic phân quyền UI

## 📋 **TODO LIST**

### **Backend:**
- [x] Update schema.prisma
- [ ] Create migration script
- [ ] Update authentication middleware
- [ ] Update auth controller
- [ ] Update adminUserController → userController
- [ ] Update all admin routes
- [ ] Test authentication
- [ ] Update seed data

### **Frontend:**
- [ ] Update admin middleware
- [ ] Update role-based UI
- [ ] Test login/logout
- [ ] Test admin panel access

### **Database:**
- [ ] Backup database
- [ ] Run migration
- [ ] Verify data integrity
- [ ] Test all admin features

## 🚀 **IMPLEMENTATION ORDER**

### **Phase 1: Database (An toàn nhất)**
1. Backup database
2. Create migration
3. Test migration on dev
4. Run migration on production

### **Phase 2: Backend**
1. Update schema
2. Update middleware
3. Update controllers
4. Update routes
5. Test API endpoints

### **Phase 3: Frontend**
1. Update auth logic
2. Update admin UI
3. Test user experience
4. Deploy

## 💡 **VÍ DỤ SỬ DỤNG**

### **Đăng nhập:**
```javascript
// User đăng nhập với email
const user = await prisma.user.findUnique({
  where: { email }
});

// Check role để redirect
if (user.role === 'ADMIN' || user.role === 'STAFF') {
  // Redirect to admin panel
  return res.json({ 
    token, 
    user, 
    redirect: '/admin/dashboard' 
  });
} else {
  // Redirect to user dashboard
  return res.json({ 
    token, 
    user, 
    redirect: '/user/profile' 
  });
}
```

### **Middleware phân quyền:**
```javascript
// Admin route
router.get('/admin/users', 
  authenticateToken,  // Check logged in
  requireAdmin,      // Check role === ADMIN || STAFF
  getUsers
);
```

**Bạn muốn tôi bắt đầu implement migration này không?** 🚀

