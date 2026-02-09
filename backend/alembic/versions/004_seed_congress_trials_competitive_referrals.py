"""Seed congress, trials, competitive, referrals; add has_data/dimensions_scored to tier_dimension_scores

Revision ID: 004
Revises: 003
Create Date: 2026-02-09

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "004"
down_revision: Union[str, None] = "003"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # --- Add has_data and dimensions_scored columns to tier_dimension_scores ---
    op.add_column("tier_dimension_scores", sa.Column("has_data", sa.Boolean, server_default="true"))
    op.add_column("tier_dimension_scores", sa.Column("dimensions_scored", sa.Integer, nullable=True))

    # --- Enhance physician profiles for better scoring ---
    # Add society leadership roles + named lectures for key physicians
    op.execute("""
        UPDATE physicians SET
            society_leadership_roles = ARRAY['AAN Fellow','AANEM Past President'],
            named_lectures_awards = ARRAY['Wartenberg Lecture','AANEM Lifetime Achievement']
        WHERE first_name = 'David' AND last_name = 'Cornblath'
    """)
    op.execute("""
        UPDATE physicians SET
            society_leadership_roles = ARRAY['AAN Fellow','European Academy of Neurology'],
            named_lectures_awards = ARRAY['ENMC Workshop Chair','Thomas Willis Lecture']
        WHERE first_name = 'Marinos' AND last_name = 'Dalakas'
    """)
    op.execute("""
        UPDATE physicians SET
            society_leadership_roles = ARRAY['MGFA Medical Advisory Board Chair'],
            named_lectures_awards = ARRAY['AANEM Distinguished Researcher']
        WHERE first_name = 'James' AND last_name = 'Howard Jr'
    """)
    op.execute("""
        UPDATE physicians SET
            society_leadership_roles = ARRAY['Canadian Neuromuscular Disease Group Chair'],
            named_lectures_awards = ARRAY['Richardson Lecture']
        WHERE first_name = 'Vera' AND last_name = 'Bril'
    """)
    op.execute("""
        UPDATE physicians SET
            society_leadership_roles = ARRAY['AANEM Board Member'],
            named_lectures_awards = ARRAY['PNS Young Investigator Award']
        WHERE first_name = 'Richard' AND last_name = 'Nowak'
    """)
    op.execute("""
        UPDATE physicians SET
            society_leadership_roles = ARRAY['AANEM Fellow'],
            named_lectures_awards = ARRAY['UCI Neuromuscular Excellence Award']
        WHERE first_name = 'Tahseen' AND last_name = 'Mozaffar'
    """)
    op.execute("""
        UPDATE physicians SET
            society_leadership_roles = ARRAY['AANEM Fellow','AAN Member'],
            named_lectures_awards = ARRAY['AANEM Practice Award']
        WHERE first_name = 'Gil' AND last_name = 'Wolfe'
    """)

    # --- Seed congress activity ---
    op.execute("""
        DO $$
        DECLARE
            howard_id UUID;
            cornblath_id UUID;
            dalakas_id UUID;
            bril_id UUID;
            nowak_id UUID;
            mozaffar_id UUID;
        BEGIN
            SELECT id INTO howard_id FROM physicians WHERE first_name='James' AND last_name='Howard Jr' LIMIT 1;
            SELECT id INTO cornblath_id FROM physicians WHERE first_name='David' AND last_name='Cornblath' LIMIT 1;
            SELECT id INTO dalakas_id FROM physicians WHERE first_name='Marinos' AND last_name='Dalakas' LIMIT 1;
            SELECT id INTO bril_id FROM physicians WHERE first_name='Vera' AND last_name='Bril' LIMIT 1;
            SELECT id INTO nowak_id FROM physicians WHERE first_name='Richard' AND last_name='Nowak' LIMIT 1;
            SELECT id INTO mozaffar_id FROM physicians WHERE first_name='Tahseen' AND last_name='Mozaffar' LIMIT 1;

            -- Howard: 4 congress activities
            INSERT INTO congress_activity (id, physician_id, congress_name, congress_date, activity_type, title, diseases)
            VALUES
                (gen_random_uuid(), howard_id, 'AAN Annual Meeting 2025', '2025-04-05', 'plenary', 'Advances in Myasthenia Gravis Treatment', ARRAY['gMG']),
                (gen_random_uuid(), howard_id, 'AANEM Annual Meeting 2025', '2025-10-15', 'oral', 'Long-term Outcomes of FcRn Inhibition in gMG', ARRAY['gMG']),
                (gen_random_uuid(), howard_id, 'PNS Annual Meeting 2024', '2024-06-22', 'oral', 'CIDP Diagnostic Criteria Update', ARRAY['CIDP']),
                (gen_random_uuid(), howard_id, 'AAN Annual Meeting 2024', '2024-04-13', 'poster', 'Real-World VYVGART Outcomes in gMG', ARRAY['gMG']);

            -- Cornblath: 5 congress activities (highest)
            INSERT INTO congress_activity (id, physician_id, congress_name, congress_date, activity_type, title, diseases)
            VALUES
                (gen_random_uuid(), cornblath_id, 'AAN Annual Meeting 2025', '2025-04-06', 'plenary', 'Wartenberg Lecture: 40 Years of CIDP Research', ARRAY['CIDP']),
                (gen_random_uuid(), cornblath_id, 'PNS Annual Meeting 2025', '2025-06-28', 'plenary', 'CIDP Classification and Treatment Algorithms', ARRAY['CIDP']),
                (gen_random_uuid(), cornblath_id, 'AANEM Annual Meeting 2025', '2025-10-16', 'oral', 'Electrodiagnostic Criteria in CIDP', ARRAY['CIDP']),
                (gen_random_uuid(), cornblath_id, 'AAN Annual Meeting 2024', '2024-04-14', 'oral', 'FcRn Inhibitors in Inflammatory Neuropathy', ARRAY['CIDP']),
                (gen_random_uuid(), cornblath_id, 'ENMC Workshop 2024', '2024-09-20', 'invited_speaker', 'International CIDP Consensus Guidelines', ARRAY['CIDP']);

            -- Dalakas: 5 congress activities
            INSERT INTO congress_activity (id, physician_id, congress_name, congress_date, activity_type, title, diseases)
            VALUES
                (gen_random_uuid(), dalakas_id, 'AAN Annual Meeting 2025', '2025-04-07', 'plenary', 'Autoimmune Neuromuscular Disorders: State of the Art', ARRAY['gMG','CIDP']),
                (gen_random_uuid(), dalakas_id, 'EAN Congress 2025', '2025-06-14', 'keynote', 'Complement Inhibition in Neuroimmunology', ARRAY['gMG']),
                (gen_random_uuid(), dalakas_id, 'PNS Annual Meeting 2024', '2024-06-23', 'oral', 'B-Cell Therapies in Inflammatory Neuropathies', ARRAY['CIDP']),
                (gen_random_uuid(), dalakas_id, 'AANEM Annual Meeting 2024', '2024-10-17', 'oral', 'IBM vs CIDP: Differential Diagnosis', ARRAY['CIDP']),
                (gen_random_uuid(), dalakas_id, 'World Muscle Society 2024', '2024-10-01', 'invited_speaker', 'Novel Immune Targets in Neuromuscular Disease', ARRAY['gMG','CIDP']);

            -- Bril: 3 congress activities
            INSERT INTO congress_activity (id, physician_id, congress_name, congress_date, activity_type, title, diseases)
            VALUES
                (gen_random_uuid(), bril_id, 'AAN Annual Meeting 2025', '2025-04-06', 'oral', 'Canadian CIDP Registry Outcomes', ARRAY['CIDP']),
                (gen_random_uuid(), bril_id, 'AANEM Annual Meeting 2024', '2024-10-16', 'poster', 'Subcutaneous Immunoglobulin in CIDP', ARRAY['CIDP']),
                (gen_random_uuid(), bril_id, 'PNS Annual Meeting 2024', '2024-06-22', 'oral', 'Treatment Response Biomarkers in CIDP', ARRAY['CIDP']);

            -- Nowak: 4 congress activities
            INSERT INTO congress_activity (id, physician_id, congress_name, congress_date, activity_type, title, diseases)
            VALUES
                (gen_random_uuid(), nowak_id, 'AAN Annual Meeting 2025', '2025-04-07', 'oral', 'MuSK Antibody gMG: Pathophysiology Update', ARRAY['gMG']),
                (gen_random_uuid(), nowak_id, 'AANEM Annual Meeting 2025', '2025-10-15', 'poster', 'FcRn Inhibitors in Refractory gMG', ARRAY['gMG']),
                (gen_random_uuid(), nowak_id, 'PNS Annual Meeting 2024', '2024-06-23', 'poster', 'Autoantibody Profiles in Neuromuscular Disease', ARRAY['gMG','CIDP']),
                (gen_random_uuid(), nowak_id, 'AAN Annual Meeting 2024', '2024-04-14', 'oral', 'B-Cell Depletion in gMG', ARRAY['gMG']);

            -- Mozaffar: 3 congress activities
            INSERT INTO congress_activity (id, physician_id, congress_name, congress_date, activity_type, title, diseases)
            VALUES
                (gen_random_uuid(), mozaffar_id, 'AAN Annual Meeting 2025', '2025-04-05', 'poster', 'CIDP Phenotypes and Treatment Response', ARRAY['CIDP']),
                (gen_random_uuid(), mozaffar_id, 'AANEM Annual Meeting 2024', '2024-10-17', 'oral', 'Neuromuscular Ultrasound in CIDP Diagnosis', ARRAY['CIDP']),
                (gen_random_uuid(), mozaffar_id, 'World Muscle Society 2024', '2024-10-02', 'poster', 'Inflammatory Neuropathy Registry at UCI', ARRAY['CIDP']);
        END$$;
    """)

    # --- Seed clinical trials + investigators ---
    op.execute("""
        DO $$
        DECLARE
            cornblath_id UUID;
            dalakas_id UUID;
            howard_id UUID;
            nowak_id UUID;
            mozaffar_id UUID;
            bril_id UUID;
            wolfe_id UUID;
            trial1_id UUID := gen_random_uuid();
            trial2_id UUID := gen_random_uuid();
            trial3_id UUID := gen_random_uuid();
            trial4_id UUID := gen_random_uuid();
            trial5_id UUID := gen_random_uuid();
        BEGIN
            SELECT id INTO cornblath_id FROM physicians WHERE first_name='David' AND last_name='Cornblath' LIMIT 1;
            SELECT id INTO dalakas_id FROM physicians WHERE first_name='Marinos' AND last_name='Dalakas' LIMIT 1;
            SELECT id INTO howard_id FROM physicians WHERE first_name='James' AND last_name='Howard Jr' LIMIT 1;
            SELECT id INTO nowak_id FROM physicians WHERE first_name='Richard' AND last_name='Nowak' LIMIT 1;
            SELECT id INTO mozaffar_id FROM physicians WHERE first_name='Tahseen' AND last_name='Mozaffar' LIMIT 1;
            SELECT id INTO bril_id FROM physicians WHERE first_name='Vera' AND last_name='Bril' LIMIT 1;
            SELECT id INTO wolfe_id FROM physicians WHERE first_name='Gil' AND last_name='Wolfe' LIMIT 1;

            -- Trial 1: Phase 3 CIDP trial (efgartigimod) - Cornblath PI
            INSERT INTO clinical_trials (id, nct_id, trial_name, sponsor, phase, diseases, products, status)
            VALUES (trial1_id, 'NCT04281472', 'ADHERE: Efgartigimod in CIDP', 'argenx', 'Phase 3', ARRAY['CIDP'], ARRAY['VYVGART'], 'Completed');

            INSERT INTO trial_investigators (id, trial_id, physician_id, role, site_name) VALUES
                (gen_random_uuid(), trial1_id, cornblath_id, 'Principal Investigator', 'Johns Hopkins University'),
                (gen_random_uuid(), trial1_id, howard_id, 'Sub-Investigator', 'UNC Chapel Hill'),
                (gen_random_uuid(), trial1_id, bril_id, 'Sub-Investigator', 'University of Toronto');

            -- Trial 2: Phase 3 CIDP trial (rozanolixizumab) - Dalakas PI
            INSERT INTO clinical_trials (id, nct_id, trial_name, sponsor, phase, diseases, products, status)
            VALUES (trial2_id, 'NCT04124965', 'MyCIDPchoice: Rozanolixizumab in CIDP', 'UCB', 'Phase 3', ARRAY['CIDP'], ARRAY['Rystiggo'], 'Active');

            INSERT INTO trial_investigators (id, trial_id, physician_id, role, site_name) VALUES
                (gen_random_uuid(), trial2_id, dalakas_id, 'Principal Investigator', 'Thomas Jefferson University'),
                (gen_random_uuid(), trial2_id, nowak_id, 'Sub-Investigator', 'Yale University');

            -- Trial 3: Phase 3 gMG trial - Howard PI
            INSERT INTO clinical_trials (id, nct_id, trial_name, sponsor, phase, diseases, products, status)
            VALUES (trial3_id, 'NCT03669588', 'ADAPT: Efgartigimod in gMG', 'argenx', 'Phase 3', ARRAY['gMG'], ARRAY['VYVGART'], 'Completed');

            INSERT INTO trial_investigators (id, trial_id, physician_id, role, site_name) VALUES
                (gen_random_uuid(), trial3_id, howard_id, 'Principal Investigator', 'UNC Chapel Hill'),
                (gen_random_uuid(), trial3_id, dalakas_id, 'Sub-Investigator', 'Thomas Jefferson University'),
                (gen_random_uuid(), trial3_id, wolfe_id, 'Sub-Investigator', 'University at Buffalo');

            -- Trial 4: Phase 2 CIDP - Mozaffar PI
            INSERT INTO clinical_trials (id, nct_id, trial_name, sponsor, phase, diseases, products, status)
            VALUES (trial4_id, 'NCT05374590', 'Phase 2 Nipocalimab in CIDP', 'Janssen', 'Phase 2', ARRAY['CIDP'], ARRAY['Nipocalimab'], 'Active');

            INSERT INTO trial_investigators (id, trial_id, physician_id, role, site_name) VALUES
                (gen_random_uuid(), trial4_id, mozaffar_id, 'Principal Investigator', 'UC Irvine');

            -- Trial 5: Phase 3 gMG trial - Dalakas PI
            INSERT INTO clinical_trials (id, nct_id, trial_name, sponsor, phase, diseases, products, status)
            VALUES (trial5_id, 'NCT04225871', 'RAISE: Ravulizumab in gMG', 'Alexion', 'Phase 3', ARRAY['gMG'], ARRAY['Ultomiris'], 'Completed');

            INSERT INTO trial_investigators (id, trial_id, physician_id, role, site_name) VALUES
                (gen_random_uuid(), trial5_id, dalakas_id, 'Principal Investigator', 'Thomas Jefferson University'),
                (gen_random_uuid(), trial5_id, cornblath_id, 'Sub-Investigator', 'Johns Hopkins University'),
                (gen_random_uuid(), trial5_id, nowak_id, 'Sub-Investigator', 'Yale University');
        END$$;
    """)

    # --- Seed competitive affiliations ---
    op.execute("""
        DO $$
        DECLARE
            cornblath_id UUID;
            dalakas_id UUID;
            howard_id UUID;
            nowak_id UUID;
            bril_id UUID;
            mozaffar_id UUID;
            wolfe_id UUID;
        BEGIN
            SELECT id INTO cornblath_id FROM physicians WHERE first_name='David' AND last_name='Cornblath' LIMIT 1;
            SELECT id INTO dalakas_id FROM physicians WHERE first_name='Marinos' AND last_name='Dalakas' LIMIT 1;
            SELECT id INTO howard_id FROM physicians WHERE first_name='James' AND last_name='Howard Jr' LIMIT 1;
            SELECT id INTO nowak_id FROM physicians WHERE first_name='Richard' AND last_name='Nowak' LIMIT 1;
            SELECT id INTO bril_id FROM physicians WHERE first_name='Vera' AND last_name='Bril' LIMIT 1;
            SELECT id INTO mozaffar_id FROM physicians WHERE first_name='Tahseen' AND last_name='Mozaffar' LIMIT 1;
            SELECT id INTO wolfe_id FROM physicians WHERE first_name='Gil' AND last_name='Wolfe' LIMIT 1;

            -- Cornblath: consulting for Alexion and CSL Behring
            INSERT INTO competitive_affiliations (id, physician_id, company, affiliation_type, product_name, year, payment_amount, data_source) VALUES
                (gen_random_uuid(), cornblath_id, 'Alexion', 'consultant', 'Ultomiris', 2024, 85000, 'Open Payments'),
                (gen_random_uuid(), cornblath_id, 'CSL Behring', 'consultant', 'Hizentra', 2024, 72000, 'Open Payments'),
                (gen_random_uuid(), cornblath_id, 'Alexion', 'advisory_board', 'Ultomiris', 2025, 45000, 'Open Payments');

            -- Dalakas: consulting for UCB and Janssen
            INSERT INTO competitive_affiliations (id, physician_id, company, affiliation_type, product_name, year, payment_amount, data_source) VALUES
                (gen_random_uuid(), dalakas_id, 'UCB', 'consultant', 'Rystiggo', 2024, 95000, 'Open Payments'),
                (gen_random_uuid(), dalakas_id, 'Janssen', 'advisory_board', 'Nipocalimab', 2024, 60000, 'Open Payments'),
                (gen_random_uuid(), dalakas_id, 'UCB', 'speaker', 'Rystiggo', 2025, 40000, 'Open Payments');

            -- Howard: consulting for CSL Behring
            INSERT INTO competitive_affiliations (id, physician_id, company, affiliation_type, product_name, year, payment_amount, data_source) VALUES
                (gen_random_uuid(), howard_id, 'CSL Behring', 'consultant', 'Hizentra', 2024, 68000, 'Open Payments'),
                (gen_random_uuid(), howard_id, 'CSL Behring', 'advisory_board', 'Hizentra', 2025, 35000, 'Open Payments');

            -- Nowak: consulting for Alexion
            INSERT INTO competitive_affiliations (id, physician_id, company, affiliation_type, product_name, year, payment_amount, data_source) VALUES
                (gen_random_uuid(), nowak_id, 'Alexion', 'consultant', 'Ultomiris', 2024, 50000, 'Open Payments'),
                (gen_random_uuid(), nowak_id, 'Alexion', 'speaker', 'Ultomiris', 2025, 25000, 'Open Payments');

            -- Bril: advisory for CSL
            INSERT INTO competitive_affiliations (id, physician_id, company, affiliation_type, product_name, year, payment_amount, data_source) VALUES
                (gen_random_uuid(), bril_id, 'CSL Behring', 'advisory_board', 'Hizentra', 2024, 40000, 'Open Payments');

            -- Mozaffar: consulting for Janssen
            INSERT INTO competitive_affiliations (id, physician_id, company, affiliation_type, product_name, year, payment_amount, data_source) VALUES
                (gen_random_uuid(), mozaffar_id, 'Janssen', 'consultant', 'Nipocalimab', 2024, 55000, 'Open Payments');

            -- Wolfe: consulting for UCB
            INSERT INTO competitive_affiliations (id, physician_id, company, affiliation_type, product_name, year, payment_amount, data_source) VALUES
                (gen_random_uuid(), wolfe_id, 'UCB', 'advisory_board', 'Zilbrysq', 2024, 38000, 'Open Payments');
        END$$;
    """)

    # --- Seed referral relationships ---
    op.execute("""
        DO $$
        DECLARE
            cornblath_id UUID;
            dalakas_id UUID;
            howard_id UUID;
            mozaffar_id UUID;
            bril_id UUID;
            nowak_id UUID;
            wolfe_id UUID;
            kaminski_id UUID;
            allen_id UUID;
            donofrio_id UUID;
            katz_id UUID;
            cidp_id UUID;
        BEGIN
            SELECT id INTO cornblath_id FROM physicians WHERE first_name='David' AND last_name='Cornblath' LIMIT 1;
            SELECT id INTO dalakas_id FROM physicians WHERE first_name='Marinos' AND last_name='Dalakas' LIMIT 1;
            SELECT id INTO howard_id FROM physicians WHERE first_name='James' AND last_name='Howard Jr' LIMIT 1;
            SELECT id INTO mozaffar_id FROM physicians WHERE first_name='Tahseen' AND last_name='Mozaffar' LIMIT 1;
            SELECT id INTO bril_id FROM physicians WHERE first_name='Vera' AND last_name='Bril' LIMIT 1;
            SELECT id INTO nowak_id FROM physicians WHERE first_name='Richard' AND last_name='Nowak' LIMIT 1;
            SELECT id INTO wolfe_id FROM physicians WHERE first_name='Gil' AND last_name='Wolfe' LIMIT 1;
            SELECT id INTO kaminski_id FROM physicians WHERE first_name='Henry' AND last_name='Kaminski' LIMIT 1;
            SELECT id INTO allen_id FROM physicians WHERE first_name='Jeffrey' AND last_name='Allen' LIMIT 1;
            SELECT id INTO donofrio_id FROM physicians WHERE first_name='Peter' AND last_name='Donofrio' LIMIT 1;
            SELECT id INTO katz_id FROM physicians WHERE first_name='Jonathan' AND last_name='Katz' LIMIT 1;
            SELECT id INTO cidp_id FROM diseases WHERE name LIKE '%CIDP%' LIMIT 1;

            -- Cornblath as high-inbound hub (5 referrals to)
            INSERT INTO referral_relationships (id, referring_physician_id, receiving_physician_id, disease_id, referral_volume, period_start, period_end, data_source) VALUES
                (gen_random_uuid(), allen_id, cornblath_id, cidp_id, 12, '2024-01-01', '2024-12-31', 'Claims Data'),
                (gen_random_uuid(), donofrio_id, cornblath_id, cidp_id, 8, '2024-01-01', '2024-12-31', 'Claims Data'),
                (gen_random_uuid(), katz_id, cornblath_id, cidp_id, 6, '2024-01-01', '2024-12-31', 'Claims Data'),
                (gen_random_uuid(), wolfe_id, cornblath_id, cidp_id, 5, '2024-01-01', '2024-12-31', 'Claims Data'),
                (gen_random_uuid(), kaminski_id, cornblath_id, cidp_id, 4, '2024-01-01', '2024-12-31', 'Claims Data');

            -- Howard as high-inbound hub (4 referrals to)
            INSERT INTO referral_relationships (id, referring_physician_id, receiving_physician_id, disease_id, referral_volume, period_start, period_end, data_source) VALUES
                (gen_random_uuid(), nowak_id, howard_id, cidp_id, 7, '2024-01-01', '2024-12-31', 'Claims Data'),
                (gen_random_uuid(), allen_id, howard_id, cidp_id, 5, '2024-01-01', '2024-12-31', 'Claims Data'),
                (gen_random_uuid(), kaminski_id, howard_id, cidp_id, 4, '2024-01-01', '2024-12-31', 'Claims Data'),
                (gen_random_uuid(), katz_id, howard_id, cidp_id, 3, '2024-01-01', '2024-12-31', 'Claims Data');

            -- Mozaffar as high-inbound hub (3 referrals to)
            INSERT INTO referral_relationships (id, referring_physician_id, receiving_physician_id, disease_id, referral_volume, period_start, period_end, data_source) VALUES
                (gen_random_uuid(), donofrio_id, mozaffar_id, cidp_id, 6, '2024-01-01', '2024-12-31', 'Claims Data'),
                (gen_random_uuid(), wolfe_id, mozaffar_id, cidp_id, 4, '2024-01-01', '2024-12-31', 'Claims Data'),
                (gen_random_uuid(), allen_id, mozaffar_id, cidp_id, 3, '2024-01-01', '2024-12-31', 'Claims Data');

            -- Cross-referrals between hubs
            INSERT INTO referral_relationships (id, referring_physician_id, receiving_physician_id, disease_id, referral_volume, period_start, period_end, data_source) VALUES
                (gen_random_uuid(), cornblath_id, dalakas_id, cidp_id, 3, '2024-01-01', '2024-12-31', 'Claims Data'),
                (gen_random_uuid(), howard_id, cornblath_id, cidp_id, 4, '2024-01-01', '2024-12-31', 'Claims Data'),
                (gen_random_uuid(), dalakas_id, howard_id, cidp_id, 2, '2024-01-01', '2024-12-31', 'Claims Data');
        END$$;
    """)

    # --- Also boost Cornblath and Dalakas additional profile attributes ---
    # Give Cornblath UpToDate authorship and CME faculty
    op.execute("""
        UPDATE physicians SET
            uptodate_author = true,
            cme_faculty = true
        WHERE first_name = 'David' AND last_name = 'Cornblath'
    """)
    # Give Dalakas CME faculty
    op.execute("""
        UPDATE physicians SET
            cme_faculty = true
        WHERE first_name = 'Marinos' AND last_name = 'Dalakas'
    """)
    # Give Howard UpToDate authorship
    op.execute("""
        UPDATE physicians SET
            uptodate_author = true
        WHERE first_name = 'James' AND last_name = 'Howard Jr'
    """)
    # Give Bril UpToDate authorship
    op.execute("""
        UPDATE physicians SET
            uptodate_author = true
        WHERE first_name = 'Vera' AND last_name = 'Bril'
    """)
    # Boost Wolfe with fellowship_program_director
    op.execute("""
        UPDATE physicians SET
            fellowship_program_director = true
        WHERE first_name = 'Gil' AND last_name = 'Wolfe'
    """)


def downgrade() -> None:
    op.drop_column("tier_dimension_scores", "dimensions_scored")
    op.drop_column("tier_dimension_scores", "has_data")
    # Note: data seeds are not reverted
