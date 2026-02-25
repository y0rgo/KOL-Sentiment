"""Create data_sources, ingestion_runs, ingestion_logs, publication_access tables

Revision ID: 007
Revises: 006
Create Date: 2026-02-24

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID, JSONB, TIMESTAMP


revision: str = "007"
down_revision: Union[str, None] = "006"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # data_sources
    op.create_table(
        "data_sources",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("name", sa.String(50), nullable=False),
        sa.Column("display_name", sa.String(100), nullable=False),
        sa.Column("base_url", sa.String(300), nullable=False),
        sa.Column("api_key_required", sa.Boolean(), server_default=sa.text("false")),
        sa.Column("api_key_configured", sa.Boolean(), server_default=sa.text("false")),
        sa.Column("status", sa.String(20), server_default=sa.text("'untested'")),
        sa.Column("last_tested_at", TIMESTAMP(timezone=True), nullable=True),
        sa.Column("last_successful_at", TIMESTAMP(timezone=True), nullable=True),
        sa.Column("last_error_message", sa.Text(), nullable=True),
        sa.Column("rate_limit_info", JSONB, nullable=True),
        sa.Column("created_at", TIMESTAMP(timezone=True), server_default=sa.text("NOW()")),
        sa.UniqueConstraint("name", name="uq_data_source_name"),
    )

    # ingestion_runs
    op.create_table(
        "ingestion_runs",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("data_source_id", UUID(as_uuid=True), sa.ForeignKey("data_sources.id"), nullable=False),
        sa.Column("run_type", sa.String(20), nullable=False),
        sa.Column("parameters", JSONB, nullable=True),
        sa.Column("status", sa.String(20), server_default=sa.text("'pending'")),
        sa.Column("records_fetched", sa.Integer(), server_default=sa.text("0")),
        sa.Column("records_new", sa.Integer(), server_default=sa.text("0")),
        sa.Column("records_updated", sa.Integer(), server_default=sa.text("0")),
        sa.Column("records_errors", sa.Integer(), server_default=sa.text("0")),
        sa.Column("started_at", TIMESTAMP(timezone=True), nullable=True),
        sa.Column("completed_at", TIMESTAMP(timezone=True), nullable=True),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column("created_at", TIMESTAMP(timezone=True), server_default=sa.text("NOW()")),
        sa.CheckConstraint("run_type IN ('sample', 'full', 'incremental')", name="ck_run_type"),
        sa.CheckConstraint("status IN ('pending', 'running', 'completed', 'failed')", name="ck_run_status"),
    )
    op.create_index("idx_ingestion_runs_source", "ingestion_runs", ["data_source_id"])
    op.create_index("idx_ingestion_runs_status", "ingestion_runs", ["status"])

    # ingestion_logs
    op.create_table(
        "ingestion_logs",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("ingestion_run_id", UUID(as_uuid=True), sa.ForeignKey("ingestion_runs.id"), nullable=False),
        sa.Column("record_identifier", sa.String(100), nullable=True),
        sa.Column("action", sa.String(20), nullable=False),
        sa.Column("detail", JSONB, nullable=True),
        sa.Column("created_at", TIMESTAMP(timezone=True), server_default=sa.text("NOW()")),
        sa.CheckConstraint("action IN ('created', 'updated', 'skipped', 'error')", name="ck_log_action"),
    )
    op.create_index("idx_ingestion_logs_run", "ingestion_logs", ["ingestion_run_id"])

    # publication_access
    op.create_table(
        "publication_access",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("publication_id", UUID(as_uuid=True), sa.ForeignKey("publications.id"), nullable=False),
        sa.Column("doi", sa.String(100), nullable=True),
        sa.Column("is_open_access", sa.Boolean(), server_default=sa.text("false")),
        sa.Column("oa_status", sa.String(20), nullable=True),
        sa.Column("free_full_text_url", sa.Text(), nullable=True),
        sa.Column("pdf_url", sa.Text(), nullable=True),
        sa.Column("license", sa.String(100), nullable=True),
        sa.Column("publisher", sa.String(200), nullable=True),
        sa.Column("checked_at", TIMESTAMP(timezone=True), server_default=sa.text("NOW()")),
        sa.UniqueConstraint("publication_id", name="uq_publication_access_pub"),
    )
    op.create_index("idx_publication_access_doi", "publication_access", ["doi"])
    op.create_index("idx_publication_access_oa", "publication_access", ["is_open_access"])

    # Seed 6 data source rows
    op.execute("""
        INSERT INTO data_sources (id, name, display_name, base_url, api_key_required, api_key_configured, status, rate_limit_info) VALUES
            (gen_random_uuid(), 'pubmed', 'PubMed / MEDLINE', 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/', true, false, 'untested', '{"requests_per_second": 3, "note": "10/sec with API key"}'),
            (gen_random_uuid(), 'openalex', 'OpenAlex', 'https://api.openalex.org/', false, false, 'untested', '{"requests_per_second": 10, "note": "Polite pool with email"}'),
            (gen_random_uuid(), 'clinicaltrials_gov', 'ClinicalTrials.gov', 'https://clinicaltrials.gov/api/v2/', false, false, 'untested', '{"requests_per_second": 10}'),
            (gen_random_uuid(), 'open_payments', 'CMS Open Payments', 'https://openpaymentsdata.cms.gov/api/1/', false, false, 'untested', '{"requests_per_second": 5}'),
            (gen_random_uuid(), 'nppes', 'NPPES NPI Registry', 'https://npiregistry.cms.hhs.gov/api/', false, false, 'untested', '{"requests_per_second": 5}'),
            (gen_random_uuid(), 'unpaywall', 'Unpaywall', 'https://api.unpaywall.org/v2/', false, false, 'untested', '{"requests_per_second": 10, "note": "Requires email"}');
    """)


def downgrade() -> None:
    op.drop_table("publication_access")
    op.drop_table("ingestion_logs")
    op.drop_table("ingestion_runs")
    op.drop_table("data_sources")
