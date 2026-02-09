import uuid
from datetime import datetime, date
from sqlalchemy import String, Numeric, Date, Text, ForeignKey, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID, TIMESTAMP, ARRAY
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class Publication(Base):
    __tablename__ = "publications"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    pmid: Mapped[str | None] = mapped_column(String(20), unique=True)
    title: Mapped[str] = mapped_column(Text, nullable=False)
    journal: Mapped[str | None] = mapped_column(String(200))
    publication_date: Mapped[date | None] = mapped_column(Date)
    impact_factor: Mapped[float | None] = mapped_column(Numeric(5, 2))
    publication_type: Mapped[str | None] = mapped_column(String(50))
    diseases: Mapped[list[str] | None] = mapped_column(ARRAY(String))
    products_mentioned: Mapped[list[str] | None] = mapped_column(ARRAY(String))
    sentiment_toward_product: Mapped[str | None] = mapped_column(String(20))
    abstract: Mapped[str | None] = mapped_column(Text)
    doi: Mapped[str | None] = mapped_column(String(100))
    ingested_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), default=datetime.utcnow)


class PublicationAuthor(Base):
    __tablename__ = "publication_authors"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    publication_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("publications.id"))
    physician_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("physicians.id"))
    author_position: Mapped[str | None] = mapped_column(String(20))

    __table_args__ = (
        UniqueConstraint("publication_id", "physician_id", name="uq_pub_author"),
    )
