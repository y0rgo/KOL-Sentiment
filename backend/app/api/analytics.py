from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.physician import Physician
from app.models.competitive import CompetitiveAffiliation
from app.schemas.analytics import (
    CompetitiveLandscapeItem,
    ConversionFunnelItem,
    GeographicCoverageItem,
    TierDistribution,
)

router = APIRouter()


@router.get("/tier-distribution", response_model=list[TierDistribution])
async def get_tier_distribution(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Physician.tier, func.count(Physician.id))
        .where(Physician.is_active == True)
        .where(Physician.tier.isnot(None))
        .group_by(Physician.tier)
    )
    return [TierDistribution(tier=row[0], count=row[1]) for row in result.all()]


@router.get("/conversion-funnel", response_model=list[ConversionFunnelItem])
async def get_conversion_funnel(db: AsyncSession = Depends(get_db)):
    from app.models.sentiment import SentimentScore

    latest_sq = (
        select(
            SentimentScore.physician_id,
            func.max(SentimentScore.assessment_date).label("max_date"),
        )
        .group_by(SentimentScore.physician_id)
        .subquery()
    )
    result = await db.execute(
        select(SentimentScore.conversion_stage, func.count())
        .join(
            latest_sq,
            (SentimentScore.physician_id == latest_sq.c.physician_id)
            & (SentimentScore.assessment_date == latest_sq.c.max_date),
        )
        .where(SentimentScore.conversion_stage.isnot(None))
        .group_by(SentimentScore.conversion_stage)
    )
    stages = ["unaware", "skeptical", "trialing", "adopting", "advocating"]
    counts = {row[0]: row[1] for row in result.all()}
    return [ConversionFunnelItem(stage=s, count=counts.get(s, 0)) for s in stages]


@router.get("/geographic-coverage", response_model=list[GeographicCoverageItem])
async def get_geographic_coverage(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Physician.state, func.count(Physician.id))
        .where(Physician.is_active == True)
        .where(Physician.state.isnot(None))
        .group_by(Physician.state)
        .order_by(func.count(Physician.id).desc())
    )
    return [GeographicCoverageItem(state=row[0], physician_count=row[1]) for row in result.all()]


@router.get("/competitive-landscape", response_model=list[CompetitiveLandscapeItem])
async def get_competitive_landscape(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(
            CompetitiveAffiliation.company,
            func.count(func.distinct(CompetitiveAffiliation.physician_id)),
            func.sum(CompetitiveAffiliation.payment_amount),
        )
        .where(CompetitiveAffiliation.company.isnot(None))
        .group_by(CompetitiveAffiliation.company)
        .order_by(func.count(func.distinct(CompetitiveAffiliation.physician_id)).desc())
    )
    return [
        CompetitiveLandscapeItem(company=row[0], physician_count=row[1], total_payments=float(row[2]) if row[2] else None)
        for row in result.all()
    ]
