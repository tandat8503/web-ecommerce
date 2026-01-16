
from pathlib import Path
from typing import List, Dict, Optional
import logging
from app.core.config import settings
from app.core.logger import get_logger

logger = get_logger(__name__)

# Singleton
_service = None

class ProductVectorService:
    def __init__(self):
        try:
            from sentence_transformers import SentenceTransformer
            import chromadb
            
            # Use path from settings
            self.chroma_path = Path(settings.CHROMA_PRODUCT_DIR)
            if not self.chroma_path.exists():
                raise FileNotFoundError(f"ChromaDB path not found: {self.chroma_path}")
            
            self.client = chromadb.PersistentClient(path=str(self.chroma_path))
            self.collection = self.client.get_collection("product_catalog")
            
            # Load model
            logger.info(f"Loading embedding model: {settings.EMBEDDING_MODEL}")
            self.model = SentenceTransformer(settings.EMBEDDING_MODEL)
            logger.info("ProductVectorService initialized")
            
        except Exception as e:
            logger.error(f"ProductVectorService init failed: {e}")
            raise

    def search_products(
        self, 
        query: str, 
        top_k: int = 5,
        price_min: Optional[float] = None,
        price_max: Optional[float] = None,
        category: Optional[str] = None
    ) -> List[Dict]:
        if not query.strip(): return []
        
        try:
            # e5 prefix
            embedding = self.model.encode([f"query: {query}"], normalize_embeddings=True)
            
            where = self._build_filter(price_min, price_max, category)
            
            results = self.collection.query(
                query_embeddings=embedding.tolist(),
                n_results=top_k,
                where=where
            )
            
            return self._format_results(results)
        except Exception as e:
            logger.error(f"Search error: {e}")
            return []

    def _build_filter(self, min_p, max_p, cat):
        conditions = []
        if min_p is not None: conditions.append({"price": {"$gte": min_p}})
        if max_p is not None: conditions.append({"price": {"$lte": max_p}})
        if cat: conditions.append({"category": {"$eq": cat}})
        
        if not conditions: return None
        if len(conditions) == 1: return conditions[0]
        return {"$and": conditions}

    def _format_results(self, results):
        products = []
        if not results.get('ids') or len(results['ids'][0]) == 0:
            return products
            
        for i in range(len(results['ids'][0])):
            try:
                meta = results['metadatas'][0][i]
                products.append({
                    'product_id': meta.get('product_id'),
                    'name': meta.get('name'),
                    'price': meta.get('price'),
                    'category': meta.get('category'),
                    'distance': results['distances'][0][i]
                })
            except: continue
        return products

def get_product_vector_service():
    global _service
    if _service is None:
        try:
            _service = ProductVectorService()
        except:
            return None
    return _service
