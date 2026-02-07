import uuid
from datetime import date, datetime
from typing import Optional

from sqlalchemy import String, Text, Date, Numeric, ForeignKey, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID, TIMESTAMP, ARRAY
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Publication(Base):
    __tablename__ = "publications"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    pmid: Mapped[Optional[str]] = mapped_column(String(20), unique=True)
    title: Mapped[str] = mapped_column(Text, nullable=False)
    journal: Mapped[Optional[str]] = mapped_column(String(200))
    publication_date: Mapped[Optional[date]] = mapped_column(Date)
    impact_factor: Mapped[Optional[float]] = mapped_column(Numeric(5, 2))
    publication_type: Mapped[Optional[str]] = mapped_column(String(50))
    diseases: Mapped[Optional[list[str]]] = mapped_column(ARRAY(Text))
    products_mentioned: Mapped[Optional[list[str]]] = mapped_column(ARRAY(Text))
    sentiment_toward_product: Mapped[Optional[str]] = mapped_column(String(20))
    abstract: Mapped[Optional[str]] = mapped_column(Text)
    doi: Mapped[Optional[str]] = mapped_column(String(100))
    ingested_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), default=datetime.utcnow)

    authors = relationship("PublicationAuthor", back_populates="publication")


class PublicationAuthor(Base):
    __tablename__ = "publication_authors"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    publication_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("publications.id"))
    physician_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("physicians.id"))
    author_position: Mapped[Optional[str]] = mapped_column(String(20))

    publication = relationship("Publication", back_populates="authors")
    physician = relationship("Physician", back_populates="publication_authorships")

    __table_args__ = (
        UniqueConstraint("publication_id", "physician_id", name="uq_pub_author"),
    )
