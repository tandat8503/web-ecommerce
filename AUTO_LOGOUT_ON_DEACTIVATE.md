# 🔐 Tự Động Logout Khi Admin Vô Hiệu Hóa Tài Khoản

## 🎯 Yêu Cầu

Khi admin vô hiệu hóa tài khoản (isActive = false), user đang đăng nhập với tài khoản đó phải **bị logout ngay lập tức**.

---

## ✅ Giải Pháp Đã Áp Dụng

### 1. Backend: Emit Socket Event

**File:** `backend/config/socket.js`

**Thêm hàm mới:**
```javascript
/**
 * HÀM 7: emitUserDeactivated()
 * 
 * CHỨC NĂNG: Gửi thông báo khi user bị vô hiệu hóa
 * 
 * @param {number} userId - ID của user bị vô hiệu hóa
 */
export const emitUserDeactivated = (userId) => {
  if (!io) {
    console.warn('⚠️ Socket.IO chưa được khởi tạo');
    return;
  }

  const userRoom = `user:${userId}`;
  
  // Gửi event đến room của user đó
  io.to(userRoom).emit('user:deactivated', {
    userId,
    message: 'Tài khoản của bạn đã bị vô hiệu hóa',
    deactivatedAt: new Date().toISOString()
  });
};
```

---

### 2. Backend Controller: Gọi Emit Khi Vô Hiệu Hóa

**File:** `backend/controller/adminUserController.js`

**Thêm import:**
```javascript
import { emitUserDeactivated } from "../config/socket.js";
```

**Thêm emit sau khi update:**
```javascript
const updatedUser = await prisma.user.update({
  where: { id: parseInt(id) },
  data: updateData,
});

// Nếu vô hiệu hóa tài khoản (isActive = false) → Gửi socket event để user logout
if (isActive === false && user.isActive === true) {
  emitUserDeactivated(parseInt(id));
}

res.json({
  code: 200,
  message: "Cập nhật user thành công",
  data: userResponse(updatedUser),
});
```

**Lưu ý:** Chỉ emit khi **chuyển từ active → inactive** (không emit khi đã inactive rồi)

---

### 3. Frontend: Socket Listener

**File:** `frontend/src/utils/socket.js`

**Thêm hàm listener:**
```javascript
/**
 * HÀM 11: onUserDeactivated(callback)
 * 
 * MỤC ĐÍCH:
 * - Lắng nghe event 'user:deactivated' từ backend
 * - Khi user bị vô hiệu hóa, gọi callback để logout
 */
export const onUserDeactivated = (callback) => {
  if (!socket) {
    console.warn('⚠️ Socket chưa được khởi tạo');
    return () => {};
  }

  socket.on('user:deactivated', (data) => {
    callback(data);
  });

  return () => {
    socket.off('user:deactivated', callback);
  };
};
```

---

### 4. Frontend: InitUserSocket - Logout Khi Nhận Event

**File:** `frontend/src/components/InitUserSocket.jsx`

**Thêm listener và logout logic:**
```javascript
import { useNavigate } from "react-router-dom";
import { onUserDeactivated } from "@/utils/socket";
import { logout } from "@/api/auth";

export default function InitUserSocket() {
  const navigate = useNavigate();

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user'));
    
    // Khởi tạo socket cho cả guest và user
    const socket = initializeSocket(user?.id || null);

    if (user?.id) {
      // Lắng nghe event user bị vô hiệu hóa
      const unsubscribeDeactivated = onUserDeactivated((data) => {
        // Kiểm tra xem có phải user hiện tại không
        if (data.userId === user.id) {
          // Hiển thị thông báo
          toast.error(data.message || "Tài khoản của bạn đã bị vô hiệu hóa", {
            autoClose: 3000,
            position: "top-right"
          });

          // Logout ngay lập tức
          logout().finally(() => {
            // Clear localStorage
            localStorage.removeItem('user');
            localStorage.removeItem('token');
            
            // Redirect về trang chủ
            navigate('/');
            
            // Reload để clear tất cả state
            window.location.reload();
          });
        }
      });

      return () => {
        unsubscribeDeactivated();
      };
    }
  }, [navigate]);
}
```

---

## 🎯 Flow Hoàn Chỉnh

### Admin Vô Hiệu Hóa User:

```
1. Admin click "Vô hiệu hóa" trên user ID = 5
   ↓
2. Backend: updateUser() → DB update (isActive = false)
   ↓
3. Backend: emitUserDeactivated(5)
   ↓
4. Socket: io.to("user:5").emit('user:deactivated', {...})
   ↓
5. User 5 (đang đăng nhập) nhận event qua socket
   ↓
6. Frontend: onUserDeactivated callback chạy
   ↓
7. Kiểm tra: data.userId === user.id? → Đúng
   ↓
8. Hiển thị toast: "Tài khoản của bạn đã bị vô hiệu hóa"
   ↓
9. Gọi logout() API
   ↓
10. Clear localStorage (user, token)
   ↓
11. Redirect về trang chủ (/)
   ↓
12. Reload trang để clear tất cả state
   ↓
13. User bị logout NGAY LẬP TỨC ✅
```

---

## 🧪 Test

### Test Case 1: Vô Hiệu Hóa User Đang Đăng Nhập

**Bước:**
1. User A đăng nhập vào trang user
2. Mở admin page ở tab khác
3. Admin vô hiệu hóa User A
4. Quan sát tab user của User A

