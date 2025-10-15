from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import Optional
from ...core.db import get_conn
from ...services.analyst.service import AnalystService


router = APIRouter()
svc = AnalystService()


class RevenueRequest(BaseModel):
    month: Optional[int] = None
    year: Optional[int] = None


@router.post("/revenue")
async def revenue(req: RevenueRequest, conn=Depends(get_conn)):
    trace = []
    trace.append({"reason": "build sql with optional filters", "act": "sql_build", "observe": {"month": req.month, "year": req.year}})
    data = await svc.get_revenue(conn, month=req.month, year=req.year)
    trace.append({"act": "sql_exec", "observe": {"rows": len(data.get("data", []))}})
    return {"data": data["data"], "summary": data.get("summary", {}), "trace": trace}


