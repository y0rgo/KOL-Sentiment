"""Celery background tasks for ingestion runs."""
import asyncio
import uuid

from app.tasks import app as celery_app
from app.database import async_session
from app.ingestion import CLIENT_REGISTRY


@celery_app.task(name="run_full_ingestion")
def run_full_ingestion(source_name: str, limit: int = 100):
    """Run a full ingestion for the given source. Called from API endpoint."""
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    try:
        result = loop.run_until_complete(_run_ingestion(source_name, limit))
        return result
    finally:
        loop.close()


async def _run_ingestion(source_name: str, limit: int) -> dict:
    client_cls = CLIENT_REGISTRY.get(source_name)
    if not client_cls:
        return {"ok": False, "error": f"Unknown source: {source_name}"}

    async with async_session() as db:
        client = client_cls(db)
        try:
            run = await client.ingest(run_type="full", limit=limit)
            return {
                "ok": True,
                "run_id": str(run.id),
                "status": run.status,
                "records_fetched": run.records_fetched,
                "records_new": run.records_new,
                "records_updated": run.records_updated,
                "records_errors": run.records_errors,
            }
        finally:
            await client.close()
