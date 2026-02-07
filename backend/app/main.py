from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.api import physicians, sentiment, engagements, analytics, network, simulator, ingest


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Run Alembic migrations on startup
    import subprocess
    import os
    backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    subprocess.run(["alembic", "upgrade", "head"], cwd=backend_dir)
    yield


app = FastAPI(
    title="KOL Sentiment & Persona Intelligence Platform",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(physicians.router, prefix="/api/physicians", tags=["physicians"])
app.include_router(sentiment.router, prefix="/api/sentiment", tags=["sentiment"])
app.include_router(engagements.router, prefix="/api/engagements", tags=["engagements"])
app.include_router(analytics.router, prefix="/api/analytics", tags=["analytics"])
app.include_router(network.router, prefix="/api/network", tags=["network"])
app.include_router(simulator.router, prefix="/api/simulator", tags=["simulator"])
app.include_router(ingest.router, prefix="/api/ingest", tags=["ingest"])


@app.get("/api/health")
async def health_check():
    return {"status": "healthy"}
