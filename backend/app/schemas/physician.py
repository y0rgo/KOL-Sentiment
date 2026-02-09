"""Pydantic schemas for Physician records."""

from __future__ import annotations

from datetime import date, datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


# ---------------------------------------------------------------------------
# Create / Update
# ---------------------------------------------------------------------------

class PhysicianCreate(BaseModel):
    """Payload accepted when creating a new physician record."""

    npi: str | None = Field(None, max_length=10)
    first_name: str = Field(..., max_length=100)
    last_name: str = Field(..., max_length=100)
    credentials: str | None = Field(None, max_length=50)
    specialty: str | None = Field(None, max_length=100)
    subspecialty: str | None = Field(None, max_length=100)
    practice_type: str | None = Field(None, max_length=50)
    institution_name: str | None = Field(None, max_length=200)
    institution_type: str | None = Field(None, max_length=50)
    city: str | None = Field(None, max_length=100)
    state: str | None = Field(None, max_length=2)
    region: str | None = Field(None, max_length=50)
    country: str | None = Field("US", max_length=50)
    years_in_practice: int | None = None
    fellowship_training: str | None = None
    institutional_role: str | None = Field(None, max_length=100)

    # Source tracking
    source_channel: str = Field("import", max_length=30)
    source_detail: str | None = None

    # Optional metadata
    notes: str | None = None


class PhysicianUpdate(BaseModel):
    """Partial-update payload – every field is optional."""

    npi: str | None = Field(None, max_length=10)
    first_name: str | None = Field(None, max_length=100)
    last_name: str | None = Field(None, max_length=100)
    credentials: str | None = Field(None, max_length=50)
    specialty: str | None = Field(None, max_length=100)
    subspecialty: str | None = Field(None, max_length=100)
    practice_type: str | None = Field(None, max_length=50)
    institution_name: str | None = Field(None, max_length=200)
    institution_type: str | None = Field(None, max_length=50)
    city: str | None = Field(None, max_length=100)
    state: str | None = Field(None, max_length=2)
    region: str | None = Field(None, max_length=50)
    country: str | None = Field(None, max_length=50)
    years_in_practice: int | None = None
    fellowship_training: str | None = None
    institutional_role: str | None = Field(None, max_length=100)

    # Tier / classification
    tier: str | None = Field(None, max_length=30)
    tier_score: float | None = None

    # Metadata
    is_active: bool | None = None
    notes: str | None = None


# ---------------------------------------------------------------------------
# Status transition
# ---------------------------------------------------------------------------

class StatusTransition(BaseModel):
    """Request body for changing a physician's record_status."""

    new_status: str = Field(..., max_length=20)
    changed_by: str = Field(..., max_length=100)
    decline_reason: str | None = None


# ---------------------------------------------------------------------------
# Response
# ---------------------------------------------------------------------------

class PhysicianResponse(BaseModel):
    """Full physician record returned by the API."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    npi: str | None = None
    first_name: str
    last_name: str
    credentials: str | None = None
    specialty: str | None = None
    subspecialty: str | None = None
    practice_type: str | None = None
    institution_name: str | None = None
    institution_type: str | None = None
    city: str | None = None
    state: str | None = None
    region: str | None = None
    country: str | None = None
    years_in_practice: int | None = None
    fellowship_training: str | None = None
    institutional_role: str | None = None

    # Record status
    record_status: str
    status_changed_at: datetime | None = None
    status_changed_by: str | None = None
    decline_reason: str | None = None

    # Source tracking
    source_channel: str
    source_detail: str | None = None
    original_import_id: UUID | None = None

    # Completeness
    completeness_score: float | None = None
    last_validated_date: date | None = None
    validated_by: str | None = None

    # Tier & classification
    tier: str | None = None
    tier_score: float | None = None
    tier_last_assessed: datetime | None = None

    # Priority
    priority_score: float | None = None
    priority_rank: int | None = None
    priority_last_computed: datetime | None = None

    # Metadata
    is_active: bool
    notes: str | None = None
    created_at: datetime
    updated_at: datetime


# ---------------------------------------------------------------------------
# List (paginated)
# ---------------------------------------------------------------------------

class PhysicianListResponse(BaseModel):
    """Paginated list of physicians."""

    items: list[PhysicianResponse]
    total: int
    page: int
    page_size: int
    pages: int


# ---------------------------------------------------------------------------
# Stats
# ---------------------------------------------------------------------------

class PhysicianStats(BaseModel):
    """Aggregate statistics shown on dashboard cards."""

    total_physicians: int = 0
    status_counts: dict[str, int] = Field(default_factory=dict)
    source_counts: dict[str, int] = Field(default_factory=dict)
    tier_counts: dict[str, int] = Field(default_factory=dict)
    avg_completeness: float | None = None
    active_count: int = 0
    inactive_count: int = 0
