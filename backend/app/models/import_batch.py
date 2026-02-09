import uuid
from datetime import datetime
from sqlalchemy import String, Integer, Text
from sqlalchemy.dialects.postgresql import UUID, TIMESTAMP
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class ImportBatch(Base):
    __tablename__ = "import_batches"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    filename: Mapped[str] = mapped_column(String(200), nullable=False)
    uploaded_by: Mapped[str] = mapped_column(String(100), nullable=False)
    team: Mapped[str | None] = mapped_column(String(50))
    description: Mapped[str | None] = mapped_column(Text)
    total_rows: Mapped[int | None] = mapped_column(Integer, default=0)
    new_records: Mapped[int | None] = mapped_column(Integer, default=0)
    updated_records: Mapped[int | None] = mapped_column(Integer, default=0)
    duplicate_records: Mapped[int | None] = mapped_column(Integer, default=0)
    error_records: Mapped[int | None] = mapped_column(Integer, default=0)
    status: Mapped[str] = mapped_column(String(20), default="processing")
    created_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), default=datetime.utcnow)
    completed_at: Mapped[datetime | None] = mapped_column(TIMESTAMP(timezone=True))
