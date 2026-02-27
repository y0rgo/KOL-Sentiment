"""Ingestion API — data source management, sample pulls, and access reporting."""
import uuid
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.data_source import DataSource
from app.models.ingestion import IngestionRun, IngestionLog
from app.models.publication import Publication
from app.models.publication_access import PublicationAccess
from app.ingestion import CLIENT_REGISTRY
from app.services.discovery_service import DiscoveryService
from app.services.sync_orchestrator import SyncOrchestrator

router = APIRouter()


# --- Data Sources ---

@router.get("/sources")
async def list_sources(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(DataSource).order_by(DataSource.name))
    sources = result.scalars().all()
    return [_source_to_dict(s) for s in sources]


@router.post("/sources/{name}/test")
async def test_source(name: str, db: AsyncSession = Depends(get_db)):
    client_cls = CLIENT_REGISTRY.get(name)
    if not client_cls:
        raise HTTPException(status_code=404, detail=f"Unknown source: {name}")

    client = client_cls(db)
    try:
        result = await client.test_connection()
        return result
    finally:
        await client.close()


@router.post("/sources/{name}/sample")
async def sample_source(
    name: str,
    limit: int = Query(default=10, ge=1, le=50),
    db: AsyncSession = Depends(get_db),
):
    client_cls = CLIENT_REGISTRY.get(name)
    if not client_cls:
        raise HTTPException(status_code=404, detail=f"Unknown source: {name}")

    client = client_cls(db)
    try:
        run = await client.ingest(run_type="sample", limit=limit)
        return _run_to_dict(run)
    finally:
        await client.close()


@router.post("/sources/{name}/run")
async def trigger_run(
    name: str,
    body: dict | None = None,
    db: AsyncSession = Depends(get_db),
):
    client_cls = CLIENT_REGISTRY.get(name)
    if not client_cls:
        raise HTTPException(status_code=404, detail=f"Unknown source: {name}")

    limit = 100
    if body and body.get("limit"):
        limit = int(body["limit"])

    # Run synchronously for now; Celery version in tasks/ingestion.py
    client = client_cls(db)
    try:
        run = await client.ingest(run_type="full", limit=limit)
        return _run_to_dict(run)
    finally:
        await client.close()


# --- Pipeline Orchestration ---

@router.post("/sync-all")
async def sync_all(body: dict | None = None, db: AsyncSession = Depends(get_db)):
    """Run the full HARVEST -> PROMOTE -> ENRICH pipeline."""
    article_limit = (body or {}).get("article_limit", 30)
    trial_limit = (body or {}).get("trial_limit", 20)
    enrichment_limit = (body or {}).get("enrichment_limit", 50)

    orchestrator = SyncOrchestrator(db)
    result = await orchestrator.run_all(
        article_limit=article_limit,
        trial_limit=trial_limit,
        enrichment_limit=enrichment_limit,
    )
    return result


@router.post("/discover")
async def run_discovery(db: AsyncSession = Depends(get_db)):
    """Run only the discovery/promotion step on existing discovered_authors."""
    service = DiscoveryService(db)
    result = await service.run()
    await db.commit()
    return result


# --- Ingestion Runs ---

@router.get("/runs")
async def list_runs(
    source: Optional[str] = None,
    status: Optional[str] = None,
    page: int = 1,
    page_size: int = 25,
    db: AsyncSession = Depends(get_db),
):
    query = select(IngestionRun).order_by(IngestionRun.created_at.desc())

    if source:
        # Join to data_sources to filter by name
        source_result = await db.execute(
            select(DataSource.id).where(DataSource.name == source)
        )
        source_id = source_result.scalar_one_or_none()
        if source_id:
            query = query.where(IngestionRun.data_source_id == source_id)

    if status:
        query = query.where(IngestionRun.status == status)

    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar()

    offset = (page - 1) * page_size
    query = query.offset(offset).limit(page_size)

    result = await db.execute(query)
    runs = result.scalars().all()

    # Get source names for display
    source_ids = {r.data_source_id for r in runs}
    source_names = {}
    if source_ids:
        src_result = await db.execute(
            select(DataSource.id, DataSource.display_name).where(DataSource.id.in_(source_ids))
        )
        source_names = dict(src_result.all())

    return {
        "items": [_run_to_dict(r, source_names.get(r.data_source_id)) for r in runs],
        "total": total,
        "page": page,
        "page_size": page_size,
    }


