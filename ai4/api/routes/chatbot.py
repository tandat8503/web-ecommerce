from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
from ...core.db import get_conn
from ...core.config import get_llm_config
import httpx
from ...services.chatbot.search import ProductSearchService
from ...services.analyst.service import AnalystService
from ...services.sentiment.service import SentimentService


router = APIRouter()
search_svc = ProductSearchService()
analyst_svc = AnalystService()
sentiment_svc = SentimentService()


class ChatRequest(BaseModel):
    role: str  # "user" | "admin"
    message: str


async def _fetch_product(conn, keyword: str):
    async with conn.cursor() as cur:
        await cur.execute(
            """
            SELECT id, name, price, slug
            FROM products
            WHERE name LIKE %s OR description LIKE %s
            ORDER BY view_count DESC
            LIMIT 5
            """,
            (f"%{keyword}%", f"%{keyword}%"),
        )
        rows = await cur.fetchall()
        return [
            {"id": r[0], "name": r[1], "price": float(r[2]), "slug": r[3]} for r in rows
        ]


async def _complete_with_provider(prompt: str) -> str:
    cfg = get_llm_config()
    system_msg = "Bạn là trợ lý bán hàng e-commerce, trả lời ngắn gọn, chính xác."
    # ReAct-style: model reasons internally, but must output only the final Answer.
    react_prompt = (
        "Bạn sẽ thực hiện ReAct nội bộ: (Reason) -> (Act dùng bằng chứng) -> (Answer).\n"
        "Chỉ IN RA phần 'Answer' cuối cùng, không in Reason/Act.\n\n" + prompt
    )

    # Priority: OpenAI > Gemini > Ollama
    if cfg.api_key:
        headers = {"Authorization": f"Bearer {cfg.api_key}"}
        payload = {
            "model": cfg.model,
            "messages": [
                {"role": "system", "content": system_msg},
                {"role": "user", "content": react_prompt},
            ],
            "max_tokens": cfg.max_tokens,
            "temperature": cfg.temperature,
        }
        async with httpx.AsyncClient(timeout=30) as client:
            r = await client.post("https://api.openai.com/v1/chat/completions", json=payload, headers=headers)
            r.raise_for_status()
            data = r.json()
            return data["choices"][0]["message"]["content"]

    if cfg.gemini_api_key:
        # Gemini via Google AI Studio REST
        # Endpoint: https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key=API_KEY
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{cfg.gemini_model}:generateContent?key={cfg.gemini_api_key}"
        payload = {
            "contents": [
                {
                    "role": "user",
                    "parts": [{"text": f"{system_msg}\n\nCâu hỏi: {react_prompt}"}],
                }
            ]
        }
        async with httpx.AsyncClient(timeout=30) as client:
            r = await client.post(url, json=payload)
            r.raise_for_status()
            data = r.json()
            # Extract first candidate text
            return data.get("candidates", [{}])[0].get("content", {}).get("parts", [{}])[0].get("text", "") or ""

    if cfg.base_url:
        # Ollama compatible
        base = cfg.base_url.rstrip("/")
        url = f"{base}/api/chat"
        payload = {
            "model": cfg.model,
            "messages": [
                {"role": "system", "content": system_msg},
                {"role": "user", "content": react_prompt},
            ],
            "stream": False,
            "options": {"temperature": cfg.temperature}
        }
        async with httpx.AsyncClient(timeout=60) as client:
            r = await client.post(url, json=payload)
            r.raise_for_status()
            data = r.json()
            # Ollama chat response shape: {message: {content: "..."}, ...}
            if isinstance(data, dict):
                if "message" in data and isinstance(data["message"], dict):
                    return data["message"].get("content", "")
            return ""

    # Fallback
    return "Hiện chưa cấu hình LLM. Vui lòng liên hệ quản trị hoặc thử lại sau."


@router.post("/user")
async def chat_user(req: ChatRequest, conn=Depends(get_conn)):
    trace = []
    await search_svc.build_from_db(conn)  # idempotent upsert (fast when no changes)
    trace.append({"act": "build_index", "observe": "ok"})
    products = search_svc.search(req.message)
    trace.append({"act": "vector_search", "observe": {"hits": len(products)}})
    if not products:
        sql_like = await _fetch_product(conn, req.message)
        products = sql_like
        trace.append({"act": "sql_like_fallback", "observe": {"hits": len(sql_like)}})
    if products:
        lines = [f"- {p['name']} • {p['price']}đ • /product/{p['slug']}" for p in products]
        prompt = "Gợi ý sản phẩm phù hợp và giải thích ngắn gọn, sau đó liệt kê link:\n" + "\n".join(lines)
        text = await _complete_with_provider(prompt)
        trace.append({"act": "llm_complete", "observe": {"chars": len(text)}})
        return {"response": text, "products": products, "trace": trace}
    trace.append({"act": "guard_oos", "observe": "no_product_match"})
    return {"response": "Xin lỗi, cửa hàng hiện chỉ tư vấn các sản phẩm đang bán trong hệ thống.", "trace": trace}


@router.post("/admin")
async def chat_admin(req: ChatRequest, conn=Depends(get_conn)):
    trace = []
    text = req.message.lower()
    intent = "help"
    month = None
    year = None
    # naive extract month/year
    import re as _re
    m = _re.search(r"tháng\s*(\d{1,2})", text)
    y = _re.search(r"năm\s*(\d{4})", text)
    if m:
        month = int(m.group(1))
    if y:
        year = int(y.group(1))

    if any(k in text for k in ["doanh thu", "revenue", "báo cáo doanh thu"]):
        intent = "revenue"
        trace.append({"reason": "keyword doanh thu", "act": "analyst_service"})
        data = await analyst_svc.get_revenue(conn, month=month, year=year)
        trace.append({"observe": {"points": len(data.get("data", [])), "total": data.get("summary", {}).get("total", 0)}})
        return {"response": "Đã tổng hợp doanh thu." if data.get("data") else "Không có dữ liệu.", "data": data, "trace": trace}

    if any(k in text for k in ["ý kiến", "bình luận", "sentiment", "đánh giá"]):
        intent = "sentiment"
        trace.append({"reason": "keyword bình luận", "act": "sentiment_service"})
        summary = await sentiment_svc.summarize_by_product(conn)
        trace.append({"observe": {"products": len(summary.get("products", []))}})
        return {"response": "Đã tổng hợp ý kiến khách hàng.", "data": summary, "trace": trace}

    if any(k in text for k in ["báo cáo", "report", "html"]):
        intent = "report"
        trace.append({"reason": "keyword báo cáo", "act": "link_report"})
        link = "/report/summary"
        if month or year:
            qs = []
            if month:
                qs.append(f"month={month}")
            if year:
                qs.append(f"year={year}")
            link += "?" + "&".join(qs)
        return {"response": f"Mở báo cáo tại: {link}", "trace": trace}

    trace.append({"reason": "no_intent_match"})
    return {"response": "Bạn có thể hỏi: 'Thống kê doanh thu tháng 3' hoặc 'Thống kê ý kiến khách hàng' hoặc 'Mở báo cáo'.", "trace": trace}


