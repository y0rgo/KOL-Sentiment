"""Staging table for all authors/investigators discovered from publications and trials."""
import uuid
from datetime import datetime

from sqlalchemy import String, ForeignKey, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID, TIMESTAMP
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class DiscoveredAuthor(Base):
    __tablename__ = "discovered_authors"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    first_name: Mapped[str] = mapped_column(String(100), nullable=False)
    last_name: Mapped[str] = mapped_column(String(100), nullable=False)
    first_name_norm: Mapped[str] = mapped_column(String(100), nullable=False)
    last_name_norm: Mapped[str] = mapped_column(String(100), nullable=False)
    source_type: Mapped[str] = mapped_column(String(30), nullable=False)
    source_identifier: Mapped[str] = mapped_column(String(100), nullable=False)
    role: Mapped[str | None] = mapped_column(String(30), nullable=True)
    journal_name: Mapped[str | None] = mapped_column(String(200), nullable=True)
    publication_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("publications.id"), nullable=True
    )
    trial_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("clinical_trials.id"), nullable=True
    )
    physician_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("physicians.id"), nullable=True
    )
    discovered_at: Mapped[datetime] = mapped_column(TIMESTAMP, default=datetime.utcnow)

    __table_args__ = (
        UniqueConstraint(
            "first_name_norm", "last_name_norm", "source_type", "source_identifier",
            name="uq_discovered_author_source",
        ),
    )
