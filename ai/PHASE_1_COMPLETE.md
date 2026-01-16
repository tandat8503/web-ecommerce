# ✅ PHASE 1 COMPLETE - NEXT: PHASE 2

## 🎉 Phase 1: DONE!

- ✅ 130 products embedded vào VectorDB
- ✅ Collection: `product_catalog`
- ✅ Test search works!

---

## 🚀 Phase 2: Create ProductVectorService (20 phút)

### **File:** `services/chatbot/product_vector_service.py`

```python
#!/usr/bin/env python3
"""
Product Vector Service for semantic product search
"""
from sentence_transformers import SentenceTransformer
import chromadb
from pathlib import Path
from typing import List, Dict, Optional


class ProductVectorService:
    """Service for semantic product search using VectorDB"""
    
    def __init__(self):
        """Initialize vector service"""
        chroma_path = Path(__file__).parent.parent.parent / "chroma_db"
        self.client = chromadb.PersistentClient(path=str(chroma_path))
        self.collection = self.client.get_collection("product_catalog")
        self.model = SentenceTransformer("intfloat/multilingual-e5-small")
    
    def search_products(
        self, 
        query: str, 
        top_k: int = 5,
        price_min: Optional[float] = None,
        price_max: Optional[float] = None,
        category: Optional[str] = None
    ) -> List[Dict]:
        """
        Search products using semantic search
        
        Args:
            query: Search query
            top_k: Number of results
            price_min: Minimum price filter
            price_max: Maximum price filter
            category: Category filter
        
        Returns:
            List of products with metadata
        """
        # Generate query embedding
        query_embedding = self.model.encode([query])
        
        # Build filters
        where = {}
        if price_min is not None or price_max is not None:
            where["price"] = {}
            if price_min is not None:
                where["price"]["$gte"] = price_min
            if price_max is not None:
                where["price"]["$lte"] = price_max
        
        if category:
            where["category"] = category
        
        # Search
        results = self.collection.query(
            query_embeddings=query_embedding.tolist(),
            n_results=top_k,
            where=where if where else None
        )
        
        # Format results
        products = []
        for i in range(len(results['ids'][0])):
            products.append({
                'product_id': results['metadatas'][0][i]['product_id'],
                'name': results['metadatas'][0][i]['name'],
                'category': results['metadatas'][0][i]['category'],
                'brand': results['metadatas'][0][i]['brand'],
                'price': results['metadatas'][0][i]['price'],
                'slug': results['metadatas'][0][i]['slug'],
                'distance': results['distances'][0][i],
                'rich_text': results['documents'][0][i]
            })
        
        return products


# Singleton instance
_product_vector_service = None

def get_product_vector_service() -> ProductVectorService:
    """Get singleton instance"""
    global _product_vector_service
    if _product_vector_service is None:
        _product_vector_service = ProductVectorService()
    return _product_vector_service
```

**Tạo file này và test:**
```bash
python -c "from services.chatbot.product_vector_service import get_product_vector_service; \
svc = get_product_vector_service(); \
results = svc.search_products('bàn cho văn phòng nhỏ', top_k=3); \
print([r['name'] for r in results])"
```

---

## 🚀 Phase 3: Update Chatbot Logic (30 phút)

Xem file `IMPLEMENTATION_PLAN.md` section Phase 3 để biết chi tiết.

**Key changes trong `improved_user_chatbot.py`:**

1. Import ProductVectorService
2. Add `_is_complex_query()` method
3. Update `_handle_product_search()` với hybrid logic
4. Improve `_generate_expert_advice()` prompts

---

## 🚀 Phase 4: Test (20 phút)

Test với queries:
- "Bàn cho văn phòng nhỏ 10m²"
- "Ghế cho lập trình viên"
- "So sánh bàn F42 và G100"

---

## 📊 Progress

- [x] Phase 1: Embed products (DONE!)
- [ ] Phase 2: ProductVectorService (20min)
- [ ] Phase 3: Update chatbot (30min)
- [ ] Phase 4: Test (20min)

**Total remaining: ~1 hour**

---

**Tiếp tục với Phase 2!** 🚀
