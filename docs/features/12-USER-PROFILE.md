# User Profile Management - Quản Lý Hồ Sơ Người Dùng

## 📋 Tổng Quan

Hệ thống quản lý hồ sơ người dùng bao gồm:
- Xem và chỉnh sửa thông tin cá nhân
- Đổi mật khẩu
- Upload/Update avatar
- Quản lý địa chỉ giao hàng
- Xem lịch sử đơn hàng
- Xem lịch sử đánh giá
- Quản lý wishlist
- Xem danh sách coupon

---

## 🗄️ Database Schema

### User Model (Already exists)
```prisma
model User {
  id            Int       @id @default(autoincrement())
  email         String    @unique @db.VarChar(255)
  password      String?   @db.VarChar(255)
  firstName     String    @map("first_name") @db.VarChar(100)
  lastName      String    @map("last_name") @db.VarChar(100)
  phone         String?   @db.VarChar(20)
  avatar        String?   @db.Text
  role          UserRole  @default(CUSTOMER)
  
  // OAuth
  googleId      String?   @unique @map("google_id") @db.VarChar(255)
  
  createdAt     DateTime  @default(now()) @map("created_at")
  updatedAt     DateTime  @updatedAt @map("updated_at")
  
  // Relations
  addresses     Address[]
  orders        Order[]
  reviews       ProductReview[]
  wishlist      Wishlist[]
  notifications Notification[]
  userCoupons   UserCoupon[]
  
  @@map("users")
}

model Address {
  id            Int      @id @default(autoincrement())
  userId        Int      @map("user_id")
  user          User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  recipientName String   @map("recipient_name") @db.VarChar(100)
  phone         String   @db.VarChar(20)
  addressLine   String   @map("address_line") @db.Text
  
  // GHN fields
  city          String   @db.VarChar(100)
  district      String   @db.VarChar(100)
  ward          String   @db.VarChar(100)
  provinceId    Int?     @map("province_id")
  districtId    Int?     @map("district_id")
  wardCode      String?  @map("ward_code") @db.VarChar(20)
  
  isDefault     Boolean  @default(false) @map("is_default")
  
  createdAt     DateTime @default(now()) @map("created_at")
  updatedAt     DateTime @updatedAt @map("updated_at")
  
  @@map("addresses")
  @@index([userId])
}
```

---

## 🔧 Backend Implementation

### 1. Controller: `controller/userController.js`

#### Get Profile
```javascript
import prisma from '../config/prisma.js';
import bcrypt from 'bcryptjs';
import { uploadToCloudinary, deleteFromCloudinary } from '../services/cloudinaryService.js';
import logger from '../utils/logger.js';

export const getProfile = async (req, res) => {
  try {
    const userId = req.user.id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        avatar: true,
        role: true,
        createdAt: true,
        _count: {
          select: {
            orders: true,
            reviews: true,
            wishlist: true
          }
        }
      }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy người dùng'
      });
    }

    return res.json({
      success: true,
      data: user
    });
  } catch (error) {
    logger.error('Get profile error', { error: error.message });
    return res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy thông tin người dùng'
    });
  }
};
```

#### Update Profile
```javascript
export const updateProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { firstName, lastName, phone } = req.body;

    // Validate
    if (!firstName || !lastName) {
      return res.status(400).json({
        success: false,
        message: 'Họ và tên là bắt buộc'
      });
    }

    // Update user
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        firstName,
        lastName,
        phone: phone || null
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        avatar: true
      }
    });

    logger.info('Profile updated', { userId });

    return res.json({
      success: true,
      message: 'Cập nhật thông tin thành công',
      data: updatedUser
    });
  } catch (error) {
    logger.error('Update profile error', { error: error.message });
    return res.status(500).json({
      success: false,
      message: 'Lỗi khi cập nhật thông tin'
    });
  }
};
```

