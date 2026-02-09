"""Master List API — Core CRUD, search, filter, status transitions."""
import uuid
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, func, or_
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.physician import Physician
from app.services.completeness_scorer import CompletenessScorer

router = APIRouter()

VALID_TRANSITIONS = {
    "imported": ["under_review"],
    "discovered": ["under_review"],
    "nominated": ["under_review"],
    "under_review": ["validated", "declined"],
    "validated": ["archived"],
    "declined": ["under_review"],
    "archived": ["under_review"],
}


@router.get("")
async def list_physicians(
    status: Optional[str] = Query(None, description="Comma-separated statuses"),
    tier: Optional[str] = None,
    state: Optional[str] = None,
    source_channel: Optional[str] = None,
    search: Optional[str] = None,
    completeness_min: Optional[float] = None,
    completeness_max: Optional[float] = None,
    sort_by: str = "created_at",
    sort_order: str = "desc",
    page: int = 1,
    page_size: int = 25,
    db: AsyncSession = Depends(get_db),
):
    query = select(Physician)

    # Filters
    if status:
        statuses = [s.strip() for s in status.split(",")]
        query = query.where(Physician.record_status.in_(statuses))

    if tier:
        query = query.where(Physician.tier == tier)

    if state:
        query = query.where(Physician.state == state)

    if source_channel:
        query = query.where(Physician.source_channel == source_channel)

    if search:
        search_term = f"%{search}%"
        query = query.where(
            or_(
                func.concat(Physician.first_name, ' ', Physician.last_name).ilike(search_term),
                Physician.npi.ilike(search_term),
                Physician.institution_name.ilike(search_term),
            )
        )

    if completeness_min is not None:
        query = query.where(Physician.completeness_score >= completeness_min)
    if completeness_max is not None:
        query = query.where(Physician.completeness_score <= completeness_max)

    # Count
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar()

    # Sort
    sort_column = getattr(Physician, sort_by, Physician.created_at)
    if sort_order == "asc":
        query = query.order_by(sort_column.asc())
    else:
        query = query.order_by(sort_column.desc())

    # Paginate
    offset = (page - 1) * page_size
    query = query.offset(offset).limit(page_size)

    result = await db.execute(query)
    physicians = result.scalars().all()

    return {
        "items": [_physician_to_dict(p) for p in physicians],
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": (total + page_size - 1) // page_size if total > 0 else 0,
    }


@router.get("/stats")
async def get_stats(db: AsyncSession = Depends(get_db)):
    # Count by status
    status_result = await db.execute(
        select(Physician.record_status, func.count()).group_by(Physician.record_status)
    )
    count_by_status = dict(status_result.all())

    # Count by source
    source_result = await db.execute(
        select(Physician.source_channel, func.count()).group_by(Physician.source_channel)
    )
    count_by_source = dict(source_result.all())

    # Count by state
    state_result = await db.execute(
        select(Physician.state, func.count())
        .where(Physician.state.isnot(None))
        .group_by(Physician.state)
    )
    count_by_state = dict(state_result.all())

    # Average completeness
    avg_result = await db.execute(
        select(func.avg(Physician.completeness_score))
    )
    avg_completeness = float(avg_result.scalar() or 0)

    # Count by tier
    tier_result = await db.execute(
        select(Physician.tier, func.count())
        .where(Physician.tier.isnot(None))
        .group_by(Physician.tier)
    )
    count_by_tier = dict(tier_result.all())

    return {
        "count_by_status": count_by_status,
        "count_by_source": count_by_source,
        "count_by_state": count_by_state,
        "average_completeness": round(avg_completeness, 2),
        "count_by_tier": count_by_tier,
    }


@router.get("/{physician_id}")
async def get_physician(physician_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Physician).where(Physician.id == physician_id))
    physician = result.scalar_one_or_none()
    if not physician:
        raise HTTPException(status_code=404, detail="Physician not found")
    return _physician_to_dict(physician)


@router.put("/{physician_id}")
async def update_physician(
    physician_id: uuid.UUID,
    updates: dict,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Physician).where(Physician.id == physician_id))
    physician = result.scalar_one_or_none()
    if not physician:
        raise HTTPException(status_code=404, detail="Physician not found")

    allowed_fields = [
        "first_name", "last_name", "npi", "credentials", "specialty", "subspecialty",
        "practice_type", "institution_name", "institution_type", "city", "state",
        "region", "country", "years_in_practice", "fellowship_training",
        "institutional_role", "notes",
    ]

    for field, value in updates.items():
        if field in allowed_fields:
            setattr(physician, field, value)

    physician.updated_at = datetime.utcnow()

    # Recompute completeness
    scorer = CompletenessScorer(db)
    await scorer.compute(physician)

    await db.commit()
    await db.refresh(physician)
    return _physician_to_dict(physician)


@router.put("/{physician_id}/status")
async def transition_status(
    physician_id: uuid.UUID,
    body: dict,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Physician).where(Physician.id == physician_id))
    physician = result.scalar_one_or_none()
    if not physician:
        raise HTTPException(status_code=404, detail="Physician not found")

    new_status = body.get("new_status")
    changed_by = body.get("changed_by", "system")
    reason = body.get("reason")

    if not new_status:
        raise HTTPException(status_code=400, detail="new_status is required")

    current_status = physician.record_status
    allowed = VALID_TRANSITIONS.get(current_status, [])

    if new_status not in allowed:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot transition from '{current_status}' to '{new_status}'. Allowed: {allowed}",
        )

    if new_status == "declined" and not reason:
        raise HTTPException(status_code=400, detail="Reason is required when declining")

    physician.record_status = new_status
    physician.status_changed_at = datetime.utcnow()
    physician.status_changed_by = changed_by
    if new_status == "declined":
        physician.decline_reason = reason
    if new_status == "validated":
        physician.last_validated_date = datetime.utcnow().date()
        physician.validated_by = changed_by

    await db.commit()
    await db.refresh(physician)
    return _physician_to_dict(physician)


def _physician_to_dict(p: Physician) -> dict:
    return {
        "id": str(p.id),
        "npi": p.npi,
        "first_name": p.first_name,
        "last_name": p.last_name,
        "credentials": p.credentials,
        "specialty": p.specialty,
        "subspecialty": p.subspecialty,
        "practice_type": p.practice_type,
        "institution_name": p.institution_name,
        "institution_type": p.institution_type,
        "city": p.city,
        "state": p.state,
        "region": p.region,
        "country": p.country,
        "years_in_practice": p.years_in_practice,
        "fellowship_training": p.fellowship_training,
        "institutional_role": p.institutional_role,
        "record_status": p.record_status,
        "status_changed_at": p.status_changed_at.isoformat() if p.status_changed_at else None,
        "status_changed_by": p.status_changed_by,
        "decline_reason": p.decline_reason,
        "source_channel": p.source_channel,
        "source_detail": p.source_detail,
        "completeness_score": float(p.completeness_score) if p.completeness_score else 0,
        "tier": p.tier,
        "tier_score": float(p.tier_score) if p.tier_score else None,
        "priority_score": float(p.priority_score) if p.priority_score else None,
        "priority_rank": p.priority_rank,
        "is_active": p.is_active,
        "notes": p.notes,
        "created_at": p.created_at.isoformat() if p.created_at else None,
        "updated_at": p.updated_at.isoformat() if p.updated_at else None,
    }
