# 🧹 CLEANUP GUIDE - AI FOLDER

## 📊 CURRENT STATUS

**Chỉ dùng 2 services:**
1. ✅ Product Chatbot
2. ✅ Legal Chatbot

**Cần xóa:**
- ❌ Analytics
- ❌ Reports
- ❌ Sentiment Analysis
- ❌ Business Analyst
- ❌ Moderation

---

## 📁 FILE STRUCTURE REVIEW

### **✅ CẦN GIỮ**

#### **Core Files:**
```
ai/
├── app.py                     # ✅ Main app (đã clean)
├── core/
│   ├── config.py              # ✅ Config (đã clean)
│   ├── db.py                  # ✅ Database pool
│   └── logging.py             # ✅ Logging setup
├── services/
│   ├── chatbot/
│   │   ├── improved_user_chatbot.py    # ✅ Product chatbot
│   │   └── product_vector_service.py   # ✅ VectorDB search
│   └── legal/
│       ├── legal_service.py            # ✅ Legal assistant
│       ├── vector_service.py           # ✅ Legal RAG
│       ├── tax_calculator.py           # ✅ Tax calculation
│       └── parser.py                   # ✅ Legal doc parser
├── shared/
│   └── llm_client.py          # ✅ Gemini client
├── chroma_db/                 # ✅ VectorDB data
│   ├── legal_docs/            # Legal embeddings
│   └── product_catalog/       # Product embeddings
└── scripts/
    ├── embed_products_to_vectordb.py  # ✅ Product embedding
    ├── export_products_for_embedding.py # ✅ Product export
    ├── seed_*.py              # ✅ Database seeding
    └── test_api_key.py        # ✅ Test tool
```

---

### **❌ CÓ THỂ XÓA**

#### **Unused Services:**
```
services/
├── analyst/                   # ❌ Business analyst (không dùng)
│   ├── service.py
│   └── ...
├── report/                    # ❌ Report generation (không dùng)
│   ├── service.py
│   ├── storage.py
│   ├── progress_tracker.py
│   └── ...
└── sentiment/                 # ❌ Sentiment analysis (không dùng)
    ├── service.py
    └── ...
```

#### **Unused Agents:**
```
agents/
├── __init__.py                # ⚠️  Cần giữ nhưng cleanup
├── orchestrator.py            # ⚠️  Cần giữ cho admin (nếu còn dùng)
├── business_analyst.py        # ❌ Xóa
├── report_generator.py        # ❌ Xóa
├── sentiment_analyzer.py      # ❌ Xóa
└── content_moderation.py      # ❌ Xóa
```

#### **Old/Backup Files:**
```
ai/
├── app_simplified.py          # ❌ Backup file - xóa
└── scripts/
    ├── cleanup.sh             # ❌ Old cleanup script
    ├── test_current_system.py # ❌ Old test
    └── WHY_40_PERCENT_ACCURACY.md # ❌ Old analysis
```

---

## 🚀 CLEANUP COMMANDS

### **1. Xóa Services không dùng:**

```bash
cd /Users/macbookpro/Workspace/web-ecommerce/ai

# Xóa analyst
rm -rf services/analyst/

# Xóa report
rm -rf services/report/

# Xóa sentiment (nếu hoàn toàn không dùng)
rm -rf services/sentiment/
```

### **2. Xóa Agents không dùng:**

```bash
# Xóa các agent files
rm agents/business_analyst.py
rm agents/report_generator.py
rm agents/sentiment_analyzer.py
rm agents/content_moderation.py

# Cleanup __init__.py
# → Chỉ import orchestrator và các base classes
```

### **3. Xóa MCP tools không dùng:**

```bash
# Check mcps/tools/ folder
cd mcps/tools/

# Xóa analytics tools
rm analytics_tools.py
rm report_tools.py
rm sentiment_tools.py

# Giữ lại:
# - search_products.py (cho chatbot)
# - legal_tools.py (cho legal chatbot)
```

### **4. Xóa Scripts cũ:**

```bash
cd scripts/

# Xóa files không cần
rm cleanup.sh
rm test_current_system.py
rm WHY_40_PERCENT_ACCURACY.md
rm LAW_COVERAGE_ANALYSIS.md
rm HANDLING_SCANNED_FILES.md

# Giữ lại:
# - seed_*.py (seeding data)
# - embed_*.py (embedding scripts)
# - check_product_data.py (utility)
# - test_api_key.py (testing)
```

### **5. Xóa Backup files:**

```bash
cd /Users/macbookpro/Workspace/web-ecommerce/ai

rm app_simplified.py
rm README_FOR_INSTRUCTOR.md  # Nếu không cần
rm SUMMARY.md  # Nếu không cần
```

---

## ⚠️ QUAN TRỌNG - TRƯỚC KHI XÓA

### **Backup trước:**

```bash
# Tạo backup toàn bộ folder
cd /Users/macbookpro/Workspace/web-ecommerce
tar -czf ai_backup_$(date +%Y%m%d).tar.gz ai/

# Hoặc git commit
cd ai
git add .
git commit -m "Backup before cleanup"
```

### **Test server trước khi xóa:**

```bash
# Start server
python app.py

# Test endpoints
curl http://localhost:8000/health
curl -X POST http://localhost:8000/chat -H "Content-Type: application/json" -d '{"message":"Tìm bàn làm việc"}'
curl -X POST http://localhost:8000/api/legal/chat -H "Content-Type: application/json" -d '{"query":"Điều kiện thành lập công ty?"}'
```

---

## 📊 SAU KHI CLEANUP

### **Structure cuối cùng:**

```
ai/
├── app.py                     # Main app (275 lines)
├── core/                      # Core utilities ✅
├── services/
│   ├── chatbot/              # Product chatbot ✅
│   └── legal/                # Legal chatbot ✅
├── shared/                    # Shared utils ✅
├── mcps/
│   ├── helpers.py            # Database helpers
│   └── tools/
│       ├── search_products.py  # Product search tool
│       └── (legal tools if any)
├── agents/
│   ├── __init__.py           # Base classes
│   └── orchestrator.py       # (nếu admin cần)
├── chroma_db/                # VectorDB data ✅
├── scripts/                  # Utility scripts ✅
└── .env                      # Config ✅
```

**Giảm từ ~50 files → ~25 files** 📉

---

## 🎯 NEXT STEPS

1. **Review files cần giữ**
2. **Backup project**
3. **Chạy cleanup commands**
4. **Test lại server**
5. **Commit changes**

**Bạn muốn tôi tạo cleanup script tự động không?** 🤔
