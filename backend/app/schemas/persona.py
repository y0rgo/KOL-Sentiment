from datetime import date
from typing import Optional
from uuid import UUID

from pydantic import BaseModel


class IdentityDomain(BaseModel):
    id: UUID
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
    tier: Optional[str] = None
    tier_score: Optional[float] = None
    institutional_role: Optional[str] = None


class PrescribingDomain(BaseModel):
    total_patients: int = 0
    products: list[dict] = []
    trend: list[dict] = []
    pa_rate: Optional[float] = None


class ResearchDomain(BaseModel):
    total_publications: int = 0
    publications: list[dict] = []
    congress_presentations: list[dict] = []


class InfluenceDomain(BaseModel):
    referral_connections: int = 0
    referrals_in: list[dict] = []
    referrals_out: list[dict] = []
    trial_participation: list[dict] = []


class CompetitiveDomain(BaseModel):
    affiliations: list[dict] = []
    total_payments: Optional[float] = None


class SentimentDomain(BaseModel):
    current_scores: Optional[dict] = None
    history: list[dict] = []
    barriers: list[dict] = []
    conversion_stage: Optional[str] = None
    confidence: Optional[str] = None


class EngagementDomain(BaseModel):
    total_engagements: int = 0
    recent: list[dict] = []
    by_type: dict[str, int] = {}
    last_engagement_date: Optional[date] = None


class RecommendedAction(BaseModel):
    action: str
    rationale: str
    priority: str  # high, medium, low


class PersonaOutput(BaseModel):
    identity: IdentityDomain
    prescribing: PrescribingDomain
    research: ResearchDomain
    influence: InfluenceDomain
    competitive: CompetitiveDomain
    sentiment: SentimentDomain
    engagement: EngagementDomain
    recommended_actions: list[RecommendedAction] = []
