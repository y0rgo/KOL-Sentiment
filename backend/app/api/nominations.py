"""Field Nominations API — submission and review."""
import uuid
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.nomination import FieldNomination
from app.models.physician import Physician
from app.services.match_engine import MatchEngine
from app.services.completeness_scorer import CompletenessScorer

router = APIRouter()


@router.post("")
async def create_nomination(body: dict, db: AsyncSession = Depends(get_db)):
    first_name = body.get("first_name", "").strip()
    last_name = body.get("last_name", "").strip()
    if not first_name or not last_name:
        raise HTTPException(status_code=400, detail="first_name and last_name are required")
    if not body.get("nominated_by"):
        raise HTTPException(status_code=400, detail="nominated_by is required")
    if not body.get("rationale"):
        raise HTTPException(status_code=400, detail="rationale is required")

    # Check if already on the list
    match_engine = MatchEngine(db)
    existing = await match_engine.find_match(
        body.get("npi"),
        first_name,
        last_name,
        body.get("state"),
    )

    nomination = FieldNomination(
        npi=body.get("npi"),
        first_name=first_name,
        last_name=last_name,
        credentials=body.get("credentials"),
        specialty=body.get("specialty"),
        institution_name=body.get("institution_name"),
        city=body.get("city"),
        state=body.get("state"),
        nominated_by=body["nominated_by"],
        nominator_role=body.get("nominator_role"),
        disease_context=body.get("disease_context"),
        rationale=body["rationale"],
        observed_influence=body.get("observed_influence"),
        matched_physician_id=existing.id if existing else None,
        review_status="pending",
    )
    db.add(nomination)
    await db.commit()
    await db.refresh(nomination)
    return _nomination_to_dict(nomination, existing)


@router.get("")
async def list_nominations(
    review_status: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
):
    query = select(FieldNomination).order_by(FieldNomination.created_at.desc())
    if review_status:
        query = query.where(FieldNomination.review_status == review_status)
    result = await db.execute(query)
    nominations = result.scalars().all()

    items = []
    for n in nominations:
        existing = None
        if n.matched_physician_id:
            r = await db.execute(select(Physician).where(Physician.id == n.matched_physician_id))
            existing = r.scalar_one_or_none()
        items.append(_nomination_to_dict(n, existing))
    return items


@router.put("/{nomination_id}/review")
async def review_nomination(
    nomination_id: uuid.UUID,
    body: dict,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(FieldNomination).where(FieldNomination.id == nomination_id))
    nomination = result.scalar_one_or_none()
    if not nomination:
        raise HTTPException(status_code=404, detail="Nomination not found")

    review_status = body.get("review_status")
    reviewed_by = body.get("reviewed_by", "system")
    review_notes = body.get("review_notes")

    if review_status not in ("promoted", "declined"):
        raise HTTPException(status_code=400, detail="review_status must be 'promoted' or 'declined'")

    nomination.review_status = review_status
    nomination.reviewed_by = reviewed_by
    nomination.reviewed_at = datetime.utcnow()
    nomination.review_notes = review_notes

    if review_status == "promoted":
        if nomination.matched_physician_id:
            # Update existing physician to validated
            r = await db.execute(
                select(Physician).where(Physician.id == nomination.matched_physician_id)
            )
            physician = r.scalar_one_or_none()
            if physician:
                physician.record_status = "validated"
                physician.status_changed_at = datetime.utcnow()
                physician.status_changed_by = reviewed_by
                physician.last_validated_date = datetime.utcnow().date()
                physician.validated_by = reviewed_by
        else:
            # Create new physician as validated
            physician = Physician(
                npi=nomination.npi,
                first_name=nomination.first_name,
                last_name=nomination.last_name,
                credentials=nomination.credentials,
                specialty=nomination.specialty,
                institution_name=nomination.institution_name,
                city=nomination.city,
                state=nomination.state,
                record_status="nominated",
                source_channel="field_nomination",
                source_detail=f"Nominated by {nomination.nominated_by}",
                status_changed_at=datetime.utcnow(),
                status_changed_by=reviewed_by,
            )
            db.add(physician)
            await db.flush()

            # Compute completeness
            scorer = CompletenessScorer(db)
            await scorer.compute(physician)

            nomination.matched_physician_id = physician.id

    await db.commit()
    await db.refresh(nomination)
    return _nomination_to_dict(nomination)


def _nomination_to_dict(n: FieldNomination, existing: Physician = None) -> dict:
    d = {
        "id": str(n.id),
        "npi": n.npi,
        "first_name": n.first_name,
        "last_name": n.last_name,
        "credentials": n.credentials,
        "specialty": n.specialty,
        "institution_name": n.institution_name,
        "city": n.city,
        "state": n.state,
        "nominated_by": n.nominated_by,
        "nominator_role": n.nominator_role,
        "disease_context": n.disease_context,
        "rationale": n.rationale,
        "observed_influence": n.observed_influence,
        "matched_physician_id": str(n.matched_physician_id) if n.matched_physician_id else None,
        "review_status": n.review_status,
        "reviewed_by": n.reviewed_by,
        "reviewed_at": n.reviewed_at.isoformat() if n.reviewed_at else None,
        "review_notes": n.review_notes,
        "created_at": n.created_at.isoformat() if n.created_at else None,
    }
    if existing:
        d["existing_physician"] = {
            "id": str(existing.id),
            "name": f"{existing.first_name} {existing.last_name}",
            "record_status": existing.record_status,
            "institution_name": existing.institution_name,
        }
    return d
