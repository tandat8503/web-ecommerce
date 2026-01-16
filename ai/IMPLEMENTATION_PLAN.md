# 🚀 PHƯƠNG ÁN IMPLEMENT: NÂNG CẤP USER CHATBOT

## 📋 Tổng Quan

### **Mục tiêu:**
Nâng cấp User Chatbot từ "show sản phẩm" → "chuyên gia tư vấn"

### **Công nghệ:**
- VectorDB: ChromaDB (đã có)
- Embedding: multilingual-e5-small (đã có)
- LLM: Gemini 1.5 Flash (đã có)

### **Thời gian:** 2-3 giờ

---

## 🎯 PHASE 1: EMBED PRODUCTS VÀO VECTORDB (1 giờ)

### **Bước 1.1: Export Products từ MySQL**

**File:** `scripts/export_products_for_embedding.py`

**Chức năng:**
```python
# Kết nối MySQL
# Query: SELECT * FROM products WHERE is_active = 1
# Lấy thêm: categories, brands, specs
# Export ra JSON
```

**Output:** `scripts/products_data.json`

**Data structure:**
```json
{
  "products": [
    {
      "id": 123,
      "name": "Bàn làm việc F42",
      "slug": "ban-lam-viec-f42",
      "category": "Bàn làm việc",
      "brand": "Nội Thất VP",
      "price": 5000000,
      "sale_price": null,
      "description": "Bàn làm việc compact...",
      "specs": {
        "dimensions": "120x60x75",
        "material": "MDF Melamine",
        "colors": ["Nâu gỗ", "Trắng"],
        "weight": "25kg"
      },
      "images": ["url1", "url2"],
      "stock": 50,
      "rating": 4.5,
      "reviews_count": 120
    }
  ]
}
```

---

### **Bước 1.2: Tạo Rich Text for Embedding**

**File:** `services/chatbot/product_embedder.py`

**Chức năng:**
```python
def create_product_embedding_text(product: dict) -> str:
    """
    Tạo text phong phú cho embedding
    Bao gồm: specs, use cases, pros/cons
    """
    
    # Template
    text = f"""
    {product['name']} - {product['brand']}
    
    Thông số kỹ thuật:
    - Kích thước: {specs['dimensions']} (DxRxC)
    - Chất liệu: {specs['material']}
    - Màu sắc: {', '.join(specs['colors'])}
    - Trọng lượng: {specs['weight']}
    
    Mô tả:
    {product['description']}
    
    Phù hợp:
    {infer_suitable_for(product)}  # AI generate
    
    Ưu điểm:
    {infer_pros(product)}  # AI generate
    
    Nhược điểm:
    {infer_cons(product)}  # AI generate
    
    Giá: {product['price']:,}đ
    Danh mục: {product['category']}
    Đánh giá: {product['rating']}/5 ({product['reviews_count']} reviews)
    """
    
    return text
```

**AI-enhanced fields:**
- `suitable_for`: Dùng LLM để infer từ specs
- `pros`: Dùng LLM để analyze
- `cons`: Dùng LLM để analyze

**Example:**
```
Input: Bàn F42, 120x60cm, 5tr
Output: 
  Phù hợp: Văn phòng nhỏ 8-12m², WFH, sinh viên
  Ưu điểm: Nhỏ gọn, tiết kiệm không gian, giá tốt
  Nhược điểm: Không phù hợp văn phòng lớn
```

---

### **Bước 1.3: Embed vào VectorDB**

**File:** `scripts/embed_products_to_vectordb.py`

**Workflow:**
```python
1. Load products_data.json
2. For each product:
   - Create rich embedding text
   - Generate embedding (multilingual-e5-small)
   - Create chunk with metadata
3. Upsert to ChromaDB collection: "product_catalog"
4. Verify: Check total chunks
```

**Chunk structure:**
```python
{
    "id": "product_123",
    "text_for_embedding": "...",  # Rich text
    "metadata": {
        "product_id": 123,
        "name": "Bàn F42",
        "category": "Bàn làm việc",
        "price": 5000000,
        "price_range": "mid",  # low/mid/high
        "dimensions": "120x60x75",
        "suitable_for": ["văn phòng nhỏ", "WFH"],
        "slug": "ban-lam-viec-f42"
    }
}
```

**Command:**
```bash
python scripts/embed_products_to_vectordb.py
```

**Output:**
```
✅ Embedded 500 products
Collection: product_catalog
Total chunks: 500
```