#### Change Password
```javascript
export const changePassword = async (req, res) => {
  try {
    const userId = req.user.id;
    const { currentPassword, newPassword } = req.body;

    // Validate
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng nhập đầy đủ thông tin'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Mật khẩu mới phải có ít nhất 6 ký tự'
      });
    }

    // Get user
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user.password) {
      return res.status(400).json({
        success: false,
        message: 'Tài khoản này đăng nhập bằng Google, không thể đổi mật khẩu'
      });
    }

    // Verify current password
    const isValidPassword = await bcrypt.compare(currentPassword, user.password);
    if (!isValidPassword) {
      return res.status(400).json({
        success: false,
        message: 'Mật khẩu hiện tại không đúng'
      });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword }
    });

    logger.info('Password changed', { userId });

    return res.json({
      success: true,
      message: 'Đổi mật khẩu thành công'
    });
  } catch (error) {
    logger.error('Change password error', { error: error.message });
    return res.status(500).json({
      success: false,
      message: 'Lỗi khi đổi mật khẩu'
    });
  }
};
```

#### Upload Avatar
```javascript
export const uploadAvatar = async (req, res) => {
  try {
    const userId = req.user.id;
    const file = req.file;

    if (!file) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng chọn file ảnh'
      });
    }

    // Get current user
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    // Delete old avatar from Cloudinary if exists
    if (user.avatar) {
      const publicId = user.avatar.split('/').pop().split('.')[0];
      await deleteFromCloudinary(`ecommerce/avatars/${publicId}`).catch(() => {});
    }

    // Upload new avatar
    const result = await uploadToCloudinary(file.buffer, 'avatars');

    // Update user
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { avatar: result.secure_url },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        avatar: true
      }
    });

    logger.info('Avatar uploaded', { userId });

    return res.json({
      success: true,
      message: 'Cập nhật ảnh đại diện thành công',
      data: updatedUser
    });
  } catch (error) {
    logger.error('Upload avatar error', { error: error.message });
    return res.status(500).json({
      success: false,
      message: 'Lỗi khi upload ảnh đại diện'
    });
  }
};
```

### 2. Address Controller: `controller/addressController.js`

#### Get User Addresses
```javascript
export const getUserAddresses = async (req, res) => {
  try {
    const userId = req.user.id;

    const addresses = await prisma.address.findMany({
      where: { userId },
      orderBy: [
        { isDefault: 'desc' },
        { createdAt: 'desc' }
      ]
    });

    return res.json({
      success: true,
      data: addresses
    });
  } catch (error) {
    logger.error('Get addresses error', { error: error.message });
    return res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy danh sách địa chỉ'
    });
  }
};
```

#### Create Address
```javascript
export const createAddress = async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      recipientName,
      phone,
      addressLine,
      city,
      district,
      ward,
      provinceId,
      districtId,
      wardCode,
      isDefault
    } = req.body;

    // Validate
    if (!recipientName || !phone || !addressLine || !city || !district || !ward) {
      return res.status(400).json({
        success: false,
        message: 'Thiếu thông tin bắt buộc'
      });
    }

    // If setting as default, unset other defaults
    if (isDefault) {
      await prisma.address.updateMany({
        where: { userId, isDefault: true },
        data: { isDefault: false }
      });
    }

    // Create address
    const address = await prisma.address.create({
      data: {
        userId,
        recipientName,
        phone,
        addressLine,
        city,
        district,
        ward,
        provinceId: provinceId ? Number(provinceId) : null,
        districtId: districtId ? Number(districtId) : null,
        wardCode: wardCode || null,
        isDefault: isDefault || false
      }
    });

    logger.info('Address created', { userId, addressId: address.id });

    return res.status(201).json({
      success: true,
      message: 'Thêm địa chỉ thành công',
      data: address
    });
  } catch (error) {
    logger.error('Create address error', { error: error.message });
    return res.status(500).json({
      success: false,
      message: 'Lỗi khi thêm địa chỉ'
    });
  }
};
```

