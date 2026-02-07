from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.physician import Physician
from app.models.referral import ReferralRelationship

router = APIRouter()


@router.get("/physician/{physician_id}")
async def get_physician_network(physician_id: UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(ReferralRelationship).where(
            or_(
                ReferralRelationship.referring_physician_id == physician_id,
                ReferralRelationship.receiving_physician_id == physician_id,
            )
        )
    )
    relationships = result.scalars().all()
    return {"physician_id": str(physician_id), "connections": len(relationships), "relationships": []}


@router.get("/graph")
async def get_network_graph(db: AsyncSession = Depends(get_db)):
    physicians_result = await db.execute(
        select(Physician.id, Physician.first_name, Physician.last_name, Physician.tier)
        .where(Physician.is_active == True)
    )
    nodes = [
        {"id": str(row[0]), "name": f"{row[1]} {row[2]}", "tier": row[3]}
        for row in physicians_result.all()
    ]

    refs_result = await db.execute(select(ReferralRelationship))
    links = [
        {
            "source": str(r.referring_physician_id),
            "target": str(r.receiving_physician_id),
            "volume": r.referral_volume,
        }
        for r in refs_result.scalars().all()
    ]

    return {"nodes": nodes, "links": links}