---

## 🎯 PHASE 2: TẠO PRODUCT VECTOR SERVICE (30 phút)

### **Bước 2.1: Create ProductVectorService**

**File:** `services/chatbot/product_vector_service.py`

**Chức năng:**
```python
class ProductVectorService:
    def __init__(self):
        self.collection = chroma_client.get_collection("product_catalog")
        self.embedding_model = SentenceTransformer("intfloat/multilingual-e5-small")
    
    def search_products(
        self, 
        query: str, 
        top_k: int = 5,
        filters: dict = None
    ) -> List[dict]:
        """
        Vector search for products
        
        Args:
            query: User query (semantic)
            top_k: Number of results
            filters: Price range, category, etc.
        
        Returns:
            List of products with full metadata
        """
        # 1. Embed query
        query_embedding = self.embedding_model.encode(query)
        
        # 2. Search
        results = self.collection.query(
            query_embeddings=[query_embedding],
            n_results=top_k,
            where=filters  # {"price": {"$lt": 10000000}}
        )
        
        # 3. Format results
        products = []
        for i, metadata in enumerate(results['metadatas'][0]):
            products.append({
                "product_id": metadata['product_id'],
                "name": metadata['name'],
                "price": metadata['price'],
                "category": metadata['category'],
                "slug": metadata['slug'],
                "distance": results['distances'][0][i],
                "full_text": results['documents'][0][i]
            })
        
        return products
```

---

## 🎯 PHASE 3: UPDATE CHATBOT LOGIC (30 phút)

### **Bước 3.1: Add Hybrid Search**

**File:** `services/chatbot/improved_user_chatbot.py`

**Update `_handle_product_search()`:**

```python
async def _handle_product_search(self, user_message, intent_data):
    """
    Hybrid search: MySQL (fast) + VectorDB (smart)
    """
    
    # 1. Classify query complexity
    is_complex = self._is_complex_query(user_message)
    
    if is_complex:
        # Use VectorDB for semantic search
        products = await self._vector_search_products(user_message, intent_data)
    else:
        # Use MySQL for simple keyword search
        products = await self._mysql_search_products(user_message, intent_data)
    
    # 2. Generate expert advice
    response = await self._generate_expert_advice(
        query=user_message,
        products=products,
        search_method="vector" if is_complex else "mysql"
    )
    
    return response

def _is_complex_query(self, query: str) -> bool:
    """
    Determine if query needs semantic search
    
    Complex queries:
    - Mentions specs (kích thước, chất liệu)
    - Mentions use case (văn phòng nhỏ, designer)
    - Comparison (so sánh, khác nhau)
    - Advice (nên chọn, phù hợp)
    
    Simple queries:
    - Product name (Bàn F42)
    - Category (bàn làm việc)
    - Brand (Nội Thất VP)
    """
    complex_keywords = [
        "phù hợp", "nên chọn", "so sánh", "khác nhau",
        "kích thước", "chất liệu", "nhỏ", "lớn",
        "văn phòng nhỏ", "designer", "giám đốc",
        "tiết kiệm", "cao cấp", "sang trọng"
    ]
    
    return any(kw in query.lower() for kw in complex_keywords)

async def _vector_search_products(self, query, intent_data):
    """Search using VectorDB"""
    from services.chatbot.product_vector_service import ProductVectorService
    
    vector_service = ProductVectorService()
    
    # Build filters
    filters = {}
    if intent_data.get('min_price'):
        filters['price'] = {'$gte': intent_data['min_price']}
    if intent_data.get('max_price'):
        if 'price' in filters:
            filters['price']['$lte'] = intent_data['max_price']
        else:
            filters['price'] = {'$lte': intent_data['max_price']}
    
    # Search
    results = vector_service.search_products(
        query=query,
        top_k=5,
        filters=filters if filters else None
    )
    
    # Get full product details from MySQL
    product_ids = [r['product_id'] for r in results]
    products = await self._get_products_by_ids(product_ids)
    
    # Attach vector search metadata
    for product in products:
        for result in results:
            if result['product_id'] == product['id']:
                product['vector_distance'] = result['distance']
                product['vector_text'] = result['full_text']
    
    return products
```

---

## 🎯 PHASE 4: IMPROVE LLM PROMPTS (30 phút)

### **Bước 4.1: Create Expert Advice Generator**

**File:** `services/chatbot/improved_user_chatbot.py`

