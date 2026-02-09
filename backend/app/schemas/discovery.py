"""Pydantic schemas for Discovery Runs and Discovery Candidates."""

from __future__ import annotations

from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


# ---------------------------------------------------------------------------
# Discovery Run
# ---------------------------------------------------------------------------

class DiscoveryRunCreate(BaseModel):
    """Payload to kick off a new discovery run."""

    discovery_type: str = Field(..., max_length=30)
    parameters: dict[str, Any] | None = None
    run_by: str | None = Field(None, max_length=100)


class DiscoveryRunResponse(BaseModel):
    """Full discovery run record."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    discovery_type: str
    parameters: dict[str, Any] | None = None
    status: str
    total_candidates: int | None = None
    promoted_count: int
    declined_count: int
    pending_count: int
    run_by: str | None = None
    created_at: datetime
    completed_at: datetime | None = None


class DiscoveryRunListResponse(BaseModel):
    """Paginated list of discovery runs."""

    items: list[DiscoveryRunResponse]
    total: int
    page: int
    page_size: int
    pages: int


# ---------------------------------------------------------------------------
# Discovery Candidate
# ---------------------------------------------------------------------------

class DiscoveryCandidateResponse(BaseModel):
    """A candidate surfaced by a discovery run."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    discovery_run_id: UUID
    npi: str | None = None
    first_name: str | None = None
    last_name: str | None = None
    credentials: str | None = None
    specialty: str | None = None
    institution_name: str | None = None
    city: str | None = None
    state: str | None = None
    evidence_summary: str
    evidence_data: dict[str, Any] | None = None
    discovery_score: float | None = None
    matched_physician_id: UUID | None = None
    review_status: str
    reviewed_by: str | None = None
    reviewed_at: datetime | None = None
    review_notes: str | None = None
    created_at: datetime


class DiscoveryCandidateListResponse(BaseModel):
    """Paginated list of discovery candidates."""

    items: list[DiscoveryCandidateResponse]
    total: int
    page: int
    page_size: int
    pages: int


class CandidateReview(BaseModel):
    """Body for reviewing (promoting / declining) a discovery candidate."""

    review_status: str = Field(
        ...,
        max_length=20,
        description="One of: promoted, declined",
    )
    reviewed_by: str = Field(..., max_length=100)
    review_notes: str | None = None
