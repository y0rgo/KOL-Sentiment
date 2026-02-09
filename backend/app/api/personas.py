"""Personas API — assembled physician deep-dive views."""
import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.physician import Physician
from app.models.prescribing import PrescribingData
from app.models.publication import PublicationAuthor, Publication
from app.models.congress import CongressActivity
from app.models.trial import TrialInvestigator, ClinicalTrial
from app.models.referral import ReferralRelationship
from app.models.sentiment import SentimentScore
from app.models.engagement import Engagement
from app.models.competitive import CompetitiveAffiliation

router = APIRouter()


@router.get("/{physician_id}/persona")
async def get_persona(physician_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Physician).where(Physician.id == physician_id))
    physician = result.scalar_one_or_none()
    if not physician:
        raise HTTPException(status_code=404, detail="Physician not found")

    # Identity domain
    identity = {
        "id": str(physician.id),
        "npi": physician.npi,
        "first_name": physician.first_name,
        "last_name": physician.last_name,
        "credentials": physician.credentials,
        "specialty": physician.specialty,
        "subspecialty": physician.subspecialty,
        "practice_type": physician.practice_type,
        "institution_name": physician.institution_name,
        "institution_type": physician.institution_type,
        "city": physician.city,
        "state": physician.state,
        "country": physician.country,
        "years_in_practice": physician.years_in_practice,
        "institutional_role": physician.institutional_role,
        "record_status": physician.record_status,
        "tier": physician.tier,
        "tier_score": float(physician.tier_score) if physician.tier_score else None,
        "completeness_score": float(physician.completeness_score) if physician.completeness_score else 0,
        "source_channel": physician.source_channel,
        "created_at": physician.created_at.isoformat() if physician.created_at else None,
    }

    # Prescribing domain
    rx_result = await db.execute(
        select(PrescribingData)
        .where(PrescribingData.physician_id == physician_id)
        .order_by(PrescribingData.period_start.desc())
        .limit(10)
    )
    prescribing = [
        {
            "period_start": r.period_start.isoformat(),
            "period_end": r.period_end.isoformat(),
            "total_patients": r.total_patients,
            "new_starts": r.new_starts,
            "formulation": r.formulation,
        }
        for r in rx_result.scalars().all()
    ]

    # Publications domain
    pub_result = await db.execute(
        select(Publication)
        .join(PublicationAuthor, PublicationAuthor.publication_id == Publication.id)
        .where(PublicationAuthor.physician_id == physician_id)
        .order_by(Publication.publication_date.desc())
        .limit(10)
    )
    publications = [
        {
            "title": p.title,
            "journal": p.journal,
            "publication_date": p.publication_date.isoformat() if p.publication_date else None,
            "impact_factor": float(p.impact_factor) if p.impact_factor else None,
        }
        for p in pub_result.scalars().all()
    ]

    # Congress domain
    congress_result = await db.execute(
        select(CongressActivity)
        .where(CongressActivity.physician_id == physician_id)
        .order_by(CongressActivity.congress_date.desc())
        .limit(10)
    )
    congress = [
        {
            "congress_name": c.congress_name,
            "congress_date": c.congress_date.isoformat() if c.congress_date else None,
            "activity_type": c.activity_type,
            "title": c.title,
        }
        for c in congress_result.scalars().all()
    ]

    # Trials domain
    trial_result = await db.execute(
        select(ClinicalTrial)
        .join(TrialInvestigator, TrialInvestigator.trial_id == ClinicalTrial.id)
        .where(TrialInvestigator.physician_id == physician_id)
        .limit(10)
    )
    trials = [
        {
            "nct_id": t.nct_id,
            "trial_name": t.trial_name,
            "phase": t.phase,
            "sponsor": t.sponsor,
            "status": t.status,
        }
        for t in trial_result.scalars().all()
    ]

    # Sentiment domain
    sentiment_result = await db.execute(
        select(SentimentScore)
        .where(SentimentScore.physician_id == physician_id)
        .order_by(SentimentScore.assessment_date.desc())
        .limit(10)
    )
    sentiment = [
        {
            "assessment_date": s.assessment_date.isoformat() if s.assessment_date else None,
            "disease_belief_score": s.disease_belief_score,
            "product_perception_score": s.product_perception_score,
            "behavioral_readiness_score": s.behavioral_readiness_score,
            "composite_score": s.composite_score,
            "conversion_stage": s.conversion_stage,
        }
        for s in sentiment_result.scalars().all()
    ]

    # Engagements domain
    eng_result = await db.execute(
        select(Engagement)
        .where(Engagement.physician_id == physician_id)
        .order_by(Engagement.engagement_date.desc())
        .limit(10)
    )
    engagements = [
        {
            "engagement_type": e.engagement_type,
            "engagement_date": e.engagement_date.isoformat() if e.engagement_date else None,
            "channel": e.channel,
            "topic": e.topic,
            "duration_minutes": e.duration_minutes,
        }
        for e in eng_result.scalars().all()
    ]

    # Competitive domain
    comp_result = await db.execute(
        select(CompetitiveAffiliation)
        .where(CompetitiveAffiliation.physician_id == physician_id)
        .order_by(CompetitiveAffiliation.year.desc())
        .limit(10)
    )
    competitive = [
        {
            "company": c.company,
            "affiliation_type": c.affiliation_type,
            "product_name": c.product_name,
            "year": c.year,
            "payment_amount": float(c.payment_amount) if c.payment_amount else None,
        }
        for c in comp_result.scalars().all()
    ]

    return {
        "identity": identity,
        "prescribing": prescribing,
        "publications": publications,
        "congress": congress,
        "trials": trials,
        "sentiment": sentiment,
        "engagements": engagements,
        "competitive": competitive,
    }
