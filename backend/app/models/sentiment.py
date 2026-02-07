import uuid
from datetime import date, datetime
from typing import Optional

from sqlalchemy import String, SmallInteger, Date, Text, ForeignKey, Index, Computed, CheckConstraint
from sqlalchemy.dialects.postgresql import UUID, TIMESTAMP
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class SentimentScore(Base):
    __tablename__ = "sentiment_scores"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    physician_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("physicians.id"))
    disease_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("diseases.id"), nullable=True)
    assessment_date: Mapped[date] = mapped_column(Date, nullable=False)
    disease_belief_score: Mapped[Optional[int]] = mapped_column(SmallInteger)
    product_perception_score: Mapped[Optional[int]] = mapped_column(SmallInteger)
    behavioral_readiness_score: Mapped[Optional[int]] = mapped_column(SmallInteger)
    composite_score: Mapped[Optional[int]] = mapped_column(
        SmallInteger,
        Computed("disease_belief_score + product_perception_score + behavioral_readiness_score")
    )
    conversion_stage: Mapped[Optional[str]] = mapped_column(String(30))
    score_type: Mapped[Optional[str]] = mapped_column(String(20))
    confidence_level: Mapped[Optional[str]] = mapped_column(String(20))
    scored_by: Mapped[Optional[str]] = mapped_column(String(100))
    notes: Mapped[Optional[str]] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), default=datetime.utcnow)

    physician = relationship("Physician", back_populates="sentiment_scores")
    barriers = relationship("SentimentBarrier", back_populates="sentiment_score")

    __table_args__ = (
        CheckConstraint("disease_belief_score BETWEEN 1 AND 5", name="ck_disease_belief_range"),
        CheckConstraint("product_perception_score BETWEEN 1 AND 5", name="ck_product_perception_range"),
        CheckConstraint("behavioral_readiness_score BETWEEN 1 AND 5", name="ck_behavioral_readiness_range"),
        Index("idx_sentiment_physician", "physician_id"),
        Index("idx_sentiment_date", "assessment_date"),
        Index("idx_sentiment_stage", "conversion_stage"),
    )


class SentimentBarrier(Base):
    __tablename__ = "sentiment_barriers"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    sentiment_score_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("sentiment_scores.id"), nullable=True)
    physician_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("physicians.id"))
    barrier_type: Mapped[str] = mapped_column(String(50), nullable=False)
    severity: Mapped[Optional[str]] = mapped_column(String(20))
    source: Mapped[Optional[str]] = mapped_column(String(50))
    detail: Mapped[Optional[str]] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), default=datetime.utcnow)

    sentiment_score = relationship("SentimentScore", back_populates="barriers")
