"""8-Dimension Tier Classifier Service.

Computes tier scores across 8 configurable dimensions, stores audit trail,
and assigns tier labels based on composite score thresholds.
"""
import uuid
from datetime import datetime, timezone
from decimal import Decimal

from sqlalchemy import select, delete, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.physician import Physician
from app.models.tier import TierDimensionWeight, TierDimensionScore
from app.models.publication import PublicationAuthor
from app.models.congress import CongressActivity
from app.models.trial import TrialInvestigator


# Tier thresholds
TIER_THRESHOLDS = [
    (75, "global_national"),
    (55, "regional_institutional"),
    (30, "local_community"),
]
RISING_STAR_MAX_YEARS = 15
RISING_STAR_MIN_SCORE = 30


def _cap(value: float, maximum: float = 100.0) -> float:
    return min(max(value, 0.0), maximum)


async def _get_weights(db: AsyncSession, disease_id: uuid.UUID | None = None) -> dict[str, float]:
    """Fetch dimension weights. Disease-specific override global if present."""
    weights: dict[str, float] = {}

    # Global weights (disease_id IS NULL)
    result = await db.execute(
        select(TierDimensionWeight)
        .where(TierDimensionWeight.disease_id.is_(None))
        .where(TierDimensionWeight.is_active.is_(True))
    )
    for w in result.scalars().all():
        weights[w.dimension] = float(w.weight)

    # Disease-specific overrides
    if disease_id:
        result = await db.execute(
            select(TierDimensionWeight)
            .where(TierDimensionWeight.disease_id == disease_id)
            .where(TierDimensionWeight.is_active.is_(True))
        )
        for w in result.scalars().all():
            weights[w.dimension] = float(w.weight)

    return weights


async def _count_publications(db: AsyncSession, physician_id: uuid.UUID) -> int:
    result = await db.execute(
        select(func.count()).select_from(PublicationAuthor)
        .where(PublicationAuthor.physician_id == physician_id)
    )
    return result.scalar() or 0


async def _count_congress(db: AsyncSession, physician_id: uuid.UUID) -> int:
    result = await db.execute(
        select(func.count()).select_from(CongressActivity)
        .where(CongressActivity.physician_id == physician_id)
    )
    return result.scalar() or 0


async def _count_trials(db: AsyncSession, physician_id: uuid.UUID) -> int:
    result = await db.execute(
        select(func.count()).select_from(TrialInvestigator)
        .where(TrialInvestigator.physician_id == physician_id)
    )
    return result.scalar() or 0


def _score_scientific_impact(physician: Physician) -> float:
    """Dimension 1: Scientific Impact (h-index, citations, author ratio, citations/paper)."""
    h = float(physician.h_index or 0)
    citations = float(physician.total_citations or 0)
    ratio = float(physician.first_last_author_ratio or 0)
    cpp = float(physician.citations_per_paper or 0)

    h_score = _cap(h / 50.0 * 100.0)
    citation_score = _cap(citations / 5000.0 * 100.0)
    ratio_score = _cap(ratio * 100.0)
    cpp_score = _cap(cpp / 30.0 * 100.0)

    return (h_score * 0.35 + citation_score * 0.30 + ratio_score * 0.20 + cpp_score * 0.15)


def _score_clinical_authority(physician: Physician) -> float:
    """Dimension 2: Clinical Authority (years, fellowship director, uptodate, cme)."""
    years = float(physician.years_in_practice or 0)
    base = _cap(years / 30.0 * 100.0)

    bonus = 0.0
    if physician.fellowship_program_director:
        bonus += 25.0
    if physician.uptodate_author:
        bonus += 25.0
    if physician.cme_faculty:
        bonus += 15.0

    return _cap(base * 0.50 + bonus)


def _score_peer_influence(physician: Physician) -> float:
    """Dimension 3: Peer Influence (society roles, editorial boards, named lectures)."""
    society_count = len(physician.society_leadership_roles or [])
    editorial = float(physician.editorial_board_count or 0)
    lectures = len(physician.named_lectures_awards or [])

    society_score = _cap(society_count * 20.0)
    editorial_score = _cap(editorial * 15.0)
    lecture_score = _cap(lectures * 20.0)

    return (society_score * 0.40 + editorial_score * 0.35 + lecture_score * 0.25)


async def _score_congress_presence(db: AsyncSession, physician_id: uuid.UUID) -> float:
    """Dimension 4: Congress Presence (count of activities)."""
    count = await _count_congress(db, physician_id)
    return _cap(count * 10.0)


async def _score_trial_leadership(db: AsyncSession, physician_id: uuid.UUID) -> float:
    """Dimension 5: Trial Leadership (count of trial involvements)."""
    count = await _count_trials(db, physician_id)
    return _cap(count * 15.0)