**Kết quả mong đợi:**
- ✅ Toast hiển thị: "Tài khoản của bạn đã bị vô hiệu hóa"
- ✅ User A bị logout NGAY LẬP TỨC
- ✅ Redirect về trang chủ
- ✅ Không thể truy cập các trang cần đăng nhập

---

### Test Case 2: Vô Hiệu Hóa User Không Đang Đăng Nhập

**Bước:**
1. User B KHÔNG đăng nhập (hoặc đăng nhập ở máy khác)
2. Admin vô hiệu hóa User B
3. User B sau đó đăng nhập

**Kết quả mong đợi:**
- ✅ User B không thể đăng nhập (API trả về lỗi isActive = false)
- ✅ Không có socket event nào (vì user không online)

---

### Test Case 3: Vô Hiệu Hóa User Khác (Không Phải User Hiện Tại)

**Bước:**
1. User A đăng nhập
2. Admin vô hiệu hóa User B (khác User A)
3. Quan sát tab user của User A

**Kết quả mong đợi:**
- ✅ User A KHÔNG bị logout
- ✅ User A vẫn hoạt động bình thường
- ✅ Socket event chỉ gửi đến User B (không phải User A)

---

## ⚠️ Lưu Ý Quan Trọng

### 1. Chỉ Emit Khi Chuyển Từ Active → Inactive

**Code:**
```javascript
if (isActive === false && user.isActive === true) {
  emitUserDeactivated(parseInt(id));
}
```

**Lý do:**
- Nếu user đã inactive rồi → Không cần emit
- Chỉ emit khi **chuyển trạng thái** từ active → inactive

---

### 2. Kiểm Tra User ID Trước Khi Logout

**Code:**
```javascript
if (data.userId === user.id) {
  // Logout
}
```

**Lý do:**
- Chỉ logout user **bị vô hiệu hóa**
- User khác không bị ảnh hưởng

---

### 3. Reload Sau Khi Logout

**Code:**
```javascript
logout().finally(() => {
  localStorage.removeItem('user');
  localStorage.removeItem('token');
  navigate('/');
  window.location.reload(); // ← Quan trọng!
});
```

**Lý do:**
- Clear tất cả state trong memory
- Đảm bảo không còn dữ liệu user cũ
- Reset toàn bộ ứng dụng

---

### 4. Socket Room

**Backend:**
```javascript
const userRoom = `user:${userId}`;
io.to(userRoom).emit('user:deactivated', {...});
```

**Frontend:**
```javascript
// User đã join room khi initializeSocket(userId)
socket.emit('join:user', userId);
```

**Lý do:**
- Event chỉ gửi đến **user cụ thể**
- User khác không nhận được
- Bảo mật và hiệu quả

---

## 🔍 Debugging

### Nếu User Không Bị Logout

**Kiểm tra:**

1. **Socket có kết nối không?**
```javascript
// Console nên có:
✅ Socket.IO connected
👤 Joined user room { userId: X }
```

2. **Backend có emit không?**
```javascript
// Backend controller:
if (isActive === false && user.isActive === true) {
  emitUserDeactivated(parseInt(id)); // ← Phải có dòng này
}
```

3. **Frontend có listener không?**
```javascript
// InitUserSocket.jsx:
const unsubscribeDeactivated = onUserDeactivated((data) => {
  console.log('🔴 Nhận event deactivated:', data); // DEBUG
  // ...
});
```

4. **User ID có khớp không?**
```javascript
console.log('User hiện tại:', user.id);
console.log('User bị deactivate:', data.userId);
if (data.userId === user.id) {
  console.log('✅ Khớp, sẽ logout');
}
```

---

## ✅ Checklist

- [x] Thêm `emitUserDeactivated()` trong backend socket.js
- [x] Gọi `emitUserDeactivated()` trong adminUserController khi vô hiệu hóa
- [x] Thêm `onUserDeactivated()` trong frontend socket.js
- [x] Thêm listener trong InitUserSocket.jsx
- [x] Kiểm tra user ID trước khi logout
- [x] Clear localStorage và redirect
- [x] Reload trang sau logout
- [x] Test: User đang login bị logout ngay
- [x] Test: User khác không bị ảnh hưởng

---

## 🎉 Kết Quả

**Giờ thì:**
- ✅ Admin vô hiệu hóa user → User bị logout NGAY LẬP TỨC
- ✅ Toast thông báo rõ ràng
- ✅ Redirect về trang chủ
- ✅ Clear tất cả state
- ✅ User khác không bị ảnh hưởng

**HOÀN HẢO!** 🎉

---

## 📝 Tóm Tắt

| Hành động | Backend | Frontend | Kết quả |
|-----------|---------|----------|---------|
| **Admin vô hiệu hóa user** | Emit socket | Nhận event | User logout ngay ✅ |
| **User đang login** | - | Lắng nghe socket | Nhận event → Logout ✅ |
| **User không login** | Emit socket | Không nhận | Không ảnh hưởng ✅ |
| **User khác** | - | Lắng nghe socket | Không nhận event ✅ |

**Nguyên tắc:**
- Socket room = `user:${userId}` → Chỉ user đó nhận event
- Kiểm tra `data.userId === user.id` → Chỉ logout user bị vô hiệu hóa
- Reload sau logout → Clear tất cả state

