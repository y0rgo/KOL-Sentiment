"""Initial schema - all core tables

Revision ID: 001
Revises:
Create Date: 2026-02-07

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Physicians
    op.create_table(
        "physicians",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("npi", sa.String(10), unique=True, nullable=False),
        sa.Column("first_name", sa.String(100), nullable=False),
        sa.Column("last_name", sa.String(100), nullable=False),
        sa.Column("credentials", sa.String(50)),
        sa.Column("specialty", sa.String(100)),
        sa.Column("subspecialty", sa.String(100)),
        sa.Column("practice_type", sa.String(50)),
        sa.Column("institution_name", sa.String(200)),
        sa.Column("institution_type", sa.String(50)),
        sa.Column("city", sa.String(100)),
        sa.Column("state", sa.String(2)),
        sa.Column("region", sa.String(50)),
        sa.Column("years_in_practice", sa.Integer),
        sa.Column("fellowship_training", sa.Text),
        sa.Column("institutional_role", sa.String(100)),
        sa.Column("tier", sa.String(30)),
        sa.Column("tier_score", sa.Numeric(5, 2)),
        sa.Column("tier_last_assessed", sa.TIMESTAMP(timezone=True)),
        sa.Column("source", sa.String(50)),
        sa.Column("is_active", sa.Boolean, server_default=sa.text("true")),
        sa.Column("notes", sa.Text),
        sa.Column("created_at", sa.TIMESTAMP(timezone=True), server_default=sa.text("now()")),
        sa.Column("updated_at", sa.TIMESTAMP(timezone=True), server_default=sa.text("now()")),
    )
    op.create_index("idx_physicians_npi", "physicians", ["npi"])
    op.create_index("idx_physicians_state", "physicians", ["state"])
    op.create_index("idx_physicians_tier", "physicians", ["tier"])
    op.create_index("idx_physicians_specialty", "physicians", ["specialty"])

    # Diseases
    op.create_table(
        "diseases",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("icd10_codes", postgresql.ARRAY(sa.Text)),
        sa.Column("therapeutic_area", sa.String(100)),
        sa.Column("is_active", sa.Boolean, server_default=sa.text("true")),
    )

    # Products
    op.create_table(
        "products",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("brand_name", sa.String(100)),
        sa.Column("generic_name", sa.String(200)),
        sa.Column("mechanism", sa.String(100)),
        sa.Column("formulation", sa.String(50)),
        sa.Column("manufacturer", sa.String(100)),
        sa.Column("is_own_product", sa.Boolean, server_default=sa.text("true")),
        sa.Column("is_active", sa.Boolean, server_default=sa.text("true")),
    )

    # Prescribing Data
    op.create_table(
        "prescribing_data",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("physician_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("physicians.id")),
        sa.Column("product_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("products.id")),
        sa.Column("disease_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("diseases.id")),
        sa.Column("period_start", sa.Date, nullable=False),
        sa.Column("period_end", sa.Date, nullable=False),
        sa.Column("total_patients", sa.Integer),
        sa.Column("new_starts", sa.Integer),
        sa.Column("formulation", sa.String(50)),
        sa.Column("line_of_therapy", sa.String(50)),
        sa.Column("pa_submissions", sa.Integer),
        sa.Column("pa_approvals", sa.Integer),
        sa.Column("data_source", sa.String(50)),
        sa.Column("ingested_at", sa.TIMESTAMP(timezone=True), server_default=sa.text("now()")),
    )
    op.create_index("idx_prescribing_physician", "prescribing_data", ["physician_id"])
    op.create_index("idx_prescribing_period", "prescribing_data", ["period_start"])

    # Sentiment Scores
    op.create_table(
        "sentiment_scores",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("physician_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("physicians.id")),
        sa.Column("disease_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("diseases.id"), nullable=True),
        sa.Column("assessment_date", sa.Date, nullable=False),
        sa.Column("disease_belief_score", sa.SmallInteger),
        sa.Column("product_perception_score", sa.SmallInteger),
        sa.Column("behavioral_readiness_score", sa.SmallInteger),
        sa.Column("composite_score", sa.SmallInteger, sa.Computed("disease_belief_score + product_perception_score + behavioral_readiness_score")),
        sa.Column("conversion_stage", sa.String(30)),
        sa.Column("score_type", sa.String(20)),
        sa.Column("confidence_level", sa.String(20)),
        sa.Column("scored_by", sa.String(100)),
        sa.Column("notes", sa.Text),
        sa.Column("created_at", sa.TIMESTAMP(timezone=True), server_default=sa.text("now()")),
        sa.CheckConstraint("disease_belief_score BETWEEN 1 AND 5", name="ck_disease_belief_range"),
        sa.CheckConstraint("product_perception_score BETWEEN 1 AND 5", name="ck_product_perception_range"),
        sa.CheckConstraint("behavioral_readiness_score BETWEEN 1 AND 5", name="ck_behavioral_readiness_range"),
    )
    op.create_index("idx_sentiment_physician", "sentiment_scores", ["physician_id"])
    op.create_index("idx_sentiment_date", "sentiment_scores", ["assessment_date"])
    op.create_index("idx_sentiment_stage", "sentiment_scores", ["conversion_stage"])

    # Sentiment Barriers
    op.create_table(
        "sentiment_barriers",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("sentiment_score_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("sentiment_scores.id"), nullable=True),
        sa.Column("physician_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("physicians.id")),
        sa.Column("barrier_type", sa.String(50), nullable=False),
        sa.Column("severity", sa.String(20)),
        sa.Column("source", sa.String(50)),
        sa.Column("detail", sa.Text),
        sa.Column("created_at", sa.TIMESTAMP(timezone=True), server_default=sa.text("now()")),
    )

    # Publications
    op.create_table(
        "publications",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("pmid", sa.String(20), unique=True),
        sa.Column("title", sa.Text, nullable=False),
        sa.Column("journal", sa.String(200)),
        sa.Column("publication_date", sa.Date),
        sa.Column("impact_factor", sa.Numeric(5, 2)),
        sa.Column("publication_type", sa.String(50)),
        sa.Column("diseases", postgresql.ARRAY(sa.Text)),
        sa.Column("products_mentioned", postgresql.ARRAY(sa.Text)),
        sa.Column("sentiment_toward_product", sa.String(20)),
        sa.Column("abstract", sa.Text),
        sa.Column("doi", sa.String(100)),
        sa.Column("ingested_at", sa.TIMESTAMP(timezone=True), server_default=sa.text("now()")),
    )

    # Publication Authors
    op.create_table(
        "publication_authors",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("publication_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("publications.id")),
        sa.Column("physician_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("physicians.id")),
        sa.Column("author_position", sa.String(20)),
        sa.UniqueConstraint("publication_id", "physician_id", name="uq_pub_author"),
    )

    # Congress Activity
    op.create_table(
        "congress_activity",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("physician_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("physicians.id")),
        sa.Column("congress_name", sa.String(200)),
        sa.Column("congress_date", sa.Date),
        sa.Column("activity_type", sa.String(50)),
        sa.Column("title", sa.Text),
        sa.Column("diseases", postgresql.ARRAY(sa.Text)),
        sa.Column("products_mentioned", postgresql.ARRAY(sa.Text)),
        sa.Column("sentiment_toward_product", sa.String(20)),
        sa.Column("ingested_at", sa.TIMESTAMP(timezone=True), server_default=sa.text("now()")),
    )

    # Clinical Trials
    op.create_table(
        "clinical_trials",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("nct_id", sa.String(20), unique=True),
        sa.Column("trial_name", sa.String(200)),
        sa.Column("sponsor", sa.String(200)),
        sa.Column("phase", sa.String(20)),
        sa.Column("diseases", postgresql.ARRAY(sa.Text)),
        sa.Column("products", postgresql.ARRAY(sa.Text)),
        sa.Column("status", sa.String(50)),
        sa.Column("ingested_at", sa.TIMESTAMP(timezone=True), server_default=sa.text("now()")),
    )

    # Trial Investigators
    op.create_table(
        "trial_investigators",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("trial_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("clinical_trials.id")),
        sa.Column("physician_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("physicians.id")),
        sa.Column("role", sa.String(50)),
        sa.Column("site_name", sa.String(200)),
        sa.UniqueConstraint("trial_id", "physician_id", name="uq_trial_investigator"),
    )

    # Referral Relationships
    op.create_table(
        "referral_relationships",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("referring_physician_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("physicians.id")),
        sa.Column("receiving_physician_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("physicians.id")),
        sa.Column("disease_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("diseases.id"), nullable=True),
        sa.Column("referral_volume", sa.Integer),
        sa.Column("period_start", sa.Date),
        sa.Column("period_end", sa.Date),
        sa.Column("data_source", sa.String(50)),
        sa.UniqueConstraint("referring_physician_id", "receiving_physician_id", "disease_id", "period_start", name="uq_referral"),
    )
    op.create_index("idx_referral_receiving", "referral_relationships", ["receiving_physician_id"])

    # Engagements
    op.create_table(
        "engagements",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("physician_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("physicians.id")),
        sa.Column("engagement_type", sa.String(50), nullable=False),
        sa.Column("engagement_date", sa.Date, nullable=False),
        sa.Column("channel", sa.String(50)),
        sa.Column("duration_minutes", sa.Integer),
        sa.Column("topic", sa.Text),
        sa.Column("disease_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("diseases.id"), nullable=True),
        sa.Column("field_disease_belief_score", sa.SmallInteger),
        sa.Column("field_product_perception_score", sa.SmallInteger),
        sa.Column("field_behavioral_readiness_score", sa.SmallInteger),
        sa.Column("objections_tagged", postgresql.ARRAY(sa.Text)),
        sa.Column("field_notes", sa.Text),
        sa.Column("recorded_by", sa.String(100)),
        sa.Column("created_at", sa.TIMESTAMP(timezone=True), server_default=sa.text("now()")),
        sa.CheckConstraint("field_disease_belief_score BETWEEN 1 AND 5", name="ck_eng_disease_belief"),
        sa.CheckConstraint("field_product_perception_score BETWEEN 1 AND 5", name="ck_eng_product_perception"),
        sa.CheckConstraint("field_behavioral_readiness_score BETWEEN 1 AND 5", name="ck_eng_behavioral_readiness"),
    )
    op.create_index("idx_engagements_physician", "engagements", ["physician_id"])
    op.create_index("idx_engagements_type", "engagements", ["engagement_type"])
    op.create_index("idx_engagements_date", "engagements", ["engagement_date"])

    # Competitive Affiliations
    op.create_table(
        "competitive_affiliations",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("physician_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("physicians.id")),
        sa.Column("company", sa.String(100)),
        sa.Column("affiliation_type", sa.String(50)),
        sa.Column("product_name", sa.String(100)),
        sa.Column("year", sa.Integer),
        sa.Column("payment_amount", sa.Numeric(10, 2)),
        sa.Column("data_source", sa.String(50)),
        sa.Column("ingested_at", sa.TIMESTAMP(timezone=True), server_default=sa.text("now()")),
    )


def downgrade() -> None:
    op.drop_table("competitive_affiliations")
    op.drop_table("engagements")
    op.drop_table("referral_relationships")
    op.drop_table("trial_investigators")
    op.drop_table("clinical_trials")
    op.drop_table("congress_activity")
    op.drop_table("publication_authors")
    op.drop_table("publications")
    op.drop_table("sentiment_barriers")
    op.drop_table("sentiment_scores")
    op.drop_table("prescribing_data")
    op.drop_table("products")
    op.drop_table("diseases")
    op.drop_table("physicians")
