from uuid import UUID

from sqlalchemy import desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.physician import Physician
from app.models.prescribing import PrescribingData
from app.models.publication import Publication, PublicationAuthor
from app.models.congress import CongressActivity
from app.models.trial import ClinicalTrial, TrialInvestigator
from app.models.referral import ReferralRelationship
from app.models.sentiment import SentimentScore, SentimentBarrier
from app.models.engagement import Engagement
from app.models.competitive import CompetitiveAffiliation
from app.schemas.persona import (
    CompetitiveDomain,
    EngagementDomain,
    IdentityDomain,
    InfluenceDomain,
    PersonaOutput,
    PrescribingDomain,
    RecommendedAction,
    ResearchDomain,
    SentimentDomain,
)


class PersonaBuilder:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def build_persona(self, physician_id: UUID) -> PersonaOutput:
        physician = await self._get_physician(physician_id)
        if not physician:
            raise ValueError(f"Physician {physician_id} not found")

        return PersonaOutput(
            identity=self._build_identity(physician),
            prescribing=await self._build_prescribing(physician_id),
            research=await self._build_research(physician_id),
            influence=await self._build_influence(physician_id),
            competitive=await self._build_competitive(physician_id),
            sentiment=await self._build_sentiment(physician_id),
            engagement=await self._build_engagement(physician_id),
            recommended_actions=await self._generate_recommendations(physician_id),
        )

    async def _get_physician(self, physician_id: UUID) -> Physician | None:
        result = await self.db.execute(
            select(Physician).where(Physician.id == physician_id)
        )
        return result.scalar_one_or_none()

    def _build_identity(self, physician: Physician) -> IdentityDomain:
        return IdentityDomain(
            id=physician.id,
            npi=physician.npi,
            first_name=physician.first_name,
            last_name=physician.last_name,
            credentials=physician.credentials,
            specialty=physician.specialty,
            subspecialty=physician.subspecialty,
            practice_type=physician.practice_type,
            institution_name=physician.institution_name,
            institution_type=physician.institution_type,
            city=physician.city,
            state=physician.state,
            region=physician.region,
            years_in_practice=physician.years_in_practice,
            tier=physician.tier,
            tier_score=float(physician.tier_score) if physician.tier_score else None,
            institutional_role=physician.institutional_role,
        )

    async def _build_prescribing(self, physician_id: UUID) -> PrescribingDomain:
        result = await self.db.execute(
            select(PrescribingData)
            .where(PrescribingData.physician_id == physician_id)
            .order_by(desc(PrescribingData.period_start))
        )
        records = result.scalars().all()

        if not records:
            return PrescribingDomain()

        total = sum(r.total_patients or 0 for r in records)
        products = {}
        for r in records:
            pid = str(r.product_id)
            if pid not in products:
                products[pid] = {"product_id": pid, "total_patients": 0, "new_starts": 0}
            products[pid]["total_patients"] += r.total_patients or 0
            products[pid]["new_starts"] += r.new_starts or 0

        pa_sub = sum(r.pa_submissions or 0 for r in records)
        pa_app = sum(r.pa_approvals or 0 for r in records)
        pa_rate = (pa_app / pa_sub * 100) if pa_sub > 0 else None

        return PrescribingDomain(
            total_patients=total,
            products=list(products.values()),
            pa_rate=pa_rate,
        )

    async def _build_research(self, physician_id: UUID) -> ResearchDomain:
        pub_result = await self.db.execute(
            select(Publication)
            .join(PublicationAuthor, PublicationAuthor.publication_id == Publication.id)
            .where(PublicationAuthor.physician_id == physician_id)
            .order_by(desc(Publication.publication_date))
            .limit(20)
        )
        pubs = pub_result.scalars().all()

        congress_result = await self.db.execute(
            select(CongressActivity)
            .where(CongressActivity.physician_id == physician_id)
            .order_by(desc(CongressActivity.congress_date))
            .limit(20)
        )
        congress = congress_result.scalars().all()

        return ResearchDomain(
            total_publications=len(pubs),
            publications=[
                {
                    "title": p.title,
                    "journal": p.journal,
                    "date": str(p.publication_date) if p.publication_date else None,
                    "type": p.publication_type,
                    "impact_factor": float(p.impact_factor) if p.impact_factor else None,
                }
                for p in pubs
            ],
            congress_presentations=[
                {
                    "congress": c.congress_name,
                    "date": str(c.congress_date) if c.congress_date else None,
                    "type": c.activity_type,
                    "title": c.title,
                }
                for c in congress
            ],
        )

    async def _build_influence(self, physician_id: UUID) -> InfluenceDomain:
        refs_in = await self.db.execute(
            select(ReferralRelationship)
            .where(ReferralRelationship.receiving_physician_id == physician_id)
        )
        refs_out = await self.db.execute(
            select(ReferralRelationship)
            .where(ReferralRelationship.referring_physician_id == physician_id)
        )
        in_list = refs_in.scalars().all()
        out_list = refs_out.scalars().all()

        trial_result = await self.db.execute(
            select(TrialInvestigator, ClinicalTrial)
            .join(ClinicalTrial, TrialInvestigator.trial_id == ClinicalTrial.id)
            .where(TrialInvestigator.physician_id == physician_id)
        )
        trials = trial_result.all()

        return InfluenceDomain(
            referral_connections=len(in_list) + len(out_list),
            referrals_in=[{"from": str(r.referring_physician_id), "volume": r.referral_volume} for r in in_list],
            referrals_out=[{"to": str(r.receiving_physician_id), "volume": r.referral_volume} for r in out_list],
            trial_participation=[
                {"trial": t[1].trial_name, "role": t[0].role, "phase": t[1].phase, "status": t[1].status}
                for t in trials
            ],
        )

    async def _build_competitive(self, physician_id: UUID) -> CompetitiveDomain:
        result = await self.db.execute(
            select(CompetitiveAffiliation)
            .where(CompetitiveAffiliation.physician_id == physician_id)
        )
        affiliations = result.scalars().all()

        total_payments = sum(float(a.payment_amount) for a in affiliations if a.payment_amount)

        return CompetitiveDomain(
            affiliations=[
                {
                    "company": a.company,
                    "type": a.affiliation_type,
                    "product": a.product_name,
                    "year": a.year,
                    "payment": float(a.payment_amount) if a.payment_amount else None,
                }
                for a in affiliations
            ],
            total_payments=total_payments if total_payments > 0 else None,
        )

    async def _build_sentiment(self, physician_id: UUID) -> SentimentDomain:
        scores_result = await self.db.execute(
            select(SentimentScore)
            .where(SentimentScore.physician_id == physician_id)
            .order_by(desc(SentimentScore.assessment_date))
        )
        scores = scores_result.scalars().all()

        barriers_result = await self.db.execute(
            select(SentimentBarrier)
            .where(SentimentBarrier.physician_id == physician_id)
            .order_by(desc(SentimentBarrier.created_at))
        )
        barriers = barriers_result.scalars().all()

        current = None
        if scores:
            latest = scores[0]
            current = {
                "disease_belief": latest.disease_belief_score,
                "product_perception": latest.product_perception_score,
                "behavioral_readiness": latest.behavioral_readiness_score,
                "composite": latest.composite_score,
                "date": str(latest.assessment_date),
            }

        return SentimentDomain(
            current_scores=current,
            history=[
                {
                    "date": str(s.assessment_date),
                    "disease_belief": s.disease_belief_score,
                    "product_perception": s.product_perception_score,
                    "behavioral_readiness": s.behavioral_readiness_score,
                    "composite": s.composite_score,
                }
                for s in scores
            ],
            barriers=[
                {"type": b.barrier_type, "severity": b.severity, "detail": b.detail}
                for b in barriers
            ],
            conversion_stage=scores[0].conversion_stage if scores else None,
            confidence=scores[0].confidence_level if scores else None,
        )

    async def _build_engagement(self, physician_id: UUID) -> EngagementDomain:
        result = await self.db.execute(
            select(Engagement)
            .where(Engagement.physician_id == physician_id)
            .order_by(desc(Engagement.engagement_date))
        )
        engagements = result.scalars().all()

        by_type: dict[str, int] = {}
        for e in engagements:
            by_type[e.engagement_type] = by_type.get(e.engagement_type, 0) + 1

        return EngagementDomain(
            total_engagements=len(engagements),
            recent=[
                {
                    "type": e.engagement_type,
                    "date": str(e.engagement_date),
                    "channel": e.channel,
                    "topic": e.topic,
                }
                for e in engagements[:10]
            ],
            by_type=by_type,
            last_engagement_date=engagements[0].engagement_date if engagements else None,
        )

    async def _generate_recommendations(self, physician_id: UUID) -> list[RecommendedAction]:
        actions = []

        # Get latest sentiment
        score_result = await self.db.execute(
            select(SentimentScore)
            .where(SentimentScore.physician_id == physician_id)
            .order_by(desc(SentimentScore.assessment_date))
            .limit(1)
        )
        latest_score = score_result.scalar_one_or_none()

        # Get engagement count
        eng_count_result = await self.db.execute(
            select(func.count(Engagement.id))
            .where(Engagement.physician_id == physician_id)
        )
        eng_count = eng_count_result.scalar() or 0

        # Get physician tier
        physician = await self._get_physician(physician_id)

        if latest_score:
            if latest_score.disease_belief_score and latest_score.disease_belief_score <= 2:
                actions.append(RecommendedAction(
                    action="Reinforce scientific foundation with disease state education",
                    rationale="Low disease belief score indicates gaps in disease understanding",
                    priority="high",
                ))
            if latest_score.product_perception_score and latest_score.product_perception_score >= 4 and latest_score.behavioral_readiness_score and latest_score.behavioral_readiness_score <= 2:
                actions.append(RecommendedAction(
                    action="Remove access friction — assist with PA process, site of care setup",
                    rationale="Strong product perception but low behavioral readiness suggests access barriers",
                    priority="high",
                ))
            if latest_score.conversion_stage == "trialing":
                actions.append(RecommendedAction(
                    action="Share real-world evidence and durability data to support continued adoption",
                    rationale="Physician is in trialing stage — reinforce with outcomes data",
                    priority="medium",
                ))

        if eng_count >= 5:
            actions.append(RecommendedAction(
                action="Reduce engagement intensity, diversify channels",
                rationale="High touchpoint volume — risk of over-engagement",
                priority="low",
            ))
        elif eng_count <= 1 and physician and physician.tier in ("global_national", "regional_institutional"):
            actions.append(RecommendedAction(
                action="Prioritize for engagement — high-tier physician with minimal touchpoints",
                rationale="Under-engaged relative to influence tier",
                priority="high",
            ))

        if not actions:
            actions.append(RecommendedAction(
                action="Continue routine engagement cadence",
                rationale="No urgent action triggers identified",
                priority="low",
            ))

        return actions
