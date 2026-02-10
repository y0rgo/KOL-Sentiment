import uuid
from datetime import datetime
from sqlalchemy import String, Integer, Boolean, Numeric, ForeignKey, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID, TIMESTAMP
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class PriorityWeight(Base):
    __tablename__ = "priority_weights"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    disease_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("diseases.id"), nullable=True)
    factor: Mapped[str] = mapped_column(String(50), nullable=False)
    weight: Mapped[float] = mapped_column(Numeric(5, 2), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    __table_args__ = (
        UniqueConstraint("disease_id", "factor", name="uq_priority_weight_disease_factor"),
    )


class PriorityScore(Base):
    __tablename__ = "priority_scores"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    physician_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("physicians.id"), unique=True, nullable=False)
    composite_score: Mapped[float] = mapped_column(Numeric(5, 2), nullable=False)
    prescribing_opportunity: Mapped[float] = mapped_column(Numeric(5, 2), nullable=False, default=0)
    influence_leverage: Mapped[float] = mapped_column(Numeric(5, 2), nullable=False, default=0)
    sentiment_gap: Mapped[float] = mapped_column(Numeric(5, 2), nullable=False, default=0)
    engagement_deficit: Mapped[float] = mapped_column(Numeric(5, 2), nullable=False, default=0)
    competitive_urgency: Mapped[float] = mapped_column(Numeric(5, 2), nullable=False, default=0)
    completeness_gap: Mapped[float] = mapped_column(Numeric(5, 2), nullable=False, default=0)
    factors_scored: Mapped[int | None] = mapped_column(Integer)
    computed_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), default=datetime.utcnow)
    priority_rank: Mapped[int | None] = mapped_column(Integer)
