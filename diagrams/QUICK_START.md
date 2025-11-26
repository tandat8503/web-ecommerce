# ⚡ Quick Start - Cài Java cho PlantUML

## 🎯 Cách nhanh nhất

### Bước 1: Chạy script tự động

Mở Terminal và chạy:

```bash
cd /Users/macbookpro/Workspace/web-ecommerce/diagrams
bash install-java.sh
```

Script sẽ:
- Kiểm tra Java đã cài chưa
- Tự động cài Java qua Homebrew
- Yêu cầu bạn nhập password khi cần

### Bước 2: Khởi động lại VS Code

Sau khi cài xong Java:
1. **Đóng hoàn toàn VS Code** (Cmd + Q)
2. Mở lại VS Code
3. Mở file `.puml` trong `diagrams/class-diagram/`
4. Nhấn `Alt + D` để preview diagram

## 🔄 Hoặc cài thủ công

### Cách 1: Homebrew (Terminal)

```bash
brew install --cask temurin
```

### Cách 2: Tải từ Oracle (GUI)

1. Truy cập: **https://www.java.com/download/**
2. Click "Download Java for Mac"
3. Mở file `.dmg` đã tải
4. Chạy installer
5. Khởi động lại VS Code

## ✅ Kiểm tra Java đã cài

```bash
java -version
```

Kết quả mong đợi:
```
openjdk version "17.0.x" ...
hoặc
java version "21.0.x" ...
```

## 🎨 Sử dụng PlantUML

1. Mở file `.puml` trong VS Code
2. Nhấn `Alt + D` → Preview diagram
3. Hoặc `Cmd + Shift + P` → "PlantUML: Preview Current Diagram"

## 🆘 Vẫn không được?

- Đảm bảo đã **khởi động lại VS Code** sau khi cài Java
- Kiểm tra Java: `java -version`
- Thử dùng PlantUML Online: https://www.plantuml.com/plantuml/uml/

