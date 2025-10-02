# Web E-commerce Docker Setup

## Prerequisites
- Docker và Docker Compose đã được cài đặt
- XAMPP với MySQL đang chạy trên port 3306
- Database `ecommerce_db` đã được tạo trong phpMyAdmin

## Quick Start

1. **Clone repository:**
```bash
git clone <repository-url>
cd web-ecommerce
```

2. **Cấu hình XAMPP MySQL:**
   - Khởi động XAMPP
   - Mở phpMyAdmin (http://localhost/phpmyadmin)
   - Tạo database mới tên `ecommerce_db`
   - Đảm bảo MySQL đang chạy trên port 3306

3. **Khởi động ứng dụng:**
```bash
# Sử dụng Makefile (khuyến nghị)
make up

# Hoặc sử dụng docker-compose trực tiếp
docker-compose up -d
```

4. **Truy cập ứng dụng:**
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000
- API Health: http://localhost:5000/api/health

## Cấu trúc Docker

### Services
- **backend**: Backend API service (Node.js + Express + Prisma)
- **frontend**: Frontend service (React + Vite)
- **db-wait**: Service chờ XAMPP MySQL sẵn sàng

### Networks
- `web-ecommerce-network`: Network nội bộ cho các services

### Volumes
- `./logs:/app/logs`: Lưu trữ log files

## Environment Variables

### Database (XAMPP MySQL)
```env
DATABASE_URL="mysql://root:@host.docker.internal:3306/ecommerce_db"
```

### JWT Configuration
```env
JWT_SECRET="your-super-secret-jwt-key-change-in-production-123456789"
JWT_EXPIRES_IN="24h"
JWT_REFRESH_EXPIRES_IN="7d"
```

### Server Configuration
```env
PORT=5000
NODE_ENV="production"
FRONTEND_URL="http://localhost:3000"
```

### Cloudinary (Image Storage)
```env
CLOUDINARY_CLOUD_NAME="your_cloud_name"
CLOUDINARY_API_KEY="your_api_key"
CLOUDINARY_API_SECRET="your_api_secret"
```

### Frontend Configuration
```env
VITE_API_URL="http://localhost:5000/api"
VITE_APP_NAME="Web E-commerce"
```

## Commands (Makefile)

### Quản lý services
```bash
make help          # Hiển thị tất cả lệnh có sẵn
make build         # Build Docker images
make up            # Khởi động tất cả services
make down          # Dừng tất cả services
make restart       # Restart services
make status        # Kiểm tra trạng thái
```

### Logs và debugging
```bash
make logs          # Xem logs tất cả services
make backend-logs  # Xem logs backend
make frontend-logs # Xem logs frontend
```

### Database operations
```bash
make db-setup      # Hướng dẫn setup database
make db-migrate    # Chạy Prisma migrations
make db-seed       # Seed database với dữ liệu mẫu
make db-reset      # Reset database (cẩn thận!)
```

### Individual services
```bash
make backend       # Chỉ chạy backend
make frontend      # Chỉ chạy frontend
```

### Cleanup
```bash
make clean         # Xóa containers và images
make clean-all     # Xóa tất cả (containers, images, volumes)
```

## Database Setup

1. **Tạo database trong phpMyAdmin:**
   ```sql
   CREATE DATABASE ecommerce_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   ```

2. **Chạy migrations:**
   ```bash
   make db-migrate
   ```

3. **Seed dữ liệu mẫu:**
   ```bash
   make db-seed
   ```

## Troubleshooting

### XAMPP MySQL không kết nối được
1. **Kiểm tra XAMPP:**
   - Đảm bảo Apache và MySQL đang chạy
   - Kiểm tra port 3306 không bị conflict

2. **Kiểm tra kết nối:**
   ```bash
   # Test kết nối từ host
   mysql -h localhost -P 3306 -u root -p
   ```

3. **Kiểm tra host.docker.internal:**
   ```bash
   # Trong container
   ping host.docker.internal
   nc -z host.docker.internal 3306
   ```

### Container không start
1. **Xem logs chi tiết:**
   ```bash
   make logs
   docker-compose logs backend
   ```

2. **Kiểm tra port conflicts:**
   ```bash
   lsof -i :3000
   lsof -i :5000
   ```

3. **Rebuild images:**
   ```bash
   make clean
   make build
   ```

### Database connection issues
1. **Kiểm tra DATABASE_URL:**
   - Format: `mysql://username:password@host:port/database`
   - Đảm bảo database đã được tạo

2. **Kiểm tra MySQL user:**
   ```sql
   -- Trong phpMyAdmin
   SELECT User, Host FROM mysql.user WHERE User = 'root';
   ```

3. **Kiểm tra firewall:**
   - Đảm bảo port 3306 không bị block

## Production Deployment

### Security
- Thay đổi JWT_SECRET mạnh
- Sử dụng environment variables thực tế
- Cấu hình HTTPS
- Setup reverse proxy (nginx)

### Performance
- Sử dụng Docker multi-stage builds
- Optimize images size
- Setup monitoring và logging
- Configure resource limits

### Database
- Sử dụng MySQL production server
- Setup database backup
- Configure connection pooling
- Monitor database performance

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend       │    │   XAMPP MySQL   │
│   (React)       │◄──►│   (Node.js)     │◄──►│   (Port 3306)   │
│   Port: 3000    │    │   Port: 5000    │    │   Database:     │
│                 │    │                 │    │   ecommerce_db  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │
         └───────────────────────┘
                   │
            ┌─────────────┐
            │   Docker    │
            │   Network   │
            └─────────────┘
```
