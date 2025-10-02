#!/bin/bash

echo "🚀 Web E-commerce - Backend + Frontend"
echo "====================================="

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Functions
print_success() { echo -e "${GREEN}✅ $1${NC}"; }
print_error() { echo -e "${RED}❌ $1${NC}"; }
print_warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
print_info() { echo -e "${BLUE}ℹ️  $1${NC}"; }

# Kiểm tra Docker
if ! command -v docker &> /dev/null; then
    print_error "Docker chưa được cài đặt"
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    print_error "Docker Compose chưa được cài đặt"
    exit 1
fi

# Kiểm tra XAMPP MySQL
print_info "Kiểm tra XAMPP MySQL..."
if lsof -i :3306 > /dev/null 2>&1; then
    print_success "XAMPP MySQL đang chạy"
else
    print_warning "XAMPP MySQL chưa chạy"
    echo ""
    echo "Vui lòng:"
    echo "1. Mở XAMPP Control Panel"
    echo "2. Start MySQL"
    echo "3. Tạo database 'ecommerce_db' trong phpMyAdmin"
    echo "4. Chạy lại: ./start.sh"
    echo ""
    exit 1
fi

# Tạo thư mục logs
mkdir -p logs

# Dừng containers cũ
print_info "Dừng containers cũ..."
docker-compose down > /dev/null 2>&1

# Build và chạy
print_info "Building và starting Backend + Frontend..."
docker-compose up --build

echo ""
echo "🎉 Ứng dụng đang chạy!"
echo "📱 Frontend: http://localhost:3000"
echo "📱 Backend:  http://localhost:5000"
echo "📱 phpMyAdmin: http://localhost/phpmyadmin"
echo ""
echo "📋 Để dừng: Ctrl+C"
echo "📋 Xem logs: docker-compose logs -f"
echo ""