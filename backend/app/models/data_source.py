import uuid
from datetime import datetime
from sqlalchemy import String, Boolean, Text
from sqlalchemy.dialects.postgresql import UUID, TIMESTAMP, JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class DataSource(Base):
    __tablename__ = "data_sources"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    display_name: Mapped[str] = mapped_column(String(100), nullable=False)
    base_url: Mapped[str] = mapped_column(String(300), nullable=False)
    api_key_required: Mapped[bool] = mapped_column(Boolean, default=False)
    api_key_configured: Mapped[bool] = mapped_column(Boolean, default=False)
    status: Mapped[str] = mapped_column(String(20), default="untested")
    last_tested_at: Mapped[datetime | None] = mapped_column(TIMESTAMP(timezone=True))
    last_successful_at: Mapped[datetime | None] = mapped_column(TIMESTAMP(timezone=True))
    last_error_message: Mapped[str | None] = mapped_column(Text)
    rate_limit_info: Mapped[dict | None] = mapped_column(JSONB)
    created_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), default=datetime.utcnow)
