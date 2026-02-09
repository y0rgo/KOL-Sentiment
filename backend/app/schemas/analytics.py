"""Pydantic schemas for Analytics / dashboard endpoints."""

from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# KOL List Health
# ---------------------------------------------------------------------------

class StatusBreakdown(BaseModel):
    """Count of physicians per record_status value."""

    imported: int = 0
    nominated: int = 0
    discovered: int = 0
    validated: int = 0
    declined: int = 0
    archived: int = 0


class TierBreakdown(BaseModel):
    """Count of physicians per tier value."""

    tier_1: int = Field(0, alias="Tier 1")
    tier_2: int = Field(0, alias="Tier 2")
    tier_3: int = Field(0, alias="Tier 3")
    untiered: int = 0


class CompletenessDistribution(BaseModel):
    """Physicians bucketed by completeness-score range."""

    range_0_25: int = Field(0, description="0-25 %")
    range_26_50: int = Field(0, description="26-50 %")
    range_51_75: int = Field(0, description="51-75 %")
    range_76_100: int = Field(0, description="76-100 %")


class ListHealthResponse(BaseModel):
    """Aggregate health metrics for the KOL master list."""

    total_physicians: int = 0
    active_physicians: int = 0
    avg_completeness: float | None = None
    status_breakdown: StatusBreakdown = Field(default_factory=StatusBreakdown)
    tier_breakdown: TierBreakdown = Field(default_factory=TierBreakdown)
    completeness_distribution: CompletenessDistribution = Field(
        default_factory=CompletenessDistribution,
    )
    source_channel_counts: dict[str, int] = Field(default_factory=dict)


# ---------------------------------------------------------------------------
# Import Activity
# ---------------------------------------------------------------------------

class ImportActivityItem(BaseModel):
    """Summary of a single import batch for the activity feed."""

    id: UUID
    filename: str
    uploaded_by: str
    team: str | None = None
    status: str
    total_rows: int | None = 0
    new_records: int | None = 0
    updated_records: int | None = 0
    duplicate_records: int | None = 0
    error_records: int | None = 0
    pending_conflicts: int = 0
    created_at: datetime
    completed_at: datetime | None = None


class ImportActivityResponse(BaseModel):
    """Recent import activity feed."""

    items: list[ImportActivityItem]
    total: int


# ---------------------------------------------------------------------------
# Review Queue
# ---------------------------------------------------------------------------

class ReviewQueueItem(BaseModel):
    """A single item awaiting review (conflict, nomination, or candidate)."""

    id: UUID
    item_type: str = Field(
        ...,
        description="One of: conflict, nomination, discovery_candidate",
    )
    physician_name: str | None = None
    physician_id: UUID | None = None
    summary: str | None = None
    created_at: datetime


class ReviewQueueStats(BaseModel):
    """Counts of items pending review across all queues."""

    pending_conflicts: int = 0
    pending_nominations: int = 0
    pending_candidates: int = 0
    total_pending: int = 0
