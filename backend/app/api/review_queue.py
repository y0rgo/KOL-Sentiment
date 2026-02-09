"""Review Queue API — unified queue for discoveries + nominations."""
from fastapi import APIRouter, Depends
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.discovery import DiscoveryCandidate
from app.models.nomination import FieldNomination

router = APIRouter()


@router.get("")
async def get_review_queue(db: AsyncSession = Depends(get_db)):
    items = []

    # Pending discovery candidates
    result = await db.execute(
        select(DiscoveryCandidate)
        .where(DiscoveryCandidate.review_status == "pending")
        .order_by(DiscoveryCandidate.created_at.desc())
    )
    for c in result.scalars().all():
        items.append({
            "type": "discovery",
            "id": str(c.id),
            "first_name": c.first_name,
            "last_name": c.last_name,
            "credentials": c.credentials,
            "specialty": c.specialty,
            "institution_name": c.institution_name,
            "city": c.city,
            "state": c.state,
            "evidence_or_rationale": c.evidence_summary,
            "source_detail": f"Discovery run: {c.discovery_run_id}",
            "score": float(c.discovery_score) if c.discovery_score else None,
            "created_at": c.created_at.isoformat() if c.created_at else None,
        })

    # Pending nominations
    result = await db.execute(
        select(FieldNomination)
        .where(FieldNomination.review_status == "pending")
        .order_by(FieldNomination.created_at.desc())
    )
    for n in result.scalars().all():
        items.append({
            "type": "nomination",
            "id": str(n.id),
            "first_name": n.first_name,
            "last_name": n.last_name,
            "credentials": n.credentials,
            "specialty": n.specialty,
            "institution_name": n.institution_name,
            "city": n.city,
            "state": n.state,
            "evidence_or_rationale": n.rationale,
            "source_detail": f"Nominated by {n.nominated_by} ({n.nominator_role or 'N/A'})",
            "disease_context": n.disease_context,
            "score": None,
            "created_at": n.created_at.isoformat() if n.created_at else None,
        })

    # Sort by created_at desc
    items.sort(key=lambda x: x.get("created_at", ""), reverse=True)
    return items


@router.get("/stats")
async def get_review_queue_stats(db: AsyncSession = Depends(get_db)):
    # Pending discoveries
    disc_result = await db.execute(
        select(func.count()).select_from(DiscoveryCandidate).where(
            DiscoveryCandidate.review_status == "pending"
        )
    )
    pending_discoveries = disc_result.scalar()

    # Pending nominations
    nom_result = await db.execute(
        select(func.count()).select_from(FieldNomination).where(
            FieldNomination.review_status == "pending"
        )
    )
    pending_nominations = nom_result.scalar()

    # Oldest pending
    oldest_disc = await db.execute(
        select(func.min(DiscoveryCandidate.created_at)).where(
            DiscoveryCandidate.review_status == "pending"
        )
    )
    oldest_nom = await db.execute(
        select(func.min(FieldNomination.created_at)).where(
            FieldNomination.review_status == "pending"
        )
    )

    oldest_d = oldest_disc.scalar()
    oldest_n = oldest_nom.scalar()

    oldest = None
    if oldest_d and oldest_n:
        oldest = min(oldest_d, oldest_n).isoformat()
    elif oldest_d:
        oldest = oldest_d.isoformat()
    elif oldest_n:
        oldest = oldest_n.isoformat()

    return {
        "total_pending": pending_discoveries + pending_nominations,
        "pending_discoveries": pending_discoveries,
        "pending_nominations": pending_nominations,
        "oldest_pending_date": oldest,
    }
