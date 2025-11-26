#!/bin/bash

# Script cài đặt Java cho PlantUML
# Chạy script này trong Terminal: bash install-java.sh

echo "🚀 Bắt đầu cài đặt Java..."

# Kiểm tra Java đã cài chưa
if command -v java &> /dev/null; then
    echo "✅ Java đã được cài đặt:"
    java -version
    exit 0
fi

# Option 1: Cài qua Homebrew Cask (Khuyến nghị - dễ nhất)
echo ""
echo "📦 Đang cài Java qua Homebrew..."
echo "⚠️  Bạn sẽ được yêu cầu nhập password để cài đặt"
echo ""

# Cài Temurin (Eclipse Adoptium) - Java LTS
brew install --cask temurin

# Kiểm tra lại
if command -v java &> /dev/null; then
    echo ""
    echo "✅ Java đã được cài đặt thành công!"
    java -version
    echo ""
    echo "🎉 Hoàn tất! Bây giờ bạn có thể:"
    echo "   1. Khởi động lại VS Code"
    echo "   2. Mở file .puml và nhấn Alt+D để preview"
else
    echo ""
    echo "❌ Cài đặt thất bại. Vui lòng thử cách khác:"
    echo ""
    echo "Cách 2: Tải Java từ Oracle"
    echo "   1. Truy cập: https://www.java.com/download/"
    echo "   2. Tải Java JRE cho macOS"
    echo "   3. Cài đặt file .dmg"
    echo "   4. Khởi động lại VS Code"
    echo ""
    echo "Hoặc dùng PlantUML Online:"
    echo "   https://www.plantuml.com/plantuml/uml/"
fi

