"""Seed diseases and products

Revision ID: 002
Revises: 001
Create Date: 2026-02-09

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

revision: str = "002"
down_revision: Union[str, None] = "001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Seed diseases
    op.execute("""
        INSERT INTO diseases (id, name, icd10_codes, therapeutic_area, is_active) VALUES
        (gen_random_uuid(), 'Chronic Inflammatory Demyelinating Polyneuropathy (CIDP)', ARRAY['G61.81'], 'Neurology', true),
        (gen_random_uuid(), 'Generalized Myasthenia Gravis (gMG)', ARRAY['G70.00', 'G70.01'], 'Neurology', true),
        (gen_random_uuid(), 'Immune Thrombocytopenia (ITP)', ARRAY['D69.3'], 'Hematology', true)
    """)

    # Seed products
    op.execute("""
        INSERT INTO products (id, brand_name, generic_name, mechanism, formulation, manufacturer, is_own_product, is_active) VALUES
        (gen_random_uuid(), 'VYVGART', 'efgartigimod alfa-fcab', 'FcRn antagonist', 'IV', 'argenx', true, true),
        (gen_random_uuid(), 'VYVGART Hytrulo', 'efgartigimod alfa and hyaluronidase-qvfc', 'FcRn antagonist', 'SC', 'argenx', true, true),
        (gen_random_uuid(), 'Rystiggo', 'rozanolixizumab-ulbb', 'FcRn antagonist', 'SC', 'UCB', false, true),
        (gen_random_uuid(), 'Ultomiris', 'ravulizumab-cwvz', 'C5 complement inhibitor', 'IV', 'Alexion', false, true),
        (gen_random_uuid(), 'Zilbrysq', 'zilucoplan', 'C5 complement inhibitor', 'SC', 'UCB', false, true)
    """)


def downgrade() -> None:
    op.execute("DELETE FROM products")
    op.execute("DELETE FROM diseases")
