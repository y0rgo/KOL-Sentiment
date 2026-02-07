import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import String, Integer, Boolean, Text, Numeric, Index
from sqlalchemy.dialects.postgresql import UUID, TIMESTAMP
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Physician(Base):
    __tablename__ = "physicians"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    npi: Mapped[str] = mapped_column(String(10), unique=True, nullable=False)
    first_name: Mapped[str] = mapped_column(String(100), nullable=False)
    last_name: Mapped[str] = mapped_column(String(100), nullable=False)
    credentials: Mapped[Optional[str]] = mapped_column(String(50))
    specialty: Mapped[Optional[str]] = mapped_column(String(100))
    subspecialty: Mapped[Optional[str]] = mapped_column(String(100))
    practice_type: Mapped[Optional[str]] = mapped_column(String(50))
    institution_name: Mapped[Optional[str]] = mapped_column(String(200))
    institution_type: Mapped[Optional[str]] = mapped_column(String(50))
    city: Mapped[Optional[str]] = mapped_column(String(100))
    state: Mapped[Optional[str]] = mapped_column(String(2))
    region: Mapped[Optional[str]] = mapped_column(String(50))
    years_in_practice: Mapped[Optional[int]] = mapped_column(Integer)
    fellowship_training: Mapped[Optional[str]] = mapped_column(Text)
    institutional_role: Mapped[Optional[str]] = mapped_column(String(100))
    tier: Mapped[Optional[str]] = mapped_column(String(30))
    tier_score: Mapped[Optional[float]] = mapped_column(Numeric(5, 2))
    tier_last_assessed: Mapped[Optional[datetime]] = mapped_column(TIMESTAMP(timezone=True))
    source: Mapped[Optional[str]] = mapped_column(String(50))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    notes: Mapped[Optional[str]] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    sentiment_scores = relationship("SentimentScore", back_populates="physician")
    engagements = relationship("Engagement", back_populates="physician")
    prescribing_data = relationship("PrescribingData", back_populates="physician")
    publication_authorships = relationship("PublicationAuthor", back_populates="physician")
    congress_activities = relationship("CongressActivity", back_populates="physician")
    trial_investigations = relationship("TrialInvestigator", back_populates="physician")
    competitive_affiliations = relationship("CompetitiveAffiliation", back_populates="physician")

    __table_args__ = (
        Index("idx_physicians_npi", "npi"),
        Index("idx_physicians_state", "state"),
        Index("idx_physicians_tier", "tier"),
        Index("idx_physicians_specialty", "specialty"),
    )
