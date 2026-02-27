"""Re-normalize discovered_authors names with improved normalizer.

Applies the new normalize_name() logic (strip credentials, Unicode→ASCII,
lowercase, strip periods, collapse whitespace) to all existing rows.
Deduplicates collisions caused by re-normalization — keeps the row that
has a physician_id link (if any), otherwise the most recent.

Revision ID: 010
Revises: 009
Create Date: 2026-02-27

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

# Import the normalizer — available because alembic runs inside the app package
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))
from app.utils.name_normalizer import normalize_name


revision: str = "010"
down_revision: Union[str, None] = "009"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()

    # Fetch all rows
    rows = conn.execute(
        sa.text("SELECT id, first_name, last_name, first_name_norm, last_name_norm, "
                "source_type, source_identifier, physician_id, discovered_at "
                "FROM discovered_authors ORDER BY discovered_at")
    ).fetchall()

    if not rows:
        return

    # Re-normalize and detect collisions
    # Key = (new_first_norm, new_last_norm, source_type, source_identifier)
    seen: dict[tuple, dict] = {}
    to_update: list[dict] = []
    to_delete: list[str] = []

    for row in rows:
        row_id = str(row.id)
        new_first_norm = normalize_name(row.first_name)
        new_last_norm = normalize_name(row.last_name)
        key = (new_first_norm, new_last_norm, row.source_type, row.source_identifier)

        if key in seen:
            # Collision — decide which to keep
            existing = seen[key]
            # Prefer the one with a physician_id
            if row.physician_id and not existing["physician_id"]:
                # New row is better — delete the old one, keep new
                to_delete.append(existing["id"])
                seen[key] = {
                    "id": row_id,
                    "first_norm": new_first_norm,
                    "last_norm": new_last_norm,
                    "physician_id": row.physician_id,
                }
                to_update.append({
                    "id": row_id,
                    "first_norm": new_first_norm,
                    "last_norm": new_last_norm,
                })
            else:
                # Existing is fine — delete the new duplicate
                to_delete.append(row_id)
        else:
            seen[key] = {
                "id": row_id,
                "first_norm": new_first_norm,
                "last_norm": new_last_norm,
                "physician_id": row.physician_id,
            }
            # Only update if normalization actually changed
            if new_first_norm != row.first_name_norm or new_last_norm != row.last_name_norm:
                to_update.append({
                    "id": row_id,
                    "first_norm": new_first_norm,
                    "last_norm": new_last_norm,
                })

    # Delete duplicates first (before updating, to avoid constraint violations)
    if to_delete:
        for batch_start in range(0, len(to_delete), 500):
            batch = to_delete[batch_start:batch_start + 500]
            placeholders = ", ".join(f":id_{i}" for i in range(len(batch)))
            params = {f"id_{i}": uid for i, uid in enumerate(batch)}
            conn.execute(
                sa.text(f"DELETE FROM discovered_authors WHERE id IN ({placeholders})"),
                params,
            )

    # Batch update remaining rows
    if to_update:
        for item in to_update:
            conn.execute(
                sa.text(
                    "UPDATE discovered_authors "
                    "SET first_name_norm = :first_norm, last_name_norm = :last_norm "
                    "WHERE id = :id"
                ),
                {"id": item["id"], "first_norm": item["first_norm"], "last_norm": item["last_norm"]},
            )


def downgrade() -> None:
    # Revert to simple lower().strip() normalization
    conn = op.get_bind()
    conn.execute(
        sa.text(
            "UPDATE discovered_authors "
            "SET first_name_norm = LOWER(TRIM(first_name)), "
            "    last_name_norm = LOWER(TRIM(last_name))"
        )
    )
