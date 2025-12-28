# Authentication System - Hệ Thống Xác Thực

## 📋 Tổng Quan

Hệ thống xác thực hỗ trợ:
- Đăng ký/Đăng nhập bằng Email & Password
- Đăng nhập bằng Google OAuth
- JWT Token authentication
- Role-based access control (ADMIN/CUSTOMER)

---

## 🗄️ Database Schema

### User Model
```prisma
model User {
  id              Int       @id @default(autoincrement())
  email           String    @unique
  password        String?   // Null nếu đăng nhập bằng Google
  firstName       String
  lastName        String
  phone           String?   @unique
  avatar          String?
  googleId        String?   @unique
  role            UserRole  @default(CUSTOMER)
  isActive        Boolean   @default(true)
  isVerified      Boolean   @default(false)
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
}

enum UserRole {
  ADMIN
  CUSTOMER
}
```

---

## 🔧 Backend Implementation

### 1. Controller: `controller/authController.js`

#### Register (Đăng ký)
```javascript
export const register = async (req, res) => {
  const { email, password, firstName, lastName, phone } = req.body;
  
  // Validate
  if (!email || !password || !firstName || !lastName) {
    return res.status(400).json({ message: 'Missing required fields' });
  }
  
  // Check email exists
  const existingUser = await prisma.user.findUnique({
    where: { email: email.toLowerCase() }
  });
  
  if (existingUser) {
    return res.status(409).json({ message: 'Email đã được sử dụng' });
  }
  
  // Hash password
  const hashedPassword = await bcrypt.hash(password, 10);
  
  // Create user
  const newUser = await prisma.user.create({
    data: {
      email: email.toLowerCase(),
      password: hashedPassword,
      firstName,
      lastName,
      phone: phone || null,
      isActive: true,
      isVerified: false
    }
  });
  
  // Generate token
  const accessToken = generateAccessToken(newUser.id);
  
  // Tặng mã chào mừng (async, không chặn response)
  grantWelcomeCoupon(newUser.id).catch(err => {
    logger.error('Failed to grant welcome coupon', { userId: newUser.id });
  });
  
  return res.status(201).json({
    success: true,
    message: 'Đăng ký thành công',
    data: { user: newUser, accessToken }
  });
};
```

#### Login (Đăng nhập)
```javascript
export const login = async (req, res) => {
  const { email, password } = req.body;
  
  // Find user
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() }
  });
  
  if (!user) {
    return res.status(401).json({ message: 'Email hoặc password không đúng' });
  }
  
  // Check active
  if (!user.isActive) {
    return res.status(401).json({ message: 'Tài khoản đã bị vô hiệu hóa' });
  }
  
  // Verify password
  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) {
    return res.status(401).json({ message: 'Email hoặc password không đúng' });
  }
  
  // Generate token
  const accessToken = generateAccessToken(user.id);
  
  // Log login history
  await prisma.loginHistory.create({
    data: {
      userId: user.id,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      loginMethod: 'EMAIL_PASSWORD',
      isSuccessful: true
    }
  });
  
  return res.json({
    success: true,
    data: {
      user: { id: user.id, email: user.email, role: user.role },
      accessToken
    }
  });
};
```

#### Google OAuth Login
```javascript
export const googleLogin = async (req, res) => {
  const { credential } = req.body; // Google ID Token
  
  // Verify token with Google
  const ticket = await client.verifyIdToken({
    idToken: credential,
    audience: process.env.GOOGLE_CLIENT_ID
  });
  
  const payload = ticket.getPayload();
  const { sub: googleId, email, given_name, family_name, picture } = payload;
  
  // Find or create user
  let user = await prisma.user.findUnique({
    where: { googleId }
  });
  
  if (!user) {
    user = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        googleId,
        firstName: given_name,
        lastName: family_name,
        avatar: picture,
        isActive: true,
        isVerified: true
      }
    });
    
    // Tặng mã chào mừng
    grantWelcomeCoupon(user.id).catch(err => {
      logger.error('Failed to grant welcome coupon', { userId: user.id });
    });
  }
  
  const accessToken = generateAccessToken(user.id);
  
  return res.json({
    success: true,
    data: { user, accessToken }
  });
};
```

### 2. Middleware: `middleware/authMiddleware.js`

```javascript
export const authenticate = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1]; // Bearer TOKEN
    
    if (!token) {
      return res.status(401).json({ message: 'Token không được cung cấp' });
    }
    
    // Verify token
    const decoded = jwt.verify(token, JWT_CONFIG.secret);
    
    // Get user
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, email: true, role: true, isActive: true }
    });
    
    if (!user || !user.isActive) {
      return res.status(401).json({ message: 'Token không hợp lệ' });
    }
    
    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Token không hợp lệ' });
  }
};

export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Không có quyền truy cập' });
    }
    next();
  };
};
```

### 3. Routes: `routes/authRoutes.js`

```javascript
import express from 'express';
import { register, login, googleLogin, logout } from '../controller/authController.js';
import { authenticate } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.post('/google-login', googleLogin);
router.post('/logout', authenticate, logout);

export default router;
```

