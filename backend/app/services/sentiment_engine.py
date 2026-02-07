from uuid import UUID

from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.sentiment import SentimentScore
from app.models.prescribing import PrescribingData


class SentimentEngine:
    def __init__(self, db: AsyncSession):
        self.db = db

    @staticmethod
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

    async def get_latest_score(self, physician_id: UUID) -> SentimentScore | None:
        result = await self.db.execute(
            select(SentimentScore)
            .where(SentimentScore.physician_id == physician_id)
            .order_by(desc(SentimentScore.assessment_date))
            .limit(1)
        )
        return result.scalar_one_or_none()
