"""Pydantic schemas for Field Nominations."""

from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


# ---------------------------------------------------------------------------
# Create
# ---------------------------------------------------------------------------

class NominationCreate(BaseModel):
    """Payload for submitting a new field nomination."""

    npi: str | None = Field(None, max_length=10)
    first_name: str = Field(..., max_length=100)
    last_name: str = Field(..., max_length=100)
    credentials: str | None = Field(None, max_length=50)
    specialty: str | None = Field(None, max_length=100)
    institution_name: str | None = Field(None, max_length=200)
    city: str | None = Field(None, max_length=100)
    state: str | None = Field(None, max_length=2)
    nominated_by: str = Field(..., max_length=100)
    nominator_role: str | None = Field(None, max_length=50)
    disease_context: str | None = Field(None, max_length=100)
    rationale: str = Field(..., min_length=1)
    observed_influence: str | None = None


# ---------------------------------------------------------------------------
# Response
# ---------------------------------------------------------------------------

class NominationResponse(BaseModel):
    """Full field-nomination record."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    npi: str | None = None
    first_name: str
    last_name: str
    credentials: str | None = None
    specialty: str | None = None
    institution_name: str | None = None
    city: str | None = None
    state: str | None = None
    nominated_by: str
    nominator_role: str | None = None
    disease_context: str | None = None
    rationale: str
    observed_influence: str | None = None
    matched_physician_id: UUID | None = None
    review_status: str
    reviewed_by: str | None = None
    reviewed_at: datetime | None = None
    review_notes: str | None = None
    created_at: datetime


class NominationListResponse(BaseModel):
    """Paginated list of nominations."""

    items: list[NominationResponse]
    total: int
    page: int
    page_size: int
    pages: int


# ---------------------------------------------------------------------------
# Review action
# ---------------------------------------------------------------------------

class NominationReview(BaseModel):
    """Body for reviewing (approving / declining) a nomination."""

    review_status: str = Field(
        ...,
        max_length=20,
        description="One of: approved, declined",
    )
    reviewed_by: str = Field(..., max_length=100)
    review_notes: str | None = None
