from datetime import date
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy import desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.physician import Physician
from app.models.sentiment import SentimentBarrier, SentimentScore
from app.schemas.sentiment import (
    SentimentBarrierResponse,
    SentimentDashboard,
    SentimentScoreCreate,
    SentimentScoreResponse,
)

router = APIRouter()


def derive_stage(composite: int) -> str:
    if composite <= 4:
        return "unaware"
    elif composite <= 6:
        return "skeptical"
    elif composite <= 9:
        return "trialing"
    elif composite <= 12:
        return "adopting"
    else:
        return "advocating"


@router.post("/score", response_model=SentimentScoreResponse)
async def create_sentiment_score(data: SentimentScoreCreate, db: AsyncSession = Depends(get_db)):
    composite = data.disease_belief_score + data.product_perception_score + data.behavioral_readiness_score
    stage = derive_stage(composite)

    score = SentimentScore(
        physician_id=data.physician_id,
        disease_id=data.disease_id,
        assessment_date=date.today(),
        disease_belief_score=data.disease_belief_score,
        product_perception_score=data.product_perception_score,
        behavioral_readiness_score=data.behavioral_readiness_score,
        conversion_stage=stage,
        score_type=data.score_type,
        confidence_level="high",
        scored_by=data.scored_by,
        notes=data.notes,
    )
    db.add(score)
    await db.flush()

    # Create barriers from objections
    if data.objections_tagged:
        for objection in data.objections_tagged:
            barrier = SentimentBarrier(
                sentiment_score_id=score.id,
                physician_id=data.physician_id,
                barrier_type=objection,
                severity="primary",
                source="field_report",
            )
            db.add(barrier)

    await db.commit()
    await db.refresh(score)
    return SentimentScoreResponse.model_validate(score)


@router.get("/physician/{physician_id}/history", response_model=list[SentimentScoreResponse])
async def get_sentiment_history(physician_id: UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(SentimentScore)
        .where(SentimentScore.physician_id == physician_id)
        .order_by(desc(SentimentScore.assessment_date))
    )
    scores = result.scalars().all()
    return [SentimentScoreResponse.model_validate(s) for s in scores]


@router.get("/physician/{physician_id}/barriers", response_model=list[SentimentBarrierResponse])
async def get_sentiment_barriers(physician_id: UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(SentimentBarrier)
        .where(SentimentBarrier.physician_id == physician_id)
        .order_by(desc(SentimentBarrier.created_at))
    )
    barriers = result.scalars().all()
    return [SentimentBarrierResponse.model_validate(b) for b in barriers]


@router.get("/dashboard", response_model=SentimentDashboard)
async def get_sentiment_dashboard(db: AsyncSession = Depends(get_db)):
    # Get latest sentiment per physician using a subquery
    latest_sq = (
        select(
            SentimentScore.physician_id,
            func.max(SentimentScore.assessment_date).label("max_date"),
        )
        .group_by(SentimentScore.physician_id)
        .subquery()
    )

    latest_scores_q = (
        select(SentimentScore)
        .join(
            latest_sq,
            (SentimentScore.physician_id == latest_sq.c.physician_id)
            & (SentimentScore.assessment_date == latest_sq.c.max_date),
        )
    )
    result = await db.execute(latest_scores_q)
    scores = result.scalars().all()

    # Stage distribution
    stage_dist: dict[str, int] = {}
    for s in scores:
        stage = s.conversion_stage or "unknown"
        stage_dist[stage] = stage_dist.get(stage, 0) + 1

    return SentimentDashboard(
        stage_distribution=stage_dist,
        tier_sentiment={},
        geographic_sentiment={},
    )
