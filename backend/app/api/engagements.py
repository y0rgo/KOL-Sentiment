"""Engagements API — logging and tracking."""
import uuid
from datetime import date

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.engagement import Engagement
from app.models.physician import Physician

router = APIRouter()


@router.post("")
async def create_engagement(body: dict, db: AsyncSession = Depends(get_db)):
    physician_id = body.get("physician_id")
    if not physician_id:
        raise HTTPException(status_code=400, detail="physician_id is required")

    result = await db.execute(
        select(Physician).where(Physician.id == uuid.UUID(physician_id))
    )
    physician = result.scalar_one_or_none()
    if not physician:
        raise HTTPException(status_code=404, detail="Physician not found")
    if physician.record_status != "validated":
        raise HTTPException(status_code=400, detail="Engagements can only be logged for validated physicians")

    engagement = Engagement(
        physician_id=uuid.UUID(physician_id),
        engagement_type=body.get("engagement_type", "meeting"),
        engagement_date=date.fromisoformat(body.get("engagement_date", date.today().isoformat())),
        channel=body.get("channel"),
        duration_minutes=body.get("duration_minutes"),
        topic=body.get("topic"),
        disease_id=uuid.UUID(body["disease_id"]) if body.get("disease_id") else None,
        field_disease_belief_score=body.get("field_disease_belief_score"),
        field_product_perception_score=body.get("field_product_perception_score"),
        field_behavioral_readiness_score=body.get("field_behavioral_readiness_score"),
        objections_tagged=body.get("objections_tagged"),
        field_notes=body.get("field_notes"),
        recorded_by=body.get("recorded_by"),
    )
    db.add(engagement)
    await db.commit()
    await db.refresh(engagement)
    return _engagement_to_dict(engagement)


@router.get("/physician/{physician_id}")
async def get_engagements(physician_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Engagement)
        .where(Engagement.physician_id == physician_id)
        .order_by(Engagement.engagement_date.desc())
    )
    engagements = result.scalars().all()
    return [_engagement_to_dict(e) for e in engagements]


def _engagement_to_dict(e: Engagement) -> dict:
    return {
        "id": str(e.id),
        "physician_id": str(e.physician_id),
        "engagement_type": e.engagement_type,
        "engagement_date": e.engagement_date.isoformat() if e.engagement_date else None,
        "channel": e.channel,
        "duration_minutes": e.duration_minutes,
        "topic": e.topic,
        "disease_id": str(e.disease_id) if e.disease_id else None,
        "field_disease_belief_score": e.field_disease_belief_score,
        "field_product_perception_score": e.field_product_perception_score,
        "field_behavioral_readiness_score": e.field_behavioral_readiness_score,
        "objections_tagged": e.objections_tagged,
        "field_notes": e.field_notes,
        "recorded_by": e.recorded_by,
        "created_at": e.created_at.isoformat() if e.created_at else None,
    }
