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
                    npi_data = await self._search_with_fallback(physician)

                    if npi_data:
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
                            "match_strategy": npi_data.get("_strategy", "unknown"),
                        })
                    else:
                        await self.log_record(
                            run,
                            f"{physician.first_name} {physician.last_name}",
                            "skipped",
                            {"reason": "no unique match after fallback attempts"},
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

    async def _search_with_fallback(self, physician: Physician) -> dict | None:
        """Try progressively broader NPPES searches until a unique match is found.

        Strategy 1: name + state + taxonomy=Neurology
        Strategy 2: name + state (no taxonomy filter)
        Strategy 3: name only (no state, no taxonomy) — if state is empty
        """
        strategies = []

        # Strategy 1: Full constraints
        params1 = {
            "version": "2.1",
            "first_name": physician.first_name,
            "last_name": physician.last_name,
            "taxonomy_description": "Neurology",
            "limit": "3",
        }
        if physician.state:
            params1["state"] = physician.state
        strategies.append(("name+state+neurology" if physician.state else "name+neurology", params1))

        # Strategy 2: Drop taxonomy
        params2 = {
            "version": "2.1",
            "first_name": physician.first_name,
            "last_name": physician.last_name,
            "limit": "3",
        }
        if physician.state:
            params2["state"] = physician.state
        strategies.append(("name+state" if physician.state else "name_only", params2))

        # Strategy 3: Name only (if state was set, try without it)
        if physician.state:
            params3 = {
                "version": "2.1",
                "first_name": physician.first_name,
                "last_name": physician.last_name,
                "limit": "3",
            }
            strategies.append(("name_only", params3))

        for strategy_name, params in strategies:
            resp = await self.rate_limited_get(BASE_URL, params=params)
            resp.raise_for_status()
            data = resp.json()
            results = data.get("results", [])

            if results and len(results) == 1:
                npi_data = self._normalize_result(results[0])
                npi_data["_strategy"] = strategy_name
                return npi_data

        return None

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
