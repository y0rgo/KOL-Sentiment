from pydantic import BaseModel


class TierDistribution(BaseModel):
    tier: str
    count: int


class ConversionFunnelItem(BaseModel):
    stage: str
    count: int


class GeographicCoverageItem(BaseModel):
    state: str
    physician_count: int
    avg_sentiment: float | None = None


class CompetitiveLandscapeItem(BaseModel):
    company: str
    physician_count: int
    total_payments: float | None = None