**New method:**

```python
async def _generate_expert_advice(
    self, 
    query: str, 
    products: List[dict],
    search_method: str = "mysql"
) -> dict:
    """
    Generate expert advice using LLM
    
    Args:
        query: User query
        products: List of products (with full specs)
        search_method: "mysql" or "vector"
    
    Returns:
        Response with expert advice
    """
    
    # 1. Prepare product context
    products_context = []
    for p in products:
        # Get vector text if available (has full specs, pros/cons)
        if search_method == "vector" and p.get('vector_text'):
            product_info = p['vector_text']
        else:
            # Build from MySQL data
            product_info = self._build_product_info(p)
        
        products_context.append({
            "name": p['name'],
            "price": p['price'],
            "sale_price": p.get('sale_price'),
            "category": p['category'],
            "full_info": product_info
        })
    
    # 2. Build expert prompt
    prompt = f"""Bạn là chuyên gia tư vấn nội thất văn phòng với 10 năm kinh nghiệm.

Khách hàng hỏi: "{query}"

Sản phẩm tìm được:
{json.dumps(products_context, ensure_ascii=False, indent=2)}

Hãy tư vấn CHI TIẾT như một chuyên gia:

**1. Phân tích nhu cầu:**
- Hiểu khách cần gì (không gian, ngân sách, mục đích)
- Đưa ra nhận xét ngắn gọn

**2. Gợi ý sản phẩm:** (cho từng sản phẩm, tối đa 2-3 sản phẩm)

🌟 **[Tên sản phẩm]** ([Giá])
   ✅ [Thông số quan trọng 1] - [Lợi ích]
   ✅ [Thông số quan trọng 2] - [Lợi ích]
   ✅ [Thông số quan trọng 3] - [Lợi ích]
   💰 Giá: [Nhận xét về giá]
   
   👉 Phù hợp nếu: [Ai nên chọn]

**3. So sánh:** (nếu có nhiều sản phẩm)
- Điểm khác biệt chính
- Sản phẩm nào phù hợp với từng nhu cầu

**4. Gợi ý cuối:**
🎯 **Gợi ý của em:** [Khuyên nên chọn sản phẩm nào và TẠI SAO]

Anh/chị muốn em tư vấn thêm về [aspect] không ạ? 😊

**Lưu ý:**
- Dùng Markdown (bold **, bullet points, emoji)
- Thân thiện, xưng "em" - "anh/chị"
- Chuyên nghiệp nhưng không khô khan
- Chốt đơn tự nhiên, không ép buộc
- KHÔNG liệt kê lại toàn bộ sản phẩm (Frontend đã show cards)
- Chỉ phân tích 2-3 sản phẩm CHÍNH
"""
    
    # 3. Generate response
    ai_response = await self.llm_client.generate_simple(
        prompt=prompt,
        system_instruction="Bạn là chuyên gia tư vấn nội thất nhiệt tình, chuyên nghiệp.",
        temperature=0.7,
        max_tokens=1000
    )
    
    answer_text = ai_response.get("content", "Dạ đây là gợi ý của em ạ.")
    
    # 4. Format response
    return {
        "success": True,
        "response": {
            "text": answer_text,
            "type": "expert_advice",
            "data": self._format_product_cards(products[:3])  # Max 3 cards
        },
        "agent_type": "user_chatbot_improved",
        "search_method": search_method
    }
```

---

## 🎯 PHASE 5: TESTING & VERIFICATION (30 phút)

### **Bước 5.1: Create Test Script**

**File:** `scripts/test_product_chatbot.py`

**Test cases:**
```python
test_cases = [
    # Simple queries (MySQL)
    {
        "query": "Bàn F42",
        "expected_method": "mysql",
        "expected_products": ["Bàn F42"]
    },
    
    # Complex queries (VectorDB)
    {
        "query": "Bàn cho văn phòng nhỏ, diện tích 10m²",
        "expected_method": "vector",
        "expected_features": ["kích thước nhỏ", "tiết kiệm không gian"]
    },
    
    # Comparison
    {
        "query": "So sánh bàn F42 và G100",
        "expected_method": "vector",
        "expected_products": ["Bàn F42", "Bàn G100"],
        "expected_features": ["so sánh", "khác biệt"]
    },
    
    # Advice
    {
        "query": "Bàn nào phù hợp cho designer?",
        "expected_method": "vector",
        "expected_features": ["rộng", "nhiều ngăn", "ergonomic"]
    }
]
```

