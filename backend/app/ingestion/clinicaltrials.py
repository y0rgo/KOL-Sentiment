"""ClinicalTrials.gov v2 API ingestion client."""
from datetime import datetime

from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert as pg_insert

from app.ingestion.base import BaseIngestionClient
from app.ingestion.config import CLINICALTRIALS_CONDITION_TERMS
from app.models.trial import ClinicalTrial, TrialInvestigator
from app.models.discovered_author import DiscoveredAuthor
from app.models.ingestion import IngestionRun
from app.services.match_engine import MatchEngine
from app.utils.name_normalizer import normalize_name

BASE_URL = "https://clinicaltrials.gov/api/v2/"


class ClinicalTrialsClient(BaseIngestionClient):
    source_name = "clinicaltrials_gov"
    max_concurrent = 5
    delay_between = 0.1

    async def test_connection(self) -> dict:
        try:
            resp = await self.rate_limited_get(
                f"{BASE_URL}studies",
                params={"query.cond": "Myasthenia Gravis", "pageSize": "1"},
            )
            resp.raise_for_status()
            data = resp.json()
            total = data.get("totalCount", 0)
            await self.update_source_status(True)
            return {"ok": True, "message": f"ClinicalTrials.gov reachable, {total} gMG studies found"}
        except Exception as e:
            await self.update_source_status(False, str(e))
            return {"ok": False, "message": str(e)}

    async def search(self, limit: int = 10) -> list[dict]:
        resp = await self.rate_limited_get(
            f"{BASE_URL}studies",
            params={
                "query.cond": "Myasthenia Gravis",
                "pageSize": str(limit),
                "sort": "LastUpdatePostDate:desc",
                "fields": "NCTId,BriefTitle,OverallStatus,Phase,LeadSponsorName,Condition,InterventionName,ContactsLocationsModule",
            },
        )
        resp.raise_for_status()
        data = resp.json()
        studies = data.get("studies", [])
        return [self._normalize_study(s) for s in studies]

    async def ingest(self, run_type: str = "sample", limit: int = 20) -> IngestionRun:
        run = await self.create_run(run_type, {"limit": limit})
        match_engine = MatchEngine(self.db)

        try:
            studies = await self.search(limit=limit)
            for study in studies:
                await self._upsert_study(study, run, match_engine)
            await self.complete_run(run)
        except Exception as e:
            await self.complete_run(run, error=str(e))

        return run

    async def _upsert_study(self, study: dict, run: IngestionRun, match_engine: MatchEngine):
        nct_id = study.get("nct_id")
        if not nct_id:
            return

        try:
            result = await self.db.execute(
                select(ClinicalTrial).where(ClinicalTrial.nct_id == nct_id)
            )
            existing = result.scalar_one_or_none()

            if existing:
                existing.trial_name = study.get("title", existing.trial_name)
                existing.sponsor = study.get("sponsor", existing.sponsor)
                existing.phase = study.get("phase", existing.phase)
                existing.status = study.get("status", existing.status)
                existing.products = study.get("interventions") or existing.products
                await self.log_record(run, nct_id, "updated")
                trial = existing
            else:
                trial = ClinicalTrial(
                    nct_id=nct_id,
                    trial_name=study.get("title"),
                    sponsor=study.get("sponsor"),
                    phase=study.get("phase"),
                    diseases=["Myasthenia Gravis"],
                    products=study.get("interventions"),
                    status=study.get("status"),
                )
                self.db.add(trial)
                await self.db.flush()
                await self.log_record(run, nct_id, "created")

            # Link investigators + stage all in discovered_authors
            for inv in study.get("investigators", []):
                first = inv.get("first_name", "").strip()
                last = inv.get("last_name", "").strip()
                if not first or not last:
                    continue

                physician = await match_engine.find_match(None, first, last)
                if physician:
                    existing_link = await self.db.execute(
                        select(TrialInvestigator).where(
                            TrialInvestigator.trial_id == trial.id,
                            TrialInvestigator.physician_id == physician.id,
                        )
                    )
                    if not existing_link.scalar_one_or_none():
                        link = TrialInvestigator(
                            trial_id=trial.id,
                            physician_id=physician.id,
                            role=inv.get("role"),
                            site_name=inv.get("site_name"),
                        )
                        self.db.add(link)

                # Map ClinicalTrials.gov roles to normalized roles
                raw_role = (inv.get("role") or "").lower().replace(" ", "_")
                if "principal" in raw_role:
                    role = "principal_investigator"
                elif "director" in raw_role:
                    role = "study_director"
                else:
                    role = raw_role or None

                # Stage every investigator in discovered_authors
                stmt = pg_insert(DiscoveredAuthor).values(
                    first_name=first,
                    last_name=last,
                    first_name_norm=normalize_name(first),
                    last_name_norm=normalize_name(last),
                    source_type="clinicaltrials",
                    source_identifier=nct_id,
                    role=role,
                    journal_name=None,
                    trial_id=trial.id,
                    physician_id=physician.id if physician else None,
                ).on_conflict_do_nothing(constraint="uq_discovered_author_source")
                await self.db.execute(stmt)

            await self.db.flush()

        except Exception as e:
            await self.log_record(run, nct_id, "error", {"error": str(e)})

    def _normalize_study(self, raw: dict) -> dict:
        proto = raw.get("protocolSection", {})
        ident = proto.get("identificationModule", {})
        status_mod = proto.get("statusModule", {})
        sponsor_mod = proto.get("sponsorCollaboratorsModule", {})
        design = proto.get("designModule", {})
        arms = proto.get("armsInterventionsModule", {})
        contacts = proto.get("contactsLocationsModule", {})

        nct_id = ident.get("nctId")
        title = ident.get("briefTitle", "")
        overall_status = status_mod.get("overallStatus", "")

        phases = design.get("phases", [])
        phase = phases[0] if phases else None

        lead_sponsor = sponsor_mod.get("leadSponsor", {})
        sponsor_name = lead_sponsor.get("name", "")

        interventions = []
        for interv in arms.get("interventions", []):
            interventions.append(interv.get("name", ""))

        investigators = []
        for official in contacts.get("overallOfficials", []):
            name = official.get("name", "")
            # Split on comma to separate name from credentials (e.g. "Miriam Freimer, MD")
            name_part = name.split(",")[0].strip()
            parts = name_part.split()
            if len(parts) >= 2:
                investigators.append({
                    "first_name": parts[0],
                    "last_name": parts[-1],
                    "role": official.get("role"),
                })

        return {
            "nct_id": nct_id,
            "title": title,
            "status": overall_status,
            "phase": phase,
            "sponsor": sponsor_name,
            "interventions": interventions or None,
            "investigators": investigators,
        }
