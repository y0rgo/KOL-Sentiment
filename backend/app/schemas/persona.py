"""Pydantic schemas for the assembled KOL Persona (360-degree view)."""

from __future__ import annotations

from datetime import date, datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


# ---------------------------------------------------------------------------
# Sub-sections — each maps to a related table
# ---------------------------------------------------------------------------

class PersonaPublicationSummary(BaseModel):
    """Lightweight publication record embedded in a persona."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    pmid: str | None = None
    title: str
    journal: str | None = None
    publication_date: date | None = None
    impact_factor: float | None = None
    publication_type: str | None = None
    author_position: str | None = None
    diseases: list[str] | None = None
    products_mentioned: list[str] | None = None
    sentiment_toward_product: str | None = None


class PersonaTrialSummary(BaseModel):
    """Lightweight clinical-trial record embedded in a persona."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    nct_id: str | None = None
    trial_name: str | None = None
    sponsor: str | None = None
    phase: str | None = None
    diseases: list[str] | None = None
    products: list[str] | None = None
    status: str | None = None
    role: str | None = None
    site_name: str | None = None


class PersonaCongressSummary(BaseModel):
    """Congress activity record embedded in a persona."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    congress_name: str | None = None
    congress_date: date | None = None
    activity_type: str | None = None
    title: str | None = None
    diseases: list[str] | None = None
    products_mentioned: list[str] | None = None
    sentiment_toward_product: str | None = None


class PersonaPrescribingSummary(BaseModel):
    """Prescribing data record embedded in a persona."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    product_id: UUID | None = None
    disease_id: UUID | None = None
    period_start: date
    period_end: date
    total_patients: int | None = None
    new_starts: int | None = None
    formulation: str | None = None
    line_of_therapy: str | None = None
    pa_submissions: int | None = None
    pa_approvals: int | None = None
    data_source: str | None = None


class PersonaSentimentSummary(BaseModel):
    """Sentiment score embedded in a persona."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    disease_id: UUID | None = None
    assessment_date: date
    disease_belief_score: int | None = None
    product_perception_score: int | None = None
    behavioral_readiness_score: int | None = None
    composite_score: int | None = None
    conversion_stage: str | None = None
    score_type: str | None = None
    confidence_level: str | None = None
    barriers: list[PersonaBarrierSummary] = Field(default_factory=list)


class PersonaBarrierSummary(BaseModel):
    """Barrier record nested inside a sentiment summary."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    barrier_type: str
    severity: str | None = None
    source: str | None = None
    detail: str | None = None


class PersonaEngagementSummary(BaseModel):
    """Engagement record embedded in a persona."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
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


class PersonaCompetitiveSummary(BaseModel):
    """Competitive affiliation embedded in a persona."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    company: str | None = None
    affiliation_type: str | None = None
    product_name: str | None = None
    year: int | None = None
    payment_amount: float | None = None
    data_source: str | None = None


class PersonaReferralSummary(BaseModel):
    """Referral relationship embedded in a persona."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    direction: str = Field(
        ...,
        description="'outgoing' if this physician is the referrer, 'incoming' otherwise.",
    )
    related_physician_id: UUID
    related_physician_name: str | None = None
    disease_id: UUID | None = None
    referral_volume: int | None = None
    period_start: date | None = None
    period_end: date | None = None


# ---------------------------------------------------------------------------
# Assembled Persona (top-level)
# ---------------------------------------------------------------------------

class PersonaResponse(BaseModel):
    """
    Full 360-degree KOL Persona.

    Assembles the physician core record together with all related
    evidence sub-sections.
    """

    model_config = ConfigDict(from_attributes=True)

    # --- Core physician fields ---
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

    # Status & source
    record_status: str
    source_channel: str
    source_detail: str | None = None

    # Completeness
    completeness_score: float | None = None

    # Tier / priority
    tier: str | None = None
    tier_score: float | None = None
    priority_score: float | None = None
    priority_rank: int | None = None

    # Metadata
    is_active: bool
    created_at: datetime
    updated_at: datetime

    # --- Related evidence sections ---
    publications: list[PersonaPublicationSummary] = Field(default_factory=list)
    clinical_trials: list[PersonaTrialSummary] = Field(default_factory=list)
    congress_activities: list[PersonaCongressSummary] = Field(default_factory=list)
    prescribing_data: list[PersonaPrescribingSummary] = Field(default_factory=list)
    sentiment_scores: list[PersonaSentimentSummary] = Field(default_factory=list)
    engagements: list[PersonaEngagementSummary] = Field(default_factory=list)
    competitive_affiliations: list[PersonaCompetitiveSummary] = Field(default_factory=list)
    referrals: list[PersonaReferralSummary] = Field(default_factory=list)


# Rebuild PersonaSentimentSummary to resolve the forward reference to
# PersonaBarrierSummary which is defined after it.
PersonaSentimentSummary.model_rebuild()
