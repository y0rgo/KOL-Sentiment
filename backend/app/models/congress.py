import uuid
from datetime import datetime, date
from sqlalchemy import String, Date, Text, ForeignKey
from sqlalchemy.dialects.postgresql import UUID, TIMESTAMP, ARRAY
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class CongressActivity(Base):
    __tablename__ = "congress_activity"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    physician_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("physicians.id"))
    congress_name: Mapped[str | None] = mapped_column(String(200))
    congress_date: Mapped[date | None] = mapped_column(Date)
    activity_type: Mapped[str | None] = mapped_column(String(50))
    title: Mapped[str | None] = mapped_column(Text)
    diseases: Mapped[list[str] | None] = mapped_column(ARRAY(String))
    products_mentioned: Mapped[list[str] | None] = mapped_column(ARRAY(String))
    sentiment_toward_product: Mapped[str | None] = mapped_column(String(20))
    ingested_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), default=datetime.utcnow)
