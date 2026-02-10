"""Priority Scoring API endpoints."""
import uuid
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.physician import Physician
from app.models.priority import PriorityWeight, PriorityScore
from app.services.priority_scorer import compute_priority, recompute_all_priorities

router = APIRouter()


class WeightUpdate(BaseModel):
    factor: str
    weight: float


class WeightBulkUpdate(BaseModel):
    disease_id: Optional[str] = None
    weights: list[WeightUpdate]


# ── GET /api/priority/config ─────────────────────────────────────
@router.get("/config")
async def get_priority_config(disease_id: Optional[str] = None, db: AsyncSession = Depends(get_db)):
    """Get current priority factor weights."""
    query = select(PriorityWeight).where(PriorityWeight.is_active.is_(True))
    if disease_id:
        query = query.where(PriorityWeight.disease_id == uuid.UUID(disease_id))
    else:
        query = query.where(PriorityWeight.disease_id.is_(None))

    result = await db.execute(query)
    weights = result.scalars().all()

    return {
        "disease_id": disease_id,
        "weights": [
            {
                "id": str(w.id),
                "factor": w.factor,
                "weight": float(w.weight),
                "is_active": w.is_active,
            }
            for w in weights
        ],
    }


# ── PUT /api/priority/config ─────────────────────────────────────
@router.put("/config")
async def update_priority_config(body: WeightBulkUpdate, db: AsyncSession = Depends(get_db)):
    """Update priority factor weights."""
    disease_uuid = uuid.UUID(body.disease_id) if body.disease_id else None

    for wu in body.weights:
        query = select(PriorityWeight).where(PriorityWeight.factor == wu.factor)
        if disease_uuid:
            query = query.where(PriorityWeight.disease_id == disease_uuid)
        else:
            query = query.where(PriorityWeight.disease_id.is_(None))

        result = await db.execute(query)
        existing = result.scalar_one_or_none()

        if existing:
            existing.weight = wu.weight
        else:
            db.add(PriorityWeight(
                id=uuid.uuid4(),
                disease_id=disease_uuid,
                factor=wu.factor,
                weight=wu.weight,
                is_active=True,
            ))

    await db.commit()
    return {"status": "updated", "count": len(body.weights)}


# ── GET /api/priority/scores ─────────────────────────────────────
@router.get("/scores")
async def get_priority_scores(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    tier: Optional[str] = None,
    min_priority: Optional[float] = None,
    max_priority: Optional[float] = None,
    db: AsyncSession = Depends(get_db),
):
    """Get ranked priority scores with optional filters."""
    query = (
        select(
            PriorityScore,
            Physician.first_name,
            Physician.last_name,
            Physician.institution_name,
            Physician.tier,
            Physician.tier_score,
        )
        .join(Physician, PriorityScore.physician_id == Physician.id)
        .order_by(PriorityScore.priority_rank.asc().nullslast())
    )

    if tier:
        query = query.where(Physician.tier == tier)
    if min_priority is not None:
        query = query.where(PriorityScore.composite_score >= min_priority)
    if max_priority is not None:
        query = query.where(PriorityScore.composite_score <= max_priority)

    # Count total
    from sqlalchemy import func
    count_query = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_query)).scalar() or 0

    # Paginate
    offset = (page - 1) * page_size
    query = query.offset(offset).limit(page_size)
    result = await db.execute(query)
    rows = result.all()

    items = []
    for ps, first_name, last_name, institution, phy_tier, phy_tier_score in rows:
        items.append({
            "physician_id": str(ps.physician_id),
            "name": f"{first_name} {last_name}",
            "institution": institution,
            "tier": phy_tier,
            "tier_score": float(phy_tier_score) if phy_tier_score else None,
            "composite_score": float(ps.composite_score),
            "priority_rank": ps.priority_rank,
            "prescribing_opportunity": float(ps.prescribing_opportunity),
            "influence_leverage": float(ps.influence_leverage),
            "sentiment_gap": float(ps.sentiment_gap),
            "engagement_deficit": float(ps.engagement_deficit),
            "competitive_urgency": float(ps.competitive_urgency),
            "completeness_gap": float(ps.completeness_gap),
            "factors_scored": ps.factors_scored,
            "computed_at": ps.computed_at.isoformat() if ps.computed_at else None,
        })

    return {
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size,
    }


