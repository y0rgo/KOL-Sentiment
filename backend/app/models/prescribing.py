import uuid
from datetime import datetime, date
from sqlalchemy import String, Integer, Numeric, Date, ForeignKey, Index
from sqlalchemy.dialects.postgresql import UUID, TIMESTAMP
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class PrescribingData(Base):
    __tablename__ = "prescribing_data"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    physician_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("physicians.id"))
    product_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("products.id"))
    disease_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("diseases.id"))
    period_start: Mapped[date] = mapped_column(Date, nullable=False)
    period_end: Mapped[date] = mapped_column(Date, nullable=False)
    total_patients: Mapped[int | None] = mapped_column(Integer)
    new_starts: Mapped[int | None] = mapped_column(Integer)
    formulation: Mapped[str | None] = mapped_column(String(50))
    line_of_therapy: Mapped[str | None] = mapped_column(String(50))
    pa_submissions: Mapped[int | None] = mapped_column(Integer)
    pa_approvals: Mapped[int | None] = mapped_column(Integer)
    data_source: Mapped[str | None] = mapped_column(String(50))
    ingested_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), default=datetime.utcnow)

    __table_args__ = (
        Index("idx_prescribing_physician", "physician_id"),
        Index("idx_prescribing_period", "period_start"),
    )
