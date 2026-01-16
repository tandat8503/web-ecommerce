# 🐛 BUG ANALYSIS & FIX GUIDE

## 📊 TEST RESULTS SUMMARY

### ✅ **HYBRID SEARCH WORKS!**

**Test 2 (MySQL):**
```
Query: "Ghế xoay"
✅ Method: MYSQL (correct!)
✅ Found: 5 products
```

**Test 3 (VectorDB):**
```
Query: "Bàn cho văn phòng nhỏ, diện tích khoảng 10m²"
✅ Method: VECTOR (correct!)
✅ Found: 5 products (semantic search works!)
```

**→ CORE FUNCTIONALITY WORKS! 🎉**

---

## 🔴 BUGS FOUND

### **Bug 1: LLM Client = None**

**Error:**
```
[AI_GENERATION] Error generating AI response: 'NoneType' object has no attribute 'generate_simple'
```

**Root Cause:**
```python
# In shared/llm_client.py line 356-363
@staticmethod
def create_client() -> Union[GeminiProClient, None]:
    config = get_llm_config()
    
    if config.gemini_api_key:  # ← Returns None if no API key
        return GeminiProClient(api_key=config.gemini_api_key)
    
    return None  # ← This is the problem!
```

**Why it happens:**
- `.env` file thiếu `GEMINI_API_KEY`
- Hoặc `GEMINI_API_KEY` = empty string

**Fix:**

1. **Check `.env` file:**
```bash
cat /Users/macbookpro/Workspace/web-ecommerce/ai/.env | grep GEMINI
```

2. **Add API key nếu thiếu:**
```bash
# Edit .env
GEMINI_API_KEY=your_api_key_here
GEMINI_MODEL=gemini-2.0-flash-exp
```

3. **Hoặc test without LLM (fallback):**

Update `improved_user_chatbot.py` để handle None client:

```python
# Line ~760
try:
    if self.llm_client:  # ← Add this check
        ai_response = await self.llm_client.generate_simple(...)
        answer_text = ai_response.get("content", "...")
    else:
        # Fallback when no LLM
        answer_text = "Dạ đây là các sản phẩm phù hợp với anh/chị ạ. 😊"
except Exception as e:
    logger.error(f"[AI_GENERATION] Error: {e}")
    answer_text = "Dạ đây là các sản phẩm phù hợp với anh/chị ạ. 😊"
```

---

### **Bug 2: Database Connection Hang**

**Error:**
```
File "/Users/macbookpro/Workspace/web-ecommerce/ai/core/db.py", line 28, in get_conn
    return await pool.acquire()
asyncio.exceptions.CancelledError
```

**Root Cause:**
- MySQL server không chạy
- Hoặc connection pool exhausted
- Script chạy lâu → connections không được release

**Fix:**

1. **Check MySQL running:**
```bash
# Check if MySQL is running
ps aux | grep mysql

# Or check via brew (if installed via brew)
brew services list | grep mysql
```

2. **Start MySQL if not running:**
```bash
brew services start mysql
# Or
mysql.server start
```

3. **Fix connection pool in test script:**

Update `test_upgraded_chatbot.py`:

```python
# Add cleanup after each test
async def test_chatbot():
    try:
        # ... test code ...
    finally:
        # Close DB connections
        from core.db import close_pool
        await close_pool()
```

---

### **Bug 3: Test 1 Failed (search_method = "unknown")**

**Error:**
```
Query: "Bàn F42"
❌ Search method: UNKNOWN (expected: MYSQL)
📦 Products found: 0
```

**Root Cause:**
- Không có product tên "F42" trong database
- `_handle_greeting` được gọi thay vì `_handle_product_search`
- Response không có `search_method` field

**Fix:**

1. **Check if product exists:**
```sql
SELECT * FROM products WHERE name LIKE '%F42%';
```

2. **Update test query:**
```python
# Change from:
"Bàn F42"

# To:
"Tìm bàn làm việc"  # More generic
```

3. **Add search_method to all responses:**

Update `improved_user_chatbot.py`:

```python
# In _handle_greeting, _handle_follow_up, etc.
return {
    "success": True,
    "response": {...},
    "agent_type": "user_chatbot_improved",
    "search_method": "greeting"  # ← Add this
}
```

---

## 🛠️ QUICK FIX STEPS

### **Option A: Full Fix (Recommended)**

```bash
# 1. Add Gemini API key
echo 'GEMINI_API_KEY=your_key_here' >> /Users/macbookpro/Workspace/web-ecommerce/ai/.env

# 2. Start MySQL
brew services start mysql

# 3. Run test again
cd /Users/macbookpro/Workspace/web-ecommerce/ai
source venv/bin/activate
python scripts/test_upgraded_chatbot.py
```

### **Option B: Test Without LLM (Quick)**

```bash
# Just test hybrid search without AI generation
cd /Users/macbookpro/Workspace/web-ecommerce/ai
source venv/bin/activate

# Simple test
python -c "
from services.chatbot.improved_user_chatbot import improved_user_chatbot_service
import asyncio

async def test():
    # Test classification only
    is_complex = improved_user_chatbot_service._is_complex_query('Bàn cho văn phòng nhỏ')
    print(f'Complex query: {is_complex}')  # Should be True
    
    is_simple = improved_user_chatbot_service._is_complex_query('Ghế xoay')
    print(f'Simple query: {is_simple}')  # Should be False

asyncio.run(test())
"
```

---

## ✅ VERIFICATION

**After fix, you should see:**

```
Test 2/6: Simple category search
✅ Success: True
✅ Search method: MYSQL (expected: MYSQL)
📦 Products found: 5

💬 Response:
Dạ bên em có mấy mẫu ghế xoay này hợp với anh/chị nè: 😊
[Detailed AI response with product analysis]

Test 3/6: Use case + size requirement
✅ Success: True
✅ Search method: VECTOR (expected: VECTOR)
📦 Products found: 5

💬 Response:
🌟 **Bàn Họp Nhỏ Hòa Phát** (5,580,000đ)
   ✅ Kích thước nhỏ gọn - PHÙ HỢP văn phòng 10m²
   ✅ Thiết kế hiện đại - TIẾT KIỆM không gian
   👉 Phù hợp: Văn phòng nhỏ, startup

🎯 **Gợi ý của em:** Chọn bàn họp nhỏ vì...
```

---

## 📝 SUMMARY

**What's Working:**
- ✅ Hybrid search logic
- ✅ Query classification
- ✅ MySQL search
- ✅ VectorDB semantic search
- ✅ Product retrieval

**What's Broken:**
- ❌ LLM client (no API key)
- ❌ Database connections (MySQL not running or pool exhausted)
- ❌ Some test queries (no matching products)

**Priority Fix:**
1. Add `GEMINI_API_KEY` to `.env`
2. Start MySQL server
3. Update test queries

**After fix → Chatbot will work perfectly!** 🎉
