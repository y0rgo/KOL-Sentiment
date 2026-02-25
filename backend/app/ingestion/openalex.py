"""OpenAlex client for author metric enrichment (h-index, citations)."""
import asyncio

from sqlalchemy import select

from app.config import settings
from app.ingestion.base import BaseIngestionClient
from app.models.physician import Physician
from app.models.ingestion import IngestionRun

BASE_URL = "https://api.openalex.org/"


class OpenAlexClient(BaseIngestionClient):
    source_name = "openalex"
    max_concurrent = 5
    delay_between = 0.1

    def _headers(self) -> dict:
        headers = {}
        if settings.OPENALEX_EMAIL:
            headers["User-Agent"] = f"mailto:{settings.OPENALEX_EMAIL}"
        return headers

    async def test_connection(self) -> dict:
        try:
            client = await self.get_client()
            resp = await client.get(
                f"{BASE_URL}authors",
                params={"search": "myasthenia gravis", "per_page": "1"},
                headers=self._headers(),
            )
            resp.raise_for_status()
            data = resp.json()
            count = data.get("meta", {}).get("count", 0)
            await self.update_source_status(True)
            return {"ok": True, "message": f"OpenAlex reachable, {count} gMG authors found"}
        except Exception as e:
            await self.update_source_status(False, str(e))
            return {"ok": False, "message": str(e)}

    async def search(self, limit: int = 10) -> list[dict]:
        client = await self.get_client()
        resp = await client.get(
            f"{BASE_URL}authors",
            params={
                "search": "myasthenia gravis",
                "per_page": str(limit),
                "sort": "cited_by_count:desc",
            },
            headers=self._headers(),
        )
        resp.raise_for_status()
        data = resp.json()
        results = data.get("results", [])
        return [self._normalize_author(a) for a in results]

    async def ingest(self, run_type: str = "sample", limit: int = 20) -> IngestionRun:
        """Enrich existing physicians with h-index and citation data."""
        run = await self.create_run(run_type, {"limit": limit})

        try:
            result = await self.db.execute(
                select(Physician)
                .where(Physician.h_index.is_(None))
                .limit(limit)
            )
            physicians = result.scalars().all()

            client = await self.get_client()
            for physician in physicians:
                try:
                    search_name = f"{physician.first_name} {physician.last_name}"
                    resp = await client.get(
                        f"{BASE_URL}authors",
                        params={
                            "search": search_name,
                            "per_page": "3",
                        },
                        headers=self._headers(),
                    )
                    await asyncio.sleep(self.delay_between)
                    resp.raise_for_status()
                    data = resp.json()
                    results = data.get("results", [])

                    if results:
                        # Take best match (first result from search)
                        author = self._normalize_author(results[0])
                        physician.h_index = author.get("h_index")
                        physician.total_citations = author.get("cited_by_count")
                        works = author.get("works_count", 0)
                        if works and author.get("cited_by_count"):
                            physician.citations_per_paper = round(
                                author["cited_by_count"] / works, 2
                            )
                        await self.db.flush()
                        await self.log_record(run, search_name, "updated", {
                            "physician_id": str(physician.id),
                            "h_index": author.get("h_index"),
                        })
                    else:
                        await self.log_record(run, search_name, "skipped", {"reason": "no match"})

                except Exception as e:
                    await self.log_record(
                        run,
                        f"{physician.first_name} {physician.last_name}",
                        "error",
                        {"error": str(e)},
                    )

            await self.complete_run(run)
        except Exception as e:
            await self.complete_run(run, error=str(e))

        return run

    def _normalize_author(self, raw: dict) -> dict:
        return {
            "openalex_id": raw.get("id"),
            "display_name": raw.get("display_name"),
            "h_index": raw.get("summary_stats", {}).get("h_index"),
            "cited_by_count": raw.get("cited_by_count"),
            "works_count": raw.get("works_count"),
            "last_known_institution": (raw.get("last_known_institutions") or [{}])[0].get("display_name") if raw.get("last_known_institutions") else None,
        }
