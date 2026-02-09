"""Pydantic schemas for Sentiment Scores and Sentiment Barriers."""

from __future__ import annotations

from datetime import date, datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


# ---------------------------------------------------------------------------
# Sentiment Score
# ---------------------------------------------------------------------------

class SentimentScoreCreate(BaseModel):
    """Payload for recording a new sentiment assessment."""

    physician_id: UUID
    disease_id: UUID | None = None
    assessment_date: date
    disease_belief_score: int | None = Field(None, ge=1, le=5)
    product_perception_score: int | None = Field(None, ge=1, le=5)
    behavioral_readiness_score: int | None = Field(None, ge=1, le=5)
    composite_score: int | None = Field(None, ge=1, le=5)
    conversion_stage: str | None = Field(None, max_length=30)
    score_type: str | None = Field(None, max_length=20)
    confidence_level: str | None = Field(None, max_length=20)
    scored_by: str | None = Field(None, max_length=100)
    notes: str | None = None


class SentimentScoreResponse(BaseModel):
    """Full sentiment-score record."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    physician_id: UUID
    disease_id: UUID | None = None
    assessment_date: date
    disease_belief_score: int | None = None
    product_perception_score: int | None = None
    behavioral_readiness_score: int | None = None
    composite_score: int | None = None
    conversion_stage: str | None = None
    score_type: str | None = None
    confidence_level: str | None = None
    scored_by: str | None = None
    notes: str | None = None
    created_at: datetime


class SentimentScoreListResponse(BaseModel):
    """Paginated list of sentiment scores."""

    items: list[SentimentScoreResponse]
    total: int
    page: int
    page_size: int
    pages: int


# ---------------------------------------------------------------------------
# Sentiment Barrier
# ---------------------------------------------------------------------------

class SentimentBarrierCreate(BaseModel):
    """Payload for logging a barrier identified during sentiment assessment."""

    sentiment_score_id: UUID
    physician_id: UUID
    barrier_type: str = Field(..., max_length=50)
    severity: str | None = Field(None, max_length=20)
    source: str | None = Field(None, max_length=50)
    detail: str | None = None


class SentimentBarrierResponse(BaseModel):
    """Full sentiment-barrier record."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    sentiment_score_id: UUID
    physician_id: UUID
    barrier_type: str
    severity: str | None = None
    source: str | None = None
    detail: str | None = None
    created_at: datetime
