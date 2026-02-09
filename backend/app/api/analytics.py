"""Analytics API — dashboards and health metrics."""
from fastapi import APIRouter, Depends
from sqlalchemy import select, func, case, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.physician import Physician
from app.models.import_batch import ImportBatch

router = APIRouter()


@router.get("/list-health")
async def list_health(db: AsyncSession = Depends(get_db)):
    # Total physicians
    total_result = await db.execute(select(func.count()).select_from(Physician))
    total = total_result.scalar()

    # Count by status
    status_result = await db.execute(
        select(Physician.record_status, func.count()).group_by(Physician.record_status)
    )
    count_by_status = dict(status_result.all())

    # Count by source channel
    source_result = await db.execute(
        select(Physician.source_channel, func.count()).group_by(Physician.source_channel)
    )
    count_by_source = dict(source_result.all())

    # Average completeness
    avg_result = await db.execute(select(func.avg(Physician.completeness_score)))
    avg_completeness = float(avg_result.scalar() or 0)

    # Completeness distribution
    completeness_dist = {}
    for label, low, high in [("0-25", 0, 25), ("25-50", 25, 50), ("50-75", 50, 75), ("75-100", 75, 101)]:
        r = await db.execute(
            select(func.count()).select_from(Physician).where(
                and_(
                    Physician.completeness_score >= low,
                    Physician.completeness_score < high,
                )
            )
        )
        completeness_dist[label] = r.scalar()

    # Count by state
    state_result = await db.execute(
        select(Physician.state, func.count())
        .where(Physician.state.isnot(None))
        .group_by(Physician.state)
        .order_by(func.count().desc())
    )
    count_by_state = dict(state_result.all())

    return {
        "total_physicians": total,
        "count_by_status": count_by_status,
        "count_by_source": count_by_source,
        "average_completeness": round(avg_completeness, 2),
        "completeness_distribution": completeness_dist,
        "count_by_state": count_by_state,
    }


@router.get("/import-activity")
async def import_activity(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(ImportBatch).order_by(ImportBatch.created_at.desc()).limit(20)
    )
    batches = result.scalars().all()

    # Total by team
    team_result = await db.execute(
        select(ImportBatch.team, func.sum(ImportBatch.new_records))
        .group_by(ImportBatch.team)
    )
    by_team = {k: int(v or 0) for k, v in team_result.all()}

    return {
        "recent_batches": [
            {
                "id": str(b.id),
                "filename": b.filename,
                "team": b.team,
                "uploaded_by": b.uploaded_by,
                "new_records": b.new_records,
                "total_rows": b.total_rows,
                "status": b.status,
                "created_at": b.created_at.isoformat() if b.created_at else None,
            }
            for b in batches
        ],
        "imported_by_team": by_team,
    }


@router.get("/tier-distribution")
async def tier_distribution(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Physician.tier, func.count())
        .where(Physician.record_status == "validated")
        .group_by(Physician.tier)
    )
    return dict(result.all())


@router.get("/geographic-coverage")
async def geographic_coverage(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Physician.state, func.count())
        .where(Physician.state.isnot(None))
        .group_by(Physician.state)
        .order_by(func.count().desc())
    )
    return dict(result.all())
