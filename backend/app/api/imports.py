"""Imports API — List upload, conflict resolution."""
import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.import_batch import ImportBatch
from app.models.import_conflict import ImportConflict
from app.models.physician import Physician
from app.services.import_processor import ImportProcessor

router = APIRouter()


@router.post("/upload")
async def upload_import(
    file: UploadFile = File(...),
    uploaded_by: str = Form(...),
    team: str = Form("other"),
    description: str = Form(""),
    db: AsyncSession = Depends(get_db),
):
    content = await file.read()
    processor = ImportProcessor(db)
    batch = await processor.process_upload(
        file_content=content,
        filename=file.filename or "unknown.csv",
        uploaded_by=uploaded_by,
        team=team,
        description=description,
    )
    return _batch_to_dict(batch)


@router.get("/batches")
async def list_batches(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(ImportBatch).order_by(ImportBatch.created_at.desc())
    )
    batches = result.scalars().all()

    batch_list = []
    for b in batches:
        d = _batch_to_dict(b)
        # Count unresolved conflicts
        conflict_count = await db.execute(
            select(func.count()).select_from(ImportConflict).where(
                ImportConflict.import_batch_id == b.id,
                ImportConflict.resolution == "pending",
            )
        )
        d["pending_conflicts"] = conflict_count.scalar()
        batch_list.append(d)

    return batch_list


@router.get("/batches/{batch_id}")
async def get_batch(batch_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(ImportBatch).where(ImportBatch.id == batch_id))
    batch = result.scalar_one_or_none()
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")
    return _batch_to_dict(batch)


@router.get("/conflicts")
async def list_all_conflicts(
    resolution: str = "pending",
    db: AsyncSession = Depends(get_db),
):
    query = select(ImportConflict).where(ImportConflict.resolution == resolution)
    result = await db.execute(query.order_by(ImportConflict.created_at.desc()))
    conflicts = result.scalars().all()

    items = []
    for c in conflicts:
        d = _conflict_to_dict(c)
        # Add physician name context
        phys = await db.execute(select(Physician).where(Physician.id == c.physician_id))
        p = phys.scalar_one_or_none()
        if p:
            d["physician_name"] = f"{p.first_name} {p.last_name}"
            d["physician_institution"] = p.institution_name
        items.append(d)

    return items


@router.get("/conflicts/{batch_id}")
async def list_batch_conflicts(batch_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(ImportConflict)
        .where(ImportConflict.import_batch_id == batch_id)
        .order_by(ImportConflict.created_at.desc())
    )
    conflicts = result.scalars().all()

    items = []
    for c in conflicts:
        d = _conflict_to_dict(c)
        phys = await db.execute(select(Physician).where(Physician.id == c.physician_id))
        p = phys.scalar_one_or_none()
        if p:
            d["physician_name"] = f"{p.first_name} {p.last_name}"
            d["physician_institution"] = p.institution_name
        items.append(d)

    return items


@router.put("/conflicts/{conflict_id}/resolve")
async def resolve_conflict(
    conflict_id: uuid.UUID,
    body: dict,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(ImportConflict).where(ImportConflict.id == conflict_id))
    conflict = result.scalar_one_or_none()
    if not conflict:
        raise HTTPException(status_code=404, detail="Conflict not found")

    resolution = body.get("resolution")
    resolved_by = body.get("resolved_by", "system")
    manual_value = body.get("manual_value")

    if resolution not in ("keep_existing", "use_incoming", "manual"):
        raise HTTPException(status_code=400, detail="Invalid resolution type")

    conflict.resolution = resolution
    conflict.resolved_by = resolved_by
    conflict.resolved_at = datetime.utcnow()

    # Apply resolution to physician record
    phys = await db.execute(select(Physician).where(Physician.id == conflict.physician_id))
    physician = phys.scalar_one_or_none()
    if physician and conflict.field_name:
        if resolution == "use_incoming":
            setattr(physician, conflict.field_name, conflict.incoming_value)
            physician.updated_at = datetime.utcnow()
        elif resolution == "manual" and manual_value:
            setattr(physician, conflict.field_name, manual_value)
            physician.updated_at = datetime.utcnow()
        # keep_existing: no change needed

    await db.commit()
    return _conflict_to_dict(conflict)


@router.post("/conflicts/bulk-resolve")
async def bulk_resolve_conflicts(body: dict, db: AsyncSession = Depends(get_db)):
    conflict_ids = body.get("conflict_ids", [])
    resolution = body.get("resolution", "keep_existing")
    resolved_by = body.get("resolved_by", "system")

    resolved = []
    for cid in conflict_ids:
        result = await db.execute(
            select(ImportConflict).where(ImportConflict.id == uuid.UUID(cid))
        )
        conflict = result.scalar_one_or_none()
        if conflict and conflict.resolution == "pending":
            conflict.resolution = resolution
            conflict.resolved_by = resolved_by
            conflict.resolved_at = datetime.utcnow()

            if resolution == "use_incoming" and conflict.field_name:
                phys = await db.execute(select(Physician).where(Physician.id == conflict.physician_id))
                physician = phys.scalar_one_or_none()
                if physician:
                    setattr(physician, conflict.field_name, conflict.incoming_value)
                    physician.updated_at = datetime.utcnow()

            resolved.append(str(conflict.id))

    await db.commit()
    return {"resolved": resolved, "count": len(resolved)}


def _batch_to_dict(b: ImportBatch) -> dict:
    return {
        "id": str(b.id),
        "filename": b.filename,
        "uploaded_by": b.uploaded_by,
        "team": b.team,
        "description": b.description,
        "total_rows": b.total_rows,
        "new_records": b.new_records,
        "updated_records": b.updated_records,
        "duplicate_records": b.duplicate_records,
        "error_records": b.error_records,
        "status": b.status,
        "created_at": b.created_at.isoformat() if b.created_at else None,
        "completed_at": b.completed_at.isoformat() if b.completed_at else None,
    }


def _conflict_to_dict(c: ImportConflict) -> dict:
    return {
        "id": str(c.id),
        "import_batch_id": str(c.import_batch_id),
        "physician_id": str(c.physician_id),
        "conflict_type": c.conflict_type,
        "field_name": c.field_name,
        "existing_value": c.existing_value,
        "incoming_value": c.incoming_value,
        "resolution": c.resolution,
        "resolved_by": c.resolved_by,
        "resolved_at": c.resolved_at.isoformat() if c.resolved_at else None,
        "created_at": c.created_at.isoformat() if c.created_at else None,
    }
