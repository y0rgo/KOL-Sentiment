import uuid
from datetime import date, datetime
from typing import Optional

from sqlalchemy import String, Integer, SmallInteger, Date, Text, ForeignKey, Index, CheckConstraint
from sqlalchemy.dialects.postgresql import UUID, TIMESTAMP, ARRAY
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Engagement(Base):
    __tablename__ = "engagements"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    physician_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("physicians.id"))
    engagement_type: Mapped[str] = mapped_column(String(50), nullable=False)
    engagement_date: Mapped[date] = mapped_column(Date, nullable=False)
    channel: Mapped[Optional[str]] = mapped_column(String(50))
    duration_minutes: Mapped[Optional[int]] = mapped_column(Integer)
    topic: Mapped[Optional[str]] = mapped_column(Text)
    disease_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("diseases.id"), nullable=True)
    field_disease_belief_score: Mapped[Optional[int]] = mapped_column(SmallInteger)
    field_product_perception_score: Mapped[Optional[int]] = mapped_column(SmallInteger)
    field_behavioral_readiness_score: Mapped[Optional[int]] = mapped_column(SmallInteger)
    objections_tagged: Mapped[Optional[list[str]]] = mapped_column(ARRAY(Text))
    field_notes: Mapped[Optional[str]] = mapped_column(Text)
    recorded_by: Mapped[Optional[str]] = mapped_column(String(100))
    created_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), default=datetime.utcnow)

    physician = relationship("Physician", back_populates="engagements")

    __table_args__ = (
        CheckConstraint("field_disease_belief_score BETWEEN 1 AND 5", name="ck_eng_disease_belief"),
        CheckConstraint("field_product_perception_score BETWEEN 1 AND 5", name="ck_eng_product_perception"),
        CheckConstraint("field_behavioral_readiness_score BETWEEN 1 AND 5", name="ck_eng_behavioral_readiness"),
        Index("idx_engagements_physician", "physician_id"),
        Index("idx_engagements_type", "engagement_type"),
        Index("idx_engagements_date", "engagement_date"),
    )
