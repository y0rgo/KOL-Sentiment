import uuid
from datetime import datetime, date
from sqlalchemy import String, Integer, Boolean, Text, Numeric, Date, Index
from sqlalchemy.dialects.postgresql import UUID, TIMESTAMP
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class Physician(Base):
    __tablename__ = "physicians"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    npi: Mapped[str | None] = mapped_column(String(10), unique=True, nullable=True)
    first_name: Mapped[str] = mapped_column(String(100), nullable=False)
    last_name: Mapped[str] = mapped_column(String(100), nullable=False)
    credentials: Mapped[str | None] = mapped_column(String(50))
    specialty: Mapped[str | None] = mapped_column(String(100))
    subspecialty: Mapped[str | None] = mapped_column(String(100))
    practice_type: Mapped[str | None] = mapped_column(String(50))
    institution_name: Mapped[str | None] = mapped_column(String(200))
    institution_type: Mapped[str | None] = mapped_column(String(50))
    city: Mapped[str | None] = mapped_column(String(100))
    state: Mapped[str | None] = mapped_column(String(2))
    region: Mapped[str | None] = mapped_column(String(50))
    country: Mapped[str | None] = mapped_column(String(50), default="US")
    years_in_practice: Mapped[int | None] = mapped_column(Integer)
    fellowship_training: Mapped[str | None] = mapped_column(Text)
    institutional_role: Mapped[str | None] = mapped_column(String(100))

    # Record Status (Layer 1)
    record_status: Mapped[str] = mapped_column(String(20), nullable=False, default="imported")
    status_changed_at: Mapped[datetime | None] = mapped_column(TIMESTAMP(timezone=True), default=datetime.utcnow)
    status_changed_by: Mapped[str | None] = mapped_column(String(100))
    decline_reason: Mapped[str | None] = mapped_column(Text)

    # Source Tracking (Layer 1)
    source_channel: Mapped[str] = mapped_column(String(30), nullable=False, default="import")
    source_detail: Mapped[str | None] = mapped_column(Text)
    original_import_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True))

    # Completeness (Layer 1)
    completeness_score: Mapped[float | None] = mapped_column(Numeric(5, 2), default=0)
    last_validated_date: Mapped[date | None] = mapped_column(Date)
    validated_by: Mapped[str | None] = mapped_column(String(100))

    # Tier & Classification (Layer 2)
    tier: Mapped[str | None] = mapped_column(String(30))
    tier_score: Mapped[float | None] = mapped_column(Numeric(5, 2))
    tier_last_assessed: Mapped[datetime | None] = mapped_column(TIMESTAMP(timezone=True))

    # Priority (Layer 3)
    priority_score: Mapped[float | None] = mapped_column(Numeric(5, 2))
    priority_rank: Mapped[int | None] = mapped_column(Integer)
    priority_last_computed: Mapped[datetime | None] = mapped_column(TIMESTAMP(timezone=True))

    # Metadata
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    notes: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)

    __table_args__ = (
        Index("idx_physicians_npi", "npi"),
        Index("idx_physicians_status", "record_status"),
        Index("idx_physicians_state", "state"),
        Index("idx_physicians_tier", "tier"),
        Index("idx_physicians_source", "source_channel"),
        Index("idx_physicians_priority", "priority_rank"),
    )
