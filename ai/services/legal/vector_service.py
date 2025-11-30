"""
Vector service cho văn bản pháp luật
Embed và upsert vào ChromaDB
"""
import logging
from typing import List, Dict, Any, Optional
import chromadb
from sentence_transformers import SentenceTransformer
import gc

try:
    import torch
    TORCH_AVAILABLE = True
except ImportError:
    TORCH_AVAILABLE = False

try:
    from core.config import app_config
except ImportError:
    from ...core.config import app_config

logger = logging.getLogger(__name__)


class LegalVectorService:
    """Service để embed và quản lý văn bản pháp luật trong Vector DB"""
    
    def __init__(self):
        self._client = chromadb.PersistentClient(path=app_config.chroma_dir)
        self._collection = self._client.get_or_create_collection(
            "legal_documents",
            metadata={"description": "Vietnamese legal documents"}
        )
        self._model = SentenceTransformer(app_config.embedding_model)
        self._original_device = None
        if TORCH_AVAILABLE and hasattr(self._model, '_target_device'):
            self._original_device = self._model._target_device
        logger.info(f"LegalVectorService initialized with model: {app_config.embedding_model}")
    
    def embed_chunks(self, chunks: List[Dict[str, Any]], batch_size: int = 20) -> List[Dict[str, Any]]:
        """
        Embed chunks và chuẩn bị data cho ChromaDB
        
        Args:
            chunks: List of chunk JSON objects
            batch_size: Batch size for embedding (smaller to avoid OOM, default: 20)
        
        Returns:
            List with embeddings added
        """
        texts = [chunk["text_for_embedding"] for chunk in chunks]
        
        # Generate embeddings in batches to avoid OOM
        logger.info(f"Generating embeddings for {len(texts)} chunks in batches of {batch_size}...")
        
        all_embeddings = []
        current_batch_size = batch_size
        oom_count = 0  # Đếm số lần OOM để không reset quá nhanh
        use_cpu_fallback = False  # Flag để chuyển sang CPU nếu MPS hết bộ nhớ
        
        i = 0
        while i < len(texts):
            batch_texts = texts[i:i+current_batch_size]
            batch_num = i//current_batch_size + 1
            total_batches = (len(texts) - 1) // current_batch_size + 1
            
            logger.info(f"Embedding batch {batch_num}/{total_batches} ({len(batch_texts)} chunks)...")
            
            try:
                # Clear cache trước khi encode
                if TORCH_AVAILABLE:
                    if torch.backends.mps.is_available() and not use_cpu_fallback:
                        torch.mps.empty_cache()
                    elif use_cpu_fallback:
                        torch.cuda.empty_cache() if torch.cuda.is_available() else None
                
                # Nếu đã chuyển sang CPU fallback, chuyển model sang CPU
                if use_cpu_fallback and TORCH_AVAILABLE and hasattr(self._model, 'to'):
                    self._model = self._model.to("cpu")
                
                batch_embeddings = self._model.encode(
                    batch_texts, 
                    normalize_embeddings=True,
                    show_progress_bar=False
                ).tolist()
                all_embeddings.extend(batch_embeddings)
                i += current_batch_size
                
                # Clear cache sau khi encode thành công
                if TORCH_AVAILABLE:
                    if torch.backends.mps.is_available() and not use_cpu_fallback:
                        torch.mps.empty_cache()
                    elif use_cpu_fallback:
                        torch.cuda.empty_cache() if torch.cuda.is_available() else None
                    gc.collect()
                
                # Reset OOM count khi thành công
                oom_count = 0
                
                # Chỉ reset batch_size nếu đã thành công nhiều batch liên tiếp (ít nhất 3)
                # và batch_size hiện tại < batch_size ban đầu
                if current_batch_size < batch_size and oom_count == 0 and not use_cpu_fallback:
                    # Tăng dần dần thay vì reset ngay
                    if len(all_embeddings) % (current_batch_size * 3) == 0:
                        new_batch_size = min(batch_size, current_batch_size + 5)
                        if new_batch_size > current_batch_size:
                            logger.info(f"Gradually increasing batch_size from {current_batch_size} to {new_batch_size}")
                            current_batch_size = new_batch_size
                    
            except RuntimeError as e:
                if "out of memory" in str(e).lower() or "MPS backend out of memory" in str(e):
                    # Clear cache ngay lập tức
                    if TORCH_AVAILABLE:
                        if torch.backends.mps.is_available():
                            torch.mps.empty_cache()
                        gc.collect()
                    
                    # Nếu batch_size=1 vẫn OOM, chuyển sang CPU
                    if current_batch_size <= 1 and not use_cpu_fallback:
                        logger.warning(
                            "MPS completely out of memory. Switching to CPU for remaining batches. "
                            "This will be slower but should work."
                        )
                        # Clear MPS cache trước khi chuyển
                        if TORCH_AVAILABLE and torch.backends.mps.is_available():
                            torch.mps.empty_cache()
                        use_cpu_fallback = True
                        # Chuyển model sang CPU
                        if TORCH_AVAILABLE and hasattr(self._model, 'to'):
                            self._model = self._model.to("cpu")
                        current_batch_size = 10  # Reset batch size khi chuyển sang CPU
                        # Don't increment i, retry the same batch with CPU
                        continue
                    elif current_batch_size <= 1 and use_cpu_fallback:
                        logger.error(f"Out of memory even with batch_size=1 on CPU. Cannot proceed.")
                        raise
                    
                    oom_count += 1
                    
                    # Reduce batch size and retry
                    current_batch_size = max(1, current_batch_size // 2)
                    logger.warning(
                        f"Out of memory at batch {batch_num} (OOM count: {oom_count}). "
                        f"Reducing batch_size to {current_batch_size} and retrying..."
                    )
                    # Don't increment i, retry the same batch with smaller size
                    continue
                else:
                    raise
        
        # Add embeddings to chunks
        for i, chunk in enumerate(chunks):
            chunk["embedding"] = all_embeddings[i]
        
        logger.info(f"Successfully embedded {len(chunks)} chunks")
        return chunks
    
    def upsert_chunks(self, chunks: List[Dict[str, Any]], batch_size: int = 100):
        """
        Upsert chunks vào ChromaDB
        
        Args:
            chunks: List of chunk JSON objects (must have embeddings)
            batch_size: Batch size for upsert
        """
        if not chunks:
            logger.warning("No chunks to upsert")
            return
        
        # Prepare data for ChromaDB
        ids = []
        documents = []
        metadatas = []
        embeddings = []
        
        for chunk in chunks:
            ids.append(chunk["id"])
            documents.append(chunk["text_for_embedding"])
            
            # Flatten metadata for ChromaDB (nested dicts not supported)
            metadata = {}
            for key, value in chunk["metadata"].items():
                if isinstance(value, (str, int, float, bool)):
                    metadata[key] = value
                elif isinstance(value, list):
                    # Join list items with semicolon
                    metadata[key] = "; ".join(str(v) for v in value)
                else:
                    metadata[key] = str(value)
            
            metadatas.append(metadata)
            embeddings.append(chunk["embedding"])
        
        # Upsert in batches
        logger.info(f"Upserting {len(chunks)} chunks in batches of {batch_size}...")
        
        for i in range(0, len(ids), batch_size):
            batch_ids = ids[i:i+batch_size]
            batch_docs = documents[i:i+batch_size]
            batch_metas = metadatas[i:i+batch_size]
            batch_embeddings = embeddings[i:i+batch_size]
            
            self._collection.upsert(
                ids=batch_ids,
                documents=batch_docs,
                metadatas=batch_metas,
                embeddings=batch_embeddings
            )
            
            logger.info(f"Upserted batch {i//batch_size + 1}/{(len(ids)-1)//batch_size + 1}")
        
        logger.info(f"Successfully upserted {len(chunks)} chunks")
    
    def search(
        self,
        query: str,
        top_k: int = 5,
        filters: Optional[Dict[str, Any]] = None,
        doc_type: Optional[str] = None,
        status: str = "active"
    ) -> List[Dict[str, Any]]:
        """
        Search trong Vector DB
        
        Args:
            query: Search query
            top_k: Number of results
            filters: Additional filters
            doc_type: Filter by document type (Luật, Nghị định, Thông tư)
            status: Filter by status (default: active)
        
        Returns:
            List of search results with metadata
        """
        # Generate query embedding
        query_embedding = self._model.encode([query], normalize_embeddings=True).tolist()[0]
        
        # Build where clause for ChromaDB
        where_clause = {}
        if status:
            where_clause["status"] = status
        if doc_type:
            where_clause["doc_type"] = doc_type
        if filters:
            where_clause.update(filters)
        
        # Search
        results = self._collection.query(
            query_embeddings=[query_embedding],
            n_results=top_k,
            where=where_clause if where_clause else None
        )
        
        # Format results
        formatted_results = []
        if results["ids"] and len(results["ids"]) > 0:
            for i in range(len(results["ids"][0])):
                formatted_results.append({
                    "id": results["ids"][0][i],
                    "text": results["documents"][0][i],
                    "metadata": results["metadatas"][0][i],
                    "distance": results["distances"][0][i] if "distances" in results else None
                })
        
        return formatted_results
    
    def delete_by_doc_name(self, doc_name: str):
        """Xóa tất cả chunks của một văn bản"""
        # Get all documents with this doc_name
        results = self._collection.get(
            where={"doc_name": doc_name}
        )
        
        if results["ids"]:
            self._collection.delete(ids=results["ids"])
            logger.info(f"Deleted {len(results['ids'])} chunks for document: {doc_name}")
        else:
            logger.warning(f"No chunks found for document: {doc_name}")
    
    def get_collection_stats(self) -> Dict[str, Any]:
        """Lấy thống kê collection"""
        count = self._collection.count()
        return {
            "total_chunks": count,
            "collection_name": "legal_documents"
        }

