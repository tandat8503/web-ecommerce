from typing import List, Dict, Any
import chromadb
from sentence_transformers import SentenceTransformer
from ...core.config import app_config


class ProductSearchService:
    def __init__(self):
        self._client = chromadb.PersistentClient(path=app_config.chroma_dir)
        self._collection = self._client.get_or_create_collection("products")
        self._model = SentenceTransformer(app_config.embedding_model)
        self._loaded = True

    async def build_from_db(self, conn):
        async with conn.cursor() as cur:
            await cur.execute(
                "SELECT id, name, description, price, slug, view_count, brand, category FROM products ORDER BY view_count DESC LIMIT 5000"
            )
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
            card = f"{name}\n{desc[:400]}\nThương hiệu: {brand} • Danh mục: {category}"
            ids.append(pid)
            docs.append(card)
            metas.append({"product_id": int(r[0]), "slug": slug, "price": price, "view_count": view, "brand": brand, "category": category})
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
        for i in range(len(res.get("ids", [[]])[0])):
            meta = res["metadatas"][0][i] or {}
            doc = res["documents"][0][i] or ""
            score = res.get("distances", [[None]])[0][i]
            out.append({
                "id": meta.get("product_id"),
                "name": doc.split("\n", 1)[0],
                "price": meta.get("price"),
                "slug": meta.get("slug"),
                "score": float(score) if score is not None else 0.0,
            })
        return out


