"""Abstract base class for all ingestion clients."""
import asyncio
import uuid
from abc import ABC, abstractmethod
from datetime import datetime
from typing import Any

import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.data_source import DataSource
from app.models.ingestion import IngestionRun, IngestionLog


class BaseIngestionClient(ABC):
    """Base class providing shared HTTP client, rate limiting, and run lifecycle."""

    source_name: str = ""
    max_concurrent: int = 3
    delay_between: float = 0.35  # seconds between requests
    request_timeout: float = 30.0  # seconds per request

    def __init__(self, db: AsyncSession):
        self.db = db
        self._semaphore = asyncio.Semaphore(self.max_concurrent)
        self._client: httpx.AsyncClient | None = None
        self._data_source: DataSource | None = None

    async def get_client(self) -> httpx.AsyncClient:
        if self._client is None or self._client.is_closed:
            self._client = httpx.AsyncClient(timeout=self.request_timeout)
        return self._client

    async def close(self):
        if self._client and not self._client.is_closed:
            await self._client.aclose()

    async def get_data_source(self) -> DataSource:
        if self._data_source is None:
            result = await self.db.execute(
                select(DataSource).where(DataSource.name == self.source_name)
            )
            self._data_source = result.scalar_one_or_none()
        return self._data_source

    async def rate_limited_get(self, url: str, params: dict | None = None) -> httpx.Response:
        async with self._semaphore:
            client = await self.get_client()
            response = await client.get(url, params=params)
            await asyncio.sleep(self.delay_between)
            return response

    async def rate_limited_post(self, url: str, **kwargs) -> httpx.Response:
        async with self._semaphore:
            client = await self.get_client()
            response = await client.post(url, **kwargs)
            await asyncio.sleep(self.delay_between)
            return response

    # --- Run lifecycle ---

    async def create_run(self, run_type: str, parameters: dict | None = None) -> IngestionRun:
        source = await self.get_data_source()
        run = IngestionRun(
            data_source_id=source.id,
            run_type=run_type,
            parameters=parameters,
            status="running",
            started_at=datetime.utcnow(),
        )
        self.db.add(run)
        await self.db.flush()
        return run

    async def log_record(
        self,
        run: IngestionRun,
        record_id: str,
        action: str,
        detail: dict | None = None,
    ):
        log = IngestionLog(
            ingestion_run_id=run.id,
            record_identifier=record_id,
            action=action,
            detail=detail,
        )
        self.db.add(log)

        if action == "created":
            run.records_new += 1
        elif action == "updated":
            run.records_updated += 1
        elif action == "error":
            run.records_errors += 1
        run.records_fetched += 1

    async def complete_run(self, run: IngestionRun, error: str | None = None):
        run.completed_at = datetime.utcnow()
        if error:
            run.status = "failed"
            run.error_message = error
        else:
            run.status = "completed"
        await self.db.commit()

    async def update_source_status(self, success: bool, error_msg: str | None = None):
        source = await self.get_data_source()
        source.last_tested_at = datetime.utcnow()
        if success:
            source.status = "connected"
            source.last_successful_at = datetime.utcnow()
            source.last_error_message = None
        else:
            source.status = "error"
            source.last_error_message = error_msg
        await self.db.commit()

    # --- Abstract methods ---

    @abstractmethod
    async def test_connection(self) -> dict:
        """Test the API connection. Return {"ok": True/False, "message": ...}."""

    @abstractmethod
    async def search(self, limit: int = 10) -> list[dict]:
        """Search for records without persisting. Returns preview dicts."""

    @abstractmethod
    async def ingest(self, run_type: str = "sample", limit: int = 20) -> IngestionRun:
        """Search + persist records. Returns the completed IngestionRun."""
