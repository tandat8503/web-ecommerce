from fastapi import FastAPI
from contextlib import asynccontextmanager
from .core.db import init_pool, close_pool


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_pool()
    try:
        yield
    finally:
        await close_pool()


app = FastAPI(title="AI4 - Modular AI Services", version="0.1.0", lifespan=lifespan)

# Routers will be imported lazily to avoid import errors if files are empty initially
from api.routes.chatbot import router as chatbot_router  # type: ignore
from api.routes.sentiment import router as sentiment_router  # type: ignore
from api.routes.analyst import router as analyst_router  # type: ignore
from api.routes.report import router as report_router  # type: ignore

app.include_router(chatbot_router, prefix="/chat", tags=["chatbot"])
app.include_router(sentiment_router, prefix="/sentiment", tags=["sentiment"])
app.include_router(analyst_router, prefix="/analyst", tags=["analyst"])
app.include_router(report_router, prefix="/report", tags=["report"])


@app.get("/health")
async def health():
    return {"status": "ok"}
