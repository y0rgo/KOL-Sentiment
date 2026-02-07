import uuid
from datetime import date
from typing import Optional

from sqlalchemy import String, Integer, Date, ForeignKey, UniqueConstraint, Index
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class ReferralRelationship(Base):
    __tablename__ = "referral_relationships"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    referring_physician_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("physicians.id"))
    receiving_physician_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("physicians.id"))
    disease_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("diseases.id"), nullable=True)
    referral_volume: Mapped[Optional[int]] = mapped_column(Integer)
    period_start: Mapped[Optional[date]] = mapped_column(Date)
    period_end: Mapped[Optional[date]] = mapped_column(Date)
    data_source: Mapped[Optional[str]] = mapped_column(String(50))

    __table_args__ = (
        UniqueConstraint("referring_physician_id", "receiving_physician_id", "disease_id", "period_start", name="uq_referral"),
        Index("idx_referral_receiving", "receiving_physician_id"),
    )
