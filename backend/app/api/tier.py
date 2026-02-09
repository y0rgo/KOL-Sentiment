"""Tier Configuration & Computation API endpoints."""
import uuid
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.tier import TierDimensionWeight, TierDimensionScore
from app.models.physician import Physician
from app.services.tier_classifier import compute_tier, recompute_all_tiers

router = APIRouter()


class WeightUpdate(BaseModel):
    dimension: str
    weight: float


class WeightBulkUpdate(BaseModel):
    disease_id: Optional[str] = None
    weights: list[WeightUpdate]


# ── GET /api/tier/config ───────────────────────────────────────────
@router.get("/config")
async def get_tier_config(disease_id: Optional[str] = None, db: AsyncSession = Depends(get_db)):
    """Get current tier dimension weights (global or disease-specific)."""
    query = select(TierDimensionWeight).where(TierDimensionWeight.is_active.is_(True))
    if disease_id:
        query = query.where(TierDimensionWeight.disease_id == uuid.UUID(disease_id))
    else:
        query = query.where(TierDimensionWeight.disease_id.is_(None))

    result = await db.execute(query)
    weights = result.scalars().all()

    return {
        "disease_id": disease_id,
        "weights": [
            {
                "id": str(w.id),
                "dimension": w.dimension,
                "weight": float(w.weight),
                "is_active": w.is_active,
            }
            for w in weights
        ],
    }


# ── PUT /api/tier/config ──────────────────────────────────────────
@router.put("/config")
async def update_tier_config(body: WeightBulkUpdate, db: AsyncSession = Depends(get_db)):
    """Update tier dimension weights. Pass disease_id=null for global."""
    disease_uuid = uuid.UUID(body.disease_id) if body.disease_id else None

    for wu in body.weights:
        query = (
            select(TierDimensionWeight)
            .where(TierDimensionWeight.dimension == wu.dimension)
        )
        if disease_uuid:
            query = query.where(TierDimensionWeight.disease_id == disease_uuid)
        else:
            query = query.where(TierDimensionWeight.disease_id.is_(None))

        result = await db.execute(query)
        existing = result.scalar_one_or_none()

        if existing:
            existing.weight = wu.weight
        else:
            db.add(TierDimensionWeight(
                id=uuid.uuid4(),
                disease_id=disease_uuid,
                dimension=wu.dimension,
                weight=wu.weight,
                is_active=True,
            ))

    await db.commit()
    return {"status": "updated", "count": len(body.weights)}


# ── GET /api/tier/physician/{id}/breakdown ─────────────────────────
@router.get("/physician/{physician_id}/breakdown")
async def get_tier_breakdown(physician_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    """Get the stored tier dimension scores for a physician."""
    # Verify physician exists
    phy_result = await db.execute(select(Physician).where(Physician.id == physician_id))
    physician = phy_result.scalar_one_or_none()
    if not physician:
        raise HTTPException(status_code=404, detail="Physician not found")

    result = await db.execute(
        select(TierDimensionScore)
        .where(TierDimensionScore.physician_id == physician_id)
        .order_by(TierDimensionScore.dimension)
    )
    scores = result.scalars().all()

    dimensions_scored = scores[0].dimensions_scored if scores else 0

    return {
        "physician_id": str(physician_id),
        "tier": physician.tier,
        "tier_score": float(physician.tier_score) if physician.tier_score else None,
        "dimensions_scored": dimensions_scored,
        "dimensions": [
            {
                "dimension": s.dimension,
                "raw_score": float(s.raw_score),
                "weighted_score": float(s.weighted_score),
                "has_data": s.has_data,
                "computed_at": s.computed_at.isoformat() if s.computed_at else None,
            }
            for s in scores
        ],
    }


# ── POST /api/tier/recompute ──────────────────────────────────────
@router.post("/recompute")
async def recompute_all(disease_id: Optional[str] = None, db: AsyncSession = Depends(get_db)):
    """Recompute tiers for all validated physicians."""
    d_id = uuid.UUID(disease_id) if disease_id else None
    result = await recompute_all_tiers(db, d_id)
    return result


# ── POST /api/tier/recompute/{physician_id} ───────────────────────
@router.post("/recompute/{physician_id}")
async def recompute_single(physician_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    """Recompute tier for a single physician."""
    try:
        result = await compute_tier(db, physician_id)
        await db.commit()
        return result
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
