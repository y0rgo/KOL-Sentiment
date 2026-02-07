from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel


class PhysicianBase(BaseModel):
    npi: str
    first_name: str
    last_name: str
    credentials: Optional[str] = None
    specialty: Optional[str] = None
    subspecialty: Optional[str] = None
    practice_type: Optional[str] = None
    institution_name: Optional[str] = None
    institution_type: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    region: Optional[str] = None
    years_in_practice: Optional[int] = None
    fellowship_training: Optional[str] = None
    institutional_role: Optional[str] = None
    tier: Optional[str] = None
    source: Optional[str] = None
    notes: Optional[str] = None


class PhysicianCreate(PhysicianBase):
    pass


class PhysicianUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    credentials: Optional[str] = None
    specialty: Optional[str] = None
    subspecialty: Optional[str] = None
    practice_type: Optional[str] = None
    institution_name: Optional[str] = None
    institution_type: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    region: Optional[str] = None
    years_in_practice: Optional[int] = None
    fellowship_training: Optional[str] = None
    institutional_role: Optional[str] = None
    tier: Optional[str] = None
    source: Optional[str] = None
    notes: Optional[str] = None


class PhysicianResponse(PhysicianBase):
    id: UUID
    tier_score: Optional[float] = None
    tier_last_assessed: Optional[datetime] = None
    is_active: bool = True
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class PhysicianListResponse(BaseModel):
    items: list[PhysicianResponse]
    total: int
    page: int
    page_size: int


class PhysicianImportResult(BaseModel):
    total_rows: int
    created: int
    updated: int
    errors: list[str]
