"""Pydantic schemas for Import Batches and Import Conflicts."""

from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


# ---------------------------------------------------------------------------
# Import Batch
# ---------------------------------------------------------------------------

class ImportBatchResponse(BaseModel):
    """Representation of a completed (or in-progress) import batch."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    filename: str
    uploaded_by: str
    team: str | None = None
    description: str | None = None
    total_rows: int | None = 0
    new_records: int | None = 0
    updated_records: int | None = 0
    duplicate_records: int | None = 0
    error_records: int | None = 0
    status: str
    created_at: datetime
    completed_at: datetime | None = None


class ImportBatchListResponse(BaseModel):
    """Paginated list of import batches."""

    items: list[ImportBatchResponse]
    total: int
    page: int
    page_size: int
    pages: int


# ---------------------------------------------------------------------------
# Import Conflict
# ---------------------------------------------------------------------------

class ImportConflictResponse(BaseModel):
    """A single field-level conflict detected during import."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    import_batch_id: UUID
    physician_id: UUID
    conflict_type: str
    field_name: str | None = None
    existing_value: str | None = None
    incoming_value: str | None = None
    resolution: str | None = "pending"
    resolved_by: str | None = None
    resolved_at: datetime | None = None
    created_at: datetime


class ImportConflictListResponse(BaseModel):
    """Paginated list of import conflicts."""

    items: list[ImportConflictResponse]
    total: int
    page: int
    page_size: int
    pages: int


# ---------------------------------------------------------------------------
# Conflict resolution
# ---------------------------------------------------------------------------

class ConflictResolve(BaseModel):
    """Body for resolving a single import conflict."""

    resolution: str = Field(
        ...,
        max_length=20,
        description="One of: keep_existing, accept_incoming, manual",
    )
    resolved_by: str = Field(..., max_length=100)
    manual_value: str | None = Field(
        None,
        description="Required when resolution == 'manual'.",
    )


class BulkConflictResolve(BaseModel):
    """Resolve multiple conflicts in one request."""

    conflict_ids: list[UUID]
    resolution: str = Field(
        ...,
        max_length=20,
        description="One of: keep_existing, accept_incoming",
    )
    resolved_by: str = Field(..., max_length=100)
