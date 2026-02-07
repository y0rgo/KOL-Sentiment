from dataclasses import dataclass
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.physician import Physician
from app.models.publication import PublicationAuthor
from app.models.congress import CongressActivity
from app.models.trial import TrialInvestigator
from app.models.referral import ReferralRelationship
from app.models.prescribing import PrescribingData


@dataclass
class TierResult:
    tier: str
    score: float


class TierClassifier:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def classify(self, physician_id: UUID) -> TierResult:
        score = 0.0

        # Publication count
        pub_count = await self.db.execute(
            select(func.count(PublicationAuthor.id))
            .where(PublicationAuthor.physician_id == physician_id)
        )
        pubs = pub_count.scalar() or 0
        score += min(pubs * 2.5, 25)

        # Prescribing volume
        rx_result = await self.db.execute(
            select(func.sum(PrescribingData.total_patients))
            .where(PrescribingData.physician_id == physician_id)
        )
        rx_total = rx_result.scalar() or 0
        score += min(rx_total * 1.0, 20)

        # Referral hub (inbound)
        ref_count = await self.db.execute(
            select(func.count(func.distinct(ReferralRelationship.referring_physician_id)))
            .where(ReferralRelationship.receiving_physician_id == physician_id)
        )
        refs = ref_count.scalar() or 0
        score += min(refs * 1.0, 20)

        # Congress activity
        congress_count = await self.db.execute(
            select(func.count(CongressActivity.id))
            .where(CongressActivity.physician_id == physician_id)
        )
        congresses = congress_count.scalar() or 0
        score += min(congresses * 3, 15)

        # Trial participation
        trial_result = await self.db.execute(
            select(TrialInvestigator.role)
            .where(TrialInvestigator.physician_id == physician_id)
        )
        trial_roles = [r[0] for r in trial_result.all()]
        if "principal_investigator" in trial_roles:
            score += 10
        elif trial_roles:
            score += 5

        # Classify
        if score >= 65:
            tier = "global_national"
        elif score >= 40:
            tier = "regional_institutional"
        elif score >= 20:
            tier = "local_community"
        else:
            # Check rising star
            physician = await self.db.execute(
                select(Physician.years_in_practice).where(Physician.id == physician_id)
            )
            yip = physician.scalar()
            if yip and yip <= 15 and pubs >= 3:
                tier = "rising_star"
            else:
                tier = "monitor"

        return TierResult(tier=tier, score=score)
