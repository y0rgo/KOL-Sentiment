"""8-Dimension Tier Classifier Service.

Computes tier scores across 8 configurable dimensions, stores audit trail,
and assigns tier labels based on composite score thresholds.

Dimensions with zero data inputs are excluded from the composite; their weight
is redistributed proportionally across the scored dimensions so physicians are
not penalized for data we haven't collected yet.
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


# ---------------------------------------------------------------------------
#  Per-dimension scoring + has-data checks
# ---------------------------------------------------------------------------

def _has_data_scientific_impact(physician: Physician) -> bool:
    return any([
        physician.h_index and physician.h_index > 0,
        physician.total_citations and physician.total_citations > 0,
        physician.first_last_author_ratio is not None,
        physician.citations_per_paper is not None and float(physician.citations_per_paper) > 0,
    ])


def _score_scientific_impact(physician: Physician) -> float:
    h = float(physician.h_index or 0)
    citations = float(physician.total_citations or 0)
    ratio = float(physician.first_last_author_ratio or 0)
    cpp = float(physician.citations_per_paper or 0)

    h_score = _cap(h / 50.0 * 100.0)
    citation_score = _cap(citations / 5000.0 * 100.0)
    ratio_score = _cap(ratio * 100.0)
    cpp_score = _cap(cpp / 30.0 * 100.0)

    return (h_score * 0.35 + citation_score * 0.30 + ratio_score * 0.20 + cpp_score * 0.15)


def _has_data_clinical_authority(physician: Physician) -> bool:
    return any([
        physician.years_in_practice and physician.years_in_practice > 0,
        physician.fellowship_program_director,
        physician.uptodate_author,
        physician.cme_faculty,
    ])


def _score_clinical_authority(physician: Physician) -> float:
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


def _has_data_peer_influence(physician: Physician) -> bool:
    return any([
        physician.society_leadership_roles and len(physician.society_leadership_roles) > 0,
        physician.editorial_board_count and physician.editorial_board_count > 0,
        physician.named_lectures_awards and len(physician.named_lectures_awards) > 0,
    ])


def _score_peer_influence(physician: Physician) -> float:
    society_count = len(physician.society_leadership_roles or [])
    editorial = float(physician.editorial_board_count or 0)
    lectures = len(physician.named_lectures_awards or [])

    society_score = _cap(society_count * 20.0)
    editorial_score = _cap(editorial * 15.0)
    lecture_score = _cap(lectures * 20.0)

    return (society_score * 0.40 + editorial_score * 0.35 + lecture_score * 0.25)


def _has_data_guideline_editorial(physician: Physician) -> bool:
    return any([
        physician.guideline_committee_count and physician.guideline_committee_count > 0,
        physician.editorial_board_count and physician.editorial_board_count > 0,
    ])


def _score_guideline_editorial(physician: Physician) -> float:
    guideline = float(physician.guideline_committee_count or 0)
    editorial = float(physician.editorial_board_count or 0)

    return _cap(guideline * 25.0 + editorial * 20.0)


def _has_data_digital_advocacy(physician: Physician) -> bool:
    return physician.digital_presence_score is not None and float(physician.digital_presence_score) > 0


def _score_digital_advocacy(physician: Physician) -> float:
    return _cap(float(physician.digital_presence_score or 0))


def _has_data_industry_recognition(physician: Physician) -> bool:
    return any([
        physician.named_lectures_awards and len(physician.named_lectures_awards) > 0,
        physician.patient_advocacy_roles and len(physician.patient_advocacy_roles) > 0,
    ])


def _score_industry_recognition(physician: Physician) -> float:
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

    Dimensions with no underlying data are excluded; their configured weight is
    redistributed proportionally across the dimensions that do have data.

    Returns dict with dimension_scores, composite, and tier label.
    """
    result = await db.execute(select(Physician).where(Physician.id == physician_id))
    physician = result.scalar_one_or_none()
    if not physician:
        raise ValueError(f"Physician {physician_id} not found")

    weights = await _get_weights(db, disease_id)

    # Compute raw scores and determine which dimensions have data
    congress_count = await _count_congress(db, physician_id)
    trial_count = await _count_trials(db, physician_id)

    dimension_info: list[dict] = [
        {
            "dimension": "scientific_impact",
            "has_data": _has_data_scientific_impact(physician),
            "raw_score": _score_scientific_impact(physician),
        },
        {
            "dimension": "clinical_authority",
            "has_data": _has_data_clinical_authority(physician),
            "raw_score": _score_clinical_authority(physician),
        },
        {
            "dimension": "peer_influence",
            "has_data": _has_data_peer_influence(physician),
            "raw_score": _score_peer_influence(physician),
        },
        {
            "dimension": "congress_presence",
            "has_data": congress_count > 0,
            "raw_score": _cap(congress_count * 10.0),
        },
        {
            "dimension": "trial_leadership",
            "has_data": trial_count > 0,
            "raw_score": _cap(trial_count * 15.0),
        },
        {
            "dimension": "guideline_editorial_authority",
            "has_data": _has_data_guideline_editorial(physician),
            "raw_score": _score_guideline_editorial(physician),
        },
        {
            "dimension": "digital_advocacy",
            "has_data": _has_data_digital_advocacy(physician),
            "raw_score": _score_digital_advocacy(physician),
        },
        {
            "dimension": "industry_recognition",
            "has_data": _has_data_industry_recognition(physician),
            "raw_score": _score_industry_recognition(physician),
        },
    ]

    # Calculate effective weights — only scored dimensions share the weight
    scored_dims = [d for d in dimension_info if d["has_data"]]
    dimensions_scored = len(scored_dims)

    # Sum of configured weights for scored dimensions only
    scored_weight_sum = sum(weights.get(d["dimension"], 0.0) for d in scored_dims)

    # Clear previous scores for this physician
    now = datetime.now(timezone.utc)
    await db.execute(
        delete(TierDimensionScore)
        .where(TierDimensionScore.physician_id == physician_id)
    )

    dimension_scores = []
    composite = 0.0

    for d in dimension_info:
        dim_name = d["dimension"]
        raw = d["raw_score"]
        has_data = d["has_data"]
        configured_weight = weights.get(dim_name, 0.0)

        if has_data and scored_weight_sum > 0:
            # Redistribute: this dimension's share = configured_weight / scored_weight_sum * 100
            effective_weight = configured_weight / scored_weight_sum * 100.0
            weighted = raw * (effective_weight / 100.0)
        else:
            effective_weight = 0.0
            weighted = 0.0

        composite += weighted

        score_record = TierDimensionScore(
            id=uuid.uuid4(),
            physician_id=physician_id,
            dimension=dim_name,
            raw_score=round(raw, 2),
            weighted_score=round(weighted, 2),
            has_data=has_data,
            dimensions_scored=dimensions_scored,
            computed_at=now,
        )
        db.add(score_record)

        dimension_scores.append({
            "dimension": dim_name,
            "raw_score": round(raw, 2),
            "configured_weight": configured_weight,
            "effective_weight": round(effective_weight, 2),
            "weighted_score": round(weighted, 2),
            "has_data": has_data,
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
        "dimensions_scored": dimensions_scored,
        "dimensions_total": len(dimension_info),
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
