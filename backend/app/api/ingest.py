from fastapi import APIRouter, Depends, File, UploadFile

from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db

router = APIRouter()


@router.post("/claims")
async def ingest_claims(file: UploadFile = File(...), db: AsyncSession = Depends(get_db)):
    return {"message": "Claims data ingestion endpoint (coming soon)", "filename": file.filename}


@router.post("/publications")
async def ingest_publications(db: AsyncSession = Depends(get_db)):
    return {"message": "Publication refresh endpoint (coming soon)"}


@router.post("/trials")
async def ingest_trials(db: AsyncSession = Depends(get_db)):
    return {"message": "Clinical trials refresh endpoint (coming soon)"}


@router.post("/open-payments")
async def ingest_open_payments(file: UploadFile = File(...), db: AsyncSession = Depends(get_db)):
    return {"message": "Open Payments ingestion endpoint (coming soon)", "filename": file.filename}
