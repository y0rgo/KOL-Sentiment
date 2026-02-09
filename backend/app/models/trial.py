import uuid
from datetime import datetime
from sqlalchemy import String, ForeignKey, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID, TIMESTAMP, ARRAY
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class ClinicalTrial(Base):
    __tablename__ = "clinical_trials"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    nct_id: Mapped[str | None] = mapped_column(String(20), unique=True)
    trial_name: Mapped[str | None] = mapped_column(String(200))
    sponsor: Mapped[str | None] = mapped_column(String(200))
    phase: Mapped[str | None] = mapped_column(String(20))
    diseases: Mapped[list[str] | None] = mapped_column(ARRAY(String))
    products: Mapped[list[str] | None] = mapped_column(ARRAY(String))
    status: Mapped[str | None] = mapped_column(String(50))
    ingested_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), default=datetime.utcnow)


class TrialInvestigator(Base):
    __tablename__ = "trial_investigators"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    trial_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("clinical_trials.id"))
    physician_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("physicians.id"))
    role: Mapped[str | None] = mapped_column(String(50))
    site_name: Mapped[str | None] = mapped_column(String(200))

    __table_args__ = (
        UniqueConstraint("trial_id", "physician_id", name="uq_trial_investigator"),
    )
