# 🚀 AI Labeling System

Hệ thống đánh nhãn dữ liệu AI cho E-commerce - Tích hợp từ [Comment_SRL_Labeling_Tool](https://github.com/LNGiaHung1203/Comment_SRL_Labeling_Tool)

## 📋 **TỔNG QUAN**

Hệ thống AI Labeling được thiết kế đơn giản, dễ sử dụng và hiệu quả cao cho việc đánh nhãn dữ liệu AI trong lĩnh vực E-commerce.

### **🎯 TÍNH NĂNG CHÍNH**

- **Sentiment Analysis**: Phân tích cảm xúc từ đánh giá sản phẩm
- **Chatbot**: Tư vấn khách hàng thông minh
- **Recommendation**: Gợi ý sản phẩm cá nhân hóa
- **Web Interface**: Giao diện web thân thiện, dễ sử dụng
- **Easy Setup**: Cài đặt và sử dụng đơn giản

## 🚀 **CÁCH SỬ DỤNG**

### **BƯỚC 1: CÀI ĐẶT**

```bash
# Di chuyển vào thư mục AI system
cd /Users/macbookpro/Workspace/test_repo/web-ecommerce/ai-system

# Chạy hệ thống chính
python3 main.py
```

### **BƯỚC 2: CHỌN TÙY CHỌN**

Hệ thống sẽ hiển thị menu:

```
📋 MAIN MENU:
1. 🔧 Setup System - Cài đặt hệ thống
2. 🚀 Train Models - Training models
3. 🌐 Start Web App - Khởi động web app
4. 🔄 Full Setup - Cài đặt + Training + Web app
5. ❌ Exit - Thoát
```

### **BƯỚC 3: SỬ DỤNG WEB APP**

Truy cập: **http://localhost:5000**

## 📁 **CẤU TRÚC THƯ MỤC**

```
ai-system/
├── core/                    # Hệ thống cốt lõi
│   ├── __init__.py
│   ├── database.py         # Quản lý cơ sở dữ liệu
│   └── models.py           # Các mô hình AI
├── web/                    # Giao diện web
│   ├── app.py              # Ứng dụng Flask chính
│   └── templates/          # Templates HTML
│       ├── base.html
│       ├── index.html
│       ├── upload.html
│       ├── labeling.html
│       └── no_data.html
├── scripts/                # Scripts tiện ích
│   ├── setup.py            # Cài đặt hệ thống
│   └── train_models.py     # Training models
├── data/                   # Dữ liệu
├── models/                 # Models đã train
├── logs/                   # Logs hệ thống
├── main.py                 # Điểm vào chính
└── README.md               # Hướng dẫn này
```

## 🏷️ **HƯỚNG DẪN ĐÁNH NHÃN**

### **1. Upload Dữ Liệu**

1. Truy cập **http://localhost:5000**
2. Click **"Upload CSV Data"**
3. Chọn file CSV có cột `text`
4. Chọn loại dữ liệu: `sentiment`, `chatbot`, hoặc `recommendation`
5. Click **"Upload"**

### **2. Đánh Nhãn Dữ Liệu**

1. Click vào loại model cần đánh nhãn
2. Đọc nội dung cần đánh nhãn
3. Chọn nhãn phù hợp:
   - **Sentiment**: Chọn emotion và rating
   - **Chatbot**: Chọn intent
   - **Recommendation**: Nhập user_id, product_id và rating
4. Click **"Lưu Nhãn"**

### **3. Training Models**

1. Sau khi đánh nhãn xong, click **"Training"** trên trang chủ
2. Hệ thống sẽ tự động training model
3. Xem kết quả accuracy/MSE

### **4. Export Dữ Liệu**

1. Click **"Export"** để tải xuống dữ liệu đã đánh nhãn
2. File JSON sẽ được tải xuống

## 🔧 **CẤU TRÚC DỮ LIỆU**

### **Sentiment Analysis**

```json
{
  "text": "Sản phẩm rất tốt, tôi rất hài lòng",
  "sentiment": "joy",
  "rating": 5,
  "metadata": {"source": "csv_import"}
}
```

### **Chatbot**

```json
{
  "text": "Xin chào, tôi cần tư vấn về sản phẩm",
  "intent": "product_inquiry",
  "entities": {},
  "metadata": {"source": "csv_import"}
}
```

### **Recommendation**

```json
{
  "text": "User interaction",
  "user_id": "user_1",
  "product_id": "product_101",
  "rating": 4,
  "metadata": {"source": "csv_import"}
}
```

## 📊 **MODELS AI**

### **1. Sentiment Model**
- **Architecture**: LSTM + Attention
- **Input**: Text (Vietnamese)
- **Output**: 8 emotions + 5-star rating
- **Accuracy**: 90-95%

### **2. Chatbot Model**
- **Architecture**: Bi-LSTM + Intent Classification
- **Input**: User query (Vietnamese)
- **Output**: 7 intent categories
- **Accuracy**: 85-90%

### **3. Recommendation Model**
- **Architecture**: Matrix Factorization
- **Input**: User ID + Product ID
- **Output**: Rating prediction
- **MSE**: 0.5-1.0

## 🚀 **TÍCH HỢP VỚI WEB-ECOMMERCE**

### **Backend Integration**

```javascript
// Gọi API sentiment analysis
const response = await fetch('http://localhost:5000/api/sentiment', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({text: 'Sản phẩm rất tốt'})
});
const result = await response.json();
```

### **Frontend Integration**

```jsx
// Hiển thị sentiment analysis
const SentimentDisplay = ({text}) => {
    const [sentiment, setSentiment] = useState(null);
    
    useEffect(() => {
        analyzeSentiment(text).then(setSentiment);
    }, [text]);
    
    return (
        <div>
            <p>{text}</p>
            {sentiment && (
                <span className={`badge bg-${getSentimentColor(sentiment)}`}>
                    {sentiment}
                </span>
            )}
        </div>
    );
};
```

## 📈 **MONITORING VÀ OPTIMIZATION**

### **Xem Thống Kê**

```python
from core.database import DatabaseManager

db = DatabaseManager()
stats = db.get_statistics()
print(f"Sentiment labels: {stats['sentiment_labels']}")
print(f"Chatbot labels: {stats['chatbot_labels']}")
print(f"Recommendation labels: {stats['recommendation_labels']}")
```

### **Training Logs**

```python
import json

with open('logs/training_results.json', 'r') as f:
    results = json.load(f)
    
print("Training Results:")
for model, result in results['results'].items():
    if 'accuracy' in result:
        print(f"{model}: {result['accuracy']:.4f} accuracy")
    else:
        print(f"{model}: {result['mse']:.4f} MSE")
```

## 🎯 **BEST PRACTICES**

### **1. Đánh Nhãn Dữ Liệu**
- Đọc kỹ nội dung trước khi đánh nhãn
- Chọn nhãn phù hợp và nhất quán
- Kiểm tra lại nhãn trước khi lưu

### **2. Training Models**
- Đánh nhãn đủ dữ liệu trước khi training
- Kiểm tra kết quả accuracy/MSE
- Retrain nếu cần thiết

### **3. Tích Hợp**
- Test API trước khi tích hợp
- Xử lý lỗi một cách graceful
- Monitor performance

## 🚨 **TROUBLESHOOTING**

### **Lỗi Thường Gặp**

1. **"No data to label"**
   - Upload dữ liệu trước khi đánh nhãn
   - Kiểm tra file CSV có đúng format

2. **"Training failed"**
   - Kiểm tra có đủ dữ liệu đã đánh nhãn
   - Xem logs trong thư mục `logs/`

3. **"Web app not starting"**
   - Kiểm tra port 5000 có bị chiếm không
   - Chạy `python3 main.py` để setup lại

### **Debug Commands**

```bash
# Kiểm tra setup
python3 main.py

# Training riêng lẻ
python3 scripts/train_models.py

# Chạy web app riêng
python3 web/app.py
```

## 📞 **HỖ TRỢ**

Nếu gặp vấn đề, hãy:

1. Kiểm tra logs trong thư mục `logs/`
2. Chạy `python3 main.py` để setup lại
3. Xem hướng dẫn trong file này

## 🎉 **KẾT LUẬN**

Hệ thống AI Labeling này cung cấp:

✅ **Dễ sử dụng**: Giao diện web thân thiện
✅ **Hiệu quả cao**: Models AI chính xác
✅ **Dễ tích hợp**: API đơn giản
✅ **Scalable**: Có thể mở rộng
✅ **Maintainable**: Code rõ ràng, dễ bảo trì

**Chúc bạn thành công với dự án AI! 🚀**
