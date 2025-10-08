# AI System Integration - Hệ thống AI tích hợp cho E-commerce

Hệ thống AI hoàn chỉnh tích hợp với database MySQL từ Prisma schema, cung cấp API cho frontend và khả năng tạo báo cáo HTML chuyên nghiệp.

## 🏗️ Kiến trúc hệ thống

```
ai-system/
├── core/                    # Core components
│   ├── database_connector.py    # MySQL connector từ Prisma schema
│   ├── models.py               # AI models (sentiment, recommendation, chatbot)
│   └── database.py            # Database utilities
├── agents/                   # Agent system
│   ├── ecommerce_agents.py     # 7 agents chuyên biệt + report_writer
│   ├── agent_orchestrator.py   # Phân loại và điều phối agents
│   ├── prompt_manager.py       # Quản lý prompts
│   └── agent_api.py           # REST API cho agents
├── nlp_system/              # NLP system
├── web/                     # Web interface
├── models/                  # Trained AI models
├── data/                    # Training data
├── scripts/                 # Training scripts
├── templates/               # HTML templates cho reports
├── web/generated/           # Generated reports
├── cli.py                   # Command line interface
├── integration_api.py       # API tích hợp cho frontend
├── report_generator.py      # Generator báo cáo HTML
├── Makefile                 # Build commands
├── requirements.txt         # Dependencies
└── env.example             # Environment configuration
```

## 🚀 Cài đặt và khởi chạy

### 1. Cài đặt dependencies
```bash
# Cài đặt tất cả dependencies
make install

# Hoặc cài đặt thủ công
pip install -r requirements.txt
```

### 2. Cấu hình environment
```bash
# Copy file cấu hình
cp env.example .env

# Chỉnh sửa .env với thông tin database của bạn
# DATABASE_URL=mysql://root:password@localhost:3306/ecommerce
# DB_HOST=localhost
# DB_PORT=3306
# DB_USER=root
# DB_PASSWORD=your_password
# DB_NAME=ecommerce
```

### 3. Train AI models
```bash
# Train tất cả models
make train

# Hoặc sử dụng CLI
python cli.py train
```

### 4. Khởi chạy services

#### Option 1: Chạy tất cả APIs cùng lúc
```bash
make all-apis
```

#### Option 2: Chạy từng service riêng
```bash
# Agents API (port 5003)
make agents-api

# NLP API (port 5004)  
make nlp-api

# Web API (port 5005)
make web-api

# Integration API (port 5006)
python integration_api.py
```

#### Option 3: Sử dụng CLI
```bash
# Start agents
python cli.py agents --port 5003

# Start integration API
python cli.py integration --port 5006

# Check status
python cli.py status
```

## 📊 Database Integration

### Kết nối với Prisma Schema
Hệ thống sử dụng `DatabaseConnector` để kết nối trực tiếp với MySQL database từ Prisma schema:

```python
from core.database_connector import DatabaseConnector

db = DatabaseConnector()
db.connect()

# Lấy sản phẩm
products = db.get_products(limit=20)

# Lấy đơn hàng user
orders = db.get_user_orders(user_id=1)

# Phân tích doanh số
analytics = db.get_sales_analytics()
```

### Các bảng được sử dụng:
- `products` - Sản phẩm
- `categories` - Danh mục
- `brands` - Thương hiệu
- `users` - Người dùng
- `orders` - Đơn hàng
- `order_items` - Chi tiết đơn hàng
- `product_reviews` - Đánh giá sản phẩm
- `shopping_cart` - Giỏ hàng
- `wishlist` - Danh sách yêu thích

## 🤖 Agent System

### 7 Agents chuyên biệt:
1. **Customer Service Agent** - Hỗ trợ khách hàng
2. **Product Expert Agent** - Tư vấn sản phẩm
3. **Sales Assistant Agent** - Trợ lý bán hàng
4. **Technical Support Agent** - Hỗ trợ kỹ thuật
5. **Order Manager Agent** - Quản lý đơn hàng
6. **Recommendation Engine Agent** - Đề xuất sản phẩm
7. **Report Writer Agent** - Tạo báo cáo HTML

### Sử dụng Agents:
```bash
# Chat với AI system
curl -X POST http://localhost:5003/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Tôi muốn mua laptop gaming",
    "user_id": "123",
    "context": {"budget": "20-30 triệu"}
  }'

# Tạo báo cáo
curl -X POST http://localhost:5003/report \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Báo cáo doanh số tháng 9",
    "outline": ["Tổng quan", "Top sản phẩm", "Phân tích danh mục"],
    "highlights": ["Tăng trưởng 15%", "iPhone bán chạy"]
  }'
```

## 📈 Report Generation

### Tạo báo cáo HTML chuyên nghiệp:
```python
from report_generator import ReportGenerator

generator = ReportGenerator()

# Báo cáo doanh số
sales_data = {
    "sales_summary": db.get_sales_analytics(),
    "top_products": db.get_top_products(10),
    "category_analytics": db.get_category_analytics()
}

filepath = generator.generate_sales_report(sales_data, "Báo cáo Q3")
```

### Sử dụng CLI:
```bash
# Tạo báo cáo doanh số
python cli.py report --type sales --title "Báo cáo tháng 9"

# Tạo báo cáo sản phẩm
python cli.py report --type product --product-id 123 --title "Báo cáo iPhone 15"
```

## 🌐 API Endpoints cho Frontend

### Integration API (port 5006):

#### Products
- `GET /api/products` - Danh sách sản phẩm
- `GET /api/products/<id>` - Chi tiết sản phẩm
- `GET /api/products/search?q=keyword` - Tìm kiếm sản phẩm