# ── GET /api/priority/physician/{id} ─────────────────────────────
@router.get("/physician/{physician_id}")
async def get_physician_priority(physician_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    """Get priority breakdown for a single physician."""
    result = await db.execute(
        select(PriorityScore).where(PriorityScore.physician_id == physician_id)
    )
    ps = result.scalar_one_or_none()

    if not ps:
        raise HTTPException(status_code=404, detail="No priority score found for this physician")

    factors = [
        {"factor": "prescribing_opportunity", "label": "Prescribing Opportunity", "score": float(ps.prescribing_opportunity)},
        {"factor": "influence_leverage", "label": "Influence Leverage", "score": float(ps.influence_leverage)},
        {"factor": "sentiment_gap", "label": "Sentiment Gap", "score": float(ps.sentiment_gap)},
        {"factor": "engagement_deficit", "label": "Engagement Deficit", "score": float(ps.engagement_deficit)},
        {"factor": "competitive_urgency", "label": "Competitive Urgency", "score": float(ps.competitive_urgency)},
        {"factor": "completeness_gap", "label": "Completeness Gap", "score": float(ps.completeness_gap)},
    ]

    return {
        "physician_id": str(ps.physician_id),
        "composite_score": float(ps.composite_score),
        "priority_rank": ps.priority_rank,
        "factors_scored": ps.factors_scored,
        "factors": factors,
        "computed_at": ps.computed_at.isoformat() if ps.computed_at else None,
    }


# ── POST /api/priority/recompute ─────────────────────────────────
@router.post("/recompute")
async def recompute_all(disease_id: Optional[str] = None, db: AsyncSession = Depends(get_db)):
    """Recompute priorities for all validated physicians."""
    d_id = uuid.UUID(disease_id) if disease_id else None
    result = await recompute_all_priorities(db, d_id)
    return result


# ── POST /api/priority/recompute/{physician_id} ──────────────────
@router.post("/recompute/{physician_id}")
async def recompute_single(physician_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    """Recompute priority for a single physician."""
    try:
        result = await compute_priority(db, physician_id)
        await db.commit()
        return result
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


# ── GET /api/priority/matrix ─────────────────────────────────────
@router.get("/matrix")
async def get_priority_matrix(db: AsyncSession = Depends(get_db)):
    """Get tier_score vs priority_score for scatter plot + summary stats."""
    result = await db.execute(
        select(
            Physician.id,
            Physician.first_name,
            Physician.last_name,
            Physician.tier,
            Physician.tier_score,
            Physician.priority_score,
            Physician.priority_rank,
            Physician.institution_name,
        )
        .where(Physician.record_status == "validated")
        .where(Physician.tier_score.isnot(None))
        .where(Physician.priority_score.isnot(None))
    )
    rows = result.all()

    points = []
    for row in rows:
        points.append({
            "physician_id": str(row.id),
            "name": f"{row.first_name} {row.last_name}",
            "tier": row.tier,
            "tier_score": float(row.tier_score) if row.tier_score else 0,
            "priority_score": float(row.priority_score) if row.priority_score else 0,
            "priority_rank": row.priority_rank,
            "institution": row.institution_name,
        })

    # Summary stats
    total = len(points)
    high_priority_high_tier = sum(1 for p in points if p["tier_score"] >= 55 and p["priority_score"] >= 50)
    high_priority_low_tier = sum(1 for p in points if p["tier_score"] < 55 and p["priority_score"] >= 50)
    low_priority_high_tier = sum(1 for p in points if p["tier_score"] >= 55 and p["priority_score"] < 50)
    low_priority_low_tier = sum(1 for p in points if p["tier_score"] < 55 and p["priority_score"] < 50)

    return {
        "points": points,
        "summary": {
            "total": total,
            "high_priority_high_tier": high_priority_high_tier,
            "high_priority_low_tier": high_priority_low_tier,
            "low_priority_high_tier": low_priority_high_tier,
            "low_priority_low_tier": low_priority_low_tier,
        },
    }
