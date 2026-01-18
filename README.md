# 🛒 E-Commerce Platform với AI Tích Hợp

<div align="center">

![Project Status](https://img.shields.io/badge/status-active-success.svg)
![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Node Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)
![Python Version](https://img.shields.io/badge/python-3.9%2B-blue.svg)

Nền tảng thương mại điện tử hiện đại với tính năng AI chatbot thông minh, tìm kiếm sản phẩm bằng hình ảnh, và hệ thống thanh toán trực tuyến.

[Tính năng](#-tính-năng-nổi-bật) •
[Công nghệ](#-công-nghệ-sử-dụng) •
[Cài đặt](#-cài-đặt) •
[Kiến trúc](#-kiến-trúc-hệ-thống) •
[API Documentation](#-api-documentation)

</div>

---

## 📋 Mục lục

- [Giới thiệu](#-giới-thiệu)
- [Tính năng nổi bật](#-tính-năng-nổi-bật)
- [Công nghệ sử dụng](#-công-nghệ-sử-dụng)
- [Kiến trúc hệ thống](#-kiến-trúc-hệ-thống)
- [Cài đặt](#-cài-đặt)
- [Cấu hình](#-cấu-hình)
- [Sử dụng](#-sử-dụng)
- [API Documentation](#-api-documentation)
- [Deployment](#-deployment)
- [Testing](#-testing)
- [Contributing](#-contributing)
- [License](#-license)

---

## 🌟 Giới thiệu

Hệ thống E-Commerce hiện đại được xây dựng với mục tiêu cung cấp trải nghiệm mua sắm trực tuyến tối ưu cho người dùng, kết hợp các công nghệ AI tiên tiến để nâng cao khả năng tìm kiếm và tư vấn sản phẩm.

### Mục tiêu chính:
- ✅ Xây dựng nền tảng thương mại điện tử đầy đủ tính năng
- ✅ Tích hợp AI Chatbot thông minh hỗ trợ khách hàng 24/7
- ✅ Tìm kiếm sản phẩm bằng hình ảnh với độ chính xác cao
- ✅ Quản lý đơn hàng, thanh toán và vận chuyển tự động
- ✅ Hệ thống khuyến mãi và marketing thông minh

---

## ✨ Tính năng nổi bật

### 🎯 Tính năng cho Khách hàng

#### 🛍️ Quản lý Sản phẩm & Giỏ hàng
- **Danh mục sản phẩm phong phú**: Phân loại theo danh mục, thương hiệu, giá cả
- **Tìm kiếm thông minh**: 
  - Full-text search với MySQL
  - Vector search với ChromaDB
  - Tìm kiếm bằng hình ảnh (Image Search)
- **Giỏ hàng linh hoạt**: Thêm, xóa, cập nhật số lượng real-time
- **Wishlist**: Lưu sản phẩm yêu thích
- **Đánh giá & Review**: Xếp hạng sản phẩm, bình luận có phân cấp
- **So sánh sản phẩm**: So sánh thông số kỹ thuật

#### 🤖 AI Chatbot (User)
- **Tư vấn sản phẩm thông minh**: Sử dụng Google Gemini AI
- **Tìm kiếm sản phẩm bằng ngôn ngữ tự nhiên**: Hiểu ý định người dùng
- **Vector search**: ChromaDB + Sentence-Transformers
- **Hybrid search**: Kết hợp Full-text và Vector search
- **Trả lời theo ngữ cảnh**: Ghi nhớ lịch sử hội thoại
- **Tìm kiếm bằng hình ảnh**: Upload ảnh để tìm sản phẩm tương tự

#### 💳 Thanh toán & Đơn hàng
- **Đa phương thức thanh toán**:
  - COD (Cash on Delivery)
  - VNPay (Cổng thanh toán trực tuyến)
  - Tingee (ví điện tử)
- **Theo dõi đơn hàng real-time**: Cập nhật trạng thái qua WebSocket
- **Lịch sử đơn hàng**: Xem chi tiết, in hóa đơn
- **Tính phí vận chuyển tự động**: Tích hợp GHN API

#### 🎫 Hệ thống Khuyến mãi
- **Mã giảm giá đa dạng**:
  - Giảm theo % hoặc số tiền cố định
  - Áp dụng cho đơn hàng đầu tiên
  - Miễn phí vận chuyển
  - Khuyến mãi theo mùa
- **Thu thập coupon**: Người dùng chủ động lưu mã
- **Tự động áp dụng**: Hệ thống gợi ý mã tốt nhất

#### 🔐 Xác thực & Bảo mật
- **Đăng ký/Đăng nhập**: Email + Password, Google OAuth
- **Xác thực OTP**: Gửi mã OTP qua email
- **Quên mật khẩu**: Reset password an toàn
- **Quản lý profile**: Cập nhật thông tin, avatar

### 👨‍💼 Tính năng cho Admin

#### 📊 Dashboard Quản trị
- **Thống kê kinh doanh**: Doanh thu, đơn hàng, khách hàng
- **Biểu đồ trực quan**: Recharts, Ant Design Charts
- **Lọc theo thời gian**: 7 ngày, 30 ngày, 90 ngày, 1 năm
- **KPIs quan trọng**: AOV, conversion rate, tỷ lệ hủy đơn

#### 🛠️ Quản lý Sản phẩm
- **CRUD đầy đủ**: Tạo, sửa, xóa sản phẩm
- **Quản lý variants**: Màu sắc, kích thước, tồn kho
- **Upload hình ảnh**: Tích hợp Cloudinary
- **SEO tối ưu**: Meta title, description, slug

#### 📦 Quản lý Đơn hàng
- **Danh sách đơn hàng**: Lọc, tìm kiếm, phân trang
- **Cập nhật trạng thái**: Xác nhận, đang xử lý, giao hàng, hủy
- **In hóa đơn**: Export PDF
- **Quản lý vận chuyển**: Tích hợp GHN API

#### 🏷️ Quản lý Khuyến mãi
- **Tạo mã giảm giá**: Cấu hình điều kiện, giới hạn sử dụng
- **Theo dõi hiệu quả**: Số lượt sử dụng, doanh thu ảnh hưởng
- **Kích hoạt/Vô hiệu hóa**: Quản lý chiến dịch

#### 👥 Quản lý Người dùng
- **Danh sách khách hàng**: Thông tin chi tiết
- **Chặn/Mở khóa tài khoản**: Quản lý quyền truy cập
- **Lịch sử mua hàng**: Theo dõi hoạt động

#### ⚖️ AI Legal Chatbot (Admin)
- **Tư vấn pháp lý**: Thuế, quy định kinh doanh
- **Tìm kiếm văn bản pháp luật**: ChromaDB + Vector search
- **Tính thuế tự động**: Dựa trên doanh thu
- **Phân tích tài liệu**: PyMuPDF, python-docx

### 🔄 Tính năng Real-time
- **Socket.IO**: Thông báo đơn hàng, cập nhật trạng thái
- **Live chat**: Hỗ trợ khách hàng trực tiếp
- **Cập nhật tồn kho**: Real-time inventory

---

## 🚀 Công nghệ sử dụng

### Frontend
- **Core**: 
  - ⚛️ React 18 - UI library
  - 🎨 Vite - Build tool & Dev server
  - 🛣️ React Router v7 - Routing
  
- **State Management**:
  - 🐻 Zustand - Light-weight state management
  - 🔄 Redux Toolkit - Complex state management
  
- **UI & Styling**:
  - 🎨 Tailwind CSS v4 - Utility-first CSS
  - 🐜 Ant Design - Enterprise UI components
  - 🎭 Framer Motion - Animations
  - 🎯 Radix UI - Headless components
  - 📊 Recharts - Charts & Visualizations
  
- **Forms & Validation**:
  - 📝 React Hook Form - Form handling
  - ✅ Zod - Schema validation
  
- **API & Real-time**:
  - 📡 Axios - HTTP client
  - 🔌 Socket.IO Client - WebSocket

### Backend
- **Core**:
  - 🟢 Node.js 18+ - Runtime environment
  - ⚡ Express 5 - Web framework
  - 🗄️ MySQL - Relational database
  - 🔍 Prisma ORM - Database toolkit
  
- **Authentication & Security**:
  - 🔐 JWT - JSON Web Tokens
  - 🔒 bcrypt - Password hashing
  - 🛡️ Helmet - Security headers
  - 🚦 express-rate-limit - Rate limiting
  
- **External Services**:
  - ☁️ Cloudinary - Image storage & CDN
  - 📧 Nodemailer - Email sending
  - 🚚 GHN API - Shipping integration
  - 💳 VNPay - Payment gateway
  
- **Real-time Communication**:
  - 🔌 Socket.IO - WebSocket server

### AI Service (Python)
- **Framework**:
  - ⚡ FastAPI - Modern Python web framework
  - 🦄 Uvicorn - ASGI server
  
- **AI & Machine Learning**:
  - 🤖 Google Gemini AI - Large language model
  - 🧠 Sentence-Transformers - Text embeddings
  - 🗄️ ChromaDB - Vector database
  
- **Database**:
  - 🔄 aiomysql - Async MySQL driver
  
- **Document Processing**:
  - 📄 PyMuPDF - PDF parsing
  - 📝 python-docx - Word document processing
  
- **Utilities**:
  - 🔧 pydantic - Data validation
  - 📋 Jinja2 - Templating engine
  - 🌍 python-dotenv - Environment management

### DevOps & Tools
- **Development**:
  - 📦 npm/yarn - Package manager
  - 🐍 pip - Python package manager
  - 🔄 nodemon - Auto-restart server
  
- **Version Control**:
  - 🌿 Git - Version control
  - 📁 GitHub - Repository hosting

---

## 🏗️ Kiến trúc hệ thống

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                              │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  React Frontend (Vite)                                   │    │
│  │  - User Interface (Customer)                             │    │
│  │  - Admin Dashboard (Admin)                               │    │
│  │  - Socket.IO Client (Real-time)                          │    │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
                              ↓ ↑
                        HTTP/WebSocket
                              ↓ ↑
┌─────────────────────────────────────────────────────────────────┐
│                      API GATEWAY LAYER                           │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  Express.js Backend (Node.js)                            │    │
│  │  - REST API Endpoints                                    │    │
│  │  - Authentication & Authorization                        │    │
│  │  - Business Logic                                        │    │
│  │  - Socket.IO Server                                      │    │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
                              ↓ ↑
                    ┌─────────┴─────────┐
                    ↓                   ↓
┌───────────────────────────┐  ┌────────────────────────────────┐
│   DATABASE LAYER          │  │   AI SERVICE LAYER             │
│  ┌─────────────────────┐  │  │  ┌──────────────────────────┐ │
│  │  MySQL Database     │  │  │  │  FastAPI (Python)        │ │
│  │  - Users            │  │  │  │  - User Chatbot          │ │
│  │  - Products         │  │  │  │  - Admin Legal Chatbot   │ │
│  │  - Orders           │  │  │  │  - Image Search          │ │
│  │  - Coupons          │  │  │  │                          │ │
│  │  - ...              │  │  │  │  ┌────────────────────┐  │ │
│  └─────────────────────┘  │  │  │  │  ChromaDB          │  │ │
│                           │  │  │  │  - Product Vectors │  │ │
└───────────────────────────┘  │  │  │  - Legal Documents │  │ │
                               │  │  └────────────────────┘  │ │
                               │  │                          │ │
                               │  │  ┌────────────────────┐  │ │
                               │  │  │  Gemini AI         │  │ │
                               │  │  │  - LLM             │  │ │
                               │  │  └────────────────────┘  │ │
                               │  └──────────────────────────┘ │
                               └────────────────────────────────┘
                                         ↓ ↑
                              ┌──────────┴──────────┐
                              ↓                     ↓
          ┌─────────────────────────────┐  ┌─────────────────────┐
          │   EXTERNAL SERVICES         │  │  CLOUD SERVICES     │
          │  ┌───────────────────────┐  │  │  ┌───────────────┐ │
          │  │  VNPay Payment        │  │  │  │  Cloudinary   │ │
          │  │  GHN Shipping         │  │  │  │  (CDN, Images)│ │
          │  │  Google OAuth         │  │  │  └───────────────┘ │
          │  │  Email (SMTP)         │  │  │                    │
          │  └───────────────────────┘  │  └─────────────────────┘
          └─────────────────────────────┘
```

### Data Flow Diagram

```
┌──────────────┐
│   User/Admin │
└──────┬───────┘
       │
       ↓
┌──────────────────────────────────────────────────────┐
│              Frontend (React)                         │
│  ┌────────────────────────────────────────────────┐  │
│  │  1. User actions (Click, Input, Upload)        │  │
│  │  2. Form validation (Zod)                      │  │
│  │  3. API calls (Axios)                          │  │
│  │  4. State management (Zustand/Redux)           │  │
│  │  5. Real-time updates (Socket.IO)              │  │
│  └────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────┘
       │
       ↓ HTTP/WebSocket
┌──────────────────────────────────────────────────────┐
│           Backend (Express.js)                        │
│  ┌────────────────────────────────────────────────┐  │
│  │  1. Route handling                             │  │
│  │  2. Authentication middleware (JWT)            │  │
│  │  3. Validation (express-validator)             │  │
│  │  4. Business logic (Controllers)               │  │
│  │  5. Database operations (Prisma ORM)           │  │
│  │  6. External API calls                         │  │
│  │  7. Socket.IO events                           │  │
│  └────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────┘
       │
       ↓
┌──────────────────────────────────────────────────────┐
│              MySQL Database                           │
│  ┌────────────────────────────────────────────────┐  │
│  │  - CRUD operations                             │  │
│  │  - Transactions                                │  │
│  │  - Full-text search                            │  │
│  │  - Relational queries                          │  │
│  └────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────┘
```

### AI Chatbot Flow

```
User Question → Frontend → Backend → AI Service (FastAPI)
                                          │
                                          ↓
                                   Gemini AI Processing
                                          │
                                          ↓
                              ┌───────────┴───────────┐
                              ↓                       ↓
                    Hybrid Search              Legal Search
                              ↓                       ↓
                    ┌─────────┴─────────┐    ┌───────┴────────┐
                    ↓                   ↓    │  ChromaDB      │
          Full-text Search    Vector Search  │  Legal Docs    │
          (MySQL)            (ChromaDB)       └────────────────┘
                    │                   │
                    └─────────┬─────────┘
                              ↓
                        Product Results
                              ↓
                    Generate AI Response
                              ↓
                    Frontend ← Backend ← AI Service
                              ↓
                        Display to User
```

---

## 💻 Cài đặt

### Yêu cầu hệ thống

- **Node.js**: >= 18.0.0
- **Python**: >= 3.9
- **MySQL**: >= 8.0
- **npm/yarn**: Latest version
- **Git**: Latest version

### 1. Clone Repository

```bash
git clone https://github.com/tandat8503/web-ecommerce.git
cd web-ecommerce
```

### 2. Cài đặt Backend

```bash
cd backend

# Cài đặt dependencies
npm install

# Tạo file .env (copy từ .env.example)
cp .env.example .env

# Cấu hình database trong .env
# DATABASE_URL="mysql://user:password@localhost:3306/ecommerce_db"

# Chạy Prisma migrations
npx prisma migrate dev

# Seed database (optional)
npm run seed

# Tạo Full-text index
npm run add-fulltext-index

# Chạy backend
npm run dev
```

Backend sẽ chạy tại: `http://localhost:5000`

### 3. Cài đặt Frontend

```bash
cd frontend

# Cài đặt dependencies
npm install

# Tạo file .env
cp .env.example .env

# Cấu hình API URL trong .env
# VITE_API_URL=http://localhost:5000/api
# VITE_SOCKET_URL=http://localhost:5000

# Chạy frontend
npm run dev
```

Frontend sẽ chạy tại: `http://localhost:5173`

### 4. Cài đặt AI Service

```bash
cd ai_v2

# Tạo virtual environment
python3 -m venv venv

# Kích hoạt virtual environment
# macOS/Linux:
source venv/bin/activate
# Windows:
# venv\Scripts\activate

# Cài đặt dependencies
pip install -r requirements.txt

# Tạo file .env
cp .env.example .env

# Cấu hình trong .env
# GOOGLE_API_KEY=your_gemini_api_key
# DATABASE_URL=mysql://root:@localhost:3306/ecommerce_db

# Chạy AI service
python main.py
```

AI Service sẽ chạy tại: `http://localhost:8000`

### 5. Khởi tạo ChromaDB (Optional)

Nếu chưa có dữ liệu vector:

```bash
cd ai_v2/scripts

# Khởi tạo product vectors
python init_product_vectors.py

# Khởi tạo legal documents (for admin chatbot)
python init_legal_vectors.py
```

---

## ⚙️ Cấu hình

### Backend Environment Variables

```env
# Database
DATABASE_URL="mysql://root:password@localhost:3306/ecommerce_db"
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=ecommerce_db

# Server
PORT=5000
NODE_ENV=development

# JWT
JWT_SECRET=your_secret_key
JWT_EXPIRES_IN=7d
JWT_REFRESH_EXPIRES_IN=30d

# Cloudinary
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# VNPay
VNPAY_TMN_CODE=your_tmn_code
VNPAY_HASH_SECRET=your_hash_secret
VNPAY_URL=https://sandbox.vnpayment.vn/paymentv2/vpcpay.html
VNPAY_RETURN_URL=http://localhost:5173/payment/vnpay/callback

# GHN Shipping
GHN_API_URL=https://dev-online-gateway.ghn.vn/shiip/public-api
GHN_TOKEN=your_ghn_token
GHN_SHOP_ID=your_shop_id

# Email
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASSWORD=your_app_password

# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# AI Service
AI_SERVICE_URL=http://localhost:8000
```

### Frontend Environment Variables

```env
# API URLs
VITE_API_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000

# Google OAuth
VITE_GOOGLE_CLIENT_ID=your_google_client_id

# VNPay
VITE_VNPAY_RETURN_URL=http://localhost:5173/payment/vnpay/callback
```

### AI Service Environment Variables

```env
# Google Gemini AI
GOOGLE_API_KEY=your_gemini_api_key

# Database
DATABASE_URL=mysql://root:@localhost:3306/ecommerce_db

# ChromaDB
CHROMA_PRODUCT_PATH=./chroma_db_product
CHROMA_LEGAL_PATH=./chroma_db_legal

# AI Service
AI_SERVICE_PORT=8000
AI_SERVICE_HOST=0.0.0.0

# Model Settings
EMBEDDING_MODEL=sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2
GEMINI_MODEL=gemini-2.5-flash
```

---

## 🎯 Sử dụng

### Chạy toàn bộ hệ thống

1. **Khởi động Database**:
   ```bash
   # Đảm bảo MySQL đang chạy
   mysql.server start  # macOS
   # hoặc
   sudo systemctl start mysql  # Linux
   ```

2. **Khởi động Backend**:
   ```bash
   cd backend
   npm run dev
   ```

3. **Khởi động AI Service**:
   ```bash
   cd ai_v2
   source venv/bin/activate
   python main.py
   ```

4. **Khởi động Frontend**:
   ```bash
   cd frontend
   npm run dev
   ```

### Truy cập ứng dụng

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:5000/api
- **AI Service**: http://localhost:8000
- **API Documentation**: http://localhost:5000/api/docs (Swagger - nếu đã cấu hình)

### Tài khoản mặc định (sau khi seed)

**Admin**:
- Email: `admin@example.com`
- Password: `admin123`

**Customer**:
- Email: `customer@example.com`
- Password: `customer123`

---

## 📚 API Documentation

### Authentication Endpoints

```
POST   /api/auth/register          - Đăng ký tài khoản
POST   /api/auth/login             - Đăng nhập
POST   /api/auth/google            - Đăng nhập Google
POST   /api/auth/verify-otp        - Xác thực OTP
POST   /api/auth/resend-otp        - Gửi lại OTP
POST   /api/auth/forgot-password   - Quên mật khẩu
POST   /api/auth/reset-password    - Reset mật khẩu
GET    /api/auth/me                - Lấy thông tin user
```

### Product Endpoints

```
GET    /api/products               - Lấy danh sách sản phẩm
GET    /api/products/:id           - Lấy chi tiết sản phẩm
POST   /api/products               - Tạo sản phẩm (Admin)
PUT    /api/products/:id           - Cập nhật sản phẩm (Admin)
DELETE /api/products/:id           - Xóa sản phẩm (Admin)
GET    /api/products/search        - Tìm kiếm sản phẩm
POST   /api/products/search-image  - Tìm kiếm bằng hình ảnh
```

### Order Endpoints

```
GET    /api/orders                 - Lấy danh sách đơn hàng
GET    /api/orders/:id             - Lấy chi tiết đơn hàng
POST   /api/orders                 - Tạo đơn hàng
PUT    /api/orders/:id/status      - Cập nhật trạng thái (Admin)
DELETE /api/orders/:id             - Hủy đơn hàng
```

### Cart Endpoints

```
GET    /api/cart                   - Lấy giỏ hàng
POST   /api/cart                   - Thêm vào giỏ hàng
PUT    /api/cart/:id               - Cập nhật số lượng
DELETE /api/cart/:id               - Xóa khỏi giỏ hàng
DELETE /api/cart                   - Xóa toàn bộ giỏ hàng
```

### Payment Endpoints

```
POST   /api/payment/vnpay/create   - Tạo payment VNPay
GET    /api/payment/vnpay/callback - Callback VNPay
POST   /api/payment/tingee/create  - Tạo payment Tingee
```

### AI Chatbot Endpoints

```
POST   /api/v2/chat/user           - Chat với User Chatbot
POST   /api/v2/chat/admin/legal    - Chat với Legal Chatbot
POST   /api/v2/chat/search-image   - Tìm kiếm bằng hình ảnh
```

### Coupon Endpoints

```
GET    /api/coupons                - Lấy danh sách coupon
GET    /api/coupons/:code          - Kiểm tra coupon
POST   /api/coupons                - Tạo coupon (Admin)
POST   /api/coupons/collect        - Thu thập coupon
POST   /api/coupons/validate       - Validate coupon
```

Chi tiết đầy đủ: Xem file `docs/API_DOCUMENTATION.md`

---

## 🚀 Deployment

### Frontend (Vercel)

```bash
# Build production
cd frontend
npm run build

# Deploy to Vercel
vercel --prod
```

### Backend (Render/Railway)

```bash
# Build command
npm install && npx prisma generate

# Start command
npm start

# Environment variables
# Cấu hình tất cả biến môi trường trên dashboard
```

### AI Service (Railway/Heroku)

```bash
# requirements.txt đã có sẵn

# Procfile
web: uvicorn main:app --host 0.0.0.0 --port $PORT
```

### Database (PlanetScale/Railway)

```bash
# Sử dụng MySQL cloud service
# Cập nhật DATABASE_URL trong .env
```

---

## 🧪 Testing

### Backend Tests

```bash
cd backend

# Chạy tất cả tests
npm test

# Test API cụ thể
npm run test-ghn        # Test GHN API
npm run test-fulltext   # Test Full-text search
```

### Frontend Tests

```bash
cd frontend

# Chạy tests (nếu đã cấu hình)
npm test
```

### Manual Testing

Xem hướng dẫn chi tiết tại: `docs/TESTING_GUIDE.md`

---

## 📁 Cấu trúc thư mục

```
web-ecommerce/
├── frontend/                 # React Frontend
│   ├── src/
│   │   ├── components/      # React components
│   │   ├── pages/           # Page components
│   │   ├── routes/          # Route config
│   │   ├── store/           # State management
│   │   ├── services/        # API services
│   │   ├── utils/           # Utilities
│   │   └── App.jsx          # Root component
│   ├── public/              # Static assets
│   └── package.json
│
├── backend/                  # Node.js Backend
│   ├── config/              # Configuration
│   ├── controller/          # Controllers
│   ├── routes/              # Express routes
│   ├── services/            # Business logic
│   ├── middleware/          # Middlewares
│   ├── prisma/              # Prisma schema & migrations
│   ├── utils/               # Utilities
│   ├── validators/          # Input validation
│   ├── server.js            # Entry point
│   └── package.json
│
├── ai_v2/                    # Python AI Service
│   ├── app/
│   │   ├── agents/          # AI agents
│   │   ├── core/            # Core config
│   │   ├── models/          # Data models
│   │   ├── routers/         # FastAPI routes
│   │   └── services/        # AI services
│   ├── scripts/             # Utility scripts
│   ├── chroma_db_product/   # Product vector DB
│   ├── chroma_db_legal/     # Legal vector DB
│   ├── luat_VN/             # Legal documents
│   ├── main.py              # Entry point
│   └── requirements.txt
│
├── docs/                     # Documentation
│   ├── AI_INTEGRATION_FLOW.md
│   ├── SYSTEM_ARCHITECTURE.md
│   └── ...
│
└── README.md                 # This file
```

---

## 🤝 Contributing

Chúng tôi hoan nghênh mọi đóng góp cho dự án!

### Quy trình đóng góp

1. Fork repository
2. Tạo branch mới: `git checkout -b feature/AmazingFeature`
3. Commit changes: `git commit -m 'Add some AmazingFeature'`
4. Push to branch: `git push origin feature/AmazingFeature`
5. Tạo Pull Request

### Coding Standards

- **JavaScript/React**: ESLint + Prettier
- **Python**: PEP 8
- **Commit messages**: Conventional Commits

---

## 📝 License

Distributed under the MIT License. See `LICENSE` file for more information.

---

## 👨‍💻 Authors

- **Tên tác giả** - *Initial work* - [GitHub Profile](https://github.com/tandat8503)

---

## 🙏 Acknowledgments

- [React](https://reactjs.org/)
- [Express.js](https://expressjs.com/)
- [FastAPI](https://fastapi.tiangolo.com/)
- [Prisma](https://www.prisma.io/)
- [ChromaDB](https://www.trychroma.com/)
- [Google Gemini](https://ai.google.dev/)
- [Ant Design](https://ant.design/)
- [Tailwind CSS](https://tailwindcss.com/)

---

## 📞 Liên hệ

- **Email**: tandat8503@gmail.com
- **GitHub**: [@tandat8503](https://github.com/tandat8503)
- **Demo**: [https://web-ecommerce-rosy.vercel.app](https://web-ecommerce-rosy.vercel.app)

---

<div align="center">

**⭐ Star this repo if you find it helpful!**

Made with ❤️ by [tandat8503](https://github.com/tandat8503)

</div>
