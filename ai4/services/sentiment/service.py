from typing import List, Dict, Any, Optional, Tuple

import re
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline
from sklearn.metrics.pairwise import cosine_similarity


class SentimentService:
    def __init__(self):
        self.pipeline: Pipeline = Pipeline([
            ("tfidf", TfidfVectorizer(max_features=10000, ngram_range=(1, 2))),
            ("clf", LogisticRegression(max_iter=200))
        ])
        self._trained = False
        self._vectorizer_for_keywords: Optional[TfidfVectorizer] = None

    async def _ensure_trained(self):
        if self._trained:
            return
        positives = [
            "tuyệt vời", "rất tốt", "hài lòng", "đáng mua", "chất lượng tốt", "giá hợp lý",
            "sản phẩm đúng mô tả", "đóng gói cẩn thận", "giao hàng nhanh", "phục vụ tuyệt vời",
        ]
        negatives = [
            "tệ", "rất tệ", "thất vọng", "kém", "không hài lòng", "đắt",
            "hỏng", "vỡ", "giao chậm", "dịch vụ kém", "không đúng mô tả",
        ]
        neutrals = [
            "bình thường", "tạm ổn", "ok", "chưa rõ", "không có ý kiến", "trung lập",
        ]
        X = positives + negatives
        y = ["positive"] * len(positives) + ["negative"] * len(negatives)
        self.pipeline.fit(X, y)
        self._trained = True
        # Prepare vectorizer for keyphrase extraction
        self._vectorizer_for_keywords = TfidfVectorizer(max_features=5000, ngram_range=(1, 3))

    async def analyze_texts(self, texts: List[str]) -> List[Dict]:
        await self._ensure_trained()
        if not texts:
            return []
        clf = self.pipeline.named_steps["clf"]
        tfidf = self.pipeline.named_steps["tfidf"]
        X = tfidf.transform(texts)
        if hasattr(clf, "predict_proba"):
            proba = clf.predict_proba(X)
            labels = clf.classes_.tolist()
            idx_pos = labels.index("positive") if "positive" in labels else 0
            # Negative assumed to be the other class
            idx_neg = 1 - idx_pos if len(labels) == 2 else labels.index("negative")
            results: List[Dict[str, Any]] = []
            for t, p in zip(texts, proba):
                pos_score = float(p[idx_pos])
                neg_score = float(p[idx_neg])
                if pos_score >= 0.6:
                    label = "positive"
                    conf = pos_score
                elif neg_score >= 0.6:
                    label = "negative"
                    conf = neg_score
                else:
                    label = "neutral"
                    conf = max(pos_score, neg_score)
                results.append({"text": t, "sentiment": label, "confidence": round(conf, 3)})
            return results
        else:
            preds = self.pipeline.predict(texts)
            return [{"text": t, "sentiment": p, "confidence": 0.6} for t, p in zip(texts, preds)]

    async def fetch_comments(self, conn, product_id: Optional[int] = None, limit: int = 200) -> List[Tuple[int, str]]:
        """Fetch comments from DB. Expected table product_comments(product_id, content).
        Returns list of (product_id, content). Safe if table missing -> returns [].
        """
        try:
            async with conn.cursor() as cur:
                if product_id is not None:
                    await cur.execute(
                        "SELECT product_id, content FROM product_comments WHERE product_id=%s ORDER BY id DESC LIMIT %s",
                        (product_id, limit),
                    )
                else:
                    await cur.execute(
                        "SELECT product_id, content FROM product_comments ORDER BY id DESC LIMIT %s",
                        (limit,),
                    )
                rows = await cur.fetchall()
                return [(int(r[0]), str(r[1])) for r in rows]
        except Exception:
            return []

    def _top_keyphrases(self, texts: List[str], top_k: int = 10) -> List[str]:
        if not texts:
            return []
        vec = self._vectorizer_for_keywords or TfidfVectorizer(max_features=5000, ngram_range=(1, 3))
        X = vec.fit_transform(texts)
        scores = X.sum(axis=0).A1
        terms = vec.get_feature_names_out()
        pairs = list(zip(terms, scores))
        pairs.sort(key=lambda x: x[1], reverse=True)
        return [t for t, _ in pairs[:top_k]]

    async def summarize_by_product(self, conn, product_id: Optional[int] = None) -> Dict[str, Any]:
        """Aggregate sentiment by product with keyphrases."""
        rows = await self.fetch_comments(conn, product_id=product_id, limit=500)
        if not rows:
            return {"products": [], "overall": {"positive": 0, "neutral": 0, "negative": 0}}
        # Group by product_id
        product_to_texts: Dict[int, List[str]] = {}
        for pid, content in rows:
            product_to_texts.setdefault(pid, []).append(content)

        products_summary: List[Dict[str, Any]] = []
        overall_counts = {"positive": 0, "neutral": 0, "negative": 0}
        for pid, texts in product_to_texts.items():
            results = await self.analyze_texts(texts)
            pos = sum(1 for r in results if r["sentiment"] == "positive")
            neu = sum(1 for r in results if r["sentiment"] == "neutral")
            neg = sum(1 for r in results if r["sentiment"] == "negative")
            overall_counts["positive"] += pos
            overall_counts["neutral"] += neu
            overall_counts["negative"] += neg
            keyphrases_neg = self._top_keyphrases([r["text"] for r in results if r["sentiment"] == "negative"], top_k=8)
            keyphrases_pos = self._top_keyphrases([r["text"] for r in results if r["sentiment"] == "positive"], top_k=5)
            products_summary.append({
                "product_id": pid,
                "counts": {"positive": pos, "neutral": neu, "negative": neg},
                "top_negative_keyphrases": keyphrases_neg,
                "top_positive_keyphrases": keyphrases_pos,
            })
        products_summary.sort(key=lambda x: x["counts"]["negative"], reverse=True)
        return {"products": products_summary, "overall": overall_counts}


