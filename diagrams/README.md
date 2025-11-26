# 📊 UML Diagrams - Web E-commerce Project

Thư mục này chứa các UML diagrams cho project web-ecommerce, được tạo bằng PlantUML.

## 📁 Cấu trúc thư mục

```
diagrams/
├── class-diagram/          # Class Diagrams
│   ├── backend-class-diagram.puml
│   ├── frontend-class-diagram.puml
│   ├── ai-class-diagram.puml
│   └── complete-class-diagram.puml
├── sequence-diagram/       # Sequence Diagrams (sẽ tạo sau)
├── component-diagram/      # Component Diagrams (sẽ tạo sau)
├── use-case-diagram/       # Use Case Diagrams (sẽ tạo sau)
└── activity-diagram/       # Activity Diagrams (sẽ tạo sau)
```

## 🎨 Class Diagrams

### 1. Backend Class Diagram
**File:** `class-diagram/backend-class-diagram.puml`

Mô tả cấu trúc classes trong Backend:
- **Controllers**: AuthController, OrderController, PaymentController, AdminProductController, etc.
- **Services**: MoMoService, EmailService
- **Middleware**: AuthMiddleware, UploadMiddleware, ValidateMiddleware
- **Utils**: FullTextSearch, Logger, Slugify
- **Validators**: ProductValidator, OrderValidator, AddressValidator
- **Routes**: Routes configuration và các route modules

### 2. Frontend Class Diagram
**File:** `class-diagram/frontend-class-diagram.puml`

Mô tả cấu trúc classes trong Frontend:
- **Pages**: UserPages (Home, Product, Cart, Checkout) và AdminPages
- **Components**: ProductCard, BannerSlider, RatingStars, CartButton, etc.
- **Hooks**: useAuth, useCart, useWishlist, useCheckout, useAdminCRUD
- **Stores**: CartStore (Zustand), WishlistStore (Zustand)
- **API Clients**: AxiosClient và các API modules
- **Utils**: AuthUtils, SocketClient, Logger

### 3. AI System Class Diagram
**File:** `class-diagram/ai-class-diagram.puml`

Mô tả cấu trúc classes trong AI System:
- **FastAPI App**: Main application với endpoints
- **Agents**: BaseAgent và các specialized agents (UserChatbot, AdminChatbot, SentimentAnalyzer, etc.)
- **MCP Tools**: 8 tools (search_products, analyze_sentiment, get_revenue_analytics, etc.)
- **Services**: ProductSearchService, SentimentService, AnalystService, ModerationService, ReportGeneratorService
- **Core**: LLMClient, DatabasePool, Config, Logger

### 4. Complete Class Diagram
**File:** `class-diagram/complete-class-diagram.puml`

Tổng hợp toàn bộ hệ thống:
- Frontend (React)
- Backend (Node.js/Express)
- AI System (Python/FastAPI)
- Database (MySQL/Prisma)
- External Services (MoMo, Cloudinary, Email)

## 🛠️ Cách sử dụng

### ⚠️ Quan trọng: Cài đặt Java

**PlantUML cần Java Runtime Environment (JRE) để hoạt động!**

Nếu gặp lỗi `Unable to locate a Java Runtime`, xem hướng dẫn chi tiết trong file:
👉 **[JAVA_SETUP_GUIDE.md](./JAVA_SETUP_GUIDE.md)**

**Cài nhanh:**
```bash
# Cài Java JDK 17
brew install openjdk@17

# Hoặc tải từ: https://www.java.com/download/
```

### ⚠️ Quan trọng: Cài Graphviz (Dot)

PlantUML sử dụng **Graphviz** để vẽ sơ đồ (`dot` executable). Nếu preview báo lỗi kiểu
`Cannot find Graphviz /opt/local/bin/dot`, hãy:

```bash
# Cài Graphviz
brew install graphviz

# Kiểm tra đường dẫn dot
/usr/local/opt/graphviz/bin/dot -V

# (Tuỳ chọn) Tạo symlink để VS Code dễ nhận
sudo ln -s /usr/local/opt/graphviz/bin/dot /usr/local/bin/dot
```

Trong VS Code:
1. `Cmd + ,` → tìm "PlantUML: Graphviz Dot"
2. Điền đường dẫn `/usr/local/opt/graphviz/bin/dot`
3. Reload VS Code nếu cần

### Cài đặt PlantUML Extension trong VS Code

1. Mở VS Code
2. Tìm extension "PlantUML" (by jebbs)
3. Cài đặt extension
4. **Khởi động lại VS Code** sau khi cài Java

### Xem và Export Diagrams

1. **Mở file .puml** trong VS Code
2. **Preview**: Nhấn `Alt + D` hoặc `Cmd + Shift + P` → "PlantUML: Preview Current Diagram"
3. **Export PNG**: `Cmd + Shift + P` → "PlantUML: Export Current Diagram"
4. **Export SVG**: Tương tự, chọn format SVG

### Online Viewer (nếu không dùng VS Code)

1. Truy cập: https://www.plantuml.com/plantuml/uml/
2. Copy nội dung file .puml
3. Paste vào editor
4. Xem diagram

## 📝 Ghi chú

- Tất cả diagrams sử dụng PlantUML syntax
- Diagrams được tối ưu cho readability và maintainability
- Màu sắc được phân biệt theo module (Backend/Frontend/AI/Database)
- Relationships được thể hiện rõ ràng với arrows và labels

## 🔄 Cập nhật Diagrams

Khi có thay đổi trong code:
1. Cập nhật file .puml tương ứng
2. Preview để kiểm tra
3. Export lại nếu cần
4. Commit changes vào git

## 📚 Tài liệu tham khảo

- [PlantUML Documentation](https://plantuml.com/)
- [PlantUML Class Diagram Guide](https://plantuml.com/class-diagram)
- [VS Code PlantUML Extension](https://marketplace.visualstudio.com/items?itemName=jebbs.plantuml)

