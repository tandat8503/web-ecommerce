#!/usr/bin/env python3
"""
Setup Script - Script cài đặt hệ thống
Chức năng: Cài đặt môi trường và dependencies
"""

import os
import sys
import subprocess
import platform

def print_banner():
    """In banner hệ thống"""
    print("=" * 80)
    print("🚀 AI LABELING SYSTEM SETUP")
    print("=" * 80)
    print("📊 Hệ thống đánh nhãn dữ liệu AI cho E-commerce")
    print("🔧 Tự động cài đặt môi trường và dependencies")
    print("=" * 80)

def check_python_version():
    """Kiểm tra phiên bản Python"""
    print("🐍 Checking Python version...")
    
    version = sys.version_info
    if version.major < 3 or (version.major == 3 and version.minor < 8):
        print("❌ Python 3.8+ is required!")
        print(f"   Current version: {version.major}.{version.minor}.{version.micro}")
        return False
    
    print(f"✅ Python {version.major}.{version.minor}.{version.micro} is compatible")
    return True

def install_dependencies():
    """Cài đặt dependencies"""
    print("📦 Installing dependencies...")
    
    dependencies = [
        'torch>=2.0.0',
        'transformers>=4.30.0',
        'pandas>=2.0.0',
        'numpy<2.0',
        'scikit-learn>=1.3.0',
        'underthesea>=1.3.0',
        'flask>=2.3.0',
        'sqlite3'
    ]
    
    for dep in dependencies:
        try:
            print(f"   Installing {dep}...")
            subprocess.run([sys.executable, '-m', 'pip', 'install', dep], 
                         check=True, capture_output=True)
            print(f"   ✅ {dep} installed successfully")
        except subprocess.CalledProcessError as e:
            print(f"   ❌ Failed to install {dep}: {e}")
            return False
    
    print("✅ All dependencies installed successfully!")
    return True

def create_directories():
    """Tạo cấu trúc thư mục"""
    print("📁 Creating directory structure...")
    
    directories = [
        'data',
        'models/sentiment',
        'models/chatbot', 
        'models/recommendation',
        'web/templates',
        'web/static',
        'logs',
        'configs'
    ]
    
    for directory in directories:
        os.makedirs(directory, exist_ok=True)
        print(f"   ✅ {directory}")
    
    print("✅ Directory structure created!")

def create_sample_data():
    """Tạo dữ liệu mẫu"""
    print("📊 Creating sample data...")
    
    # Import database manager
    sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    from core.database import DatabaseManager
    
    db_manager = DatabaseManager()
    
    # Tạo dữ liệu sentiment mẫu
    sentiment_samples = [
        "Sản phẩm rất tốt, tôi rất hài lòng với chất lượng",
        "Chất lượng tệ, không đáng tiền bỏ ra",
        "Dịch vụ giao hàng nhanh, đóng gói cẩn thận",
        "Sản phẩm đúng như mô tả, giá cả hợp lý",
        "Không hài lòng với sản phẩm này, chất lượng kém"
    ]
    
    for text in sentiment_samples:
        db_manager.add_data('sentiment', text, {'source': 'sample'})
    
    # Tạo dữ liệu chatbot mẫu
    chatbot_samples = [
        "Xin chào, tôi cần tư vấn về sản phẩm",
        "Sản phẩm này có giá bao nhiêu?",
        "Còn hàng không? Khi nào giao được?",
        "Bảo hành sản phẩm này như thế nào?",
        "Cảm ơn, tạm biệt"
    ]
    
    for text in chatbot_samples:
        db_manager.add_data('chatbot', text, {'source': 'sample'})
    
    # Tạo dữ liệu recommendation mẫu
    for i in range(10):
        db_manager.add_data('recommendation', f'User {i} interaction', 
                          {'user_id': i, 'product_id': i % 5, 'source': 'sample'})
    
    print("✅ Sample data created!")

def create_config_files():
    """Tạo file cấu hình"""
    print("⚙️ Creating configuration files...")
    
    # requirements.txt
    requirements = """torch>=2.0.0
transformers>=4.30.0
pandas>=2.0.0
numpy<2.0
scikit-learn>=1.3.0
underthesea>=1.3.0
flask>=2.3.0
"""
    
    with open('requirements.txt', 'w') as f:
        f.write(requirements)
    
    # README.md
    readme = """# AI Labeling System

Hệ thống đánh nhãn dữ liệu AI cho E-commerce

## Cài đặt

```bash
python3 scripts/setup.py
```

## Chạy hệ thống

```bash
python3 web/app.py
```

Truy cập: http://localhost:5000

## Cấu trúc thư mục

- `core/` - Hệ thống cốt lõi
- `web/` - Giao diện web
- `data/` - Dữ liệu
- `models/` - Models đã train
- `scripts/` - Scripts tiện ích
"""
    
    with open('README.md', 'w') as f:
        f.write(readme)
    
    print("✅ Configuration files created!")

def main():
    """Hàm main"""
    print_banner()
    
    # Kiểm tra Python version
    if not check_python_version():
        return
    
    # Cài đặt dependencies
    if not install_dependencies():
        print("❌ Setup failed!")
        return
    
    # Tạo cấu trúc thư mục
    create_directories()
    
    # Tạo dữ liệu mẫu
    create_sample_data()
    
    # Tạo file cấu hình
    create_config_files()
    
    print("\n🎉 SETUP COMPLETED SUCCESSFULLY!")
    print("=" * 80)
    print("📱 Để chạy hệ thống:")
    print("   python3 web/app.py")
    print("📱 Truy cập: http://localhost:5000")
    print("=" * 80)

if __name__ == "__main__":
    main()
