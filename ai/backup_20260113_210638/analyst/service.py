from typing import Optional, List, Dict, Any
from fastapi import Depends

# Import db - handle both relative and absolute imports
try:
    from core.db import get_conn
except ImportError:
    from ...core.db import get_conn


class AnalystService:
    async def get_revenue(self, conn, month: Optional[int] = None, year: Optional[int] = None) -> Dict[str, Any]:
        query = "SELECT DATE_FORMAT(order_date, '%Y-%m') ym, SUM(total_amount) rev FROM orders"
        conditions: List[str] = []
        params: List[Any] = []
        if year:
            conditions.append("YEAR(order_date)=%s")
            params.append(year)
        if month:
            conditions.append("MONTH(order_date)=%s")
            params.append(month)
        if conditions:
            query += " WHERE " + " AND ".join(conditions)
        query += " GROUP BY ym ORDER BY ym"
        async with conn.cursor() as cur:
            await cur.execute(query, params)
            rows = await cur.fetchall()
        data = [{"month": r[0], "revenue": float(r[1])} for r in rows]
        return {"data": data, "summary": {"total": sum(d["revenue"] for d in data)}}


