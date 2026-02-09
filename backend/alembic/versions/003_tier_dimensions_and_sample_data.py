"""Add tier dimension tables, physician profile fields, and sample data

Revision ID: 003
Revises: 002
Create Date: 2026-02-09

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID, TIMESTAMP, ARRAY

revision: str = "003"
down_revision: Union[str, None] = "002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # --- New physician columns ---
    op.add_column("physicians", sa.Column("h_index", sa.Integer, nullable=True))
    op.add_column("physicians", sa.Column("total_citations", sa.Integer, nullable=True))
    op.add_column("physicians", sa.Column("citations_per_paper", sa.Numeric(6, 2), nullable=True))
    op.add_column("physicians", sa.Column("first_last_author_ratio", sa.Numeric(3, 2), nullable=True))
    op.add_column("physicians", sa.Column("guideline_committee_count", sa.Integer, server_default="0"))
    op.add_column("physicians", sa.Column("editorial_board_count", sa.Integer, server_default="0"))
    op.add_column("physicians", sa.Column("society_leadership_roles", ARRAY(sa.String), nullable=True))
    op.add_column("physicians", sa.Column("fellowship_program_director", sa.Boolean, server_default="false"))
    op.add_column("physicians", sa.Column("uptodate_author", sa.Boolean, server_default="false"))
    op.add_column("physicians", sa.Column("cme_faculty", sa.Boolean, server_default="false"))
    op.add_column("physicians", sa.Column("patient_advocacy_roles", ARRAY(sa.String), nullable=True))
    op.add_column("physicians", sa.Column("digital_presence_score", sa.Numeric(5, 2), nullable=True))
    op.add_column("physicians", sa.Column("named_lectures_awards", ARRAY(sa.String), nullable=True))

    # --- tier_dimension_weights ---
    op.create_table(
        "tier_dimension_weights",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("disease_id", UUID(as_uuid=True), sa.ForeignKey("diseases.id"), nullable=True),
        sa.Column("dimension", sa.String(50), nullable=False),
        sa.Column("weight", sa.Numeric(5, 2), nullable=False),
        sa.Column("is_active", sa.Boolean, server_default="true"),
        sa.UniqueConstraint("disease_id", "dimension", name="uq_tier_weight_disease_dimension"),
    )

    # --- tier_dimension_scores ---
    op.create_table(
        "tier_dimension_scores",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("physician_id", UUID(as_uuid=True), sa.ForeignKey("physicians.id"), nullable=False),
        sa.Column("dimension", sa.String(50), nullable=False),
        sa.Column("raw_score", sa.Numeric(5, 2), nullable=False),
        sa.Column("weighted_score", sa.Numeric(5, 2), nullable=False),
        sa.Column("computed_at", TIMESTAMP(timezone=True), server_default=sa.text("NOW()")),
    )
    op.create_index("idx_tier_scores_physician", "tier_dimension_scores", ["physician_id"])

    # --- Seed default tier dimension weights (global, disease_id=NULL) ---
    op.execute("""
        INSERT INTO tier_dimension_weights (id, disease_id, dimension, weight, is_active) VALUES
        (gen_random_uuid(), NULL, 'scientific_impact', 20, true),
        (gen_random_uuid(), NULL, 'clinical_authority', 15, true),
        (gen_random_uuid(), NULL, 'peer_influence', 15, true),
        (gen_random_uuid(), NULL, 'congress_presence', 10, true),
        (gen_random_uuid(), NULL, 'trial_leadership', 10, true),
        (gen_random_uuid(), NULL, 'guideline_editorial_authority', 10, true),
        (gen_random_uuid(), NULL, 'digital_advocacy', 10, true),
        (gen_random_uuid(), NULL, 'industry_recognition', 10, true)
    """)

    # --- Seed sample physician profile data ---
    # Howard Jr — h_index=45, citations=3200, guideline_committees=2, editorial_boards=1, fellowship_director=true
    op.execute("""
        UPDATE physicians SET
            h_index = 45, total_citations = 3200, citations_per_paper = 22.5,
            first_last_author_ratio = 0.65, guideline_committee_count = 2,
            editorial_board_count = 1, fellowship_program_director = true,
            years_in_practice = 28, digital_presence_score = 35
        WHERE first_name = 'James' AND last_name = 'Howard Jr'
    """)

    # Cornblath — h_index=62, citations=8500, guideline_committees=3, editorial_boards=2, fellowship_director=true
    op.execute("""
        UPDATE physicians SET
            h_index = 62, total_citations = 8500, citations_per_paper = 28.3,
            first_last_author_ratio = 0.72, guideline_committee_count = 3,
            editorial_board_count = 2, fellowship_program_director = true,
            named_lectures_awards = ARRAY['Wartenberg Lecture'],
            years_in_practice = 35, digital_presence_score = 40
        WHERE first_name = 'David' AND last_name = 'Cornblath'
    """)

    # Dalakas — h_index=71, citations=12000, guideline_committees=2, editorial_boards=3, uptodate_author=true
    op.execute("""
        UPDATE physicians SET
            h_index = 71, total_citations = 12000, citations_per_paper = 32.1,
            first_last_author_ratio = 0.78, guideline_committee_count = 2,
            editorial_board_count = 3, uptodate_author = true,
            years_in_practice = 40, digital_presence_score = 50
        WHERE first_name = 'Marinos' AND last_name = 'Dalakas'
    """)

    # Bril — h_index=38, citations=2800, guideline_committees=1, editorial_boards=1
    op.execute("""
        UPDATE physicians SET
            h_index = 38, total_citations = 2800, citations_per_paper = 18.7,
            first_last_author_ratio = 0.55, guideline_committee_count = 1,
            editorial_board_count = 1,
            years_in_practice = 30, digital_presence_score = 25
        WHERE first_name = 'Vera' AND last_name = 'Bril'
    """)

    # Nowak — h_index=28, citations=1400, cme_faculty=true, patient_advocacy
    op.execute("""
        UPDATE physicians SET
            h_index = 28, total_citations = 1400, citations_per_paper = 15.2,
            first_last_author_ratio = 0.48, cme_faculty = true,
            patient_advocacy_roles = ARRAY['MGFA Medical Advisory Board'],
            years_in_practice = 18, digital_presence_score = 60
        WHERE first_name = 'Richard' AND last_name = 'Nowak'
    """)

    # Mozaffar — h_index=32, citations=1900, editorial_boards=1, fellowship_director=true
    op.execute("""
        UPDATE physicians SET
            h_index = 32, total_citations = 1900, citations_per_paper = 16.8,
            first_last_author_ratio = 0.52, editorial_board_count = 1,
            fellowship_program_director = true,
            years_in_practice = 22, digital_presence_score = 30
        WHERE first_name = 'Tahseen' AND last_name = 'Mozaffar'
    """)

    # Wolfe — h_index=35, citations=2100, guideline_committees=1
    op.execute("""
        UPDATE physicians SET
            h_index = 35, total_citations = 2100, citations_per_paper = 19.1,
            first_last_author_ratio = 0.58, guideline_committee_count = 1,
            years_in_practice = 25, digital_presence_score = 28
        WHERE first_name = 'Gil' AND last_name = 'Wolfe'
    """)

    # Kaminski — h_index=30, citations=1600, society_leadership
    op.execute("""
        UPDATE physicians SET
            h_index = 30, total_citations = 1600, citations_per_paper = 14.5,
            first_last_author_ratio = 0.45, society_leadership_roles = ARRAY['AANEM Board Member'],
            years_in_practice = 26, digital_presence_score = 32
        WHERE first_name = 'Henry' AND last_name = 'Kaminski'
    """)

    # Allen — h_index=25, citations=1100, cme_faculty=true
    op.execute("""
        UPDATE physicians SET
            h_index = 25, total_citations = 1100, citations_per_paper = 12.8,
            first_last_author_ratio = 0.42, cme_faculty = true,
            years_in_practice = 20, digital_presence_score = 22
        WHERE first_name = 'Jeffrey' AND last_name = 'Allen'
    """)

    # Li (nominated) — h_index=12, citations=280, digital_presence=45
    op.execute("""
        UPDATE physicians SET
            h_index = 12, total_citations = 280, citations_per_paper = 8.5,
            first_last_author_ratio = 0.35, digital_presence_score = 45,
            years_in_practice = 10
        WHERE first_name = 'Yuebing' AND last_name = 'Li'
    """)

    # Katz — h_index=18, citations=600, patient_advocacy
    op.execute("""
        UPDATE physicians SET
            h_index = 18, total_citations = 600, citations_per_paper = 10.2,
            first_last_author_ratio = 0.40,
            patient_advocacy_roles = ARRAY['GBS|CIDP Foundation'],
            years_in_practice = 22, digital_presence_score = 38
        WHERE first_name = 'Jonathan' AND last_name = 'Katz'
    """)

    # Ajroud-Driss — h_index=15, citations=420, cme_faculty=true, digital_presence=55
    op.execute("""
        UPDATE physicians SET
            h_index = 15, total_citations = 420, citations_per_paper = 9.3,
            first_last_author_ratio = 0.38, cme_faculty = true,
            digital_presence_score = 55, years_in_practice = 12
        WHERE first_name = 'Senda' AND last_name = 'Ajroud-Driss'
    """)

    # Donofrio
    op.execute("""
        UPDATE physicians SET
            h_index = 33, total_citations = 2000, citations_per_paper = 17.4,
            first_last_author_ratio = 0.50,
            years_in_practice = 30, digital_presence_score = 20
        WHERE first_name = 'Peter' AND last_name = 'Donofrio'
    """)

    # Shy
    op.execute("""
        UPDATE physicians SET
            h_index = 40, total_citations = 3500, citations_per_paper = 21.0,
            first_last_author_ratio = 0.60, guideline_committee_count = 1,
            fellowship_program_director = true,
            years_in_practice = 28, digital_presence_score = 25
        WHERE first_name = 'Michael' AND last_name = 'Shy'
    """)

    # Nobile-Orazio
    op.execute("""
        UPDATE physicians SET
            h_index = 48, total_citations = 4200, citations_per_paper = 24.5,
            first_last_author_ratio = 0.68, guideline_committee_count = 2,
            editorial_board_count = 2,
            years_in_practice = 35, digital_presence_score = 30
        WHERE first_name = 'Eduardo' AND last_name = 'Nobile-Orazio'
    """)

    # --- Seed sample prescribing data for 8+ physicians ---
    # We need disease and product IDs
    op.execute("""
        DO $$
        DECLARE
            cidp_id UUID;
            vyvgart_id UUID;
            physician_rec RECORD;
        BEGIN
            SELECT id INTO cidp_id FROM diseases WHERE name LIKE '%CIDP%' LIMIT 1;
            SELECT id INTO vyvgart_id FROM products WHERE brand_name = 'VYVGART' LIMIT 1;

            FOR physician_rec IN
                SELECT id, first_name FROM physicians
                WHERE first_name IN ('James','Richard','David','Tahseen','Gil','Henry','Jeffrey','Vera','Marinos','Peter','Michael')
                AND record_status = 'imported'
            LOOP
                INSERT INTO prescribing_data (id, physician_id, product_id, disease_id, period_start, period_end, total_patients, new_starts, formulation, data_source)
                VALUES (
                    gen_random_uuid(), physician_rec.id, vyvgart_id, cidp_id,
                    '2025-07-01', '2025-09-30',
                    (10 + floor(random() * 40))::int,
                    (2 + floor(random() * 10))::int,
                    'IV', 'SP Feed'
                );
                INSERT INTO prescribing_data (id, physician_id, product_id, disease_id, period_start, period_end, total_patients, new_starts, formulation, data_source)
                VALUES (
                    gen_random_uuid(), physician_rec.id, vyvgart_id, cidp_id,
                    '2025-10-01', '2025-12-31',
                    (12 + floor(random() * 45))::int,
                    (3 + floor(random() * 12))::int,
                    'IV', 'SP Feed'
                );
            END LOOP;
        END$$;
    """)

    # --- Seed sample sentiment scores for 8+ physicians ---
    op.execute("""
        DO $$
        DECLARE
            cidp_id UUID;
            physician_rec RECORD;
            db_score INT;
            pp_score INT;
            br_score INT;
            composite INT;
            stage TEXT;
        BEGIN
            SELECT id INTO cidp_id FROM diseases WHERE name LIKE '%CIDP%' LIMIT 1;

            FOR physician_rec IN
                SELECT id FROM physicians
                WHERE first_name IN ('James','Richard','David','Tahseen','Gil','Henry','Jeffrey','Vera','Marinos','Peter')
                AND record_status = 'imported'
            LOOP
                db_score := 2 + floor(random() * 4)::int;
                pp_score := 2 + floor(random() * 4)::int;
                br_score := 1 + floor(random() * 5)::int;
                composite := db_score + pp_score + br_score;
                IF composite >= 13 THEN stage := 'advocate';
                ELSIF composite >= 10 THEN stage := 'adopter';
                ELSIF composite >= 7 THEN stage := 'interested';
                ELSIF composite >= 4 THEN stage := 'aware';
                ELSE stage := 'unaware';
                END IF;

                -- First transition to under_review, then validated
                UPDATE physicians SET record_status = 'under_review',
                    status_changed_at = NOW(), status_changed_by = 'system'
                WHERE id = physician_rec.id;
                UPDATE physicians SET record_status = 'validated',
                    status_changed_at = NOW(), status_changed_by = 'system',
                    last_validated_date = CURRENT_DATE, validated_by = 'system'
                WHERE id = physician_rec.id;

                INSERT INTO sentiment_scores (id, physician_id, disease_id, assessment_date,
                    disease_belief_score, product_perception_score, behavioral_readiness_score,
                    composite_score, conversion_stage, score_type, confidence_level, scored_by)
                VALUES (
                    gen_random_uuid(), physician_rec.id, cidp_id, CURRENT_DATE - (floor(random()*30))::int,
                    db_score, pp_score, br_score, composite, stage,
                    'field_assessment', 'medium', 'System Seed'
                );
            END LOOP;
        END$$;
    """)

    # Also validate Yuebing Li if she exists and is nominated
    op.execute("""
        UPDATE physicians SET record_status = 'validated',
            status_changed_at = NOW(), status_changed_by = 'system',
            last_validated_date = CURRENT_DATE, validated_by = 'system'
        WHERE first_name = 'Yuebing' AND last_name = 'Li' AND record_status IN ('nominated','under_review')
    """)


def downgrade() -> None:
    op.drop_index("idx_tier_scores_physician", table_name="tier_dimension_scores")
    op.drop_table("tier_dimension_scores")
    op.drop_table("tier_dimension_weights")

    for col in ["h_index", "total_citations", "citations_per_paper", "first_last_author_ratio",
                "guideline_committee_count", "editorial_board_count", "society_leadership_roles",
                "fellowship_program_director", "uptodate_author", "cme_faculty",
                "patient_advocacy_roles", "digital_presence_score", "named_lectures_awards"]:
        op.drop_column("physicians", col)