#### Update Address
```javascript
export const updateAddress = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const updateData = req.body;

    // Check ownership
    const address = await prisma.address.findUnique({
      where: { id: Number(id) }
    });

    if (!address || address.userId !== userId) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy địa chỉ'
      });
    }

    // If setting as default, unset other defaults
    if (updateData.isDefault) {
      await prisma.address.updateMany({
        where: { userId, isDefault: true, id: { not: Number(id) } },
        data: { isDefault: false }
      });
    }

    // Update address
    const updatedAddress = await prisma.address.update({
      where: { id: Number(id) },
      data: updateData
    });

    return res.json({
      success: true,
      message: 'Cập nhật địa chỉ thành công',
      data: updatedAddress
    });
  } catch (error) {
    logger.error('Update address error', { error: error.message });
    return res.status(500).json({
      success: false,
      message: 'Lỗi khi cập nhật địa chỉ'
    });
  }
};
```

#### Delete Address
```javascript
export const deleteAddress = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    // Check ownership
    const address = await prisma.address.findUnique({
      where: { id: Number(id) }
    });

    if (!address || address.userId !== userId) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy địa chỉ'
      });
    }

    // Delete address
    await prisma.address.delete({
      where: { id: Number(id) }
    });

    logger.info('Address deleted', { userId, addressId: Number(id) });

    return res.json({
      success: true,
      message: 'Xóa địa chỉ thành công'
    });
  } catch (error) {
    logger.error('Delete address error', { error: error.message });
    return res.status(500).json({
      success: false,
      message: 'Lỗi khi xóa địa chỉ'
    });
  }
};
```

### 3. Routes: `routes/userRoutes.js`

```javascript
import express from 'express';
import multer from 'multer';
import {
  getProfile,
  updateProfile,
  changePassword,
  uploadAvatar
} from '../controller/userController.js';
import {
  getUserAddresses,
  createAddress,
  updateAddress,
  deleteAddress
} from '../controller/addressController.js';
import { authenticate } from '../middleware/authMiddleware.js';

const router = express.Router();

// Multer for avatar upload
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Chỉ chấp nhận file hình ảnh'));
    }
  }
});

router.use(authenticate);

// Profile routes
router.get('/profile', getProfile);
router.put('/profile', updateProfile);
router.post('/change-password', changePassword);
router.post('/upload-avatar', upload.single('avatar'), uploadAvatar);

// Address routes
router.get('/addresses', getUserAddresses);
router.post('/addresses', createAddress);
router.put('/addresses/:id', updateAddress);
router.delete('/addresses/:id', deleteAddress);

export default router;
```

---

## 🎨 Frontend Implementation

### 1. API Service: `src/api/user.js`

```javascript
import axiosClient from './axiosClient';

export const getProfile = () => {
  return axiosClient.get('/user/profile');
};

export const updateProfile = (data) => {
  return axiosClient.put('/user/profile', data);
};

export const changePassword = (data) => {
  return axiosClient.post('/user/change-password', data);
};

export const uploadAvatar = (file) => {
  const formData = new FormData();
  formData.append('avatar', file);
  return axiosClient.post('/user/upload-avatar', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
};

export const getUserAddresses = () => {
  return axiosClient.get('/user/addresses');
};

export const createAddress = (data) => {
  return axiosClient.post('/user/addresses', data);
};

export const updateAddress = (id, data) => {
  return axiosClient.put(`/user/addresses/${id}`, data);
};

export const deleteAddress = (id) => {
  return axiosClient.delete(`/user/addresses/${id}`);
};
```

### 2. Profile Page: `src/pages/user/profile/Profile.jsx`

