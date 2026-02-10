"""Create priority_weights and priority_scores tables with default weights

Revision ID: 006
Revises: 005
Create Date: 2026-02-10

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

revision: str = "006"
down_revision: Union[str, None] = "005"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # --- priority_weights table ---
    op.create_table(
        "priority_weights",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("disease_id", UUID(as_uuid=True), sa.ForeignKey("diseases.id"), nullable=True),
        sa.Column("factor", sa.String(50), nullable=False),
        sa.Column("weight", sa.Numeric(5, 2), nullable=False),
        sa.Column("is_active", sa.Boolean(), server_default=sa.text("true")),
        sa.UniqueConstraint("disease_id", "factor", name="uq_priority_weight_disease_factor"),
    )

    # --- priority_scores table ---
    op.create_table(
        "priority_scores",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("physician_id", UUID(as_uuid=True), sa.ForeignKey("physicians.id"), unique=True, nullable=False),
        sa.Column("composite_score", sa.Numeric(5, 2), nullable=False),
        sa.Column("prescribing_opportunity", sa.Numeric(5, 2), nullable=False, server_default="0"),
        sa.Column("influence_leverage", sa.Numeric(5, 2), nullable=False, server_default="0"),
        sa.Column("sentiment_gap", sa.Numeric(5, 2), nullable=False, server_default="0"),
        sa.Column("engagement_deficit", sa.Numeric(5, 2), nullable=False, server_default="0"),
        sa.Column("competitive_urgency", sa.Numeric(5, 2), nullable=False, server_default="0"),
        sa.Column("completeness_gap", sa.Numeric(5, 2), nullable=False, server_default="0"),
        sa.Column("factors_scored", sa.Integer()),
        sa.Column("computed_at", sa.TIMESTAMP(timezone=True)),
        sa.Column("priority_rank", sa.Integer()),
    )

    # --- Seed default global priority weights ---
    op.execute("""
        INSERT INTO priority_weights (id, disease_id, factor, weight, is_active) VALUES
            (gen_random_uuid(), NULL, 'prescribing_opportunity', 25.0, true),
            (gen_random_uuid(), NULL, 'influence_leverage', 20.0, true),
            (gen_random_uuid(), NULL, 'sentiment_gap', 20.0, true),
            (gen_random_uuid(), NULL, 'engagement_deficit', 15.0, true),
            (gen_random_uuid(), NULL, 'competitive_urgency', 10.0, true),
            (gen_random_uuid(), NULL, 'completeness_gap', 10.0, true);
    """)


def downgrade() -> None:
    op.drop_table("priority_scores")
    op.drop_table("priority_weights")
