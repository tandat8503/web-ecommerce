# 🔔 Luồng Socket Frontend - Category (Danh Mục)

## 📋 Tổng Quan

**Mục đích:** Khi admin CRUD category → User thấy thay đổi ngay trên UI (không cần reload)

---

## 🔄 Luồng Hoạt Động Tổng Quan

```
Admin CRUD category
  ↓
Backend: emitCategoryCreated/Updated/Deleted() → io.emit('category:created', {...})
  ↓
Socket.IO tự động gửi đến TẤT CẢ client đang kết nối
  ↓
Frontend: socket.on('category:created', callback) nhận được
  ↓
Callback được gọi với data từ backend → Cập nhật state
  ↓
React re-render → UI tự động cập nhật ✅
```

---

## 📝 Files Và Chức Năng

### 1. **Frontend Socket** (`frontend/src/utils/socket.js`)

**Chức năng:** Lắng nghe event từ backend và gọi callback

```javascript
// Lắng nghe category mới → Gọi callback
export const onCategoryCreated = (callback) => {
  if (!socket) return () => {};
  socket.on('category:created', (data) => {
    callback(data); // ← Gọi callback với data từ backend
  });
  return () => socket.off('category:created', callback); // Cleanup
};

// Lắng nghe category cập nhật → Gọi callback
export const onCategoryUpdated = (callback) => {
  if (!socket) return () => {};
  socket.on('category:updated', (data) => {
    callback(data);
  });
  return () => socket.off('category:updated', callback);
};

// Lắng nghe category xóa → Gọi callback
export const onCategoryDeleted = (callback) => {
  if (!socket) return () => {};
  socket.on('category:deleted', (data) => {
    callback(data);
  });
  return () => socket.off('category:deleted', callback);
};
```

**Giải thích:**
- `socket.on('category:created', callback)` → Đăng ký listener
- Khi backend emit `'category:created'` → Socket.IO tự động gọi `callback(data)`
- `return () => socket.off(...)` → Hàm cleanup để unsubscribe

---

### 2. **Component Sử Dụng Socket**

#### A. `Categories.jsx` - Trang danh sách category

```javascript
useEffect(() => {
  // Category mới → Thêm vào danh sách (nếu isActive = true)
  const unsubscribeCreated = onCategoryCreated((newCategory) => {
    if (newCategory.isActive) {
      setCategories(prev => {
        const exists = prev.some(cat => cat.id === newCategory.id);
        if (exists) {
          // Đã có → Cập nhật
          return prev.map(cat => cat.id === newCategory.id ? newCategory : cat);
        } else {
          // Chưa có → Thêm mới
          return [newCategory, ...prev];
        }
      });
    }
  });

  // Category cập nhật → Cập nhật hoặc xóa (nếu bị tắt)
  const unsubscribeUpdated = onCategoryUpdated((updatedCategory) => {
    setCategories(prev => {
      const exists = prev.some(cat => cat.id === updatedCategory.id);
      if (exists) {
        // Có trong state → Cập nhật và filter
        return prev
          .map(cat => cat.id === updatedCategory.id ? updatedCategory : cat)
          .filter(cat => cat.isActive); // Xóa nếu isActive = false
      } else {
        // Không có trong state → Thêm lại nếu isActive = true
        if (updatedCategory.isActive) {
          return [updatedCategory, ...prev];
        }
        return prev;
      }
    });
  });

  // Category xóa → Xóa khỏi danh sách
  const unsubscribeDeleted = onCategoryDeleted((data) => {
    setCategories(prev => prev.filter(cat => cat.id !== data.id));
  });

  return () => {
    unsubscribeCreated();
    unsubscribeUpdated();
    unsubscribeDeleted();
  };
}, []);
```

---

#### B. `useUserHeader.js` - Header có dropdown category

**Logic tương tự Categories.jsx** - Cập nhật categories trong header dropdown

---

#### C. `Navbar.jsx` - Navbar có menu category

**Logic tương tự Categories.jsx** - Cập nhật menu items trong navbar

---

#### D. `CategoryPage.jsx` - Trang chi tiết category

```javascript
useEffect(() => {
  // Lắng nghe category được cập nhật (tắt/bật)
  const unsubscribe = onCategoryUpdated((updatedCategory) => {
    // Chỉ cập nhật nếu là category hiện tại
    if (updatedCategory.slug === slug || updatedCategory.id === category.id) {
      setCategory(prev => ({ ...prev, ...updatedCategory }));
      
      // Nếu category bị tắt → Clear products và set error
      if (!updatedCategory.isActive) {
        setProducts([]);
        setTotal(0);
        setError("Danh mục này đã bị tạm dừng");
      }
    }
  });
  
  return unsubscribe;
}, [category, slug]);
```

---

## 🎯 Ví Dụ Cụ Thể

### Scenario 1: Admin Tạo Category Mới

**1. Admin tạo category:**
```
Admin → POST /api/admin/categories
  ↓
Backend: prisma.category.create(...)
  ↓
Backend: emitCategoryCreated(category) → io.emit('category:created', {...})
```

**2. Frontend nhận event:**
```
Socket.IO nhận 'category:created'
  ↓
socket.on('category:created', callback) được trigger
  ↓
Callback trong Categories.jsx được gọi với data category
  ↓
setCategories(...) → State được cập nhật
  ↓
UI tự động re-render → Category mới xuất hiện ✅
```

---

### Scenario 2: Admin Tắt Category

