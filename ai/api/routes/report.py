from fastapi import APIRouter, Depends
from jinja2 import Template, Environment, FileSystemLoader, select_autoescape
import os
from typing import Optional, List, Dict
from datetime import datetime
import json
from ...core.db import get_conn
from ...services.analyst.service import AnalystService
from ...services.sentiment.service import SentimentService

router = APIRouter()
analyst_svc = AnalystService()
sentiment_svc = SentimentService()

_env = Environment(
    loader=FileSystemLoader(searchpath=os.path.join(os.path.dirname(os.path.dirname(__file__)), "..", "templates")),
    autoescape=select_autoescape(["html", "xml"])  # safe JSON via tojson
)


@router.get("/summary")
async def summary(month: Optional[int] = None, year: Optional[int] = None, conn=Depends(get_conn)):
    rev = await analyst_svc.get_revenue(conn, month=month, year=year)
    sent = await sentiment_svc.summarize_by_product(conn)

    # Enrich product names/slugs for better visualization
    pids: List[int] = [int(p.get("product_id")) for p in (sent.get("products") or [])]
    id_to_meta: Dict[int, Dict[str, str]] = {}
    if pids:
        placeholders = ",".join(["%s"] * len(pids))
        async with conn.cursor() as cur:
            await cur.execute(
                f"SELECT id, name, slug FROM products WHERE id IN ({placeholders})",
                pids,
            )
            rows = await cur.fetchall()
            for r in rows:
                id_to_meta[int(r[0])] = {"name": str(r[1]), "slug": str(r[2])}
        # attach to sentiment result
        for item in sent.get("products", []):
            meta = id_to_meta.get(int(item["product_id"]))
            if meta:
                item["name"] = meta["name"]
                item["slug"] = meta["slug"]
    template = _env.get_template("report_summary.html.j2")
    return template.render(
        revenue=rev,
        sentiment=sent,
        generated_at=datetime.utcnow().isoformat(timespec="seconds") + "Z",
        params={"month": month, "year": year},
    )


