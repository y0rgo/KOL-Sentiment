"""Computes how complete a physician's record is."""
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.physician import Physician
from app.models.prescribing import PrescribingData
from app.models.publication import PublicationAuthor
from app.models.congress import CongressActivity
from app.models.trial import TrialInvestigator
from app.models.sentiment import SentimentScore
from app.models.engagement import Engagement
from app.models.competitive import CompetitiveAffiliation

# Field weights totaling 100
IDENTITY_FIELDS = {
    'npi': 8,
    'credentials': 3,
    'specialty': 5,
    'institution_name': 5,
    'practice_type': 4,
    'city': 3,
    'state': 2,
}  # 30%

BEHAVIORAL_WEIGHT = 30  # has_prescribing_data
SCIENTIFIC_WEIGHT = 20  # publications, congress, trials
ENGAGEMENT_WEIGHT = 20  # sentiment, engagements, competitive

class CompletenessScorer:
    def __init__(self, db: AsyncSession):
        self.db = db
    
    async def compute(self, physician: Physician) -> float:
        score = 0.0
        total = 100.0
        
        # Identity fields (30%)
        for field, weight in IDENTITY_FIELDS.items():
            val = getattr(physician, field, None)
            if val and str(val).strip():
                score += weight
        
        # Behavioral data (30%): prescribing data
        result = await self.db.execute(
            select(func.count()).select_from(PrescribingData).where(
                PrescribingData.physician_id == physician.id
            )
        )
        has_prescribing = result.scalar() > 0
        if has_prescribing:
            score += BEHAVIORAL_WEIGHT
        
        # Scientific profile (20%): publications (10), congress (5), trials (5)
        result = await self.db.execute(
            select(func.count()).select_from(PublicationAuthor).where(
                PublicationAuthor.physician_id == physician.id
            )
        )
        if result.scalar() > 0:
            score += 10
        
        result = await self.db.execute(
            select(func.count()).select_from(CongressActivity).where(
                CongressActivity.physician_id == physician.id
            )
        )
        if result.scalar() > 0:
            score += 5
        
        result = await self.db.execute(
            select(func.count()).select_from(TrialInvestigator).where(
                TrialInvestigator.physician_id == physician.id
            )
        )
        if result.scalar() > 0:
            score += 5
        
        # Engagement & sentiment (20%): sentiment (10), engagements (5), competitive (5)
        result = await self.db.execute(
            select(func.count()).select_from(SentimentScore).where(
                SentimentScore.physician_id == physician.id
            )
        )
        if result.scalar() > 0:
            score += 10
        
        result = await self.db.execute(
            select(func.count()).select_from(Engagement).where(
                Engagement.physician_id == physician.id
            )
        )
        if result.scalar() > 0:
            score += 5
        
        result = await self.db.execute(
            select(func.count()).select_from(CompetitiveAffiliation).where(
                CompetitiveAffiliation.physician_id == physician.id
            )
        )
        if result.scalar() > 0:
            score += 5
        
        physician.completeness_score = round(score, 2)
        return score
