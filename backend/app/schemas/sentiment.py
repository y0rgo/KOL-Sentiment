from datetime import date, datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field


class SentimentScoreCreate(BaseModel):
    physician_id: UUID
    disease_id: Optional[UUID] = None
    disease_belief_score: int = Field(ge=1, le=5)
    product_perception_score: int = Field(ge=1, le=5)
    behavioral_readiness_score: int = Field(ge=1, le=5)
    score_type: str = "field_input"
    scored_by: Optional[str] = None
    notes: Optional[str] = None
    objections_tagged: Optional[list[str]] = None


class SentimentScoreResponse(BaseModel):
    id: UUID
    physician_id: UUID
    disease_id: Optional[UUID] = None
    assessment_date: date
    disease_belief_score: Optional[int] = None
    product_perception_score: Optional[int] = None
    behavioral_readiness_score: Optional[int] = None
    composite_score: Optional[int] = None
    conversion_stage: Optional[str] = None
    score_type: Optional[str] = None
    confidence_level: Optional[str] = None
    scored_by: Optional[str] = None
    notes: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class SentimentBarrierResponse(BaseModel):
    id: UUID
    barrier_type: str
    severity: Optional[str] = None
    source: Optional[str] = None
    detail: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class SentimentDashboard(BaseModel):
    stage_distribution: dict[str, int]
    tier_sentiment: dict[str, dict[str, int]]
    geographic_sentiment: dict[str, dict[str, int]]