@router.get("/runs/{run_id}")
async def get_run(run_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(IngestionRun).where(IngestionRun.id == run_id))
    run = result.scalar_one_or_none()
    if not run:
        raise HTTPException(status_code=404, detail="Run not found")

    # Get logs
    log_result = await db.execute(
        select(IngestionLog)
        .where(IngestionLog.ingestion_run_id == run_id)
        .order_by(IngestionLog.created_at)
    )
    logs = log_result.scalars().all()

    run_dict = _run_to_dict(run)
    run_dict["logs"] = [
        {
            "id": str(log.id),
            "record_identifier": log.record_identifier,
            "action": log.action,
            "detail": log.detail,
            "created_at": log.created_at.isoformat() if log.created_at else None,
        }
        for log in logs
    ]
    return run_dict


# --- Access Report ---

@router.get("/access-report")
async def access_report(db: AsyncSession = Depends(get_db)):
    """Journal-by-journal breakdown of OA vs paywalled publications."""
    # Total publications by journal
    total_result = await db.execute(
        select(Publication.journal, func.count(Publication.id))
        .where(Publication.journal.isnot(None))
        .group_by(Publication.journal)
        .order_by(func.count(Publication.id).desc())
    )
    totals = dict(total_result.all())

    # OA counts by journal
    oa_result = await db.execute(
        select(Publication.journal, func.count(PublicationAccess.id))
        .join(PublicationAccess, Publication.id == PublicationAccess.publication_id)
        .where(
            and_(
                Publication.journal.isnot(None),
                PublicationAccess.is_open_access.is_(True),
            )
        )
        .group_by(Publication.journal)
    )
    oa_counts = dict(oa_result.all())

    # Checked counts by journal
    checked_result = await db.execute(
        select(Publication.journal, func.count(PublicationAccess.id))
        .join(PublicationAccess, Publication.id == PublicationAccess.publication_id)
        .where(Publication.journal.isnot(None))
        .group_by(Publication.journal)
    )
    checked_counts = dict(checked_result.all())

    # Overall stats
    overall_total = await db.execute(select(func.count(Publication.id)))
    overall_checked = await db.execute(select(func.count(PublicationAccess.id)))
    overall_oa = await db.execute(
        select(func.count(PublicationAccess.id))
        .where(PublicationAccess.is_open_access.is_(True))
    )

    journals = []
    for journal_name, total in totals.items():
        oa = oa_counts.get(journal_name, 0)
        checked = checked_counts.get(journal_name, 0)
        journals.append({
            "journal": journal_name,
            "total": total,
            "checked": checked,
            "open_access": oa,
            "paywalled": checked - oa,
            "unchecked": total - checked,
            "oa_percent": round(oa / checked * 100, 1) if checked > 0 else None,
        })

    return {
        "journals": journals,
        "summary": {
            "total_publications": overall_total.scalar() or 0,
            "total_checked": overall_checked.scalar() or 0,
            "total_open_access": overall_oa.scalar() or 0,
        },
    }


# --- Helpers ---

def _source_to_dict(s: DataSource) -> dict:
    return {
        "id": str(s.id),
        "name": s.name,
        "display_name": s.display_name,
        "base_url": s.base_url,
        "api_key_required": s.api_key_required,
        "api_key_configured": s.api_key_configured,
        "status": s.status,
        "last_tested_at": s.last_tested_at.isoformat() if s.last_tested_at else None,
        "last_successful_at": s.last_successful_at.isoformat() if s.last_successful_at else None,
        "last_error_message": s.last_error_message,
        "rate_limit_info": s.rate_limit_info,
    }


def _run_to_dict(r: IngestionRun, source_name: str | None = None) -> dict:
    return {
        "id": str(r.id),
        "data_source_id": str(r.data_source_id),
        "source_name": source_name,
        "run_type": r.run_type,
        "parameters": r.parameters,
        "status": r.status,
        "records_fetched": r.records_fetched,
        "records_new": r.records_new,
        "records_updated": r.records_updated,
        "records_errors": r.records_errors,
        "started_at": r.started_at.isoformat() if r.started_at else None,
        "completed_at": r.completed_at.isoformat() if r.completed_at else None,
        "error_message": r.error_message,
        "created_at": r.created_at.isoformat() if r.created_at else None,
    }
