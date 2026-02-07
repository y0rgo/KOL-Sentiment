from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.engagement import Engagement
from app.schemas.engagement import EngagementCreate, EngagementResponse

router = APIRouter()


@router.post("", response_model=EngagementResponse)
async def create_engagement(data: EngagementCreate, db: AsyncSession = Depends(get_db)):
    engagement = Engagement(**data.model_dump())
    db.add(engagement)
    await db.commit()
    await db.refresh(engagement)
    return EngagementResponse.model_validate(engagement)


@router.get("/physician/{physician_id}", response_model=list[EngagementResponse])
async def get_physician_engagements(physician_id: UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Engagement)
        .where(Engagement.physician_id == physician_id)
        .order_by(desc(Engagement.engagement_date))
    )
    engagements = result.scalars().all()
    return [EngagementResponse.model_validate(e) for e in engagements]
