
import logging
from typing import List, Dict, Any, Optional
from pathlib import Path
import chromadb
from sentence_transformers import SentenceTransformer
from app.core.config import settings

logger = logging.getLogger(__name__)

class LegalVectorService:
    """Service to manage legal documents in ChromaDB"""
    
    def __init__(self):
        self.chroma_path = Path(settings.CHROMA_LEGAL_DIR)
        self._client = chromadb.PersistentClient(path=str(self.chroma_path))
        self._collection = self._client.get_or_create_collection(
            "legal_documents",
            metadata={"description": "Vietnamese legal documents"}
        )
        self._model = SentenceTransformer(settings.EMBEDDING_MODEL)
        
    def search(
        self,
        query: str,
        top_k: int = 5,
        filters: Optional[Dict[str, Any]] = None,
        doc_type: Optional[str] = None,
        status: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        
        # Add E5 prefix for consistent retrieval
        query_text = f"query: {query}"
        query_embedding = self._model.encode([query_text], normalize_embeddings=True).tolist()[0]
        
        where_clause = {}
        if status: where_clause["status"] = status
        if doc_type: where_clause["doc_type"] = doc_type
        if filters: where_clause.update(filters)
        
        # Fetch more to allow filtering (Aggressive to handle noise)
        fetch_k = max(20, top_k * 6)
        
        results = self._collection.query(
            query_embeddings=[query_embedding],
            n_results=fetch_k,
            where=where_clause if where_clause else None,
            include=["documents", "metadatas", "distances"]
        )
        
        # Keyword gating detection
        q_lower = query.lower()
        need_warranty = "bảo hành" in q_lower
        
        formatted_results = []
        if results["ids"] and len(results["ids"]) > 0:
            for i in range(len(results["ids"][0])):
                metadata = results["metadatas"][0][i]
                doc_text = results["documents"][0][i]
                
                # NOISE FILTERING
                chapter = str(metadata.get("chapter", "")).lower()
                article = str(metadata.get("article", "")).lower()
                article_title = str(metadata.get("article_title", "")).lower()
                
                # Skip noise patterns (expanded to check article too)
                if "dẫn nhập" in article or "phần mở đầu" in chapter:
                    continue
                if ("hiệu lực thi hành" in article_title or "điều khoản thi hành" in article_title
                    or "hiệu lực thi hành" in article or "điều khoản thi hành" in article):
                    continue
                
                # Keyword gating for warranty queries
                if need_warranty:
                    text_low = doc_text.lower()
                    kw_low = str(metadata.get("keywords", "")).lower()
                    if "bảo hành" not in text_low and "bảo hành" not in kw_low:
                        continue
                    
                formatted_results.append({
                    "id": results["ids"][0][i],
                    "text": doc_text,
                    "metadata": metadata,
                    "distance": results["distances"][0][i] if "distances" in results else None
                })
                
                if len(formatted_results) >= top_k:
                    break
        
        return formatted_results

_legal_vector_service = None

def get_legal_vector_service():
    global _legal_vector_service
    if _legal_vector_service is None:
        _legal_vector_service = LegalVectorService()
    return _legal_vector_service
