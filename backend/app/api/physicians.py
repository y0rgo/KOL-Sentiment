import csv
import io
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.physician import Physician
from app.models.sentiment import SentimentScore
from app.schemas.physician import (
    PhysicianCreate,
    PhysicianImportResult,
    PhysicianListResponse,
    PhysicianResponse,
    PhysicianUpdate,
)
from app.schemas.persona import PersonaOutput
from app.services.persona_builder import PersonaBuilder

router = APIRouter()

STATE_TO_REGION = {
    "CT": "northeast", "ME": "northeast", "MA": "northeast", "NH": "northeast",
    "RI": "northeast", "VT": "northeast", "NJ": "northeast", "NY": "northeast", "PA": "northeast",
    "IL": "midwest", "IN": "midwest", "MI": "midwest", "OH": "midwest", "WI": "midwest",
    "IA": "midwest", "KS": "midwest", "MN": "midwest", "MO": "midwest", "NE": "midwest",
    "ND": "midwest", "SD": "midwest",
    "DE": "southeast", "FL": "southeast", "GA": "southeast", "MD": "southeast",
    "NC": "southeast", "SC": "southeast", "VA": "southeast", "DC": "southeast",
    "WV": "southeast", "AL": "southeast", "KY": "southeast", "MS": "southeast", "TN": "southeast",
    "AR": "southeast", "LA": "southeast",
    "AZ": "southwest", "NM": "southwest", "OK": "southwest", "TX": "southwest",
    "CO": "west", "ID": "west", "MT": "west", "NV": "west", "UT": "west", "WY": "west",
    "AK": "west", "CA": "west", "HI": "west", "OR": "west", "WA": "west",
}


@router.get("", response_model=PhysicianListResponse)
async def list_physicians(
    tier: Optional[str] = None,
    state: Optional[str] = None,
    specialty: Optional[str] = None,
    search: Optional[str] = None,
    sentiment_min: Optional[int] = None,
    sentiment_max: Optional[int] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    query = select(Physician).where(Physician.is_active == True)

    if tier:
        query = query.where(Physician.tier == tier)
    if state:
        query = query.where(Physician.state == state)
    if specialty:
        query = query.where(Physician.specialty.ilike(f"%{specialty}%"))
    if search:
        query = query.where(
            (Physician.first_name.ilike(f"%{search}%"))
            | (Physician.last_name.ilike(f"%{search}%"))
            | (Physician.npi.ilike(f"%{search}%"))
        )

    # Count total before pagination
    count_query = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_query)).scalar() or 0

    # Apply pagination
    query = query.offset((page - 1) * page_size).limit(page_size).order_by(Physician.last_name)
    result = await db.execute(query)
    physicians = result.scalars().all()

    return PhysicianListResponse(
        items=[PhysicianResponse.model_validate(p) for p in physicians],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/{physician_id}", response_model=PhysicianResponse)
async def get_physician(physician_id: UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Physician).where(Physician.id == physician_id))
    physician = result.scalar_one_or_none()
    if not physician:
        raise HTTPException(status_code=404, detail="Physician not found")
    return PhysicianResponse.model_validate(physician)


@router.get("/{physician_id}/persona", response_model=PersonaOutput)
async def get_physician_persona(physician_id: UUID, db: AsyncSession = Depends(get_db)):
    builder = PersonaBuilder(db)
    persona = await builder.build_persona(physician_id)
    return persona


@router.post("", response_model=PhysicianResponse)
async def create_physician(data: PhysicianCreate, db: AsyncSession = Depends(get_db)):
    physician = Physician(**data.model_dump())
    if physician.state:
        physician.region = STATE_TO_REGION.get(physician.state.upper())
    db.add(physician)
    await db.commit()
    await db.refresh(physician)
    return PhysicianResponse.model_validate(physician)


@router.put("/{physician_id}", response_model=PhysicianResponse)
async def update_physician(physician_id: UUID, data: PhysicianUpdate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Physician).where(Physician.id == physician_id))
    physician = result.scalar_one_or_none()
    if not physician:
        raise HTTPException(status_code=404, detail="Physician not found")

    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(physician, field, value)

    if "state" in update_data and physician.state:
        physician.region = STATE_TO_REGION.get(physician.state.upper())

    await db.commit()
    await db.refresh(physician)
    return PhysicianResponse.model_validate(physician)


@router.post("/import", response_model=PhysicianImportResult)
async def import_physicians(file: UploadFile = File(...), db: AsyncSession = Depends(get_db)):
    content = await file.read()
    text = content.decode("utf-8-sig")
    reader = csv.DictReader(io.StringIO(text))

    created = 0
    updated = 0
    errors = []
    total = 0

    for row_num, row in enumerate(reader, start=2):
        total += 1
        npi = row.get("npi", "").strip()
        if not npi:
            errors.append(f"Row {row_num}: missing NPI")
            continue

        try:
            result = await db.execute(select(Physician).where(Physician.npi == npi))
            existing = result.scalar_one_or_none()

            state = row.get("state", "").strip().upper() or None
            region = STATE_TO_REGION.get(state) if state else None

            if existing:
                for field in ["first_name", "last_name", "credentials", "specialty",
                              "institution_name", "practice_type", "city"]:
                    val = row.get(field, "").strip()
                    if val:
                        setattr(existing, field, val)
                if state:
                    existing.state = state
                    existing.region = region
                updated += 1
            else:
                physician = Physician(
                    npi=npi,
                    first_name=row.get("first_name", "").strip() or "Unknown",
                    last_name=row.get("last_name", "").strip() or "Unknown",
                    credentials=row.get("credentials", "").strip() or None,
                    specialty=row.get("specialty", "").strip() or None,
                    institution_name=row.get("institution_name", "").strip() or None,
                    practice_type=row.get("practice_type", "").strip() or None,
                    city=row.get("city", "").strip() or None,
                    state=state,
                    region=region,
                    source="csv_import",
                )
                db.add(physician)
                created += 1
        except Exception as e:
            errors.append(f"Row {row_num}: {str(e)}")

    await db.commit()
    return PhysicianImportResult(total_rows=total, created=created, updated=updated, errors=errors)
