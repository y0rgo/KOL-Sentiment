"""Priority Scoring Service — Layer 3.

Measures where the OPPORTUNITY is, not who the physician IS (that's tier).
Factors with no data are excluded and their weight redistributed proportionally.
"""
import uuid
from datetime import datetime, timezone, timedelta
from decimal import Decimal

from sqlalchemy import select, delete, func, desc
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.physician import Physician
from app.models.priority import PriorityWeight, PriorityScore
from app.models.prescribing import PrescribingData
from app.models.sentiment import SentimentScore
from app.models.engagement import Engagement
from app.models.competitive import CompetitiveAffiliation
from app.models.referral import ReferralRelationship
from app.models.reference import Product


def _cap(value: float, maximum: float = 100.0) -> float:
    return min(max(value, 0.0), maximum)


async def _get_weights(db: AsyncSession, disease_id: uuid.UUID | None = None) -> dict[str, float]:
    weights: dict[str, float] = {}
    result = await db.execute(
        select(PriorityWeight)
        .where(PriorityWeight.disease_id.is_(None))
        .where(PriorityWeight.is_active.is_(True))
    )
    for w in result.scalars().all():
        weights[w.factor] = float(w.weight)

    if disease_id:
        result = await db.execute(
            select(PriorityWeight)
            .where(PriorityWeight.disease_id == disease_id)
            .where(PriorityWeight.is_active.is_(True))
        )
        for w in result.scalars().all():
            weights[w.factor] = float(w.weight)

    return weights