---

## 🎨 Frontend Implementation

### 1. API Service: `src/api/auth.js`

```javascript
import axiosClient from './axiosClient';

export const register = (data) => {
  return axiosClient.post('/auth/register', data);
};

export const login = (data) => {
  return axiosClient.post('/auth/login', data);
};

export const googleLogin = (credential) => {
  return axiosClient.post('/auth/google-login', { credential });
};

export const logout = () => {
  return axiosClient.post('/auth/logout');
};
```

### 2. Auth Store: `src/stores/authStore.js`

```javascript
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useAuthStore = create(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      
      setAuth: (user, token) => set({ 
        user, 
        token, 
        isAuthenticated: true 
      }),
      
      clearAuth: () => set({ 
        user: null, 
        token: null, 
        isAuthenticated: false 
      }),
    }),
    {
      name: 'auth-storage',
    }
  )
);

export default useAuthStore;
```

### 3. Login Page: `src/pages/auth/Login.jsx`

```jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login, googleLogin } from '@/api/auth';
import useAuthStore from '@/stores/authStore';
import { GoogleLogin } from '@react-oauth/google';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const setAuth = useAuthStore(state => state.setAuth);
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const response = await login({ email, password });
      const { user, accessToken } = response.data.data;
      
      setAuth(user, accessToken);
      toast.success('Đăng nhập thành công!');
      navigate('/');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Đăng nhập thất bại');
    } finally {
      setLoading(false);
    }
  };
  
  const handleGoogleSuccess = async (credentialResponse) => {
    try {
      const response = await googleLogin(credentialResponse.credential);
      const { user, accessToken } = response.data.data;
      
      setAuth(user, accessToken);
      toast.success('Đăng nhập thành công!');
      navigate('/');
    } catch (error) {
      toast.error('Đăng nhập Google thất bại');
    }
  };
  
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="max-w-md w-full space-y-8">
        <h2 className="text-3xl font-bold text-center">Đăng nhập</h2>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Mật khẩu"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button type="submit" disabled={loading}>
            {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
          </button>
        </form>
        
        <div className="text-center">
          <GoogleLogin
            onSuccess={handleGoogleSuccess}
            onError={() => toast.error('Đăng nhập Google thất bại')}
          />
        </div>
      </div>
    </div>
  );
}
```

### 4. Protected Route: `src/components/ProtectedRoute.jsx`

```jsx
import { Navigate } from 'react-router-dom';
import useAuthStore from '@/stores/authStore';

export default function ProtectedRoute({ children, requireAdmin = false }) {
  const { isAuthenticated, user } = useAuthStore();
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  if (requireAdmin && user?.role !== 'ADMIN') {
    return <Navigate to="/" replace />;
  }
  
  return children;
}
```

---

## 🔐 Security Best Practices

### 1. Password Hashing
```javascript
// Sử dụng bcrypt với salt rounds = 10
const hashedPassword = await bcrypt.hash(password, 10);
```

### 2. JWT Configuration
```javascript
// config/jwt.js
export const JWT_CONFIG = {
  secret: process.env.JWT_SECRET,
  expiresIn: '24h'
};
```

### 3. Token Storage
- **Frontend**: Lưu trong Zustand với persist (localStorage)
- **Backend**: Không lưu token (stateless JWT)

### 4. CORS Configuration
```javascript
// server.js
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));
```

---

## 🧪 Testing

### Test Register
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "123456",
    "firstName": "Test",
    "lastName": "User"
  }'
```

### Test Login
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "123456"
  }'
```

### Test Protected Route
```bash
curl -X GET http://localhost:5000/api/user/profile \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 📝 Environment Variables

```env
# JWT
JWT_SECRET=your-super-secret-key-change-this-in-production

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id

# Frontend URL (for CORS)
FRONTEND_URL=http://localhost:5173
```

---

## 🚀 Flow Diagram

```
User Registration Flow:
1. User nhập thông tin → Frontend validate
2. POST /api/auth/register → Backend validate
3. Hash password → Create user in DB
4. Generate JWT token
5. Tặng mã chào mừng (async)
6. Return user + token → Frontend
7. Save to Zustand store → Redirect to home

User Login Flow:
1. User nhập email/password → Frontend
2. POST /api/auth/login → Backend
3. Verify credentials → Check active status
4. Generate JWT token
5. Log login history
6. Return user + token → Frontend
7. Save to store → Redirect

Google OAuth Flow:
1. User click Google button → Google popup
2. User chọn account → Google return credential
3. POST /api/auth/google-login with credential
4. Backend verify with Google API
5. Find or create user
6. Generate JWT token
7. Return user + token → Frontend
```

---

## ✅ Checklist

- [x] User registration với email/password
- [x] User login với email/password
- [x] Google OAuth integration
- [x] JWT token generation
- [x] Auth middleware
- [x] Role-based authorization
- [x] Login history tracking
- [x] Welcome coupon grant
- [x] Protected routes (frontend)
- [x] Token persistence
- [x] Logout functionality
