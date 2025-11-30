from typing import List, Dict, Any
import chromadb
from sentence_transformers import SentenceTransformer

# Import config - handle both relative and absolute imports
try:
    from core.config import app_config
except ImportError:
    from ...core.config import app_config


class ProductSearchService:
    def __init__(self):
        self._client = chromadb.PersistentClient(path=app_config.chroma_dir)
        self._collection = self._client.get_or_create_collection("products")
        self._model = SentenceTransformer(app_config.embedding_model)
        self._loaded = True

    async def build_from_db(self, conn):
        async with conn.cursor() as cur:
            # Query với variant info để tìm kiếm theo kích thước, màu sắc, chất liệu
            await cur.execute("""
                SELECT 
                    p.id, 
                    p.name, 
                    p.description, 
                    p.price, 
                    p.slug, 
                    p.view_count, 
                    b.name as brand, 
                    c.name as category,
                    (
                        SELECT GROUP_CONCAT(
                            CONCAT_WS(' ', 
                                COALESCE(pv.color, ''), 
                                COALESCE(pv.material, ''), 
                                CASE 
                                    WHEN pv.width IS NOT NULL AND pv.depth IS NOT NULL 
                                    THEN CONCAT(pv.width, 'x', pv.depth, 'cm')
                                    WHEN pv.width IS NOT NULL 
                                    THEN CONCAT(pv.width, 'cm')
                                    ELSE ''
                                END,
                                CASE 
                                    WHEN pv.height IS NOT NULL 
                                    THEN CONCAT('cao ', pv.height, 'cm')
                                    ELSE ''
                                END
                            ) SEPARATOR '; '
                        )
                        FROM product_variants pv 
                        WHERE pv.product_id = p.id AND pv.is_active = 1
                        AND (pv.color IS NOT NULL OR pv.material IS NOT NULL OR pv.width IS NOT NULL)
                    ) as variant_info
                FROM products p
                LEFT JOIN brands b ON p.brand_id = b.id
                LEFT JOIN categories c ON p.category_id = c.id
                WHERE p.status = 'ACTIVE'
                ORDER BY p.view_count DESC
                LIMIT 5000
            """)
            rows = await cur.fetchall()
        if not rows:
            return
        ids: List[str] = []
        docs: List[str] = []
        metas: List[Dict[str, Any]] = []
        for r in rows:
            pid = str(r[0])
            name = r[1] or ""
            desc = r[2] or ""
            price = float(r[3]) if r[3] is not None else 0.0
            slug = r[4] or ""
            view = int(r[5] or 0)
            brand = r[6] or ""
            category = r[7] or ""
            variant_info = r[8] or ""  # Thông tin variants: "Trắng Gỗ 1200x600cm; Đen Thép 1400x700cm"
            
            # Tạo document text với variant info để vector search có thể tìm theo kích thước, màu sắc
            card = f"Sản phẩm: {name}\nDanh mục: {category}\nThương hiệu: {brand}\nMô tả: {desc[:300]}"
            if variant_info:
                card += f"\nBiến thể: {variant_info}"
            
            ids.append(pid)
            docs.append(card)
            metas.append({
                "product_id": int(r[0]), 
                "slug": slug, 
                "price": price, 
                "view_count": view, 
                "brand": brand, 
                "category": category
            })
        # Upsert in small batches to avoid memory spikes
        batch = 512
        for i in range(0, len(ids), batch):
            chunk_ids = ids[i:i+batch]
            chunk_docs = docs[i:i+batch]
            chunk_metas = metas[i:i+batch]
            embeddings = self._model.encode(chunk_docs, normalize_embeddings=True).tolist()
            self._collection.upsert(ids=chunk_ids, documents=chunk_docs, metadatas=chunk_metas, embeddings=embeddings)

    def search(self, query: str, top_k: int = 5, filters: Dict[str, Any] | None = None) -> List[Dict[str, Any]]:
        where = filters or {}
        res = self._collection.query(query_texts=[query], n_results=top_k, where=where)
        out: List[Dict[str, Any]] = []
        
        ids_list = res.get("ids", [[]])
        if not ids_list or len(ids_list) == 0:
            return out
        
        for i in range(len(ids_list[0])):
            meta = res["metadatas"][0][i] if res.get("metadatas") and len(res["metadatas"]) > 0 and len(res["metadatas"][0]) > i else {}
            doc = res["documents"][0][i] if res.get("documents") and len(res["documents"]) > 0 and len(res["documents"][0]) > i else ""
            score = res.get("distances", [[None]])[0][i] if res.get("distances") and len(res["distances"]) > 0 and len(res["distances"][0]) > i else None
            
            # Extract name from document (first line)
            name = doc.split("\n", 1)[0] if doc else meta.get("name", "Sản phẩm")
            
            out.append({
                "id": meta.get("product_id"),
                "name": name,
                "price": float(meta.get("price", 0)) if meta.get("price") else 0.0,
                "slug": meta.get("slug", ""),
                "score": float(score) if score is not None else 0.0,
                "brand": meta.get("brand", ""),
                "category": meta.get("category", ""),
            })
        return out


