import uuid
from datetime import date
from sqlalchemy import String, Integer, Date, ForeignKey, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class ReferralRelationship(Base):
    __tablename__ = "referral_relationships"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    referring_physician_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("physicians.id"))
    receiving_physician_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("physicians.id"))
    disease_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("diseases.id"))
    referral_volume: Mapped[int | None] = mapped_column(Integer)
    period_start: Mapped[date | None] = mapped_column(Date)
    period_end: Mapped[date | None] = mapped_column(Date)
    data_source: Mapped[str | None] = mapped_column(String(50))

    __table_args__ = (
        UniqueConstraint(
            "referring_physician_id", "receiving_physician_id", "disease_id", "period_start",
            name="uq_referral"
        ),
    )
