"""Pydantic schemas for Engagement records."""

from __future__ import annotations

from datetime import date, datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


# ---------------------------------------------------------------------------
# Create
# ---------------------------------------------------------------------------

class EngagementCreate(BaseModel):
    """Payload for logging a new engagement interaction."""

    physician_id: UUID
    engagement_type: str = Field(..., max_length=50)
    engagement_date: date
    channel: str | None = Field(None, max_length=50)
    duration_minutes: int | None = None
    topic: str | None = None
    disease_id: UUID | None = None
    field_disease_belief_score: int | None = Field(None, ge=1, le=5)
    field_product_perception_score: int | None = Field(None, ge=1, le=5)
    field_behavioral_readiness_score: int | None = Field(None, ge=1, le=5)
    objections_tagged: list[str] | None = None
    field_notes: str | None = None
    recorded_by: str | None = Field(None, max_length=100)


# ---------------------------------------------------------------------------
# Response
# ---------------------------------------------------------------------------

class EngagementResponse(BaseModel):
    """Full engagement record."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    physician_id: UUID
    engagement_type: str
    engagement_date: date
    channel: str | None = None
    duration_minutes: int | None = None
    topic: str | None = None
    disease_id: UUID | None = None
    field_disease_belief_score: int | None = None
    field_product_perception_score: int | None = None
    field_behavioral_readiness_score: int | None = None
    objections_tagged: list[str] | None = None
    field_notes: str | None = None
    recorded_by: str | None = None
    created_at: datetime


class EngagementListResponse(BaseModel):
    """Paginated list of engagements."""

    items: list[EngagementResponse]
    total: int
    page: int
    page_size: int
    pages: int
