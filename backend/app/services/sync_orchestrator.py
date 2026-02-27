"""Full pipeline orchestrator running all sources in dependency order.

Phase 1 — Articles:    pubmed, europe_pmc, biorxiv_medrxiv  (parallel-safe, independent)
Phase 2 — Trials:      clinicaltrials_gov
Phase 3 — Discovery:   DiscoveryService.run()  (needs articles + trials first)
Phase 4 — Enrichment:  nppes → open_payments → openalex → unpaywall  (NPPES before Open Payments)
"""
import logging
from dataclasses import dataclass, field

from sqlalchemy.ext.asyncio import AsyncSession

from app.ingestion import CLIENT_REGISTRY
from app.services.discovery_service import DiscoveryService

logger = logging.getLogger(__name__)

# Source groups in execution order
ARTICLE_SOURCES = ["pubmed", "europe_pmc", "biorxiv_medrxiv"]
TRIAL_SOURCES = ["clinicaltrials_gov"]
ENRICHMENT_SOURCES = ["nppes", "open_payments", "openalex", "unpaywall"]


@dataclass
class PhaseResult:
    name: str
    status: str = "pending"
    results: dict = field(default_factory=dict)
    error: str | None = None


class SyncOrchestrator:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def run_all(
        self,
        article_limit: int = 30,
        trial_limit: int = 20,
        enrichment_limit: int = 50,
    ) -> dict:
        """Execute the full HARVEST → PROMOTE → ENRICH pipeline."""
        phases = []

        # Phase 1: Articles
        phase1 = await self._run_phase(
            "articles", ARTICLE_SOURCES, limit=article_limit
        )
        phases.append(phase1)

        # Phase 2: Trials
        phase2 = await self._run_phase(
            "trials", TRIAL_SOURCES, limit=trial_limit
        )
        phases.append(phase2)

        # Phase 3: Discovery
        phase3 = await self._run_discovery()
        phases.append(phase3)

        # Phase 4: Enrichment (sequential — NPPES must precede Open Payments)
        phase4 = await self._run_phase(
            "enrichment", ENRICHMENT_SOURCES, limit=enrichment_limit
        )
        phases.append(phase4)

        return {
            "phases": [
                {
                    "name": p.name,
                    "status": p.status,
                    "results": p.results,
                    "error": p.error,
                }
                for p in phases
            ],
            "overall_status": "completed" if all(
                p.status == "completed" for p in phases
            ) else "partial",
        }

    async def _run_phase(
        self, phase_name: str, source_names: list[str], limit: int
    ) -> PhaseResult:
        phase = PhaseResult(name=phase_name)
        try:
            for source_name in source_names:
                client_cls = CLIENT_REGISTRY.get(source_name)
                if not client_cls:
                    phase.results[source_name] = {"status": "skipped", "reason": "not in registry"}
                    continue

                client = client_cls(self.db)
                try:
                    run = await client.ingest(run_type="full", limit=limit)
                    phase.results[source_name] = {
                        "status": run.status,
                        "records_fetched": run.records_fetched,
                        "records_new": run.records_new,
                        "records_updated": run.records_updated,
                        "records_errors": run.records_errors,
                    }
                except Exception as e:
                    logger.error("Source %s failed: %s", source_name, e)
                    phase.results[source_name] = {"status": "failed", "error": str(e)}
                finally:
                    await client.close()

            phase.status = "completed"
        except Exception as e:
            phase.status = "failed"
            phase.error = str(e)
            logger.error("Phase %s failed: %s", phase_name, e)

        return phase

    async def _run_discovery(self) -> PhaseResult:
        phase = PhaseResult(name="discovery")
        try:
            service = DiscoveryService(self.db)
            result = await service.run()
            phase.results = result
            phase.status = "completed"
            await self.db.commit()
        except Exception as e:
            phase.status = "failed"
            phase.error = str(e)
            logger.error("Discovery phase failed: %s", e)

        return phase