```jsx
import { useState, useEffect } from 'react';
import { getProfile, updateProfile, changePassword, uploadAvatar } from '@/api/user';
import { User, Lock, MapPin, Package, Star, Heart, Gift } from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function Profile() {
  const [activeTab, setActiveTab] = useState('info');
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const response = await getProfile();
      setProfile(response.data.data);
    } catch (error) {
      toast.error('Lỗi khi tải thông tin');
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'info', label: 'Thông Tin', icon: User },
    { id: 'password', label: 'Đổi Mật Khẩu', icon: Lock },
    { id: 'addresses', label: 'Địa Chỉ', icon: MapPin },
    { id: 'orders', label: 'Đơn Hàng', icon: Package },
    { id: 'reviews', label: 'Đánh Giá', icon: Star },
    { id: 'wishlist', label: 'Yêu Thích', icon: Heart },
    { id: 'coupons', label: 'Mã Giảm Giá', icon: Gift }
  ];

  if (loading) {
    return <div className="text-center py-20">Đang tải...</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Tài Khoản Của Tôi</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar */}
        <div className="lg:col-span-1">
          <div className="bg-white border rounded-lg p-4">
            {/* Avatar */}
            <div className="text-center mb-6">
              <img
                src={profile.avatar || '/default-avatar.png'}
                alt={profile.firstName}
                className="w-24 h-24 rounded-full mx-auto mb-3"
              />
              <h3 className="font-semibold">
                {profile.firstName} {profile.lastName}
              </h3>
              <p className="text-sm text-gray-600">{profile.email}</p>
            </div>

            {/* Tabs */}
            <nav className="space-y-1">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center gap-3 px-4 py-2 rounded ${
                      activeTab === tab.id
                        ? 'bg-blue-50 text-blue-600'
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    <Icon size={20} />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Content */}
        <div className="lg:col-span-3">
          <div className="bg-white border rounded-lg p-6">
            {activeTab === 'info' && <ProfileInfo profile={profile} onUpdate={fetchProfile} />}
            {activeTab === 'password' && <ChangePassword />}
            {activeTab === 'addresses' && <AddressList />}
            {activeTab === 'orders' && <OrderHistory />}
            {activeTab === 'reviews' && <ReviewHistory />}
            {activeTab === 'wishlist' && <WishlistTab />}
            {activeTab === 'coupons' && <CouponList />}
          </div>
        </div>
      </div>
    </div>
  );
}
```

### 3. Profile Info Component

```jsx
function ProfileInfo({ profile, onUpdate }) {
  const [formData, setFormData] = useState({
    firstName: profile.firstName,
    lastName: profile.lastName,
    phone: profile.phone || ''
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    
    try {
      await updateProfile(formData);
      toast.success('Cập nhật thông tin thành công');
      onUpdate();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Lỗi khi cập nhật');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAvatarChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      await uploadAvatar(file);
      toast.success('Cập nhật ảnh đại diện thành công');
      onUpdate();
    } catch (error) {
      toast.error('Lỗi khi upload ảnh');
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Thông Tin Cá Nhân</h2>
      
      {/* Avatar Upload */}
      <div className="mb-6">
        <label className="block mb-2 font-medium">Ảnh Đại Diện</label>
        <input
          type="file"
          accept="image/*"
          onChange={handleAvatarChange}
          className="border px-4 py-2 rounded"
        />
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block mb-2 font-medium">Họ *</label>
            <input
              type="text"
              value={formData.firstName}
              onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
              required
              className="w-full border px-4 py-2 rounded"
            />
          </div>
          <div>
            <label className="block mb-2 font-medium">Tên *</label>
            <input
              type="text"
              value={formData.lastName}
              onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
              required
              className="w-full border px-4 py-2 rounded"
            />
          </div>
        </div>

        <div>
          <label className="block mb-2 font-medium">Email</label>
          <input
            type="email"
            value={profile.email}
            disabled
            className="w-full border px-4 py-2 rounded bg-gray-100"
          />
        </div>

        <div>
          <label className="block mb-2 font-medium">Số Điện Thoại</label>
          <input
            type="tel"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            className="w-full border px-4 py-2 rounded"
          />
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {submitting ? 'Đang lưu...' : 'Lưu Thay Đổi'}
        </button>
      </form>
    </div>
  );
}
```

---

## ✅ Checklist

- [x] View profile
- [x] Update profile
- [x] Change password
- [x] Upload avatar
- [x] Address CRUD
- [x] Set default address
- [x] Order history
- [x] Review history
- [x] Wishlist management
- [x] Coupon list
- [x] Profile tabs
- [x] Form validation
- [x] Image upload
