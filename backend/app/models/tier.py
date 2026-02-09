import uuid
from datetime import datetime
from sqlalchemy import String, Integer, Boolean, Numeric, ForeignKey, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID, TIMESTAMP
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class TierDimensionWeight(Base):
    __tablename__ = "tier_dimension_weights"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    disease_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("diseases.id"), nullable=True)
    dimension: Mapped[str] = mapped_column(String(50), nullable=False)
    weight: Mapped[float] = mapped_column(Numeric(5, 2), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    __table_args__ = (
        UniqueConstraint("disease_id", "dimension", name="uq_tier_weight_disease_dimension"),
    )


class TierDimensionScore(Base):
    __tablename__ = "tier_dimension_scores"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    physician_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("physicians.id"), nullable=False)
    dimension: Mapped[str] = mapped_column(String(50), nullable=False)
    raw_score: Mapped[float] = mapped_column(Numeric(5, 2), nullable=False)
    weighted_score: Mapped[float] = mapped_column(Numeric(5, 2), nullable=False)
    has_data: Mapped[bool] = mapped_column(Boolean, default=True)
    dimensions_scored: Mapped[int | None] = mapped_column(Integer)
    computed_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), default=datetime.utcnow)
