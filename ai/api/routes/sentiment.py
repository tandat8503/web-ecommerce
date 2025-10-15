from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import List, Optional
from ...services.sentiment.service import SentimentService
from ...core.db import get_conn


router = APIRouter()
svc = SentimentService()


class SentimentRequest(BaseModel):
    texts: List[str]


@router.post("/analyze")
async def analyze(req: SentimentRequest):
    trace = []
    trace.append({"reason": "classify list of texts", "act": "analyze_texts", "observe": {"count": len(req.texts)}})
    data = await svc.analyze_texts(req.texts)
    trace.append({"act": "done", "observe": {"count": len(data)}})
    return {"data": data, "trace": trace}


class SentimentSummaryRequest(BaseModel):
    product_id: Optional[int] = None


@router.get("/summary")
async def summarize(product_id: Optional[int] = None, conn=Depends(get_conn)):
    trace = []
    trace.append({"reason": "fetch comments", "act": "db_select", "observe": {"product_id": product_id}})
    data = await svc.summarize_by_product(conn, product_id=product_id)
    trace.append({"act": "aggregate", "observe": {"products": len(data.get("products", []))}})
    return {"data": data, "trace": trace}