# ───────────────────────────────────────────────────────────────────
#  Factor 1: Prescribing Opportunity
# ───────────────────────────────────────────────────────────────────
async def _score_prescribing_opportunity(db: AsyncSession, physician_id: uuid.UUID) -> tuple[float, bool]:
    """High volume + low/no VYVGART = high opportunity."""
    result = await db.execute(
        select(PrescribingData).where(PrescribingData.physician_id == physician_id)
    )
    rows = result.scalars().all()
    if not rows:
        return 0.0, False

    total_patients = sum(r.total_patients or 0 for r in rows)
    if total_patients == 0:
        return 0.0, False

    # Find VYVGART product IDs
    vyvgart = await db.execute(
        select(Product.id).where(Product.brand_name.ilike('%VYVGART%'))
    )
    vyvgart_ids = {r[0] for r in vyvgart.all()}

    vyvgart_patients = sum(
        r.total_patients or 0 for r in rows if r.product_id in vyvgart_ids
    )

    non_vyvgart_ratio = 1.0 - (vyvgart_patients / total_patients) if total_patients > 0 else 1.0

    # Volume score: more patients = more opportunity (cap at 50 patients -> 100)
    volume_score = _cap(total_patients / 50.0 * 100.0)

    # Growth: compare latest vs earlier periods
    sorted_rows = sorted(rows, key=lambda r: r.period_start)
    if len(sorted_rows) >= 2:
        early = sum(r.total_patients or 0 for r in sorted_rows[:len(sorted_rows)//2])
        late = sum(r.total_patients or 0 for r in sorted_rows[len(sorted_rows)//2:])
        growth_factor = 1.0 + (0.2 if late > early else -0.1)
    else:
        growth_factor = 1.0

    raw = _cap(non_vyvgart_ratio * 60.0 + volume_score * 0.4) * growth_factor
    return _cap(raw), True


# ───────────────────────────────────────────────────────────────────
#  Factor 2: Influence Leverage
# ───────────────────────────────────────────────────────────────────
async def _score_influence_leverage(db: AsyncSession, physician: Physician) -> tuple[float, bool]:
    """Tier score * referral hub status. Converting high-influence hubs cascades."""
    tier_score = float(physician.tier_score or 0)
    has_tier = tier_score > 0

    # Count inbound referrals
    result = await db.execute(
        select(func.count()).select_from(ReferralRelationship)
        .where(ReferralRelationship.receiving_physician_id == physician.id)
    )
    inbound = result.scalar() or 0

    if not has_tier and inbound == 0:
        return 0.0, False

    # Referral hub score: 5+ inbound = 100
    hub_score = _cap(inbound * 20.0)

    # Combine: tier provides base influence, referrals amplify it
    raw = tier_score * 0.6 + hub_score * 0.4
    return _cap(raw), True


# ───────────────────────────────────────────────────────────────────
#  Factor 3: Sentiment Gap
# ───────────────────────────────────────────────────────────────────
async def _score_sentiment_gap(db: AsyncSession, physician_id: uuid.UUID) -> tuple[float, bool]:
    """Distance from advocate status. Declining sentiment increases urgency."""
    result = await db.execute(
        select(SentimentScore)
        .where(SentimentScore.physician_id == physician_id)
        .order_by(desc(SentimentScore.assessment_date))
        .limit(2)
    )
    scores = result.scalars().all()
    if not scores:
        return 0.0, False

    latest = scores[0]
    composite = latest.composite_score or 0
    # Max composite is 15 (3 scores x 5), advocate threshold ~13
    gap = _cap((15 - composite) / 15.0 * 100.0)

    # Trajectory adjustment
    if len(scores) >= 2:
        prev = scores[1]
        prev_composite = prev.composite_score or 0
        if composite > prev_composite:
            gap *= 0.85  # Improving — slightly less urgent
        elif composite < prev_composite:
            gap = _cap(gap * 1.2)  # Declining — more urgent

    return round(gap, 2), True


# ───────────────────────────────────────────────────────────────────
#  Factor 4: Engagement Deficit
# ───────────────────────────────────────────────────────────────────
async def _score_engagement_deficit(db: AsyncSession, physician_id: uuid.UUID) -> tuple[float, bool]:
    """How long since last engagement? No engagements ever = 100."""
    result = await db.execute(
        select(Engagement.engagement_date)
        .where(Engagement.physician_id == physician_id)
        .order_by(desc(Engagement.engagement_date))
        .limit(1)
    )
    row = result.first()

    if not row:
        # No engagements ever — but only if there's *some* data context
        # (we consider this factor as "has data" = true because the absence itself is signal)
        return 100.0, True

    last_date = row[0]
    today = datetime.now(timezone.utc).date()
    days_since = (today - last_date).days

    if days_since > 90:
        raw = 80.0
    elif days_since > 30:
        raw = 50.0
    else:
        raw = 20.0

    return raw, True


# ───────────────────────────────────────────────────────────────────
#  Factor 5: Competitive Urgency
# ───────────────────────────────────────────────────────────────────
async def _score_competitive_urgency(db: AsyncSession, physician_id: uuid.UUID) -> tuple[float, bool]:
    """More competitors + recent affiliations = higher urgency."""
    result = await db.execute(
        select(CompetitiveAffiliation)
        .where(CompetitiveAffiliation.physician_id == physician_id)
    )
    affiliations = result.scalars().all()

    if not affiliations:
        return 20.0, True  # No competitive affiliations is still signal (low urgency)

    unique_companies = len({a.company for a in affiliations if a.company})
    current_year = datetime.now().year

    # Base: number of companies
    if unique_companies >= 3:
        raw = 90.0
    elif unique_companies == 2:
        raw = 65.0
    else:
        raw = 40.0

    # Recency bonus: recent affiliation in last ~year
    recent = any(a.year and a.year >= current_year - 1 for a in affiliations)
    if recent:
        raw += 20.0

    return _cap(raw), True


# ───────────────────────────────────────────────────────────────────
#  Factor 6: Completeness Gap
# ───────────────────────────────────────────────────────────────────
def _score_completeness_gap(physician: Physician) -> tuple[float, bool]:
    """Inverse of completeness score."""
    completeness = float(physician.completeness_score or 0)
    return _cap(100.0 - completeness), True


# ───────────────────────────────────────────────────────────────────
#  Main computation
# ───────────────────────────────────────────────────────────────────
async def compute_priority(
    db: AsyncSession,
    physician_id: uuid.UUID,
    disease_id: uuid.UUID | None = None,
) -> dict:
    """Compute priority score for a single physician."""
    result = await db.execute(select(Physician).where(Physician.id == physician_id))
    physician = result.scalar_one_or_none()
    if not physician:
        raise ValueError(f"Physician {physician_id} not found")

    weights = await _get_weights(db, disease_id)

    # Compute each factor
    factors: list[dict] = []

    prescribing_score, prescribing_has = await _score_prescribing_opportunity(db, physician_id)
    factors.append({"factor": "prescribing_opportunity", "raw": prescribing_score, "has_data": prescribing_has})

    influence_score, influence_has = await _score_influence_leverage(db, physician)
    factors.append({"factor": "influence_leverage", "raw": influence_score, "has_data": influence_has})

    sentiment_score, sentiment_has = await _score_sentiment_gap(db, physician_id)
    factors.append({"factor": "sentiment_gap", "raw": sentiment_score, "has_data": sentiment_has})

    engagement_score, engagement_has = await _score_engagement_deficit(db, physician_id)
    factors.append({"factor": "engagement_deficit", "raw": engagement_score, "has_data": engagement_has})

    competitive_score, competitive_has = await _score_competitive_urgency(db, physician_id)
    factors.append({"factor": "competitive_urgency", "raw": competitive_score, "has_data": competitive_has})

    completeness_score, completeness_has = _score_completeness_gap(physician)
    factors.append({"factor": "completeness_gap", "raw": completeness_score, "has_data": completeness_has})

    # Redistribute weights for scored factors only
    scored = [f for f in factors if f["has_data"]]
    factors_scored = len(scored)
    scored_weight_sum = sum(weights.get(f["factor"], 0.0) for f in scored)

    composite = 0.0
    factor_details = []
    for f in factors:
        configured_weight = weights.get(f["factor"], 0.0)
        if f["has_data"] and scored_weight_sum > 0:
            effective_weight = configured_weight / scored_weight_sum * 100.0
            weighted = f["raw"] * (effective_weight / 100.0)
        else:
            effective_weight = 0.0
            weighted = 0.0
        composite += weighted
        factor_details.append({
            "factor": f["factor"],
            "raw_score": round(f["raw"], 2),
            "configured_weight": configured_weight,
            "effective_weight": round(effective_weight, 2),
            "weighted_score": round(weighted, 2),
            "has_data": f["has_data"],
        })

    composite = round(composite, 2)

    # Upsert PriorityScore
    now = datetime.now(timezone.utc)
    existing = await db.execute(
        select(PriorityScore).where(PriorityScore.physician_id == physician_id)
    )
    ps = existing.scalar_one_or_none()
    if ps:
        ps.composite_score = composite
        ps.prescribing_opportunity = round(prescribing_score, 2)
        ps.influence_leverage = round(influence_score, 2)
        ps.sentiment_gap = round(sentiment_score, 2)
        ps.engagement_deficit = round(engagement_score, 2)
        ps.competitive_urgency = round(competitive_score, 2)
        ps.completeness_gap = round(completeness_score, 2)
        ps.factors_scored = factors_scored
        ps.computed_at = now
    else:
        ps = PriorityScore(
            id=uuid.uuid4(),
            physician_id=physician_id,
            composite_score=composite,
            prescribing_opportunity=round(prescribing_score, 2),
            influence_leverage=round(influence_score, 2),
            sentiment_gap=round(sentiment_score, 2),
            engagement_deficit=round(engagement_score, 2),
            competitive_urgency=round(competitive_score, 2),
            completeness_gap=round(completeness_score, 2),
            factors_scored=factors_scored,
            computed_at=now,
        )
        db.add(ps)

    # Update physician record
    physician.priority_score = Decimal(str(composite))
    await db.flush()

    return {
        "physician_id": str(physician_id),
        "composite_score": composite,
        "factors_scored": factors_scored,
        "factors": factor_details,
        "computed_at": now.isoformat(),
    }


async def recompute_all_priorities(
    db: AsyncSession,
    disease_id: uuid.UUID | None = None,
) -> dict:
    """Recompute priorities for all validated physicians then rank them."""
    result = await db.execute(
        select(Physician.id).where(Physician.record_status == "validated")
    )
    physician_ids = [row[0] for row in result.all()]

    results = []
    for pid in physician_ids:
        r = await compute_priority(db, pid, disease_id)
        results.append(r)

    # Rank by composite desc
    results.sort(key=lambda x: x["composite_score"], reverse=True)
    for rank, r in enumerate(results, 1):
        pid = uuid.UUID(r["physician_id"])
        ps_result = await db.execute(
            select(PriorityScore).where(PriorityScore.physician_id == pid)
        )
        ps = ps_result.scalar_one_or_none()
        if ps:
            ps.priority_rank = rank
        # Also update physician
        phy_result = await db.execute(select(Physician).where(Physician.id == pid))
        phy = phy_result.scalar_one_or_none()
        if phy:
            phy.priority_rank = rank
        r["priority_rank"] = rank

    await db.commit()

    return {
        "total_computed": len(results),
        "results": results,
    }
