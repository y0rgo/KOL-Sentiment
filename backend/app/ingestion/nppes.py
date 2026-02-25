"""NPPES NPI Registry client for physician enrichment."""
from sqlalchemy import select

from app.ingestion.base import BaseIngestionClient
from app.models.physician import Physician
from app.models.ingestion import IngestionRun

BASE_URL = "https://npiregistry.cms.hhs.gov/api/"


class NPPESClient(BaseIngestionClient):
    source_name = "nppes"
    max_concurrent = 3
    delay_between = 0.2

    async def test_connection(self) -> dict:
        try:
            resp = await self.rate_limited_get(
                BASE_URL,
                params={"version": "2.1", "taxonomy_description": "Neurology", "limit": "1"},
            )
            resp.raise_for_status()
            data = resp.json()
            count = data.get("result_count", 0)
            await self.update_source_status(True)
            return {"ok": True, "message": f"NPPES reachable, {count} neurology results"}
        except Exception as e:
            await self.update_source_status(False, str(e))
            return {"ok": False, "message": str(e)}

    async def search(self, limit: int = 10) -> list[dict]:
        """Search NPPES for neurologists."""
        resp = await self.rate_limited_get(
            BASE_URL,
            params={
                "version": "2.1",
                "taxonomy_description": "Neurology",
                "limit": str(limit),
            },
        )
        resp.raise_for_status()
        data = resp.json()
        results = data.get("results", [])
        return [self._normalize_result(r) for r in results]

    async def ingest(self, run_type: str = "sample", limit: int = 20) -> IngestionRun:
        """Enrich existing physicians with NPI data."""
        run = await self.create_run(run_type, {"limit": limit})

        try:
            # Find physicians missing NPI
            result = await self.db.execute(
                select(Physician)
                .where(Physician.npi.is_(None))
                .limit(limit)
            )
            physicians = result.scalars().all()

            for physician in physicians:
                try:
                    resp = await self.rate_limited_get(
                        BASE_URL,
                        params={
                            "version": "2.1",
                            "first_name": physician.first_name,
                            "last_name": physician.last_name,
                            "state": physician.state or "",
                            "taxonomy_description": "Neurology",
                            "limit": "3",
                        },
                    )
                    resp.raise_for_status()
                    data = resp.json()
                    results = data.get("results", [])

                    if results and len(results) == 1:
                        npi_data = self._normalize_result(results[0])
                        physician.npi = npi_data.get("npi")
                        if npi_data.get("credentials"):
                            physician.credentials = npi_data["credentials"]
                        if npi_data.get("city") and not physician.city:
                            physician.city = npi_data["city"]
                        if npi_data.get("state") and not physician.state:
                            physician.state = npi_data["state"]
                        await self.db.flush()
                        await self.log_record(run, f"NPI:{npi_data['npi']}", "updated", {
                            "physician_id": str(physician.id),
                        })
                    else:
                        await self.log_record(
                            run,
                            f"{physician.first_name} {physician.last_name}",
                            "skipped",
                            {"reason": f"{len(results)} matches found"},
                        )

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

    def _normalize_result(self, raw: dict) -> dict:
        basic = raw.get("basic", {})
        addresses = raw.get("addresses", [{}])
        taxonomies = raw.get("taxonomies", [{}])

        location = addresses[0] if addresses else {}
        taxonomy = taxonomies[0] if taxonomies else {}

        return {
            "npi": str(raw.get("number", "")),
            "first_name": basic.get("first_name", ""),
            "last_name": basic.get("last_name", ""),
            "credentials": basic.get("credential", ""),
            "taxonomy": taxonomy.get("desc", ""),
            "city": location.get("city", ""),
            "state": location.get("state", ""),
            "postal_code": location.get("postal_code", ""),
        }
