import uuid
from sqlalchemy import String, Boolean, Text
from sqlalchemy.dialects.postgresql import UUID, ARRAY
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class Disease(Base):
    __tablename__ = "diseases"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    icd10_codes: Mapped[list[str]] = mapped_column(ARRAY(Text), default=list)
    therapeutic_area: Mapped[str | None] = mapped_column(String(100))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)


class Product(Base):
    __tablename__ = "products"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    brand_name: Mapped[str | None] = mapped_column(String(100))
    generic_name: Mapped[str | None] = mapped_column(String(200))
    mechanism: Mapped[str | None] = mapped_column(String(100))
    formulation: Mapped[str | None] = mapped_column(String(50))
    manufacturer: Mapped[str | None] = mapped_column(String(100))
    is_own_product: Mapped[bool] = mapped_column(Boolean, default=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