#### Users
- `GET /api/users/<id>` - Thông tin user
- `GET /api/users/<id>/orders` - Đơn hàng của user
- `GET /api/users/<id>/cart` - Giỏ hàng
- `GET /api/users/<id>/wishlist` - Danh sách yêu thích

#### Orders
- `GET /api/orders/<id>` - Chi tiết đơn hàng

#### Analytics
- `GET /api/analytics/sales` - Phân tích doanh số
- `GET /api/analytics/top-products` - Sản phẩm bán chạy
- `GET /api/analytics/categories` - Phân tích danh mục

#### AI Chat
- `POST /api/chat` - Chat với AI system

#### Reports
- `POST /api/reports/sales` - Tạo báo cáo doanh số
- `POST /api/reports/product/<id>` - Tạo báo cáo sản phẩm
- `GET /api/reports/download/<filename>` - Download báo cáo
- `GET /api/reports/view/<filename>` - Xem báo cáo

#### Recommendations
- `GET /api/recommendations/user/<id>` - Gợi ý cho user
- `GET /api/recommendations/product/<id>` - Sản phẩm tương tự

## 🛠️ CLI Commands

```bash
# Training & Testing
python cli.py train                    # Train AI models
python cli.py test                     # Test all systems

# Services
python cli.py agents --port 5003      # Start Agents API
python cli.py nlp --port 5004         # Start NLP API
python cli.py web --port 5005         # Start Web API

# Database Operations
python cli.py list-products --limit 20    # List products
python cli.py search "iPhone" --limit 10  # Search products
python cli.py analytics --start-date 2024-01-01  # Get analytics

# Reports
python cli.py report --type sales --title "Báo cáo Q3"
python cli.py report --type product --product-id 123

# System
python cli.py status                   # Check system status
```

## 🔧 Development

### Cấu trúc dự án:
```
web-ecommerce/
├── ai-system/              # AI System (this)
├── backend/                # Backend API (Node.js/Prisma)
└── frontend/               # Frontend (React)
```

### Tích hợp với Frontend:
```javascript
// Frontend có thể gọi API từ ai-system
const response = await fetch('http://localhost:5006/api/products');
const products = await response.json();

// Chat với AI
const chatResponse = await fetch('http://localhost:5006/api/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    message: 'Tôi cần tư vấn laptop',
    user_id: 123
  })
});
```

### Tích hợp với Backend:
```javascript
// Backend có thể gọi AI system để phân tích
const aiResponse = await fetch('http://localhost:5006/api/analytics/sales');
const analytics = await aiResponse.json();
```

## 📊 Monitoring & Logs

### Xem logs:
```bash
# Agents API
tail -f logs/agents_api.log

# NLP API  
tail -f logs/nlp_api.log

# Web API
tail -f logs/web_api.log

# Integration API
tail -f logs/integration_api.log
```

### Health checks:
```bash
# Check tất cả services
python cli.py status

# Check từng service
curl http://localhost:5003/health  # Agents
curl http://localhost:5004/health  # NLP
curl http://localhost:5005/health  # Web
curl http://localhost:5006/health  # Integration
```

## 🚀 Production Deployment

### 1. Cấu hình production:
```bash
# Copy và chỉnh sửa .env cho production
cp env.example .env.production

# Cập nhật database URL, API keys, etc.
```

### 2. Chạy với PM2 (Node.js process manager):
```bash
# Install PM2
npm install -g pm2

# Start all services
pm2 start ecosystem.config.js

# Monitor
pm2 monit
```

### 3. Docker deployment:
```dockerfile
# Dockerfile cho ai-system
FROM python:3.9-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
EXPOSE 5006
CMD ["python", "integration_api.py"]
```

## 🔍 Troubleshooting

### Lỗi thường gặp:

1. **Database connection failed**:
   ```bash
   # Kiểm tra MySQL service
   sudo systemctl status mysql
   
   # Kiểm tra connection string trong .env
   # DATABASE_URL=mysql://user:password@host:port/database
   ```

2. **Port already in use**:
   ```bash
   # Tìm process sử dụng port
   lsof -i :5003
   
   # Kill process
   kill -9 <PID>
   ```

3. **Models not found**:
   ```bash
   # Train lại models
   python cli.py train
   ```

4. **Permission denied**:
   ```bash
   # Cấp quyền cho thư mục
   chmod -R 755 ai-system/
   ```

## 📝 Changelog

### v2.0.0 - Integration Release
- ✅ Database connector cho MySQL từ Prisma schema
- ✅ Report generator với HTML + Jinja2 + Tailwind
- ✅ CLI tool hoàn chỉnh
- ✅ Integration API cho frontend
- ✅ 7 agents chuyên biệt + report_writer
- ✅ Tích hợp với web-ecommerce project

### v1.0.0 - Initial Release
- ✅ Basic AI models (sentiment, recommendation, chatbot)
- ✅ Agent system
- ✅ NLP system
- ✅ Web interface

## 🤝 Contributing

1. Fork repository
2. Tạo feature branch: `git checkout -b feature/new-feature`
3. Commit changes: `git commit -am 'Add new feature'`
4. Push to branch: `git push origin feature/new-feature`
5. Tạo Pull Request

## 📄 License

MIT License - Xem file LICENSE để biết thêm chi tiết.

---

## 🎯 Quick Start

```bash
# 1. Cài đặt
cd ai-system
make install

# 2. Cấu hình
cp env.example .env
# Chỉnh sửa .env với database info

# 3. Train models
make train

# 4. Start all services
make all-apis

# 5. Test
python cli.py status
```

**🎉 Hệ thống AI đã sẵn sàng tích hợp với web-ecommerce!**
