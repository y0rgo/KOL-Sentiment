import os
import asyncio
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from app.database import engine


async def run_migrations():
    """Run alembic migrations on startup."""
    from alembic.config import Config
    from alembic import command

    # Determine the correct alembic paths
    if os.path.exists("/app/alembic"):
        alembic_dir = "/app"
    else:
        alembic_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

    alembic_cfg = Config(os.path.join(alembic_dir, "alembic.ini"))
    alembic_cfg.set_main_option("script_location", os.path.join(alembic_dir, "alembic"))
    alembic_cfg.set_main_option("sqlalchemy.url", str(engine.url))

    # Run migrations in a thread to avoid blocking
    loop = asyncio.get_event_loop()
    await loop.run_in_executor(None, lambda: command.upgrade(alembic_cfg, "head"))


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Run migrations on startup
    try:
        await run_migrations()
    except Exception as e:
        print(f"Migration warning: {e}")
    yield


app = FastAPI(
    title="KOL Master List & Intelligence Platform",
    description="Physician intelligence platform for KOL management",
    version="2.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Import and register routers
from app.api.master_list import router as master_list_router
from app.api.imports import router as imports_router
from app.api.nominations import router as nominations_router
from app.api.review_queue import router as review_queue_router
from app.api.analytics import router as analytics_router
from app.api.sentiment import router as sentiment_router
from app.api.engagements import router as engagements_router
from app.api.personas import router as personas_router
from app.api.tier import router as tier_router

app.include_router(master_list_router, prefix="/api/master-list", tags=["Master List"])
app.include_router(imports_router, prefix="/api/imports", tags=["Imports"])
app.include_router(nominations_router, prefix="/api/nominations", tags=["Nominations"])
app.include_router(review_queue_router, prefix="/api/review-queue", tags=["Review Queue"])
app.include_router(analytics_router, prefix="/api/analytics", tags=["Analytics"])
app.include_router(sentiment_router, prefix="/api/sentiment", tags=["Sentiment"])
app.include_router(engagements_router, prefix="/api/engagements", tags=["Engagements"])
app.include_router(personas_router, prefix="/api/physicians", tags=["Personas"])
app.include_router(tier_router, prefix="/api/tier", tags=["Tier Classification"])


@app.get("/api/health")
async def health_check():
    return {"status": "healthy", "version": "2.0.0"}
