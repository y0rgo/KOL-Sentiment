import uuid
from datetime import datetime
from sqlalchemy import String, Boolean, Text, ForeignKey, Index
from sqlalchemy.dialects.postgresql import UUID, TIMESTAMP
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class PublicationAccess(Base):
    __tablename__ = "publication_access"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    publication_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("publications.id"), unique=True, nullable=False)
    doi: Mapped[str | None] = mapped_column(String(100))
    is_open_access: Mapped[bool] = mapped_column(Boolean, default=False)
    oa_status: Mapped[str | None] = mapped_column(String(20))
    free_full_text_url: Mapped[str | None] = mapped_column(Text)
    pdf_url: Mapped[str | None] = mapped_column(Text)
    license: Mapped[str | None] = mapped_column(String(100))
    publisher: Mapped[str | None] = mapped_column(String(200))
    checked_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), default=datetime.utcnow)

    __table_args__ = (
        Index("idx_publication_access_doi", "doi"),
        Index("idx_publication_access_oa", "is_open_access"),
    )
