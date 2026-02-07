import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import String, Text, ForeignKey, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID, TIMESTAMP, ARRAY
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class ClinicalTrial(Base):
    __tablename__ = "clinical_trials"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    nct_id: Mapped[Optional[str]] = mapped_column(String(20), unique=True)
    trial_name: Mapped[Optional[str]] = mapped_column(String(200))
    sponsor: Mapped[Optional[str]] = mapped_column(String(200))
    phase: Mapped[Optional[str]] = mapped_column(String(20))
    diseases: Mapped[Optional[list[str]]] = mapped_column(ARRAY(Text))
    products: Mapped[Optional[list[str]]] = mapped_column(ARRAY(Text))
    status: Mapped[Optional[str]] = mapped_column(String(50))
    ingested_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), default=datetime.utcnow)

    investigators = relationship("TrialInvestigator", back_populates="trial")


class TrialInvestigator(Base):
    __tablename__ = "trial_investigators"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    trial_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("clinical_trials.id"))
    physician_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("physicians.id"))
    role: Mapped[Optional[str]] = mapped_column(String(50))
    site_name: Mapped[Optional[str]] = mapped_column(String(200))

    trial = relationship("ClinicalTrial", back_populates="investigators")
    physician = relationship("Physician", back_populates="trial_investigations")

    __table_args__ = (
        UniqueConstraint("trial_id", "physician_id", name="uq_trial_investigator"),
    )
