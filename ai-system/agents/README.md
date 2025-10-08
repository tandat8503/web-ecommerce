# Agent System - Hệ thống Agents cho E-commerce

Hệ thống agents thông minh cho e-commerce với khả năng phân loại request, điều phối agents và tạo báo cáo HTML.

## 🚀 Tính năng

### Agents có sẵn:
- **Customer Service Agent**: Hỗ trợ khách hàng, xử lý khiếu nại
- **Product Expert Agent**: Tư vấn sản phẩm kỹ thuật
- **Sales Assistant Agent**: Trợ lý bán hàng, khuyến mãi
- **Technical Support Agent**: Hỗ trợ kỹ thuật sản phẩm
- **Order Manager Agent**: Quản lý đơn hàng, vận chuyển
- **Recommendation Engine Agent**: Đề xuất sản phẩm
- **Report Writer Agent**: Tạo báo cáo HTML (index.html)

### Chức năng chính:
- Phân loại request tự động
- Điều phối agents thông minh
- Quản lý prompts động
- API REST đầy đủ
- Tạo báo cáo HTML chuyên nghiệp

## 📦 Cài đặt

```bash
# Cài đặt dependencies
make install

# Hoặc cài đặt thủ công
pip install flask flask-cors
```

## 🧪 Testing

```bash
# Chạy tất cả tests
make test

# Test từng component
python ecommerce_agents.py
python prompt_manager.py
python agent_orchestrator.py
```

## 🌐 API Server

### Khởi động API:
```bash
# Chạy trực tiếp
make api

# Chạy trong background
make api-bg

# Chạy thủ công
python agent_api.py --host 0.0.0.0 --port 5003
```

### API Endpoints:

#### 1. Health Check
```bash
GET /health
```

#### 2. List Agents
```bash
GET /agents
```

#### 3. Chat với Agent System
```bash
POST /chat
Content-Type: application/json

{
  "message": "Tôi muốn mua điện thoại iPhone",
  "user_id": "user123",
  "session_id": "session456",
  "context": {
    "customer_name": "Nguyễn Văn A",
    "budget": "20-30 triệu"
  },
  "priority": "medium"
}
```

#### 4. Phân loại Request
```bash
POST /classify
Content-Type: application/json

{
  "message": "Đơn hàng của tôi bị trễ",
  "context": {}
}
```

#### 5. Tạo Báo cáo
```bash
POST /report
Content-Type: application/json

{
  "title": "Báo cáo doanh thu tháng 9",
  "outline": [
    "Tổng quan doanh thu",
    "Phân tích theo sản phẩm",
    "Biểu đồ xu hướng"
  ],
  "data_sources": [
    "sales_data.json",
    "product_data.csv"
  ],
  "highlights": [
    "Doanh thu tăng 15%",
    "Sản phẩm A bán chạy nhất"
  ],
  "audience": "management"
}
```

#### 6. Performance Metrics
```bash
GET /performance
```

#### 7. Request History
```bash
GET /history?limit=10
```

## 🔧 Sử dụng

### 1. Chat với Agent System:
```python
import requests

response = requests.post('http://localhost:5003/chat', json={
    "message": "Tôi cần tư vấn laptop gaming",
    "user_id": "user123",
    "context": {
        "budget": "25-30 triệu",
        "purpose": "gaming"
    }
})

print(response.json())
```

### 2. Tạo Báo cáo:
```python
import requests

response = requests.post('http://localhost:5003/report', json={
    "title": "Báo cáo bán hàng Q3",
    "outline": [
        "Tổng quan Q3",
        "Top sản phẩm",
        "Phân tích xu hướng"
    ],
    "highlights": [
        "Doanh thu tăng 20%",
        "iPhone 15 bán chạy"
    ]
})

print(response.json())
```

## 📊 Monitoring

### Xem logs:
```bash
# Logs API server
tail -f logs/agent_api.log

# Logs real-time
journalctl -f -u agent-api
```

### Performance metrics:
```bash
curl http://localhost:5003/performance
```

## 🛠️ Cấu hình

### Environment Variables:
```bash
export AGENT_API_HOST=0.0.0.0
export AGENT_API_PORT=5003
export AGENT_API_DEBUG=false
```

### Custom Prompts:
```python
from prompt_manager import PromptManager

manager = PromptManager()
manager.add_template("custom_prompt", "Your custom prompt here...")
```

## 🔍 Troubleshooting

### Lỗi thường gặp:

1. **Port đã được sử dụng**:
   ```bash
   lsof -i :5003
   kill -9 <PID>
   ```

2. **Dependencies thiếu**:
   ```bash
   make install
   ```

3. **Agent không phản hồi**:
   ```bash
   # Kiểm tra logs
   tail -f logs/agent_api.log
   
   # Restart API
   make stop
   make api-bg
   ```

## 📈 Mở rộng

### Thêm Agent mới:
1. Thêm vào `ecommerce_agents.py`
2. Cập nhật routing trong `agent_orchestrator.py`
3. Thêm prompt template trong `prompt_manager.py`

### Thêm API endpoint:
1. Thêm route trong `agent_api.py`
2. Cập nhật documentation
3. Thêm tests

## 📝 Changelog

### v1.0.0
- ✅ Hệ thống agents cơ bản
- ✅ Report Writer Agent
- ✅ API REST đầy đủ
- ✅ Prompt management
- ✅ Performance tracking

## 🤝 Contributing

1. Fork repository
2. Tạo feature branch
3. Commit changes
4. Push to branch
5. Tạo Pull Request

## 📄 License

MIT License - Xem file LICENSE để biết thêm chi tiết.