def _score_guideline_editorial(physician: Physician) -> float:
    """Dimension 6: Guideline & Editorial Authority."""
    guideline = float(physician.guideline_committee_count or 0)
    editorial = float(physician.editorial_board_count or 0)

    return _cap(guideline * 25.0 + editorial * 20.0)


def _score_digital_advocacy(physician: Physician) -> float:
    """Dimension 7: Digital Advocacy (digital_presence_score already 0-100)."""
    return _cap(float(physician.digital_presence_score or 0))


def _score_industry_recognition(physician: Physician) -> float:
    """Dimension 8: Industry Recognition (named lectures, patient advocacy)."""
    lectures = len(physician.named_lectures_awards or [])
    advocacy = len(physician.patient_advocacy_roles or [])

    return _cap(lectures * 30.0 + advocacy * 25.0)


def _classify_tier(composite: float, years_in_practice: int | None) -> str:
    """Assign tier label based on composite score and rising star check."""
    yip = years_in_practice or 99
    if yip <= RISING_STAR_MAX_YEARS and composite >= RISING_STAR_MIN_SCORE:
        return "rising_star"

    for threshold, label in TIER_THRESHOLDS:
        if composite >= threshold:
            return label

    return "emerging"


async def compute_tier(
    db: AsyncSession,
    physician_id: uuid.UUID,
    disease_id: uuid.UUID | None = None,
) -> dict:
    """Compute and store 8-dimension tier score for a single physician.

    Returns dict with dimension_scores, composite, and tier label.
    """
    result = await db.execute(select(Physician).where(Physician.id == physician_id))
    physician = result.scalar_one_or_none()
    if not physician:
        raise ValueError(f"Physician {physician_id} not found")

    weights = await _get_weights(db, disease_id)
    total_weight = sum(weights.values()) or 100.0

    # Compute raw scores for each dimension
    raw_scores: dict[str, float] = {}
    raw_scores["scientific_impact"] = _score_scientific_impact(physician)
    raw_scores["clinical_authority"] = _score_clinical_authority(physician)
    raw_scores["peer_influence"] = _score_peer_influence(physician)
    raw_scores["congress_presence"] = await _score_congress_presence(db, physician_id)
    raw_scores["trial_leadership"] = await _score_trial_leadership(db, physician_id)
    raw_scores["guideline_editorial_authority"] = _score_guideline_editorial(physician)
    raw_scores["digital_advocacy"] = _score_digital_advocacy(physician)
    raw_scores["industry_recognition"] = _score_industry_recognition(physician)

    # Compute weighted scores and composite
    now = datetime.now(timezone.utc)
    dimension_scores = []
    composite = 0.0

    # Clear previous scores for this physician
    await db.execute(
        delete(TierDimensionScore)
        .where(TierDimensionScore.physician_id == physician_id)
    )

    for dimension, raw in raw_scores.items():
        weight = weights.get(dimension, 0.0)
        weighted = raw * (weight / total_weight)
        composite += weighted

        score_record = TierDimensionScore(
            id=uuid.uuid4(),
            physician_id=physician_id,
            dimension=dimension,
            raw_score=round(raw, 2),
            weighted_score=round(weighted, 2),
            computed_at=now,
        )
        db.add(score_record)

        dimension_scores.append({
            "dimension": dimension,
            "raw_score": round(raw, 2),
            "weight": weight,
            "weighted_score": round(weighted, 2),
        })

    composite = round(composite, 2)
    tier_label = _classify_tier(composite, physician.years_in_practice)

    # Update physician record
    physician.tier = tier_label
    physician.tier_score = Decimal(str(composite))
    physician.tier_last_assessed = now

    await db.flush()

    return {
        "physician_id": str(physician_id),
        "composite_score": composite,
        "tier": tier_label,
        "dimensions": dimension_scores,
        "computed_at": now.isoformat(),
    }


async def recompute_all_tiers(
    db: AsyncSession,
    disease_id: uuid.UUID | None = None,
) -> dict:
    """Recompute tiers for all validated physicians. Returns summary stats."""
    result = await db.execute(
        select(Physician.id).where(Physician.record_status == "validated")
    )
    physician_ids = [row[0] for row in result.all()]

    results = []
    for pid in physician_ids:
        tier_result = await compute_tier(db, pid, disease_id)
        results.append(tier_result)

    await db.commit()

    tier_counts: dict[str, int] = {}
    for r in results:
        t = r["tier"]
        tier_counts[t] = tier_counts.get(t, 0) + 1

    return {
        "total_computed": len(results),
        "tier_distribution": tier_counts,
        "results": results,
    }
