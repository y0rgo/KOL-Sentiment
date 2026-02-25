"""Unpaywall client for checking open access status of publications."""
from datetime import datetime

from sqlalchemy import select, and_

from app.config import settings
from app.ingestion.base import BaseIngestionClient
from app.models.publication import Publication
from app.models.publication_access import PublicationAccess
from app.models.ingestion import IngestionRun

BASE_URL = "https://api.unpaywall.org/v2/"


class UnpaywallClient(BaseIngestionClient):
    source_name = "unpaywall"
    max_concurrent = 5
    delay_between = 0.1

    def _email(self) -> str:
        return settings.UNPAYWALL_EMAIL or "kol.platform.dev@gmail.com"

    async def test_connection(self) -> dict:
        try:
            # Test with a known DOI (landmark gMG paper)
            resp = await self.rate_limited_get(
                f"{BASE_URL}10.1016/S1474-4422(17)30369-1",
                params={"email": self._email()},
            )
            resp.raise_for_status()
            data = resp.json()
            await self.update_source_status(True)
            return {
                "ok": True,
                "message": f"Unpaywall reachable, tested DOI is_oa={data.get('is_oa')}",
            }
        except Exception as e:
            await self.update_source_status(False, str(e))
            return {"ok": False, "message": str(e)}

    async def search(self, limit: int = 10) -> list[dict]:
        """Preview: check OA status of publications with DOIs but no access record."""
        pubs = await self._get_unchecked_publications(limit)
        results = []
        for pub in pubs:
            try:
                data = await self._lookup_doi(pub.doi)
                if data:
                    results.append(data)
            except Exception:
                pass
        return results

    async def ingest(self, run_type: str = "sample", limit: int = 20) -> IngestionRun:
        run = await self.create_run(run_type, {"limit": limit})

        try:
            pubs = await self._get_unchecked_publications(limit)
            for pub in pubs:
                if not pub.doi:
                    continue
                try:
                    data = await self._lookup_doi(pub.doi)
                    if data:
                        access = PublicationAccess(
                            publication_id=pub.id,
                            doi=pub.doi,
                            is_open_access=data.get("is_oa", False),
                            oa_status=data.get("oa_status", "closed"),
                            free_full_text_url=data.get("free_fulltext_url"),
                            pdf_url=data.get("pdf_url"),
                            license=data.get("license"),
                            publisher=data.get("publisher"),
                        )
                        self.db.add(access)
                        await self.db.flush()
                        await self.log_record(run, f"DOI:{pub.doi}", "created", {
                            "is_oa": data.get("is_oa"),
                            "oa_status": data.get("oa_status"),
                        })
                    else:
                        await self.log_record(run, f"DOI:{pub.doi}", "skipped", {"reason": "no data"})
                except Exception as e:
                    await self.log_record(run, f"DOI:{pub.doi}", "error", {"error": str(e)})

            await self.complete_run(run)
        except Exception as e:
            await self.complete_run(run, error=str(e))

        return run

    async def _get_unchecked_publications(self, limit: int) -> list[Publication]:
        """Get publications with DOIs that don't have an access record yet."""
        result = await self.db.execute(
            select(Publication)
            .outerjoin(PublicationAccess, Publication.id == PublicationAccess.publication_id)
            .where(
                and_(
                    Publication.doi.isnot(None),
                    Publication.doi != "",
                    PublicationAccess.id.is_(None),
                )
            )
            .limit(limit)
        )
        return list(result.scalars().all())

    async def _lookup_doi(self, doi: str) -> dict | None:
        resp = await self.rate_limited_get(
            f"{BASE_URL}{doi}",
            params={"email": self._email()},
        )
        if resp.status_code == 404:
            return None
        resp.raise_for_status()
        data = resp.json()

        best_oa = data.get("best_oa_location") or {}
        return {
            "is_oa": data.get("is_oa", False),
            "oa_status": data.get("oa_status", "closed"),
            "free_fulltext_url": best_oa.get("url"),
            "pdf_url": best_oa.get("url_for_pdf"),
            "license": best_oa.get("license"),
            "publisher": data.get("publisher"),
        }
