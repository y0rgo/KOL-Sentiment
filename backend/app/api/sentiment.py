"""Sentiment API — scoring and tracking."""
import uuid
from datetime import datetime, date

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.sentiment import SentimentScore, SentimentBarrier
from app.models.physician import Physician

router = APIRouter()


@router.post("/score")
async def create_sentiment_score(body: dict, db: AsyncSession = Depends(get_db)):
    physician_id = body.get("physician_id")
    if not physician_id:
        raise HTTPException(status_code=400, detail="physician_id is required")

    # Verify physician exists and is validated
    result = await db.execute(
        select(Physician).where(Physician.id == uuid.UUID(physician_id))
    )
    physician = result.scalar_one_or_none()
    if not physician:
        raise HTTPException(status_code=404, detail="Physician not found")
    if physician.record_status != "validated":
        raise HTTPException(status_code=400, detail="Sentiment scores can only be recorded for validated physicians")

    disease_belief = body.get("disease_belief_score")
    product_perception = body.get("product_perception_score")
    behavioral_readiness = body.get("behavioral_readiness_score")

    # Validate scores are 1-5
    for name, val in [("disease_belief_score", disease_belief),
                      ("product_perception_score", product_perception),
                      ("behavioral_readiness_score", behavioral_readiness)]:
        if val is not None and (val < 1 or val > 5):
            raise HTTPException(status_code=400, detail=f"{name} must be between 1 and 5")

    composite = None
    if disease_belief and product_perception and behavioral_readiness:
        composite = disease_belief + product_perception + behavioral_readiness

    # Determine conversion stage from composite
    conversion_stage = None
    if composite:
        if composite >= 13:
            conversion_stage = "advocate"
        elif composite >= 10:
            conversion_stage = "adopter"
        elif composite >= 7:
            conversion_stage = "interested"
        elif composite >= 4:
            conversion_stage = "aware"
        else:
            conversion_stage = "unaware"

    score = SentimentScore(
        physician_id=uuid.UUID(physician_id),
        disease_id=uuid.UUID(body["disease_id"]) if body.get("disease_id") else None,
        assessment_date=date.fromisoformat(body.get("assessment_date", date.today().isoformat())),
        disease_belief_score=disease_belief,
        product_perception_score=product_perception,
        behavioral_readiness_score=behavioral_readiness,
        composite_score=composite,
        conversion_stage=conversion_stage,
        score_type=body.get("score_type", "field_assessment"),
        confidence_level=body.get("confidence_level", "medium"),
        scored_by=body.get("scored_by", "system"),
        notes=body.get("notes"),
    )
    db.add(score)

    # Add barriers if provided
    barriers = body.get("barriers", [])
    for b in barriers:
        barrier = SentimentBarrier(
            sentiment_score_id=score.id,
            physician_id=uuid.UUID(physician_id),
            barrier_type=b.get("barrier_type", "unknown"),
            severity=b.get("severity"),
            source=b.get("source"),
            detail=b.get("detail"),
        )
        db.add(barrier)

    await db.commit()
    await db.refresh(score)
    return _score_to_dict(score)


@router.get("/physician/{physician_id}/history")
async def get_sentiment_history(
    physician_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(SentimentScore)
        .where(SentimentScore.physician_id == physician_id)
        .order_by(SentimentScore.assessment_date.desc())
    )
    scores = result.scalars().all()
    return [_score_to_dict(s) for s in scores]


@router.get("/physician/{physician_id}/barriers")
async def get_barriers(
    physician_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(SentimentBarrier)
        .where(SentimentBarrier.physician_id == physician_id)
        .order_by(SentimentBarrier.created_at.desc())
    )
    barriers = result.scalars().all()
    return [
        {
            "id": str(b.id),
            "barrier_type": b.barrier_type,
            "severity": b.severity,
            "source": b.source,
            "detail": b.detail,
            "created_at": b.created_at.isoformat() if b.created_at else None,
        }
        for b in barriers
    ]


@router.get("/dashboard")
async def sentiment_dashboard(db: AsyncSession = Depends(get_db)):
    from sqlalchemy import func

    # Overall stats
    result = await db.execute(
        select(
            func.count(SentimentScore.id),
            func.avg(SentimentScore.composite_score),
        )
    )
    row = result.one()
    total_scores = row[0]
    avg_composite = float(row[1]) if row[1] else 0

    # By conversion stage
    stage_result = await db.execute(
        select(SentimentScore.conversion_stage, func.count())
        .where(SentimentScore.conversion_stage.isnot(None))
        .group_by(SentimentScore.conversion_stage)
    )
    by_stage = dict(stage_result.all())

    return {
        "total_scores": total_scores,
        "average_composite": round(avg_composite, 2),
        "by_conversion_stage": by_stage,
    }


def _score_to_dict(s: SentimentScore) -> dict:
    return {
        "id": str(s.id),
        "physician_id": str(s.physician_id),
        "disease_id": str(s.disease_id) if s.disease_id else None,
        "assessment_date": s.assessment_date.isoformat() if s.assessment_date else None,
        "disease_belief_score": s.disease_belief_score,
        "product_perception_score": s.product_perception_score,
        "behavioral_readiness_score": s.behavioral_readiness_score,
        "composite_score": s.composite_score,
        "conversion_stage": s.conversion_stage,
        "score_type": s.score_type,
        "confidence_level": s.confidence_level,
        "scored_by": s.scored_by,
        "notes": s.notes,
        "created_at": s.created_at.isoformat() if s.created_at else None,
    }
