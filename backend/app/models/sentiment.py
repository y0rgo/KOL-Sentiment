import uuid
from datetime import datetime, date
from sqlalchemy import String, SmallInteger, Date, Text, ForeignKey, Index, CheckConstraint
from sqlalchemy.dialects.postgresql import UUID, TIMESTAMP
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class SentimentScore(Base):
    __tablename__ = "sentiment_scores"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    physician_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("physicians.id"))
    disease_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("diseases.id"))
    assessment_date: Mapped[date] = mapped_column(Date, nullable=False)
    disease_belief_score: Mapped[int | None] = mapped_column(SmallInteger)
    product_perception_score: Mapped[int | None] = mapped_column(SmallInteger)
    behavioral_readiness_score: Mapped[int | None] = mapped_column(SmallInteger)
    composite_score: Mapped[int | None] = mapped_column(SmallInteger)
    conversion_stage: Mapped[str | None] = mapped_column(String(30))
    score_type: Mapped[str | None] = mapped_column(String(20))
    confidence_level: Mapped[str | None] = mapped_column(String(20))
    scored_by: Mapped[str | None] = mapped_column(String(100))
    notes: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), default=datetime.utcnow)

    __table_args__ = (
        CheckConstraint("disease_belief_score BETWEEN 1 AND 5", name="ck_disease_belief"),
        CheckConstraint("product_perception_score BETWEEN 1 AND 5", name="ck_product_perception"),
        CheckConstraint("behavioral_readiness_score BETWEEN 1 AND 5", name="ck_behavioral_readiness"),
        Index("idx_sentiment_physician", "physician_id"),
        Index("idx_sentiment_stage", "conversion_stage"),
    )


class SentimentBarrier(Base):
    __tablename__ = "sentiment_barriers"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    sentiment_score_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("sentiment_scores.id"))
    physician_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("physicians.id"))
    barrier_type: Mapped[str] = mapped_column(String(50), nullable=False)
    severity: Mapped[str | None] = mapped_column(String(20))
    source: Mapped[str | None] = mapped_column(String(50))
    detail: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), default=datetime.utcnow)