**Run test:**
```bash
python scripts/test_product_chatbot.py
```

**Expected output:**
```
Test 1: Bàn F42
  ✅ Method: mysql (expected: mysql)
  ✅ Found: Bàn F42
  ✅ Response quality: Good

Test 2: Bàn cho văn phòng nhỏ
  ✅ Method: vector (expected: vector)
  ✅ Features mentioned: kích thước nhỏ, tiết kiệm không gian
  ✅ Response quality: Excellent

...

Overall: 4/4 tests passed (100%)
```

---

## 📊 SUMMARY: NHỮNG GÌ SẼ ĐƯỢC LÀM

### **1. Scripts Mới:**
```
scripts/
├── export_products_for_embedding.py    # Export MySQL → JSON
├── embed_products_to_vectordb.py       # Embed JSON → VectorDB
└── test_product_chatbot.py             # Test chatbot quality
```

### **2. Services Mới:**
```
services/chatbot/
├── product_embedder.py                 # Create rich embedding text
└── product_vector_service.py           # Vector search for products
```

### **3. Services Updated:**
```
services/chatbot/
└── improved_user_chatbot.py            # Add hybrid search + expert advice
```

### **4. VectorDB:**
```
chroma_db/
└── product_catalog/                    # New collection (500 chunks)
```

---

## 🎯 KẾT QUẢ MONG ĐỢI

### **Before:**
```
User: "Bàn cho văn phòng nhỏ"
Bot: "Dạ bên em có mấy mẫu này: 😊"
     [5 random product cards]
```

### **After:**
```
User: "Bàn cho văn phòng nhỏ, diện tích 10m²"

Bot: "Dạ em hiểu rồi ạ! Với văn phòng nhỏ 10m², em gợi ý 2 mẫu này:

🌟 **Bàn F42 - Compact Series** (5,000,000đ)
   ✅ Kích thước 120x60cm - VỪA VẶN cho không gian nhỏ
   ✅ Gỗ MDF Melamine - BỀN, DỄ VỆ SINH
   ✅ Có 2 ngăn kéo - TIẾT KIỆM KHÔNG GIAN
   💰 Giá: Phù hợp ngân sách tầm trung
   
   👉 Phù hợp nếu: Anh/chị ưu tiên TIẾT KIỆM KHÔNG GIAN

📦 **Bàn G100 - Executive** (7,000,000đ)
   ✅ Kích thước 140x70cm - Rộng hơn một chút
   ✅ Gỗ công nghiệp cao cấp - SANG TRỌNG
   ✅ Tủ phụ đi kèm - NHIỀU NGĂN chứa
   💰 Giá: Cao hơn 40% nhưng chất lượng tốt
   
   👉 Phù hợp nếu: Anh/chị muốn BỀN ĐẸP, đầu tư lâu dài

🎯 **Gợi ý của em:**
Với văn phòng 10m², em khuyên anh/chị chọn **Bàn F42** vì:
- Kích thước 120x60cm để lại không gian đi lại thoải mái
- Giá cả phải chăng hơn
- Vẫn đủ chức năng cho công việc hàng ngày

Anh/chị muốn em tư vấn thêm về màu sắc hoặc phụ kiện không ạ? 😊"

[Card: Bàn F42] [Card: Bàn G100]
```

---

## ⏱️ TIMELINE

| Phase | Task | Time |
|-------|------|------|
| 1 | Export + Embed products | 1h |
| 2 | Create ProductVectorService | 30min |
| 3 | Update chatbot logic | 30min |
| 4 | Improve LLM prompts | 30min |
| 5 | Testing & verification | 30min |
| **Total** | | **3h** |

---

## 💰 COST

- Embedding: ~$0.10 (one-time)
- Per query: ~$0.001 (LLM generation)
- Storage: Free (local ChromaDB)

**Total:** ~$0.10 one-time + $0.001/query

---

## ✅ CHECKLIST

- [ ] Phase 1: Export & Embed products
- [ ] Phase 2: Create ProductVectorService
- [ ] Phase 3: Update chatbot logic
- [ ] Phase 4: Improve LLM prompts
- [ ] Phase 5: Test & verify
- [ ] Deploy to production

---

**Bạn muốn tôi bắt đầu implement không?** 🚀

Tôi sẽ làm từng phase một và báo cáo tiến độ cho bạn!
