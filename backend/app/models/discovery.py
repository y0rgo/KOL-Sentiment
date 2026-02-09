import uuid
from datetime import datetime
from sqlalchemy import String, Integer, Text, Numeric, ForeignKey, Index
from sqlalchemy.dialects.postgresql import UUID, TIMESTAMP, JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class DiscoveryRun(Base):
    __tablename__ = "discovery_runs"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    discovery_type: Mapped[str] = mapped_column(String(30), nullable=False)
    parameters: Mapped[dict | None] = mapped_column(JSONB)
    status: Mapped[str] = mapped_column(String(20), default="running")
    total_candidates: Mapped[int | None] = mapped_column(Integer)
    promoted_count: Mapped[int] = mapped_column(Integer, default=0)
    declined_count: Mapped[int] = mapped_column(Integer, default=0)
    pending_count: Mapped[int] = mapped_column(Integer, default=0)
    run_by: Mapped[str | None] = mapped_column(String(100))
    created_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), default=datetime.utcnow)
    completed_at: Mapped[datetime | None] = mapped_column(TIMESTAMP(timezone=True))


class DiscoveryCandidate(Base):
    __tablename__ = "discovery_candidates"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    discovery_run_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("discovery_runs.id"))
    npi: Mapped[str | None] = mapped_column(String(10))
    first_name: Mapped[str | None] = mapped_column(String(100))
    last_name: Mapped[str | None] = mapped_column(String(100))
    credentials: Mapped[str | None] = mapped_column(String(50))
    specialty: Mapped[str | None] = mapped_column(String(100))
    institution_name: Mapped[str | None] = mapped_column(String(200))
    city: Mapped[str | None] = mapped_column(String(100))
    state: Mapped[str | None] = mapped_column(String(2))
    evidence_summary: Mapped[str] = mapped_column(Text, nullable=False)
    evidence_data: Mapped[dict | None] = mapped_column(JSONB)
    discovery_score: Mapped[float | None] = mapped_column(Numeric(5, 2))
    matched_physician_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("physicians.id"))
    review_status: Mapped[str] = mapped_column(String(20), default="pending")
    reviewed_by: Mapped[str | None] = mapped_column(String(100))
    reviewed_at: Mapped[datetime | None] = mapped_column(TIMESTAMP(timezone=True))
    review_notes: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), default=datetime.utcnow)

    __table_args__ = (
        Index("idx_candidates_run", "discovery_run_id"),
        Index("idx_candidates_status", "review_status"),
    )
