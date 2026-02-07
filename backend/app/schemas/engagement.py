from datetime import date, datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field


class EngagementCreate(BaseModel):
    physician_id: UUID
    engagement_type: str
    engagement_date: date
    channel: Optional[str] = None
    duration_minutes: Optional[int] = None
    topic: Optional[str] = None
    disease_id: Optional[UUID] = None
    field_disease_belief_score: Optional[int] = Field(None, ge=1, le=5)
    field_product_perception_score: Optional[int] = Field(None, ge=1, le=5)
    field_behavioral_readiness_score: Optional[int] = Field(None, ge=1, le=5)
    objections_tagged: Optional[list[str]] = None
    field_notes: Optional[str] = None
    recorded_by: Optional[str] = None


class EngagementResponse(BaseModel):
    id: UUID
    physician_id: UUID
    engagement_type: str
    engagement_date: date
    channel: Optional[str] = None
    duration_minutes: Optional[int] = None
    topic: Optional[str] = None
    disease_id: Optional[UUID] = None
    field_disease_belief_score: Optional[int] = None
    field_product_perception_score: Optional[int] = None
    field_behavioral_readiness_score: Optional[int] = None
    objections_tagged: Optional[list[str]] = None
    field_notes: Optional[str] = None
    recorded_by: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}
