#!/usr/bin/env python3
"""
Main Entry Point - Điểm vào chính của hệ thống
Chức năng: Khởi động toàn bộ hệ thống AI
"""

import os
import sys
import subprocess
from datetime import datetime

def print_banner():
    """In banner hệ thống"""
    print("=" * 80)
    print("🚀 AI LABELING SYSTEM")
    print("=" * 80)
    print("📊 Hệ thống đánh nhãn dữ liệu AI cho E-commerce")
    print("🔧 Tích hợp từ Comment_SRL_Labeling_Tool")
    print("=" * 80)
    print("📱 Features:")
    print("   • Sentiment Analysis - Phân tích cảm xúc")
    print("   • Chatbot - Tư vấn khách hàng")
    print("   • Recommendation - Gợi ý sản phẩm")
    print("   • Web Interface - Giao diện web thân thiện")
    print("   • Easy Setup - Cài đặt đơn giản")
    print("=" * 80)

def check_setup():
    """Kiểm tra setup hệ thống"""
    print("🔍 Checking system setup...")
    
    # Kiểm tra Python version
    if sys.version_info < (3, 8):
        print("❌ Python 3.8+ is required!")
        return False
    
    # Kiểm tra thư mục cần thiết
    required_dirs = ['core', 'web', 'data', 'models', 'scripts']
    for directory in required_dirs:
        if not os.path.exists(directory):
            print(f"❌ Directory {directory} not found!")
            return False
    
    # Kiểm tra file cần thiết
    required_files = [
        'core/database.py',
        'core/models.py',
        'web/app.py',
        'scripts/setup.py',
        'scripts/train_models.py'
    ]
    
    for file_path in required_files:
        if not os.path.exists(file_path):
            print(f"❌ File {file_path} not found!")
            return False
    
    print("✅ System setup is correct!")
    return True

def run_setup():
    """Chạy setup hệ thống"""
    print("🔧 Running system setup...")
    
    try:
        subprocess.run([sys.executable, 'scripts/setup.py'], check=True)
        print("✅ Setup completed successfully!")
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ Setup failed: {e}")
        return False

def run_training():
    """Chạy training models"""
    print("🚀 Running model training...")
    
    try:
        subprocess.run([sys.executable, 'scripts/train_models.py'], check=True)
        print("✅ Training completed successfully!")
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ Training failed: {e}")
        return False

def start_web_app():
    """Khởi động web app"""
    print("🌐 Starting web application...")
    
    try:
        subprocess.run([sys.executable, 'web/app.py'], check=True)
    except KeyboardInterrupt:
        print("\n👋 Web app stopped by user")
    except subprocess.CalledProcessError as e:
        print(f"❌ Web app failed: {e}")

def show_menu():
    """Hiển thị menu chính"""
    print("\n📋 MAIN MENU:")
    print("1. 🔧 Setup System - Cài đặt hệ thống")
    print("2. 🚀 Train Models - Training models")
    print("3. 🌐 Start Web App - Khởi động web app")
    print("4. 🔄 Full Setup - Cài đặt + Training + Web app")
    print("5. ❌ Exit - Thoát")
    
    while True:
        try:
            choice = input("\n👉 Chọn tùy chọn (1-5): ").strip()
            
            if choice == '1':
                run_setup()
                break
            elif choice == '2':
                run_training()
                break
            elif choice == '3':
                start_web_app()
                break
            elif choice == '4':
                print("🔄 Running full setup...")
                if run_setup():
                    if run_training():
                        start_web_app()
                break
            elif choice == '5':
                print("👋 Goodbye!")
                break
            else:
                print("❌ Invalid choice! Please select 1-5")
        except KeyboardInterrupt:
            print("\n👋 Goodbye!")
            break

def main():
    """Hàm main"""
    print_banner()
    
    # Kiểm tra setup
    if not check_setup():
        print("\n🔧 System needs setup. Running setup...")
        if not run_setup():
            print("❌ Setup failed! Please check the errors above.")
            return
    
    # Hiển thị menu
    show_menu()

if __name__ == "__main__":
    main()
