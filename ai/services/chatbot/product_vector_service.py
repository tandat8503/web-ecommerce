#!/usr/bin/env python3
"""
Product Vector Service for semantic product search using ChromaDB and SentenceTransformers.

This service provides:
- Semantic search for products using embeddings
- Price and category filtering
- Efficient caching and lazy loading
"""

import logging
from pathlib import Path
from typing import List, Dict, Optional

logger = logging.getLogger(__name__)

# Singleton instance
_product_vector_service = None
_initialization_failed = False


class ProductVectorService:
    """
    Service for semantic product search using VectorDB (ChromaDB).
    
    Uses intfloat/multilingual-e5-small for Vietnamese text embedding.
    """
    
    def __init__(self):
        """Initialize vector service with ChromaDB and SentenceTransformer."""
        try:
            from sentence_transformers import SentenceTransformer
            import chromadb
            
            # Initialize ChromaDB
            chroma_path = Path(__file__).parent.parent.parent / "chroma_db"
            if not chroma_path.exists():
                raise FileNotFoundError(f"ChromaDB path not found: {chroma_path}")
            
            self.client = chromadb.PersistentClient(path=str(chroma_path))
            
            # Get or verify collection exists
            try:
                self.collection = self.client.get_collection("product_catalog")
                collection_count = self.collection.count()
                logger.info(f"ProductVectorService: Collection has {collection_count} documents")
            except Exception as e:
                raise RuntimeError(f"Collection 'product_catalog' not found: {e}")
            
            # Initialize embedding model (this takes 10-15 seconds on first load)
            self.model = SentenceTransformer("intfloat/multilingual-e5-small")
            
            logger.info("ProductVectorService initialized successfully")
            
        except ImportError as e:
            logger.error(f"Missing dependency for ProductVectorService: {e}")
            raise
        except Exception as e:
            logger.error(f"Failed to initialize ProductVectorService: {e}")
            raise
    
    def search_products(
        self, 
        query: str, 
        top_k: int = 5,
        price_min: Optional[float] = None,
        price_max: Optional[float] = None,
        category: Optional[str] = None
    ) -> List[Dict]:
        """
        Search products using semantic vector search.
        
        Args:
            query: Search query in any language (optimized for Vietnamese)
            top_k: Number of results to return (default: 5)
            price_min: Minimum price filter (optional)
            price_max: Maximum price filter (optional)
            category: Category filter (optional)
        
        Returns:
            List of product dictionaries with metadata and similarity scores
        """
        if not query or not query.strip():
            logger.warning("[VECTOR_SEARCH] Empty query provided")
            return []
        
        try:
            # Add prefix for e5 model (improves search quality)
            search_query = f"query: {query}"
            
            # Generate query embedding
            query_embedding = self.model.encode([search_query])
            
            # Build metadata filters
            where = self._build_where_filter(price_min, price_max, category)
            
            # Execute search
            results = self.collection.query(
                query_embeddings=query_embedding.tolist(),
                n_results=top_k,
                where=where if where else None
            )
            
            # Format results
            products = self._format_results(results)
            
            logger.info(f"[VECTOR_SEARCH] Query: '{query}' -> {len(products)} results")
            return products
            
        except Exception as e:
            logger.error(f"[VECTOR_SEARCH] Error: {e}", exc_info=True)
            return []
    
    def _build_where_filter(
        self,
        price_min: Optional[float],
        price_max: Optional[float],
        category: Optional[str]
    ) -> Optional[Dict]:
        """Build ChromaDB where filter from parameters."""
        conditions = []
        
        if price_min is not None:
            conditions.append({"price": {"$gte": price_min}})
        
        if price_max is not None:
            conditions.append({"price": {"$lte": price_max}})
        
        if category:
            conditions.append({"category": {"$eq": category}})
        
        if not conditions:
            return None
        
        if len(conditions) == 1:
            return conditions[0]
        
        return {"$and": conditions}
    
    def _format_results(self, results: Dict) -> List[Dict]:
        """Format ChromaDB results to product dictionaries."""
        products = []
        
        if not results.get('ids') or len(results['ids']) == 0:
            return products
        
        if len(results['ids'][0]) == 0:
            return products
        
        for i in range(len(results['ids'][0])):
            try:
                metadata = results['metadatas'][0][i]
                products.append({
                    'product_id': metadata.get('product_id'),
                    'name': metadata.get('name', ''),
                    'category': metadata.get('category', ''),
                    'brand': metadata.get('brand', ''),
                    'price': metadata.get('price', 0),
                    'slug': metadata.get('slug', ''),
                    'distance': results['distances'][0][i],
                    'rich_text': results['documents'][0][i] if results.get('documents') and len(results['documents'][0]) > i else ''
                })
            except (IndexError, KeyError) as e:
                logger.warning(f"[VECTOR_SEARCH] Error parsing result {i}: {e}")
                continue
        
        return products
    
    def get_collection_stats(self) -> Dict:
        """Get statistics about the vector collection."""
        try:
            count = self.collection.count()
            return {
                "collection_name": "product_catalog",
                "document_count": count,
                "model": "intfloat/multilingual-e5-small"
            }
        except Exception as e:
            logger.error(f"Error getting collection stats: {e}")
            return {"error": str(e)}


def get_product_vector_service() -> Optional[ProductVectorService]:
    """
    Get singleton instance of ProductVectorService.
    
    Returns None if initialization failed to prevent repeated failures.
    """
    global _product_vector_service, _initialization_failed
    
    if _initialization_failed:
        logger.debug("ProductVectorService previously failed to initialize, skipping")
        return None
    
    if _product_vector_service is None:
        try:
            _product_vector_service = ProductVectorService()
        except Exception as e:
            logger.error(f"Failed to initialize ProductVectorService: {e}")
            _initialization_failed = True
            return None
    
    return _product_vector_service


def reset_vector_service():
    """Reset the singleton instance (useful for testing or reloading)."""
    global _product_vector_service, _initialization_failed
    _product_vector_service = None
    _initialization_failed = False
    logger.info("ProductVectorService singleton reset")
