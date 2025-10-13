# 🤖 Chatbot Module

Thư mục này chứa các scripts liên quan đến chatbot thông minh với MySQL integration.

## 📁 Files:

### `setup_chatbot.py`
- **Chức năng**: Setup chatbot với RAG system và MySQL integration
- **Sử dụng**: `python setup_chatbot.py`
- **Features**: 
  - MySQL connector
  - SimpleLLM với product validation
  - RAG system với knowledge base

### `chatbot_interactive.py`
- **Chức năng**: Interactive chatbot chat với MySQL data
- **Sử dụng**: `python chatbot_interactive.py`
- **Features**:
  - Real-time chat interface
  - Product search từ database
  - Session management

### `chatbot_demo.py`
- **Chức năng**: Demo chatbot capabilities
- **Sử dụng**: `python chatbot_demo.py`
- **Features**:
  - Test conversation flows
  - Knowledge base testing
  - Performance demonstration

## 🚀 Quick Start:

```bash
# Setup chatbot
python setup_chatbot.py

# Interactive chat
python chatbot_interactive.py

# Demo capabilities
python chatbot_demo.py
```

## 🔧 Features:

- ✅ **MySQL Integration** - Đọc dữ liệu sản phẩm thực
- ✅ **Product Validation** - Phân biệt sản phẩm thuộc/ngoài danh mục
- ✅ **Smart Search** - Tìm kiếm thông minh với database
- ✅ **Real-time Responses** - Phản hồi nhanh chóng
- ✅ **Fallback Support** - Hoạt động khi MySQL lỗi
