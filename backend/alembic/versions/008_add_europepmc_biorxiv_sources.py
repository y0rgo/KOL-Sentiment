"""Add Europe PMC and bioRxiv/medRxiv data sources

Revision ID: 008
Revises: 007
Create Date: 2026-02-24

"""
from typing import Sequence, Union

from alembic import op


revision: str = "008"
down_revision: Union[str, None] = "007"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("""
        INSERT INTO data_sources (id, name, display_name, base_url, api_key_required, api_key_configured, status, rate_limit_info) VALUES
            (gen_random_uuid(), 'europe_pmc', 'Europe PMC', 'https://www.ebi.ac.uk/europepmc/webservices/rest/', false, false, 'untested', '{"requests_per_second": 10, "note": "No auth required"}'),
            (gen_random_uuid(), 'biorxiv_medrxiv', 'bioRxiv / medRxiv', 'https://api.biorxiv.org/', false, false, 'untested', '{"requests_per_second": 1, "note": "1 req/sec recommended to avoid Cloudflare block"}');
    """)


def downgrade() -> None:
    op.execute("DELETE FROM data_sources WHERE name IN ('europe_pmc', 'biorxiv_medrxiv');")
