#!/bin/bash

# Script fix Graphviz installation

echo "🔧 Đang dừng các process brew đang chạy..."

# Kill các process brew install
pkill -f "brew.rb install" 2>/dev/null
pkill -f "Homebrew/build.rb" 2>/dev/null

echo "⏳ Đợi 2 giây để process dừng hoàn toàn..."
sleep 2

echo "🧹 Đang xóa lock files..."
rm -rf /usr/local/Homebrew/var/homebrew/locks/* 2>/dev/null
rm -rf /usr/local/Cellar/.brew/subversion 2>/dev/null 2>/dev/null

echo "📦 Đang cài subversion..."
brew install subversion

if [ $? -eq 0 ]; then
    echo "✅ Subversion đã được cài thành công!"
    echo ""
    echo "📦 Đang cài graphviz..."
    brew install graphviz
    
    if [ $? -eq 0 ]; then
        echo "✅ Graphviz đã được cài thành công!"
        echo ""
        echo "🔗 Đang tạo symlink cho dot..."
        sudo ln -sf /usr/local/opt/graphviz/bin/dot /usr/local/bin/dot 2>/dev/null
        
        echo ""
        echo "✅ Kiểm tra dot:"
        /usr/local/opt/graphviz/bin/dot -V 2>&1 | head -1
        
        echo ""
        echo "🎉 Hoàn tất! Bây giờ bạn có thể:"
        echo "   1. Khởi động lại VS Code"
        echo "   2. Mở file .puml và nhấn Alt+D"
    else
        echo "❌ Cài graphviz thất bại"
    fi
else
    echo "❌ Cài subversion thất bại"
fi

