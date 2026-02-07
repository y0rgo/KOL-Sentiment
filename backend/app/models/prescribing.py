import uuid
from datetime import date, datetime
from typing import Optional

from sqlalchemy import String, Integer, Date, ForeignKey, Index
from sqlalchemy.dialects.postgresql import UUID, TIMESTAMP
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class PrescribingData(Base):
    __tablename__ = "prescribing_data"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    physician_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("physicians.id"))
    product_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("products.id"))
    disease_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("diseases.id"))
    period_start: Mapped[date] = mapped_column(Date, nullable=False)
    period_end: Mapped[date] = mapped_column(Date, nullable=False)
    total_patients: Mapped[Optional[int]] = mapped_column(Integer)
    new_starts: Mapped[Optional[int]] = mapped_column(Integer)
    formulation: Mapped[Optional[str]] = mapped_column(String(50))
    line_of_therapy: Mapped[Optional[str]] = mapped_column(String(50))
    pa_submissions: Mapped[Optional[int]] = mapped_column(Integer)
    pa_approvals: Mapped[Optional[int]] = mapped_column(Integer)
    data_source: Mapped[Optional[str]] = mapped_column(String(50))
    ingested_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), default=datetime.utcnow)

    physician = relationship("Physician", back_populates="prescribing_data")

    __table_args__ = (
        Index("idx_prescribing_physician", "physician_id"),
        Index("idx_prescribing_period", "period_start"),
    )
