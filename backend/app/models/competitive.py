import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import String, Integer, Numeric, ForeignKey
from sqlalchemy.dialects.postgresql import UUID, TIMESTAMP
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class CompetitiveAffiliation(Base):
    __tablename__ = "competitive_affiliations"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    physician_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("physicians.id"))
    company: Mapped[Optional[str]] = mapped_column(String(100))
    affiliation_type: Mapped[Optional[str]] = mapped_column(String(50))
    product_name: Mapped[Optional[str]] = mapped_column(String(100))
    year: Mapped[Optional[int]] = mapped_column(Integer)
    payment_amount: Mapped[Optional[float]] = mapped_column(Numeric(10, 2))
    data_source: Mapped[Optional[str]] = mapped_column(String(50))
    ingested_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), default=datetime.utcnow)

    physician = relationship("Physician", back_populates="competitive_affiliations")
