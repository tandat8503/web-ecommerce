# 🐳 Docker Setup cho Web E-commerce

## 📋 Tổng quan

**1 lệnh duy nhất** để chạy cả Backend và Frontend:
- **Backend**: Node.js + Express + Prisma + MySQL
- **Frontend**: React + Vite + TailwindCSS
- **Database**: XAMPP MySQL (local)

## 🚀 Cách sử dụng (Siêu đơn giản)

### **Bước 1: Chuẩn bị XAMPP**
1. Mở XAMPP Control Panel
2. Start MySQL
3. Mở phpMyAdmin: http://localhost/phpmyadmin
4. Tạo database tên `ecommerce_db`

### **Bước 2: Chạy ứng dụng**
```bash
# Chỉ cần 1 lệnh này!
./start.sh

# Hoặc dùng Makefile
make start
```

**Xong!** Ứng dụng sẽ chạy và bạn có thể theo dõi logs trực tiếp trên terminal.

## 🌐 Truy cập ứng dụng

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000
- **phpMyAdmin**: http://localhost/phpmyadmin

## 📊 Theo dõi và Debug

### **Xem logs real-time:**
```bash
# Trong terminal khác
docker-compose logs -f

# Hoặc
make logs
```

### **Kiểm tra status:**
```bash
make status
```

### **Vào container để debug:**
```bash
make shell
```

## 🔧 Commands hữu ích

```bash
make start     # Chạy Backend + Frontend
make stop      # Dừng
make logs      # Xem logs
make status    # Kiểm tra status
make clean     # Xóa containers
make shell     # Vào container
```

## 🛠️ Troubleshooting

### **XAMPP MySQL không chạy**
1. Mở XAMPP Control Panel
2. Click "Start" cho MySQL
3. Kiểm tra: `lsof -i :3306`

### **Port đã được sử dụng**
```bash
# Kiểm tra port
lsof -i :3000
lsof -i :5000

# Kill process
kill -9 <PID>
```

### **Database connection failed**
1. Kiểm tra XAMPP MySQL đang chạy
2. Kiểm tra database `ecommerce_db` đã tạo
3. Xem logs: `docker-compose logs -f`

## 📝 Notes

- **Logs hiển thị trực tiếp** khi chạy `./start.sh`
- **Ctrl+C** để dừng ứng dụng
- **Database data** được lưu trong XAMPP MySQL
- **Logs** được lưu trong thư mục `./logs`