# Prompts for Web-ecommerce AI System

## 🎯 **Tổng quan**

Hệ thống sử dụng **prompts tiếng Anh** để đảm bảo LLM hiểu tốt nhất, nhưng **AI sẽ trả lời bằng tiếng Việt** cho user.

## 🔄 **Cách hoạt động**

### **1. Prompts (English)**
- ✅ **System prompts** viết bằng tiếng Anh
- ✅ **Instructions** rõ ràng và chi tiết
- ✅ **Keywords** tiếng Anh để LLM hiểu tốt
- ✅ **Format** chuẩn quốc tế

### **2. Responses (Vietnamese)**
- ✅ **AI trả lời bằng tiếng Việt** cho user
- ✅ **User experience** tốt hơn
- ✅ **Dễ hiểu** cho người dùng Việt Nam
- ✅ **Tự nhiên** và thân thiện

## 📝 **Cấu trúc Prompts**

### **1. System Prompts**
```python
USER_CHATBOT_SYSTEM_PROMPT = """
You are a User Chatbot Agent specialized in product consultation...
Core Capabilities:
- Product search and recommendations
- Price inquiries and comparisons
Operating Rules:
- ALWAYS respond in Vietnamese for better customer experience
- Never make up or guess product information
"""
```

### **2. Response Formatting**
```python
RESPONSE_FORMATTING_PROMPT = """
When responding to users, please follow these guidelines:
1. **Always respond in Vietnamese** - This is crucial for user experience
2. **Use clear, friendly language** - Professional but approachable
3. **Include relevant data** - Show numbers, percentages, and specific information
"""
```

## 🤖 **Các Agent Prompts**

### **1. UserChatbotAgent**
- **Mục đích**: Tư vấn sản phẩm cho khách hàng
- **Prompt**: English với instruction "ALWAYS respond in Vietnamese"
- **Response**: Tiếng Việt thân thiện

### **2. AdminChatbotAgent**
- **Mục đích**: Business intelligence cho admin
- **Prompt**: English với instruction "ALWAYS respond in Vietnamese"
- **Response**: Tiếng Việt chuyên nghiệp

### **3. SentimentAnalyzerAgent**
- **Mục đích**: Phân tích cảm xúc khách hàng
- **Prompt**: English với instruction "ALWAYS respond in Vietnamese"
- **Response**: Tiếng Việt phân tích

### **4. BusinessAnalystAgent**
- **Mục đích**: Phân tích KPI và metrics
- **Prompt**: English với instruction "ALWAYS respond in Vietnamese"
- **Response**: Tiếng Việt báo cáo

## 🎯 **Ví dụ cụ thể**

### **Input (Vietnamese):**
```
User: "Tìm laptop gaming giá dưới 10 triệu"
```

### **Processing:**
```
1. Orchestrator nhận request
2. Chọn UserChatbotAgent
3. Agent phân tích intent: "product_search"
4. Gọi MCP tool: search_products()
5. LLM nhận English prompt + Vietnamese instruction
6. Tạo response bằng tiếng Việt
```

### **Output (Vietnamese):**
```
"Tôi tìm thấy 3 laptop gaming phù hợp với ngân sách của bạn:

1. **Laptop Gaming A** - 8,500,000 VND
   - CPU: Intel i7, RAM: 16GB, GPU: RTX 3060
   - Phù hợp cho gaming và công việc

2. **Laptop Gaming B** - 9,200,000 VND
   - CPU: AMD Ryzen 7, RAM: 32GB, GPU: RTX 3070
   - Hiệu suất cao, giá trị tốt

3. **Laptop Gaming C** - 9,800,000 VND
   - CPU: Intel i9, RAM: 32GB, GPU: RTX 3080
   - Flagship, hiệu suất tối đa

Bạn muốn xem chi tiết sản phẩm nào?"
```

## 🔧 **Cách test**

### **1. Test Prompts:**
```bash
python test_prompts.py
```

### **2. Test Specific Scenarios:**
```python
# Test product search
result = await orchestrator.process_request(
    user_message="Tìm laptop gaming",
    user_type="user"
)

# Test revenue analysis
result = await orchestrator.process_request(
    user_message="Báo cáo doanh thu",
    user_type="admin"
)
```

## 📊 **Lợi ích**

### **1. LLM Performance:**
- ✅ **Hiểu tốt hơn** - English prompts có nhiều training data
- ✅ **Chính xác hơn** - LLM xử lý English tốt hơn
- ✅ **Consistent** - Tất cả prompts đều English
- ✅ **Maintainable** - Dễ maintain và debug

### **2. User Experience:**
- ✅ **Thân thiện** - AI trả lời bằng tiếng Việt
- ✅ **Dễ hiểu** - User không cần dịch
- ✅ **Tự nhiên** - Giao tiếp như người Việt
- ✅ **Professional** - Vẫn chuyên nghiệp

### **3. Development:**
- ✅ **Best of both worlds** - English prompts + Vietnamese responses
- ✅ **Scalable** - Dễ thêm prompts mới
- ✅ **Flexible** - Có thể thay đổi ngôn ngữ response
- ✅ **Maintainable** - Code clean và dễ hiểu

## 🎯 **Kết quả**

- ✅ **Prompts tiếng Anh** - LLM hiểu tốt nhất
- ✅ **Responses tiếng Việt** - User experience tốt
- ✅ **Performance cao** - LLM xử lý nhanh và chính xác
- ✅ **Maintainable** - Dễ maintain và extend
- ✅ **Scalable** - Có thể scale theo nhu cầu

---

**Hệ thống AI e-commerce với English prompts và Vietnamese responses! 🎉**