**1. Admin tắt category (`isActive = false`):**
```
Admin → PUT /api/admin/categories/:id (isActive = false)
  ↓
Backend: prisma.category.update(...)
  ↓
Backend: emitCategoryUpdated(category) → io.emit('category:updated', {...})
```

**2. Frontend nhận event:**
```
Socket.IO nhận 'category:updated'
  ↓
Callback được gọi với updatedCategory = { id: 5, isActive: false, ... }
  ↓
setCategories(prev => prev.filter(cat => cat.isActive)) 
  ↓
Category bị xóa khỏi danh sách → UI tự động cập nhật ✅
```

---

## 🔍 Chi Tiết Từng Bước

### Bước 1: Backend Emit Event

```javascript
// backend/config/socket.js
emitCategoryCreated(categoryData) {
  io.emit('category:created', {
    id: categoryData.id,
    name: categoryData.name,
    slug: categoryData.slug,
    isActive: categoryData.isActive,
    ...
  });
}
```

---

### Bước 2: Frontend Socket Lắng Nghe

```javascript
// frontend/src/utils/socket.js
export const onCategoryCreated = (callback) => {
  socket.on('category:created', (data) => {
    // data = { id, name, slug, isActive, ... } từ backend
    callback(data); // ← Gọi callback với data
  });
};
```

---

### Bước 3: Component Nhận Và Xử Lý

```javascript
// frontend/src/components/user/Categories.jsx
useEffect(() => {
  const unsubscribeCreated = onCategoryCreated((newCategory) => {
    // newCategory = { id: 5, name: "Danh mục mới", isActive: true, ... }
    
    if (newCategory.isActive) {
      setCategories(prev => {
        const exists = prev.find(cat => cat.id === newCategory.id);
        if (exists) {
          // Cập nhật
          return prev.map(cat => cat.id === newCategory.id ? newCategory : cat);
        } else {
          // Thêm mới
          return [newCategory, ...prev];
        }
      });
    }
  });
  
  return () => unsubscribeCreated();
}, []);
```

---

## 📊 Sơ Đồ Luồng Chi Tiết

```
┌─────────────────┐
│   Backend       │
│ emitCategory    │
│ Created(...)    │
└────────┬─────────┘
         │
         │ io.emit('category:created', {...})
         │
         ▼
┌─────────────────┐
│  Socket.IO      │
│  Server         │
└────────┬─────────┘
         │
         │ WebSocket
         │
         ▼
┌─────────────────┐
│  Socket.IO      │
│  Client (FE)    │
│  socket.on(...) │
└────────┬─────────┘
         │
         │ callback(newCategory)
         │
         ▼
┌─────────────────┐
│ Categories.jsx  │
│ Component       │
│ setCategories   │
│ (...)           │
└────────┬─────────┘
         │
         │ React re-render
         │
         ▼
┌─────────────────┐
│   UI Update     │
│   ✅ Category   │
│   xuất hiện     │
└─────────────────┘
```

---

## 🎯 Các Component Sử Dụng Socket Category

| Component | Chức Năng |
|-----------|-----------|
| `Categories.jsx` | Trang danh sách category → Cập nhật grid |
| `useUserHeader.js` | Header dropdown → Cập nhật menu |
| `Navbar.jsx` | Navbar menu → Cập nhật menu items |
| `CategoryPage.jsx` | Trang chi tiết → Cập nhật category hiện tại |

---

## ⚠️ Lưu Ý Quan Trọng

### 1. Tên Event Phải Khớp

**Backend:**
```javascript
io.emit('category:created', {...}); // ← Tên event
```

**Frontend:**
```javascript
socket.on('category:created', callback); // ← Phải khớp chính xác!
```

**⚠️ Nếu không khớp → Event không được nhận!**

---

### 2. Cleanup Function

**Tại sao cần cleanup?**
- Tránh memory leak
- Tránh listener bị gọi nhiều lần khi component re-render
- Unsubscribe khi component unmount

**Cách hoạt động:**
```javascript
useEffect(() => {
  const unsubscribe = onCategoryCreated(callback);
  
  return () => {
    unsubscribe(); // ← Gọi hàm cleanup
    // → socket.off('category:created', callback)
    // → Ngừng lắng nghe event
  };
}, []);
```

---

### 3. Logic Xử Lý `isActive`

**Category mới:**
- `isActive = true` → Thêm vào danh sách
- `isActive = false` → Không thêm (chỉ admin thấy)

**Category cập nhật:**
- `isActive = true` → Cập nhật hoặc thêm lại vào danh sách
- `isActive = false` → Xóa khỏi danh sách (ẩn khỏi user)

**Category xóa:**
- Xóa khỏi danh sách ngay lập tức

---

## ✅ Tóm Tắt

1. **Backend emit event** → `io.emit('category:created', data)`
2. **Frontend đăng ký listener** → `socket.on('category:created', callback)`
3. **Khi nhận event** → Socket.IO tự động gọi `callback(data)`
4. **Callback cập nhật state** → `setCategories(...)`
5. **React re-render** → UI tự động cập nhật ✅
6. **Cleanup khi unmount** → `unsubscribe()` để ngừng lắng nghe

---

## 🎉 Kết Quả

**User thấy category mới/cập nhật/xóa ngay lập tức mà không cần reload trang!** 🚀

**Áp dụng cho:**
- ✅ Trang danh sách category (`Categories.jsx`)
- ✅ Header dropdown (`useUserHeader.js`)
- ✅ Navbar menu (`Navbar.jsx`)
- ✅ Trang chi tiết category (`CategoryPage.jsx`)

