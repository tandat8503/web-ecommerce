# 🔧 Hướng dẫn cài đặt Java cho PlantUML

## ❌ Lỗi hiện tại

PlantUML extension cần **Java Runtime Environment (JRE)** để render diagrams, nhưng Java chưa được cài đặt trên máy của bạn.

**Lỗi:** `Unable to locate a Java Runtime`

## ✅ Giải pháp

### Cách 1: Cài Java JDK qua Homebrew (Khuyến nghị)

Mở Terminal và chạy:

```bash
# Fix quyền (nếu cần)
sudo chown -R $(whoami) /usr/local/share/man/man8
chmod u+w /usr/local/share/man/man8

# Cài Java JDK 17
brew install openjdk@17

# Link Java vào system path
sudo ln -sfn /opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk /Library/Java/JavaVirtualMachines/openjdk-17.jdk

# Thêm vào PATH (thêm vào ~/.zshrc hoặc ~/.bash_profile)
echo 'export PATH="/opt/homebrew/opt/openjdk@17/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc

# Kiểm tra
java -version
```

### Cách 2: Cài Java JRE từ Oracle (Đơn giản hơn)

1. Truy cập: https://www.java.com/download/
2. Tải Java JRE cho macOS
3. Cài đặt file `.dmg` đã tải
4. Khởi động lại VS Code

### Cách 3: Cài Java JDK từ Oracle

1. Truy cập: https://www.oracle.com/java/technologies/downloads/
2. Tải JDK 17 hoặc 21 cho macOS
3. Cài đặt và thêm vào PATH

## 🔍 Kiểm tra Java đã cài

Sau khi cài, kiểm tra bằng lệnh:

```bash
java -version
```

Kết quả mong đợi:
```
openjdk version "17.0.x" ...
```

## 🎨 Sử dụng PlantUML sau khi cài Java

1. **Khởi động lại VS Code** (quan trọng!)
2. Mở file `.puml` trong thư mục `diagrams/class-diagram/`
3. Nhấn `Alt + D` hoặc `Cmd + Shift + P` → "PlantUML: Preview Current Diagram"
4. Diagram sẽ hiển thị!

## 🔄 Giải pháp thay thế (Không cần Java)

Nếu không muốn cài Java, bạn có thể:

### Option 1: Dùng PlantUML Online
1. Truy cập: https://www.plantuml.com/plantuml/uml/
2. Copy nội dung file `.puml`
3. Paste vào editor
4. Xem và export diagram

### Option 2: Dùng VS Code Extension khác
- **Markdown Preview Mermaid Support**: Dùng Mermaid thay vì PlantUML
- **Draw.io Integration**: Dùng Draw.io (không cần Java)

### Option 3: Export bằng Docker
```bash
docker run --rm -i -v "$(pwd):/work" plantuml/plantuml:latest -tpng diagrams/class-diagram/backend-class-diagram.puml
```

## 📝 Lưu ý

- **macOS 13 (Ventura)**: Có thể cần cài Java theo cách thủ công
- **Homebrew**: Nếu gặp lỗi permission, chạy lệnh fix quyền trước
- **VS Code**: Phải khởi động lại sau khi cài Java để extension nhận diện

## 🆘 Vẫn gặp lỗi?

1. Kiểm tra Java đã được cài: `java -version`
2. Kiểm tra PATH: `echo $PATH`
3. Khởi động lại VS Code
4. Kiểm tra PlantUML extension settings trong VS Code
5. Thử dùng PlantUML Online như giải pháp tạm thời

