"""Add discovered_authors staging table for physician-centric discovery.

Captures every author/investigator name from article and trial sources,
even before physician matching, enabling organic KOL discovery.

Revision ID: 009
Revises: 008
Create Date: 2026-02-25

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID


revision: str = "009"
down_revision: Union[str, None] = "008"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "discovered_authors",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("first_name", sa.String(100), nullable=False),
        sa.Column("last_name", sa.String(100), nullable=False),
        sa.Column("first_name_norm", sa.String(100), nullable=False),
        sa.Column("last_name_norm", sa.String(100), nullable=False),
        sa.Column("source_type", sa.String(30), nullable=False),
        sa.Column("source_identifier", sa.String(100), nullable=False),
        sa.Column("role", sa.String(30), nullable=True),
        sa.Column("journal_name", sa.String(200), nullable=True),
        sa.Column("publication_id", UUID(as_uuid=True), sa.ForeignKey("publications.id"), nullable=True),
        sa.Column("trial_id", UUID(as_uuid=True), sa.ForeignKey("clinical_trials.id"), nullable=True),
        sa.Column("physician_id", UUID(as_uuid=True), sa.ForeignKey("physicians.id"), nullable=True),
        sa.Column("discovered_at", sa.TIMESTAMP, server_default=sa.text("now()"), nullable=False),
        sa.UniqueConstraint(
            "first_name_norm", "last_name_norm", "source_type", "source_identifier",
            name="uq_discovered_author_source",
        ),
    )

    # Index for discovery aggregation queries
    op.create_index(
        "ix_discovered_authors_name_norm",
        "discovered_authors",
        ["first_name_norm", "last_name_norm"],
    )
    op.create_index(
        "ix_discovered_authors_physician_id",
        "discovered_authors",
        ["physician_id"],
    )


def downgrade() -> None:
    op.drop_index("ix_discovered_authors_physician_id", table_name="discovered_authors")
    op.drop_index("ix_discovered_authors_name_norm", table_name="discovered_authors")
    op.drop_table("discovered_authors")
