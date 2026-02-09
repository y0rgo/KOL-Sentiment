"""Create all tables

Revision ID: 001
Revises:
Create Date: 2026-02-09

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID, JSONB, ARRAY, TIMESTAMP

revision: str = "001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # physicians
    op.create_table(
        "physicians",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("npi", sa.String(10), unique=True, nullable=True),
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
        sa.Column("country", sa.String(50), server_default="US"),
        sa.Column("years_in_practice", sa.Integer),
        sa.Column("fellowship_training", sa.Text),
        sa.Column("institutional_role", sa.String(100)),
        sa.Column("record_status", sa.String(20), nullable=False, server_default="imported"),
        sa.Column("status_changed_at", TIMESTAMP(timezone=True), server_default=sa.text("NOW()")),
        sa.Column("status_changed_by", sa.String(100)),
        sa.Column("decline_reason", sa.Text),
        sa.Column("source_channel", sa.String(30), nullable=False, server_default="import"),
        sa.Column("source_detail", sa.Text),
        sa.Column("original_import_id", UUID(as_uuid=True)),
        sa.Column("completeness_score", sa.Numeric(5, 2), server_default="0"),
        sa.Column("last_validated_date", sa.Date),
        sa.Column("validated_by", sa.String(100)),
        sa.Column("tier", sa.String(30)),
        sa.Column("tier_score", sa.Numeric(5, 2)),
        sa.Column("tier_last_assessed", TIMESTAMP(timezone=True)),
        sa.Column("priority_score", sa.Numeric(5, 2)),
        sa.Column("priority_rank", sa.Integer),
        sa.Column("priority_last_computed", TIMESTAMP(timezone=True)),
        sa.Column("is_active", sa.Boolean, server_default="true"),
        sa.Column("notes", sa.Text),
        sa.Column("created_at", TIMESTAMP(timezone=True), server_default=sa.text("NOW()")),
        sa.Column("updated_at", TIMESTAMP(timezone=True), server_default=sa.text("NOW()")),
    )
    op.create_index("idx_physicians_npi", "physicians", ["npi"])
    op.create_index("idx_physicians_status", "physicians", ["record_status"])
    op.create_index("idx_physicians_state", "physicians", ["state"])
    op.create_index("idx_physicians_tier", "physicians", ["tier"])
    op.create_index("idx_physicians_source", "physicians", ["source_channel"])
    op.create_index("idx_physicians_priority", "physicians", ["priority_rank"])

    # import_batches
    op.create_table(
        "import_batches",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("filename", sa.String(200), nullable=False),
        sa.Column("uploaded_by", sa.String(100), nullable=False),
        sa.Column("team", sa.String(50)),
        sa.Column("description", sa.Text),
        sa.Column("total_rows", sa.Integer, server_default="0"),
        sa.Column("new_records", sa.Integer, server_default="0"),
        sa.Column("updated_records", sa.Integer, server_default="0"),
        sa.Column("duplicate_records", sa.Integer, server_default="0"),
        sa.Column("error_records", sa.Integer, server_default="0"),
        sa.Column("status", sa.String(20), server_default="processing"),
        sa.Column("created_at", TIMESTAMP(timezone=True), server_default=sa.text("NOW()")),
        sa.Column("completed_at", TIMESTAMP(timezone=True)),
    )

    # import_conflicts
    op.create_table(
        "import_conflicts",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("import_batch_id", UUID(as_uuid=True), sa.ForeignKey("import_batches.id")),
        sa.Column("physician_id", UUID(as_uuid=True), sa.ForeignKey("physicians.id")),
        sa.Column("conflict_type", sa.String(30), nullable=False),
        sa.Column("field_name", sa.String(50)),
        sa.Column("existing_value", sa.Text),
        sa.Column("incoming_value", sa.Text),
        sa.Column("resolution", sa.String(20), server_default="pending"),
        sa.Column("resolved_by", sa.String(100)),
        sa.Column("resolved_at", TIMESTAMP(timezone=True)),
        sa.Column("created_at", TIMESTAMP(timezone=True), server_default=sa.text("NOW()")),
    )
    op.create_index("idx_conflicts_batch", "import_conflicts", ["import_batch_id"])
    op.create_index("idx_conflicts_resolution", "import_conflicts", ["resolution"])

    # discovery_runs
    op.create_table(
        "discovery_runs",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("discovery_type", sa.String(30), nullable=False),
        sa.Column("parameters", JSONB),
        sa.Column("status", sa.String(20), server_default="running"),
        sa.Column("total_candidates", sa.Integer),
        sa.Column("promoted_count", sa.Integer, server_default="0"),
        sa.Column("declined_count", sa.Integer, server_default="0"),
        sa.Column("pending_count", sa.Integer, server_default="0"),
        sa.Column("run_by", sa.String(100)),
        sa.Column("created_at", TIMESTAMP(timezone=True), server_default=sa.text("NOW()")),
        sa.Column("completed_at", TIMESTAMP(timezone=True)),
    )

    # discovery_candidates
    op.create_table(
        "discovery_candidates",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("discovery_run_id", UUID(as_uuid=True), sa.ForeignKey("discovery_runs.id")),
        sa.Column("npi", sa.String(10)),
        sa.Column("first_name", sa.String(100)),
        sa.Column("last_name", sa.String(100)),
        sa.Column("credentials", sa.String(50)),
        sa.Column("specialty", sa.String(100)),
        sa.Column("institution_name", sa.String(200)),
        sa.Column("city", sa.String(100)),
        sa.Column("state", sa.String(2)),
        sa.Column("evidence_summary", sa.Text, nullable=False),
        sa.Column("evidence_data", JSONB),
        sa.Column("discovery_score", sa.Numeric(5, 2)),
        sa.Column("matched_physician_id", UUID(as_uuid=True), sa.ForeignKey("physicians.id")),
        sa.Column("review_status", sa.String(20), server_default="pending"),
        sa.Column("reviewed_by", sa.String(100)),
        sa.Column("reviewed_at", TIMESTAMP(timezone=True)),
        sa.Column("review_notes", sa.Text),
        sa.Column("created_at", TIMESTAMP(timezone=True), server_default=sa.text("NOW()")),
    )
    op.create_index("idx_candidates_run", "discovery_candidates", ["discovery_run_id"])
    op.create_index("idx_candidates_status", "discovery_candidates", ["review_status"])

    # field_nominations
    op.create_table(
        "field_nominations",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("npi", sa.String(10)),
        sa.Column("first_name", sa.String(100), nullable=False),
        sa.Column("last_name", sa.String(100), nullable=False),
        sa.Column("credentials", sa.String(50)),
        sa.Column("specialty", sa.String(100)),
        sa.Column("institution_name", sa.String(200)),
        sa.Column("city", sa.String(100)),
        sa.Column("state", sa.String(2)),
        sa.Column("nominated_by", sa.String(100), nullable=False),
        sa.Column("nominator_role", sa.String(50)),
        sa.Column("disease_context", sa.String(100)),
        sa.Column("rationale", sa.Text, nullable=False),
        sa.Column("observed_influence", sa.Text),
        sa.Column("matched_physician_id", UUID(as_uuid=True), sa.ForeignKey("physicians.id")),
        sa.Column("review_status", sa.String(20), server_default="pending"),
        sa.Column("reviewed_by", sa.String(100)),
        sa.Column("reviewed_at", TIMESTAMP(timezone=True)),
        sa.Column("review_notes", sa.Text),
        sa.Column("created_at", TIMESTAMP(timezone=True), server_default=sa.text("NOW()")),
    )
    op.create_index("idx_nominations_status", "field_nominations", ["review_status"])

    # diseases
    op.create_table(
        "diseases",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("icd10_codes", ARRAY(sa.String)),
        sa.Column("therapeutic_area", sa.String(100)),
        sa.Column("is_active", sa.Boolean, server_default="true"),
    )

    # products
    op.create_table(
        "products",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("brand_name", sa.String(100)),
        sa.Column("generic_name", sa.String(200)),
        sa.Column("mechanism", sa.String(100)),
        sa.Column("formulation", sa.String(50)),
        sa.Column("manufacturer", sa.String(100)),
        sa.Column("is_own_product", sa.Boolean, server_default="true"),
        sa.Column("is_active", sa.Boolean, server_default="true"),
    )

    # prescribing_data
    op.create_table(
        "prescribing_data",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("physician_id", UUID(as_uuid=True), sa.ForeignKey("physicians.id")),
        sa.Column("product_id", UUID(as_uuid=True), sa.ForeignKey("products.id")),
        sa.Column("disease_id", UUID(as_uuid=True), sa.ForeignKey("diseases.id")),
        sa.Column("period_start", sa.Date, nullable=False),
        sa.Column("period_end", sa.Date, nullable=False),
        sa.Column("total_patients", sa.Integer),
        sa.Column("new_starts", sa.Integer),
        sa.Column("formulation", sa.String(50)),
        sa.Column("line_of_therapy", sa.String(50)),
        sa.Column("pa_submissions", sa.Integer),
        sa.Column("pa_approvals", sa.Integer),
        sa.Column("data_source", sa.String(50)),
        sa.Column("ingested_at", TIMESTAMP(timezone=True), server_default=sa.text("NOW()")),
    )
    op.create_index("idx_prescribing_physician", "prescribing_data", ["physician_id"])
    op.create_index("idx_prescribing_period", "prescribing_data", ["period_start"])

    # sentiment_scores
    op.create_table(
        "sentiment_scores",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("physician_id", UUID(as_uuid=True), sa.ForeignKey("physicians.id")),
        sa.Column("disease_id", UUID(as_uuid=True), sa.ForeignKey("diseases.id")),
        sa.Column("assessment_date", sa.Date, nullable=False),
        sa.Column("disease_belief_score", sa.SmallInteger),
        sa.Column("product_perception_score", sa.SmallInteger),
        sa.Column("behavioral_readiness_score", sa.SmallInteger),
        sa.Column("composite_score", sa.SmallInteger),
        sa.Column("conversion_stage", sa.String(30)),
        sa.Column("score_type", sa.String(20)),
        sa.Column("confidence_level", sa.String(20)),
        sa.Column("scored_by", sa.String(100)),
        sa.Column("notes", sa.Text),
        sa.Column("created_at", TIMESTAMP(timezone=True), server_default=sa.text("NOW()")),
        sa.CheckConstraint("disease_belief_score BETWEEN 1 AND 5", name="ck_disease_belief"),
        sa.CheckConstraint("product_perception_score BETWEEN 1 AND 5", name="ck_product_perception"),
        sa.CheckConstraint("behavioral_readiness_score BETWEEN 1 AND 5", name="ck_behavioral_readiness"),
    )
    op.create_index("idx_sentiment_physician", "sentiment_scores", ["physician_id"])
    op.create_index("idx_sentiment_stage", "sentiment_scores", ["conversion_stage"])

    # sentiment_barriers
    op.create_table(
        "sentiment_barriers",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("sentiment_score_id", UUID(as_uuid=True), sa.ForeignKey("sentiment_scores.id")),
        sa.Column("physician_id", UUID(as_uuid=True), sa.ForeignKey("physicians.id")),
        sa.Column("barrier_type", sa.String(50), nullable=False),
        sa.Column("severity", sa.String(20)),
        sa.Column("source", sa.String(50)),
        sa.Column("detail", sa.Text),
        sa.Column("created_at", TIMESTAMP(timezone=True), server_default=sa.text("NOW()")),
    )

    # publications
    op.create_table(
        "publications",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("pmid", sa.String(20), unique=True),
        sa.Column("title", sa.Text, nullable=False),
        sa.Column("journal", sa.String(200)),
        sa.Column("publication_date", sa.Date),
        sa.Column("impact_factor", sa.Numeric(5, 2)),
        sa.Column("publication_type", sa.String(50)),
        sa.Column("diseases", ARRAY(sa.String)),
        sa.Column("products_mentioned", ARRAY(sa.String)),
        sa.Column("sentiment_toward_product", sa.String(20)),
        sa.Column("abstract", sa.Text),
        sa.Column("doi", sa.String(100)),
        sa.Column("ingested_at", TIMESTAMP(timezone=True), server_default=sa.text("NOW()")),
    )

    # publication_authors
    op.create_table(
        "publication_authors",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("publication_id", UUID(as_uuid=True), sa.ForeignKey("publications.id")),
        sa.Column("physician_id", UUID(as_uuid=True), sa.ForeignKey("physicians.id")),
        sa.Column("author_position", sa.String(20)),
        sa.UniqueConstraint("publication_id", "physician_id", name="uq_pub_author"),
    )

    # congress_activity
    op.create_table(
        "congress_activity",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("physician_id", UUID(as_uuid=True), sa.ForeignKey("physicians.id")),
        sa.Column("congress_name", sa.String(200)),
        sa.Column("congress_date", sa.Date),
        sa.Column("activity_type", sa.String(50)),
        sa.Column("title", sa.Text),
        sa.Column("diseases", ARRAY(sa.String)),
        sa.Column("products_mentioned", ARRAY(sa.String)),
        sa.Column("sentiment_toward_product", sa.String(20)),
        sa.Column("ingested_at", TIMESTAMP(timezone=True), server_default=sa.text("NOW()")),
    )

    # clinical_trials
    op.create_table(
        "clinical_trials",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("nct_id", sa.String(20), unique=True),
        sa.Column("trial_name", sa.String(200)),
        sa.Column("sponsor", sa.String(200)),
        sa.Column("phase", sa.String(20)),
        sa.Column("diseases", ARRAY(sa.String)),
        sa.Column("products", ARRAY(sa.String)),
        sa.Column("status", sa.String(50)),
        sa.Column("ingested_at", TIMESTAMP(timezone=True), server_default=sa.text("NOW()")),
    )

    # trial_investigators
    op.create_table(
        "trial_investigators",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("trial_id", UUID(as_uuid=True), sa.ForeignKey("clinical_trials.id")),
        sa.Column("physician_id", UUID(as_uuid=True), sa.ForeignKey("physicians.id")),
        sa.Column("role", sa.String(50)),
        sa.Column("site_name", sa.String(200)),
        sa.UniqueConstraint("trial_id", "physician_id", name="uq_trial_investigator"),
    )

    # referral_relationships
    op.create_table(
        "referral_relationships",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("referring_physician_id", UUID(as_uuid=True), sa.ForeignKey("physicians.id")),
        sa.Column("receiving_physician_id", UUID(as_uuid=True), sa.ForeignKey("physicians.id")),
        sa.Column("disease_id", UUID(as_uuid=True), sa.ForeignKey("diseases.id")),
        sa.Column("referral_volume", sa.Integer),
        sa.Column("period_start", sa.Date),
        sa.Column("period_end", sa.Date),
        sa.Column("data_source", sa.String(50)),
        sa.UniqueConstraint(
            "referring_physician_id", "receiving_physician_id", "disease_id", "period_start",
            name="uq_referral"
        ),
    )

    # engagements
    op.create_table(
        "engagements",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("physician_id", UUID(as_uuid=True), sa.ForeignKey("physicians.id")),
        sa.Column("engagement_type", sa.String(50), nullable=False),
        sa.Column("engagement_date", sa.Date, nullable=False),
        sa.Column("channel", sa.String(50)),
        sa.Column("duration_minutes", sa.Integer),
        sa.Column("topic", sa.Text),
        sa.Column("disease_id", UUID(as_uuid=True), sa.ForeignKey("diseases.id")),
        sa.Column("field_disease_belief_score", sa.SmallInteger),
        sa.Column("field_product_perception_score", sa.SmallInteger),
        sa.Column("field_behavioral_readiness_score", sa.SmallInteger),
        sa.Column("objections_tagged", ARRAY(sa.String)),
        sa.Column("field_notes", sa.Text),
        sa.Column("recorded_by", sa.String(100)),
        sa.Column("created_at", TIMESTAMP(timezone=True), server_default=sa.text("NOW()")),
        sa.CheckConstraint("field_disease_belief_score BETWEEN 1 AND 5", name="ck_eng_disease_belief"),
        sa.CheckConstraint("field_product_perception_score BETWEEN 1 AND 5", name="ck_eng_product_perception"),
        sa.CheckConstraint("field_behavioral_readiness_score BETWEEN 1 AND 5", name="ck_eng_behavioral_readiness"),
    )
    op.create_index("idx_engagements_physician", "engagements", ["physician_id"])
    op.create_index("idx_engagements_date", "engagements", ["engagement_date"])

    # competitive_affiliations
    op.create_table(
        "competitive_affiliations",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("physician_id", UUID(as_uuid=True), sa.ForeignKey("physicians.id")),
        sa.Column("company", sa.String(100)),
        sa.Column("affiliation_type", sa.String(50)),
        sa.Column("product_name", sa.String(100)),
        sa.Column("year", sa.Integer),
        sa.Column("payment_amount", sa.Numeric(10, 2)),
        sa.Column("data_source", sa.String(50)),
        sa.Column("ingested_at", TIMESTAMP(timezone=True), server_default=sa.text("NOW()")),
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
    op.drop_table("field_nominations")
    op.drop_table("discovery_candidates")
    op.drop_table("discovery_runs")
    op.drop_table("import_conflicts")
    op.drop_table("import_batches")
    op.drop_table("physicians")
