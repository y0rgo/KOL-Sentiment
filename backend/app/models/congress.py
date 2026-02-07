import uuid
from datetime import date, datetime
from typing import Optional

from sqlalchemy import String, Text, Date, ForeignKey
from sqlalchemy.dialects.postgresql import UUID, TIMESTAMP, ARRAY
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class CongressActivity(Base):
    __tablename__ = "congress_activity"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    physician_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("physicians.id"))
    congress_name: Mapped[Optional[str]] = mapped_column(String(200))
    congress_date: Mapped[Optional[date]] = mapped_column(Date)
    activity_type: Mapped[Optional[str]] = mapped_column(String(50))
    title: Mapped[Optional[str]] = mapped_column(Text)
    diseases: Mapped[Optional[list[str]]] = mapped_column(ARRAY(Text))
    products_mentioned: Mapped[Optional[list[str]]] = mapped_column(ARRAY(Text))
    sentiment_toward_product: Mapped[Optional[str]] = mapped_column(String(20))
    ingested_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), default=datetime.utcnow)

    physician = relationship("Physician", back_populates="congress_activities")
