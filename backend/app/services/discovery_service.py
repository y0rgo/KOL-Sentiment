"""Physician-centric discovery service.

Scans discovered_authors staging table, applies threshold rules,
and promotes qualifying candidates to the physicians table.

Three phases:
1. Link — match unlinked discovered_authors to existing physicians
2. Find — aggregate and apply threshold rules to find candidates
3. Promote — create candidate physician records and backfill links
"""
import logging
from datetime import datetime

from sqlalchemy import select, func, case, text, and_, or_, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.ingestion.config import TARGET_JOURNALS
from app.models.discovered_author import DiscoveredAuthor
from app.models.physician import Physician
from app.models.publication import PublicationAuthor
from app.models.trial import TrialInvestigator
from app.services.match_engine import MatchEngine

logger = logging.getLogger(__name__)

# Normalized target journal names for case-insensitive comparison
TARGET_JOURNALS_LOWER = [j.lower() for j in TARGET_JOURNALS]


class DiscoveryService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.match_engine = MatchEngine(db)

    async def run(self) -> dict:
        """Execute full discovery pipeline: link -> find -> promote."""
        linked = await self._link_existing_physicians()
        candidates = await self._find_candidates()
        promoted = await self._promote_candidates(candidates)

        return {
            "linked_to_existing": linked,
            "candidates_found": len(candidates),
            "candidates_promoted": promoted,
        }

    # --- Phase 1: Link unmatched discovered_authors to existing physicians ---

    async def _link_existing_physicians(self) -> int:
        """Scan discovered_authors with physician_id IS NULL, try MatchEngine."""
        result = await self.db.execute(
            select(
                DiscoveredAuthor.first_name_norm,
                DiscoveredAuthor.last_name_norm,
            )
            .where(DiscoveredAuthor.physician_id.is_(None))
            .group_by(
                DiscoveredAuthor.first_name_norm,
                DiscoveredAuthor.last_name_norm,
            )
        )
        unmatched_names = result.all()

        linked_count = 0
        for first_norm, last_norm in unmatched_names:
            physician = await self.match_engine.find_match(None, first_norm, last_norm)
            if physician:
                await self.db.execute(
                    update(DiscoveredAuthor)
                    .where(
                        DiscoveredAuthor.first_name_norm == first_norm,
                        DiscoveredAuthor.last_name_norm == last_norm,
                        DiscoveredAuthor.physician_id.is_(None),
                    )
                    .values(physician_id=physician.id)
                )
                linked_count += 1

        await self.db.flush()
        return linked_count

    # --- Phase 2: Find candidates using threshold rules ---

    async def _find_candidates(self) -> list[dict]:
        """Aggregate discovered_authors and apply promotion thresholds.

        A candidate qualifies if ANY of these are met:
        - 2+ appearances as first_author or last_author
        - 1+ as principal_investigator or study_director
        - 1+ first/last author in a high-impact TARGET_JOURNAL
        """
        # Build the aggregate query over unlinked authors only
        da = DiscoveredAuthor.__table__

        first_last_count = func.count(case(
            (da.c.role.in_(["first_author", "last_author"]), 1),
        ))
        pi_count = func.count(case(
            (da.c.role.in_(["principal_investigator", "study_director"]), 1),
        ))
        high_impact_count = func.count(case(
            (and_(
                da.c.role.in_(["first_author", "last_author"]),
                func.lower(da.c.journal_name).in_(TARGET_JOURNALS_LOWER),
            ), 1),
        ))
        total_count = func.count()
        sources_agg = func.array_agg(func.distinct(da.c.source_type))

        query = (
            select(
                da.c.first_name_norm,
                da.c.last_name_norm,
                func.max(da.c.first_name).label("first_name"),
                func.max(da.c.last_name).label("last_name"),
                first_last_count.label("first_last"),
                pi_count.label("pi"),
                high_impact_count.label("high_impact"),
                total_count.label("total"),
                sources_agg.label("sources"),
            )
            .where(da.c.physician_id.is_(None))
            .group_by(da.c.first_name_norm, da.c.last_name_norm)
            .having(
                or_(
                    first_last_count >= 2,
                    pi_count >= 1,
                    high_impact_count >= 1,
                )
            )
        )

        result = await self.db.execute(query)
        rows = result.all()

        candidates = []
        for row in rows:
            # Determine which rule(s) triggered
            rules = []
            if row.first_last >= 2:
                rules.append("repeat_first_last_author")
            if row.pi >= 1:
                rules.append("clinical_trial_pi")
            if row.high_impact >= 1:
                rules.append("high_impact_journal")

            sources_str = ", ".join(sorted(row.sources)) if row.sources else ""
            detail = (
                f"Auto-discovered: {', '.join(rules)}. "
                f"{row.total} appearances across {sources_str}. "
                f"first/last={row.first_last}, PI={row.pi}, high-impact={row.high_impact}."
            )

            candidates.append({
                "first_name": row.first_name,
                "last_name": row.last_name,
                "first_name_norm": row.first_name_norm,
                "last_name_norm": row.last_name_norm,
                "source_detail": detail,
                "rules": rules,
                "stats": {
                    "total": row.total,
                    "first_last": row.first_last,
                    "pi": row.pi,
                    "high_impact": row.high_impact,
                },
            })

        return candidates

    # --- Phase 3: Promote candidates to physicians table ---

    async def _promote_candidates(self, candidates: list[dict]) -> int:
        """Create Physician records for candidates and backfill links."""
        promoted = 0

        for cand in candidates:
            # Double-check no existing physician (edge case from concurrent runs)
            existing = await self.match_engine.find_match(
                None, cand["first_name_norm"], cand["last_name_norm"]
            )
            if existing:
                # Just link the discovered_authors to this physician
                await self.db.execute(
                    update(DiscoveredAuthor)
                    .where(
                        DiscoveredAuthor.first_name_norm == cand["first_name_norm"],
                        DiscoveredAuthor.last_name_norm == cand["last_name_norm"],
                        DiscoveredAuthor.physician_id.is_(None),
                    )
                    .values(physician_id=existing.id)
                )
                continue

            # Determine source_channel from dominant rule
            if "clinical_trial_pi" in cand["rules"]:
                source_channel = "clinical_trial"
            else:
                source_channel = "publication"

            physician = Physician(
                first_name=cand["first_name"],
                last_name=cand["last_name"],
                record_status="candidate",
                source_channel=source_channel,
                source_detail=cand["source_detail"],
            )
            self.db.add(physician)
            await self.db.flush()

            # Stamp physician_id on all their discovered_author rows
            await self.db.execute(
                update(DiscoveredAuthor)
                .where(
                    DiscoveredAuthor.first_name_norm == cand["first_name_norm"],
                    DiscoveredAuthor.last_name_norm == cand["last_name_norm"],
                    DiscoveredAuthor.physician_id.is_(None),
                )
                .values(physician_id=physician.id)
            )

            # Backfill publication_authors links
            pub_rows = await self.db.execute(
                select(DiscoveredAuthor)
                .where(
                    DiscoveredAuthor.physician_id == physician.id,
                    DiscoveredAuthor.publication_id.isnot(None),
                )
            )
            for da in pub_rows.scalars():
                existing_link = await self.db.execute(
                    select(PublicationAuthor).where(
                        PublicationAuthor.publication_id == da.publication_id,
                        PublicationAuthor.physician_id == physician.id,
                    )
                )
                if not existing_link.scalar_one_or_none():
                    self.db.add(PublicationAuthor(
                        publication_id=da.publication_id,
                        physician_id=physician.id,
                        author_position=da.role,
                    ))

            # Backfill trial_investigators links
            trial_rows = await self.db.execute(
                select(DiscoveredAuthor)
                .where(
                    DiscoveredAuthor.physician_id == physician.id,
                    DiscoveredAuthor.trial_id.isnot(None),
                )
            )
            for da in trial_rows.scalars():
                existing_link = await self.db.execute(
                    select(TrialInvestigator).where(
                        TrialInvestigator.trial_id == da.trial_id,
                        TrialInvestigator.physician_id == physician.id,
                    )
                )
                if not existing_link.scalar_one_or_none():
                    self.db.add(TrialInvestigator(
                        trial_id=da.trial_id,
                        physician_id=physician.id,
                        role=da.role,
                    ))

            await self.db.flush()
            promoted += 1
            logger.info(
                "Promoted candidate physician: %s %s (%s)",
                cand["first_name"], cand["last_name"], ", ".join(cand["rules"]),
            )

        await self.db.flush()
        return promoted
