"""Seed diseases and products reference data

Revision ID: 002
Revises: 001
Create Date: 2026-02-07

"""
from typing import Sequence, Union

from alembic import op

revision: str = "002"
down_revision: Union[str, None] = "001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Seed diseases
    op.execute("""
        INSERT INTO diseases (name, icd10_codes, therapeutic_area) VALUES
        ('CIDP', ARRAY['G61.81'], 'neuromuscular_autoimmune'),
        ('gMG', ARRAY['G70.00', 'G70.01'], 'neuromuscular_autoimmune'),
        ('ITP', ARRAY['D69.3'], 'hematology')
    """)

    # Seed products
    op.execute("""
        INSERT INTO products (brand_name, generic_name, mechanism, formulation, manufacturer, is_own_product) VALUES
        ('VYVGART', 'efgartigimod alfa-fcab', 'FcRn_blocker', 'IV', 'argenx', true),
        ('VYVGART Hytrulo', 'efgartigimod alfa and hyaluronidase-qvfc', 'FcRn_blocker', 'SC', 'argenx', true),
        ('Ultomiris', 'ravulizumab-cwvz', 'complement_C5', 'IV', 'Alexion', false),
        ('Rystiggo', 'rozanolixizumab-ulbb', 'FcRn_blocker', 'SC', 'UCB', false),
        ('Zilbrysq', 'zilucoplan', 'complement_C5', 'SC', 'UCB', false)
    """)


def downgrade() -> None:
    op.execute("DELETE FROM products WHERE brand_name IN ('VYVGART', 'VYVGART Hytrulo', 'Ultomiris', 'Rystiggo', 'Zilbrysq')")
    op.execute("DELETE FROM diseases WHERE name IN ('CIDP', 'gMG', 'ITP')")
