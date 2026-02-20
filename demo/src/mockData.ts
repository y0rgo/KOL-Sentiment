import type {
  Physician,
  PhysicianListResponse,
  ImportBatch,
  ImportConflict,
  ReviewQueueItem,
  ReviewQueueStats,
  SentimentScore,
  EngagementRecord,
  ListHealth,
  Persona,
  TierBreakdownResponse,
  TierConfigResponse,
} from './types';

/* ================================================================== */
/*  Physicians (18 total across gMG, CIDP, ITP, MMN)                  */
/* ================================================================== */

export const physicians: Physician[] = [
  {
    id: 'p001',
    npi: '1234567890',
    first_name: 'Richard',
    last_name: 'Barohn',
    credentials: 'MD',
    specialty: 'Neurology',
    subspecialty: 'Neuromuscular Medicine',
    practice_type: 'Academic',
    institution_name: 'University of Missouri',
    institution_type: 'Academic Medical Center',
    city: 'Columbia',
    state: 'MO',
    region: 'Midwest',
    country: 'US',
    years_in_practice: 32,
    fellowship_training: 'Neuromuscular',
    institutional_role: 'Department Chair',
    record_status: 'validated',
    status_changed_at: '2025-11-15T10:30:00Z',
    status_changed_by: 'admin',
    decline_reason: null,
    source_channel: 'import',
    source_detail: 'HCP Master List Q4 2025',
    completeness_score: 92,
    tier: 'global_national',
    tier_score: 82.5,
    priority_score: 95,
    priority_rank: 1,
    is_active: true,
    notes: 'Top gMG expert, DBRPC trial PI',
    created_at: '2025-10-01T08:00:00Z',
    updated_at: '2025-12-20T14:30:00Z',
  },
  {
    id: 'p002',
    npi: '2345678901',
    first_name: 'Vera',
    last_name: 'Bril',
    credentials: 'MD, FRCPC',
    specialty: 'Neurology',
    subspecialty: 'Neuromuscular Medicine',
    practice_type: 'Academic',
    institution_name: 'University of Toronto',
    institution_type: 'Academic Medical Center',
    city: 'Toronto',
    state: 'ON',
    region: 'Canada',
    country: 'CA',
    years_in_practice: 28,
    fellowship_training: 'Neuromuscular',
    institutional_role: 'Division Head',
    record_status: 'validated',
    status_changed_at: '2025-11-20T09:15:00Z',
    status_changed_by: 'admin',
    decline_reason: null,
    source_channel: 'import',
    source_detail: 'Global KOL Import Q4 2025',
    completeness_score: 88,
    tier: 'global_national',
    tier_score: 79.3,
    priority_score: 90,
    priority_rank: 2,
    is_active: true,
    notes: 'Leading gMG researcher, guideline author',
    created_at: '2025-10-01T08:00:00Z',
    updated_at: '2025-12-18T11:00:00Z',
  },
  {
    id: 'p003',
    npi: '3456789012',
    first_name: 'Mamatha',
    last_name: 'Pasnoor',
    credentials: 'MD',
    specialty: 'Neurology',
    subspecialty: 'Neuromuscular Medicine',
    practice_type: 'Academic',
    institution_name: 'University of Kansas Medical Center',
    institution_type: 'Academic Medical Center',
    city: 'Kansas City',
    state: 'KS',
    region: 'Midwest',
    country: 'US',
    years_in_practice: 18,
    fellowship_training: 'Neuromuscular',
    institutional_role: 'Associate Professor',
    record_status: 'validated',
    status_changed_at: '2025-11-22T14:00:00Z',
    status_changed_by: 'admin',
    decline_reason: null,
    source_channel: 'import',
    source_detail: 'HCP Master List Q4 2025',
    completeness_score: 85,
    tier: 'regional_institutional',
    tier_score: 61.8,
    priority_score: 78,
    priority_rank: 5,
    is_active: true,
    notes: 'CIDP trial site investigator, active congress presenter',
    created_at: '2025-10-01T08:00:00Z',
    updated_at: '2025-12-15T09:45:00Z',
  },
  {
    id: 'p004',
    npi: '4567890123',
    first_name: 'James',
    last_name: 'Bussel',
    credentials: 'MD',
    specialty: 'Hematology',
    subspecialty: 'Pediatric Hematology',
    practice_type: 'Academic',
    institution_name: 'Weill Cornell Medicine',
    institution_type: 'Academic Medical Center',
    city: 'New York',
    state: 'NY',
    region: 'Northeast',
    country: 'US',
    years_in_practice: 38,
    fellowship_training: 'Hematology-Oncology',
    institutional_role: 'Professor Emeritus',
    record_status: 'validated',
    status_changed_at: '2025-11-10T16:00:00Z',
    status_changed_by: 'admin',
    decline_reason: null,
    source_channel: 'import',
    source_detail: 'ITP Expert Panel Import',
    completeness_score: 95,
    tier: 'global_national',
    tier_score: 88.2,
    priority_score: 97,
    priority_rank: 1,
    is_active: true,
    notes: 'World-leading ITP expert, 400+ publications',
    created_at: '2025-09-15T08:00:00Z',
    updated_at: '2025-12-22T10:00:00Z',
  },
  {
    id: 'p005',
    npi: '5678901234',
    first_name: 'Cindy',
    last_name: 'Neunert',
    credentials: 'MD, MSCS',
    specialty: 'Hematology',
    subspecialty: 'Pediatric Hematology',
    practice_type: 'Academic',
    institution_name: 'Columbia University Medical Center',
    institution_type: 'Academic Medical Center',
    city: 'New York',
    state: 'NY',
    region: 'Northeast',
    country: 'US',
    years_in_practice: 16,
    fellowship_training: 'Hematology-Oncology',
    institutional_role: 'Associate Professor',
    record_status: 'validated',
    status_changed_at: '2025-11-25T11:30:00Z',
    status_changed_by: 'admin',
    decline_reason: null,
    source_channel: 'import',
    source_detail: 'ITP Expert Panel Import',
    completeness_score: 82,
    tier: 'regional_institutional',
    tier_score: 64.5,
    priority_score: 80,
    priority_rank: 4,
    is_active: true,
    notes: 'ASH guideline author for ITP, active researcher',
    created_at: '2025-09-20T08:00:00Z',
    updated_at: '2025-12-10T15:20:00Z',
  },
  {
    id: 'p006',
    npi: '6789012345',
    first_name: 'Eduardo',
    last_name: 'Nobile-Orazio',
    credentials: 'MD, PhD',
    specialty: 'Neurology',
    subspecialty: 'Neuromuscular Medicine',
    practice_type: 'Academic',
    institution_name: 'University of Milan',
    institution_type: 'Academic Medical Center',
    city: 'Milan',
    state: null,
    region: 'Europe',
    country: 'IT',
    years_in_practice: 30,
    fellowship_training: 'Clinical Neurophysiology',
    institutional_role: 'Full Professor',
    record_status: 'validated',
    status_changed_at: '2025-12-01T10:00:00Z',
    status_changed_by: 'admin',
    decline_reason: null,
    source_channel: 'discovery_publications',
    source_detail: 'PubMed scan - CIDP/MMN',
    completeness_score: 78,
    tier: 'global_national',
    tier_score: 76.1,
    priority_score: 85,
    priority_rank: 3,
    is_active: true,
    notes: 'CIDP & MMN global expert, EFNS guideline committee',
    created_at: '2025-10-15T08:00:00Z',
    updated_at: '2025-12-20T08:30:00Z',
  },
  {
    id: 'p007',
    npi: '7890123456',
    first_name: 'Amanda',
    last_name: 'Piquet',
    credentials: 'MD',
    specialty: 'Neurology',
    subspecialty: 'Neuromuscular Medicine',
    practice_type: 'Community',
    institution_name: 'Swedish Neuroscience Institute',
    institution_type: 'Community Hospital',
    city: 'Seattle',
    state: 'WA',
    region: 'West',
    country: 'US',
    years_in_practice: 9,
    fellowship_training: 'Neuromuscular',
    institutional_role: 'Attending Physician',
    record_status: 'validated',
    status_changed_at: '2025-12-05T09:00:00Z',
    status_changed_by: 'field_rep',
    decline_reason: null,
    source_channel: 'field_nomination',
    source_detail: 'NW Region Field Team',
    completeness_score: 68,
    tier: 'rising_star',
    tier_score: 42.3,
    priority_score: 65,
    priority_rank: 10,
    is_active: true,
    notes: 'Rising star, high gMG patient volume, congress speaker',
    created_at: '2025-11-01T08:00:00Z',
    updated_at: '2025-12-15T16:00:00Z',
  },
  {
    id: 'p008',
    npi: '8901234567',
    first_name: 'Drew',
    last_name: 'Provan',
    credentials: 'MD, FRCP',
    specialty: 'Hematology',
    subspecialty: null,
    practice_type: 'Academic',
    institution_name: 'Queen Mary University of London',
    institution_type: 'Academic Medical Center',
    city: 'London',
    state: null,
    region: 'Europe',
    country: 'UK',
    years_in_practice: 25,
    fellowship_training: 'Haematology',
    institutional_role: 'Professor',
    record_status: 'validated',
    status_changed_at: '2025-11-18T13:00:00Z',
    status_changed_by: 'admin',
    decline_reason: null,
    source_channel: 'import',
    source_detail: 'Global ITP List',
    completeness_score: 74,
    tier: 'global_national',
    tier_score: 75.8,
    priority_score: 82,
    priority_rank: 4,
    is_active: true,
    notes: 'ITP international consensus author',
    created_at: '2025-10-10T08:00:00Z',
    updated_at: '2025-12-12T10:00:00Z',
  },
  {
    id: 'p009',
    npi: '9012345678',
    first_name: 'Yesim',
    last_name: 'Parman',
    credentials: 'MD',
    specialty: 'Neurology',
    subspecialty: 'Neuromuscular Medicine',
    practice_type: 'Academic',
    institution_name: 'Istanbul University',
    institution_type: 'Academic Medical Center',
    city: 'Istanbul',
    state: null,
    region: 'EMEA',
    country: 'TR',
    years_in_practice: 22,
    fellowship_training: 'EMG/NCS',
    institutional_role: 'Professor',
    record_status: 'under_review',
    status_changed_at: '2025-12-10T08:00:00Z',
    status_changed_by: 'system',
    decline_reason: null,
    source_channel: 'discovery_congress',
    source_detail: 'AANEM 2025 presenter',
    completeness_score: 55,
    tier: null,
    tier_score: null,
    priority_score: 60,
    priority_rank: null,
    is_active: true,
    notes: null,
    created_at: '2025-12-08T08:00:00Z',
    updated_at: '2025-12-10T08:00:00Z',
  },
  {
    id: 'p010',
    npi: '0123456789',
    first_name: 'Michael',
    last_name: 'Kolb',
    credentials: 'MD',
    specialty: 'Hematology',
    subspecialty: null,
    practice_type: 'Community',
    institution_name: 'Piedmont Atlanta Hospital',
    institution_type: 'Community Hospital',
    city: 'Atlanta',
    state: 'GA',
    region: 'Southeast',
    country: 'US',
    years_in_practice: 14,
    fellowship_training: 'Hematology',
    institutional_role: 'Medical Director',
    record_status: 'imported',
    status_changed_at: null,
    status_changed_by: null,
    decline_reason: null,
    source_channel: 'import',
    source_detail: 'Claims Data Import',
    completeness_score: 45,
    tier: null,
    tier_score: null,
    priority_score: 40,
    priority_rank: null,
    is_active: true,
    notes: null,
    created_at: '2025-12-15T08:00:00Z',
    updated_at: '2025-12-15T08:00:00Z',
  },
  {
    id: 'p011',
    npi: '1122334455',
    first_name: 'Jeffrey',
    last_name: 'Allen',
    credentials: 'MD',
    specialty: 'Neurology',
    subspecialty: 'Neuromuscular Medicine',
    practice_type: 'Academic',
    institution_name: 'University of Minnesota',
    institution_type: 'Academic Medical Center',
    city: 'Minneapolis',
    state: 'MN',
    region: 'Midwest',
    country: 'US',
    years_in_practice: 20,
    fellowship_training: 'Neuromuscular',
    institutional_role: 'Professor',
    record_status: 'validated',
    status_changed_at: '2025-11-28T10:00:00Z',
    status_changed_by: 'admin',
    decline_reason: null,
    source_channel: 'import',
    source_detail: 'HCP Master List Q4 2025',
    completeness_score: 80,
    tier: 'regional_institutional',
    tier_score: 58.2,
    priority_score: 72,
    priority_rank: 7,
    is_active: true,
    notes: 'MMN clinical trial experience',
    created_at: '2025-10-01T08:00:00Z',
    updated_at: '2025-12-08T14:00:00Z',
  },
  {
    id: 'p012',
    npi: '2233445566',
    first_name: 'Catherine',
    last_name: 'Broome',
    credentials: 'MD',
    specialty: 'Hematology',
    subspecialty: 'Transfusion Medicine',
    practice_type: 'Academic',
    institution_name: 'Georgetown University Hospital',
    institution_type: 'Academic Medical Center',
    city: 'Washington',
    state: 'DC',
    region: 'Mid-Atlantic',
    country: 'US',
    years_in_practice: 19,
    fellowship_training: 'Hematology',
    institutional_role: 'Associate Professor',
    record_status: 'validated',
    status_changed_at: '2025-12-02T11:00:00Z',
    status_changed_by: 'admin',
    decline_reason: null,
    source_channel: 'field_nomination',
    source_detail: 'DC Field Team',
    completeness_score: 71,
    tier: 'local_community',
    tier_score: 38.5,
    priority_score: 55,
    priority_rank: 12,
    is_active: true,
    notes: 'ITP patient advocate, strong community influence',
    created_at: '2025-11-05T08:00:00Z',
    updated_at: '2025-12-10T09:00:00Z',
  },
  {
    id: 'p013',
    npi: '3344556677',
    first_name: 'Tahseen',
    last_name: 'Mozaffar',
    credentials: 'MD',
    specialty: 'Neurology',
    subspecialty: 'Neuromuscular Medicine',
    practice_type: 'Academic',
    institution_name: 'UC Irvine Health',
    institution_type: 'Academic Medical Center',
    city: 'Irvine',
    state: 'CA',
    region: 'West',
    country: 'US',
    years_in_practice: 24,
    fellowship_training: 'Neuromuscular',
    institutional_role: 'Division Chief',
    record_status: 'validated',
    status_changed_at: '2025-11-30T09:30:00Z',
    status_changed_by: 'admin',
    decline_reason: null,
    source_channel: 'import',
    source_detail: 'HCP Master List Q4 2025',
    completeness_score: 86,
    tier: 'regional_institutional',
    tier_score: 66.4,
    priority_score: 82,
    priority_rank: 4,
    is_active: true,
    notes: 'gMG, CIDP specialist. Multiple Phase 3 trials PI.',
    created_at: '2025-10-01T08:00:00Z',
    updated_at: '2025-12-18T16:00:00Z',
  },
  {
    id: 'p014',
    npi: '4455667788',
    first_name: 'Waleed',
    last_name: 'Al-Herz',
    credentials: 'MD, FAAP',
    specialty: 'Immunology',
    subspecialty: 'Primary Immunodeficiency',
    practice_type: 'Academic',
    institution_name: 'Kuwait University',
    institution_type: 'Academic Medical Center',
    city: 'Kuwait City',
    state: null,
    region: 'Middle East',
    country: 'KW',
    years_in_practice: 20,
    fellowship_training: 'Clinical Immunology',
    institutional_role: 'Professor',
    record_status: 'nominated',
    status_changed_at: '2025-12-12T07:00:00Z',
    status_changed_by: 'field_rep',
    decline_reason: null,
    source_channel: 'field_nomination',
    source_detail: 'Gulf Region Medical Affairs',
    completeness_score: 42,
    tier: null,
    tier_score: null,
    priority_score: 50,
    priority_rank: null,
    is_active: true,
    notes: null,
    created_at: '2025-12-12T07:00:00Z',
    updated_at: '2025-12-12T07:00:00Z',
  },
  {
    id: 'p015',
    npi: '5566778899',
    first_name: 'Srikanth',
    last_name: 'Muppidi',
    credentials: 'MD',
    specialty: 'Neurology',
    subspecialty: 'Neuromuscular Medicine',
    practice_type: 'Academic',
    institution_name: 'Stanford Health Care',
    institution_type: 'Academic Medical Center',
    city: 'Palo Alto',
    state: 'CA',
    region: 'West',
    country: 'US',
    years_in_practice: 15,
    fellowship_training: 'Neuromuscular',
    institutional_role: 'Associate Professor',
    record_status: 'validated',
    status_changed_at: '2025-11-20T15:00:00Z',
    status_changed_by: 'admin',
    decline_reason: null,
    source_channel: 'import',
    source_detail: 'HCP Master List Q4 2025',
    completeness_score: 90,
    tier: 'global_national',
    tier_score: 77.0,
    priority_score: 88,
    priority_rank: 3,
    is_active: true,
    notes: 'gMG expert, REGAIN trial co-investigator',
    created_at: '2025-10-01T08:00:00Z',
    updated_at: '2025-12-19T10:00:00Z',
  },
  {
    id: 'p016',
    npi: '6677889900',
    first_name: 'Terry',
    last_name: 'Gernsheimer',
    credentials: 'MD',
    specialty: 'Hematology',
    subspecialty: 'Transfusion Medicine',
    practice_type: 'Academic',
    institution_name: 'University of Washington Medical Center',
    institution_type: 'Academic Medical Center',
    city: 'Seattle',
    state: 'WA',
    region: 'West',
    country: 'US',
    years_in_practice: 30,
    fellowship_training: 'Hematology',
    institutional_role: 'Professor',
    record_status: 'validated',
    status_changed_at: '2025-11-15T14:00:00Z',
    status_changed_by: 'admin',
    decline_reason: null,
    source_channel: 'import',
    source_detail: 'ITP Expert Panel Import',
    completeness_score: 76,
    tier: 'regional_institutional',
    tier_score: 60.2,
    priority_score: 75,
    priority_rank: 6,
    is_active: true,
    notes: 'ASH ITP guideline panelist',
    created_at: '2025-10-10T08:00:00Z',
    updated_at: '2025-12-14T11:00:00Z',
  },
  {
    id: 'p017',
    npi: '7788990011',
    first_name: 'Kazim',
    last_name: 'Sheikh',
    credentials: 'MBBS, PhD',
    specialty: 'Neurology',
    subspecialty: 'Neuroimmunology',
    practice_type: 'Academic',
    institution_name: 'Johns Hopkins University',
    institution_type: 'Academic Medical Center',
    city: 'Baltimore',
    state: 'MD',
    region: 'Mid-Atlantic',
    country: 'US',
    years_in_practice: 26,
    fellowship_training: 'Neuroimmunology',
    institutional_role: 'Full Professor',
    record_status: 'validated',
    status_changed_at: '2025-11-12T10:00:00Z',
    status_changed_by: 'admin',
    decline_reason: null,
    source_channel: 'import',
    source_detail: 'HCP Master List Q4 2025',
    completeness_score: 83,
    tier: 'global_national',
    tier_score: 80.1,
    priority_score: 92,
    priority_rank: 2,
    is_active: true,
    notes: 'CIDP & GBS expert, NIH funded researcher',
    created_at: '2025-10-01T08:00:00Z',
    updated_at: '2025-12-20T09:00:00Z',
  },
  {
    id: 'p018',
    npi: '8899001122',
    first_name: 'Nicole',
    last_name: 'Yarosh',
    credentials: 'DO',
    specialty: 'Neurology',
    subspecialty: 'Neuromuscular Medicine',
    practice_type: 'Community',
    institution_name: 'Orlando Health',
    institution_type: 'Community Hospital',
    city: 'Orlando',
    state: 'FL',
    region: 'Southeast',
    country: 'US',
    years_in_practice: 6,
    fellowship_training: 'Neuromuscular',
    institutional_role: 'Attending Physician',
    record_status: 'discovered',
    status_changed_at: '2025-12-18T12:00:00Z',
    status_changed_by: 'system',
    decline_reason: null,
    source_channel: 'discovery_claims',
    source_detail: 'Claims analysis - high gMG Rx volume',
    completeness_score: 35,
    tier: null,
    tier_score: null,
    priority_score: 45,
    priority_rank: null,
    is_active: true,
    notes: null,
    created_at: '2025-12-18T12:00:00Z',
    updated_at: '2025-12-18T12:00:00Z',
  },
];

/* ================================================================== */
/*  Import Batches                                                     */
/* ================================================================== */

export const importBatches: ImportBatch[] = [
  {
    id: 'b001',
    filename: 'hcp_master_list_q4_2025.csv',
    uploaded_by: 'Sarah Chen',
    team: 'Medical Affairs',
    description: 'Q4 2025 master HCP list refresh',
    total_rows: 156,
    new_records: 12,
    updated_records: 8,
    duplicate_records: 134,
    error_records: 2,
    status: 'completed',
    created_at: '2025-12-01T09:00:00Z',
    completed_at: '2025-12-01T09:05:00Z',
    pending_conflicts: 3,
  },
  {
    id: 'b002',
    filename: 'itp_expert_panel.xlsx',
    uploaded_by: 'Mark Thompson',
    team: 'Commercial',
    description: 'ITP expert panel list from ASH meeting',
    total_rows: 45,
    new_records: 8,
    updated_records: 5,
    duplicate_records: 32,
    error_records: 0,
    status: 'completed',
    created_at: '2025-11-15T14:30:00Z',
    completed_at: '2025-11-15T14:32:00Z',
    pending_conflicts: 0,
  },
  {
    id: 'b003',
    filename: 'field_nominations_dec.csv',
    uploaded_by: 'Jennifer Lee',
    team: 'Field',
    description: 'December field nominations batch',
    total_rows: 22,
    new_records: 18,
    updated_records: 2,
    duplicate_records: 2,
    error_records: 0,
    status: 'completed',
    created_at: '2025-12-10T11:00:00Z',
    completed_at: '2025-12-10T11:01:00Z',
    pending_conflicts: 1,
  },
];

/* ================================================================== */
/*  Import Conflicts                                                   */
/* ================================================================== */

export const importConflicts: Record<string, ImportConflict[]> = {
  b001: [
    {
      id: 'c001',
      import_batch_id: 'b001',
      physician_id: 'p001',
      conflict_type: 'field_mismatch',
      field_name: 'institution_name',
      existing_value: 'University of Missouri',
      incoming_value: 'University of Missouri School of Medicine',
      resolution: 'pending',
      resolved_by: null,
      resolved_at: null,
      created_at: '2025-12-01T09:03:00Z',
      physician_name: 'Richard Barohn',
      physician_institution: 'University of Missouri',
    },
    {
      id: 'c002',
      import_batch_id: 'b001',
      physician_id: 'p003',
      conflict_type: 'field_mismatch',
      field_name: 'institutional_role',
      existing_value: 'Associate Professor',
      incoming_value: 'Professor',
      resolution: 'pending',
      resolved_by: null,
      resolved_at: null,
      created_at: '2025-12-01T09:03:00Z',
      physician_name: 'Mamatha Pasnoor',
      physician_institution: 'University of Kansas Medical Center',
    },
    {
      id: 'c003',
      import_batch_id: 'b001',
      physician_id: 'p013',
      conflict_type: 'field_mismatch',
      field_name: 'years_in_practice',
      existing_value: '24',
      incoming_value: '25',
      resolution: 'pending',
      resolved_by: null,
      resolved_at: null,
      created_at: '2025-12-01T09:03:00Z',
      physician_name: 'Tahseen Mozaffar',
      physician_institution: 'UC Irvine Health',
    },
  ],
  b003: [
    {
      id: 'c004',
      import_batch_id: 'b003',
      physician_id: 'p007',
      conflict_type: 'field_mismatch',
      field_name: 'specialty',
      existing_value: 'Neurology',
      incoming_value: 'Neuromuscular Medicine',
      resolution: 'pending',
      resolved_by: null,
      resolved_at: null,
      created_at: '2025-12-10T11:01:00Z',
      physician_name: 'Amanda Piquet',
      physician_institution: 'Swedish Neuroscience Institute',
    },
  ],
};

/* ================================================================== */
/*  Review Queue                                                       */
/* ================================================================== */

export const reviewQueueItems: ReviewQueueItem[] = [
  {
    type: 'nomination',
    id: 'n001',
    first_name: 'Waleed',
    last_name: 'Al-Herz',
    credentials: 'MD, FAAP',
    specialty: 'Immunology',
    institution_name: 'Kuwait University',
    city: 'Kuwait City',
    state: null,
    evidence_or_rationale: 'Extensive primary immunodeficiency research with relevance to IgG treatment optimization. Publishes on IVIG outcomes in PID population.',
    source_detail: 'Gulf Region Medical Affairs',
    disease_context: 'MMN / CIDP',
    score: 72,
    created_at: '2025-12-12T07:00:00Z',
  },
  {
    type: 'discovery',
    id: 'd001',
    first_name: 'Nicole',
    last_name: 'Yarosh',
    credentials: 'DO',
    specialty: 'Neurology',
    institution_name: 'Orlando Health',
    city: 'Orlando',
    state: 'FL',
    evidence_or_rationale: 'Identified through claims analysis. High gMG prescribing volume (top 5% in FL), not currently on master list.',
    source_detail: 'Claims Analysis Engine',
    disease_context: 'gMG',
    score: 68,
    created_at: '2025-12-18T12:00:00Z',
  },
  {
    type: 'nomination',
    id: 'n002',
    first_name: 'Laura',
    last_name: 'Herbas-Rocha',
    credentials: 'MD',
    specialty: 'Hematology',
    institution_name: 'Baptist Health South Florida',
    city: 'Miami',
    state: 'FL',
    evidence_or_rationale: 'Field team observed high ITP patient volume and active participation in regional hematology meetings. Strong referral network in South Florida.',
    source_detail: 'SE Region Field Team',
    disease_context: 'ITP',
    score: 55,
    created_at: '2025-12-08T09:30:00Z',
  },
  {
    type: 'discovery',
    id: 'd002',
    first_name: 'Raghav',
    last_name: 'Govindarajan',
    credentials: 'MD',
    specialty: 'Neurology',
    institution_name: 'University of Missouri Health Care',
    city: 'Columbia',
    state: 'MO',
    evidence_or_rationale: 'Published 3 papers on gMG treatment outcomes in 2025. Presenting at AAN 2026.',
    source_detail: 'PubMed Discovery Scan',
    disease_context: 'gMG',
    score: 63,
    created_at: '2025-12-05T14:00:00Z',
  },
];

export const reviewQueueStats: ReviewQueueStats = {
  total_pending: 4,
  pending_discoveries: 2,
  pending_nominations: 2,
  oldest_pending_date: '2025-12-05T14:00:00Z',
};

/* ================================================================== */
/*  Sentiment Scores                                                   */
/* ================================================================== */

const sentimentScores: Record<string, SentimentScore[]> = {
  p001: [
    {
      id: 's001',
      physician_id: 'p001',
      disease_id: 'gmg',
      assessment_date: '2025-12-15',
      disease_belief_score: 4.5,
      product_perception_score: 4.0,
      behavioral_readiness_score: 3.5,
      composite_score: 4.0,
      conversion_stage: 'evaluating',
      score_type: 'field_assessment',
      confidence_level: 'high',
      scored_by: 'Sarah Chen',
      notes: 'Very favorable to mechanism, wants more real-world data',
      created_at: '2025-12-15T10:00:00Z',
    },
    {
      id: 's002',
      physician_id: 'p001',
      disease_id: 'gmg',
      assessment_date: '2025-10-20',
      disease_belief_score: 4.0,
      product_perception_score: 3.5,
      behavioral_readiness_score: 3.0,
      composite_score: 3.5,
      conversion_stage: 'interested',
      score_type: 'field_assessment',
      confidence_level: 'medium',
      scored_by: 'Mark Thompson',
      notes: 'Interested but cautious, wants Phase 3 data',
      created_at: '2025-10-20T14:00:00Z',
    },
  ],
  p004: [
    {
      id: 's003',
      physician_id: 'p004',
      disease_id: 'itp',
      assessment_date: '2025-12-10',
      disease_belief_score: 5.0,
      product_perception_score: 4.5,
      behavioral_readiness_score: 4.0,
      composite_score: 4.5,
      conversion_stage: 'adopting',
      score_type: 'field_assessment',
      confidence_level: 'high',
      scored_by: 'Sarah Chen',
      notes: 'Strong advocate, already prescribing to select patients',
      created_at: '2025-12-10T11:00:00Z',
    },
  ],
  p015: [
    {
      id: 's004',
      physician_id: 'p015',
      disease_id: 'gmg',
      assessment_date: '2025-12-01',
      disease_belief_score: 4.0,
      product_perception_score: 3.0,
      behavioral_readiness_score: 2.5,
      composite_score: 3.2,
      conversion_stage: 'interested',
      score_type: 'field_assessment',
      confidence_level: 'medium',
      scored_by: 'Jennifer Lee',
      notes: 'Interested in mechanism, wants to see head-to-head data',
      created_at: '2025-12-01T16:00:00Z',
    },
  ],
};

/* ================================================================== */
/*  Engagement Records                                                 */
/* ================================================================== */

const engagementRecords: Record<string, EngagementRecord[]> = {
  p001: [
    {
      id: 'e001',
      physician_id: 'p001',
      engagement_type: 'advisory_board',
      engagement_date: '2025-12-05',
      channel: 'In-person',
      duration_minutes: 120,
      topic: 'gMG treatment landscape and unmet needs',
      disease_id: 'gmg',
      field_notes: 'Very engaged, provided insights on real-world treatment patterns',
      recorded_by: 'Sarah Chen',
      created_at: '2025-12-05T18:00:00Z',
    },
    {
      id: 'e002',
      physician_id: 'p001',
      engagement_type: 'speaker_program',
      engagement_date: '2025-11-15',
      channel: 'Virtual',
      duration_minutes: 60,
      topic: 'Managing treatment-resistant gMG',
      disease_id: 'gmg',
      field_notes: 'Presented to 45 attendees, strong Q&A engagement',
      recorded_by: 'Mark Thompson',
      created_at: '2025-11-15T20:00:00Z',
    },
    {
      id: 'e003',
      physician_id: 'p001',
      engagement_type: 'field_visit',
      engagement_date: '2025-10-20',
      channel: 'In-person',
      duration_minutes: 30,
      topic: 'Pipeline update and clinical trial discussion',
      disease_id: 'gmg',
      field_notes: 'Discussed new Phase 3 results, expressed interest in site participation',
      recorded_by: 'Sarah Chen',
      created_at: '2025-10-20T15:00:00Z',
    },
  ],
  p004: [
    {
      id: 'e004',
      physician_id: 'p004',
      engagement_type: 'congress_meeting',
      engagement_date: '2025-12-08',
      channel: 'In-person',
      duration_minutes: 45,
      topic: 'ASH 2025 ITP symposium follow-up',
      disease_id: 'itp',
      field_notes: 'Met at ASH, discussed ITP management guidelines update',
      recorded_by: 'Mark Thompson',
      created_at: '2025-12-08T22:00:00Z',
    },
  ],
  p015: [
    {
      id: 'e005',
      physician_id: 'p015',
      engagement_type: 'field_visit',
      engagement_date: '2025-11-28',
      channel: 'In-person',
      duration_minutes: 25,
      topic: 'gMG clinical data review',
      disease_id: 'gmg',
      field_notes: 'Reviewed latest efficacy data, requested reprint',
      recorded_by: 'Jennifer Lee',
      created_at: '2025-11-28T17:00:00Z',
    },
  ],
};

/* ================================================================== */
/*  Tier Breakdown Data                                                */
/* ================================================================== */

const tierBreakdowns: Record<string, TierBreakdownResponse> = {
  p001: {
    physician_id: 'p001',
    tier: 'global_national',
    tier_score: 82.5,
    dimensions: [
      { dimension: 'scientific_impact', raw_score: 88, weighted_score: 11.0, weight: 12.5 },
      { dimension: 'clinical_authority', raw_score: 92, weighted_score: 11.5, weight: 12.5 },
      { dimension: 'peer_influence', raw_score: 85, weighted_score: 10.6, weight: 12.5 },
      { dimension: 'congress_presence', raw_score: 78, weighted_score: 9.8, weight: 12.5 },
      { dimension: 'trial_leadership', raw_score: 90, weighted_score: 11.3, weight: 12.5 },
      { dimension: 'guideline_editorial_authority', raw_score: 75, weighted_score: 9.4, weight: 12.5 },
      { dimension: 'digital_advocacy', raw_score: 45, weighted_score: 5.6, weight: 12.5 },
      { dimension: 'industry_recognition', raw_score: 82, weighted_score: 10.3, weight: 12.5 },
    ],
  },
  p002: {
    physician_id: 'p002',
    tier: 'global_national',
    tier_score: 79.3,
    dimensions: [
      { dimension: 'scientific_impact', raw_score: 85, weighted_score: 10.6, weight: 12.5 },
      { dimension: 'clinical_authority', raw_score: 88, weighted_score: 11.0, weight: 12.5 },
      { dimension: 'peer_influence', raw_score: 80, weighted_score: 10.0, weight: 12.5 },
      { dimension: 'congress_presence', raw_score: 82, weighted_score: 10.3, weight: 12.5 },
      { dimension: 'trial_leadership', raw_score: 72, weighted_score: 9.0, weight: 12.5 },
      { dimension: 'guideline_editorial_authority', raw_score: 78, weighted_score: 9.8, weight: 12.5 },
      { dimension: 'digital_advocacy', raw_score: 38, weighted_score: 4.8, weight: 12.5 },
      { dimension: 'industry_recognition', raw_score: 70, weighted_score: 8.8, weight: 12.5 },
    ],
  },
  p004: {
    physician_id: 'p004',
    tier: 'global_national',
    tier_score: 88.2,
    dimensions: [
      { dimension: 'scientific_impact', raw_score: 95, weighted_score: 11.9, weight: 12.5 },
      { dimension: 'clinical_authority', raw_score: 94, weighted_score: 11.8, weight: 12.5 },
      { dimension: 'peer_influence', raw_score: 90, weighted_score: 11.3, weight: 12.5 },
      { dimension: 'congress_presence', raw_score: 88, weighted_score: 11.0, weight: 12.5 },
      { dimension: 'trial_leadership', raw_score: 92, weighted_score: 11.5, weight: 12.5 },
      { dimension: 'guideline_editorial_authority', raw_score: 85, weighted_score: 10.6, weight: 12.5 },
      { dimension: 'digital_advocacy', raw_score: 50, weighted_score: 6.3, weight: 12.5 },
      { dimension: 'industry_recognition', raw_score: 88, weighted_score: 11.0, weight: 12.5 },
    ],
  },
  p007: {
    physician_id: 'p007',
    tier: 'rising_star',
    tier_score: 42.3,
    dimensions: [
      { dimension: 'scientific_impact', raw_score: 30, weighted_score: 3.8, weight: 12.5 },
      { dimension: 'clinical_authority', raw_score: 55, weighted_score: 6.9, weight: 12.5 },
      { dimension: 'peer_influence', raw_score: 35, weighted_score: 4.4, weight: 12.5 },
      { dimension: 'congress_presence', raw_score: 48, weighted_score: 6.0, weight: 12.5 },
      { dimension: 'trial_leadership', raw_score: 25, weighted_score: 3.1, weight: 12.5 },
      { dimension: 'guideline_editorial_authority', raw_score: 10, weighted_score: 1.3, weight: 12.5 },
      { dimension: 'digital_advocacy', raw_score: 72, weighted_score: 9.0, weight: 12.5 },
      { dimension: 'industry_recognition', raw_score: 40, weighted_score: 5.0, weight: 12.5 },
    ],
  },
  p015: {
    physician_id: 'p015',
    tier: 'global_national',
    tier_score: 77.0,
    dimensions: [
      { dimension: 'scientific_impact', raw_score: 82, weighted_score: 10.3, weight: 12.5 },
      { dimension: 'clinical_authority', raw_score: 80, weighted_score: 10.0, weight: 12.5 },
      { dimension: 'peer_influence', raw_score: 75, weighted_score: 9.4, weight: 12.5 },
      { dimension: 'congress_presence', raw_score: 85, weighted_score: 10.6, weight: 12.5 },
      { dimension: 'trial_leadership', raw_score: 80, weighted_score: 10.0, weight: 12.5 },
      { dimension: 'guideline_editorial_authority', raw_score: 60, weighted_score: 7.5, weight: 12.5 },
      { dimension: 'digital_advocacy', raw_score: 55, weighted_score: 6.9, weight: 12.5 },
      { dimension: 'industry_recognition', raw_score: 65, weighted_score: 8.1, weight: 12.5 },
    ],
  },
};

/* ================================================================== */
/*  Tier Config Weights                                                */
/* ================================================================== */

export const tierConfigWeights: TierConfigResponse = {
  disease_id: null,
  weights: [
    { id: 'tw1', dimension: 'scientific_impact', weight: 12.5, is_active: true },
    { id: 'tw2', dimension: 'clinical_authority', weight: 12.5, is_active: true },
    { id: 'tw3', dimension: 'peer_influence', weight: 12.5, is_active: true },
    { id: 'tw4', dimension: 'congress_presence', weight: 12.5, is_active: true },
    { id: 'tw5', dimension: 'trial_leadership', weight: 12.5, is_active: true },
    { id: 'tw6', dimension: 'guideline_editorial_authority', weight: 12.5, is_active: true },
    { id: 'tw7', dimension: 'digital_advocacy', weight: 12.5, is_active: true },
    { id: 'tw8', dimension: 'industry_recognition', weight: 12.5, is_active: true },
  ],
};

/* ================================================================== */
/*  List Health (Dashboard analytics)                                  */
/* ================================================================== */

export const listHealth: ListHealth = {
  total_physicians: 18,
  count_by_status: {
    validated: 12,
    imported: 1,
    under_review: 1,
    nominated: 1,
    discovered: 1,
    declined: 0,
    archived: 0,
  },
  count_by_source: {
    import: 10,
    field_nomination: 3,
    discovery_publications: 1,
    discovery_congress: 1,
    discovery_claims: 1,
    discovery_referral: 0,
    discovery_competitive_trials: 0,
  },
  average_completeness: 72,
  completeness_distribution: {
    '0-25': 0,
    '25-50': 3,
    '50-75': 5,
    '75-100': 10,
  },
  count_by_state: {
    CA: 2,
    NY: 2,
    WA: 2,
    MO: 1,
    KS: 1,
    GA: 1,
    MN: 1,
    DC: 1,
    MD: 1,
    FL: 1,
  },
};

/* ================================================================== */
/*  Persona builder                                                    */
/* ================================================================== */

export function getPersona(physicianId: string): Persona | null {
  const phy = physicians.find((p) => p.id === physicianId);
  if (!phy) return null;

  const publications: any[] = [];
  const congress: any[] = [];
  const trials: any[] = [];
  const prescribing: any[] = [];
  const competitive: any[] = [];

  if (physicianId === 'p001') {
    publications.push(
      { title: 'Eculizumab in Generalized Myasthenia Gravis: Subgroup Analysis of REGAIN', journal: 'Muscle & Nerve', date: '2025-06-15', impact_factor: 3.8 },
      { title: 'Treatment Paradigms in Generalized MG: A Review', journal: 'Neurology Reviews', date: '2025-01-20', impact_factor: 4.2 },
      { title: 'Long-term Safety of FcRn Inhibitors in MG', journal: 'JAMA Neurology', date: '2024-09-10', impact_factor: 11.3 },
    );
    congress.push(
      { congress_name: 'AAN 2025', role: 'Invited Speaker', year: 2025, presentation_type: 'Plenary' },
      { congress_name: 'AANEM 2025', role: 'Session Chair', year: 2025, presentation_type: 'Symposium' },
    );
    trials.push(
      { trial_name: 'CHAMPION-MG', role: 'Principal Investigator', phase: '3', status: 'Completed' },
      { trial_name: 'VIVACITY-MG3', role: 'Steering Committee', phase: '3', status: 'Enrolling' },
    );
    prescribing.push(
      { period: 'Q3 2025', patients: 45, new_starts: 8, formulation: 'SC' },
      { period: 'Q2 2025', patients: 42, new_starts: 5, formulation: 'SC' },
    );
    competitive.push(
      { company: 'argenx', type: 'Advisory Board', product: 'Vyvgart', year: 2024, payment: 15000 },
      { company: 'UCB', type: 'Speaker', product: 'Rystiggo', year: 2025, payment: 8000 },
    );
  }

  if (physicianId === 'p004') {
    publications.push(
      { title: 'Romiplostim for First-Line Treatment of ITP', journal: 'NEJM', date: '2025-03-01', impact_factor: 96.2 },
      { title: 'Long-term Outcomes with Thrombopoietin Receptor Agonists', journal: 'Blood', date: '2025-07-15', impact_factor: 25.2 },
    );
    congress.push(
      { congress_name: 'ASH 2025', role: 'Keynote Speaker', year: 2025, presentation_type: 'Plenary' },
    );
    trials.push(
      { trial_name: 'FLIGHT-ITP', role: 'Principal Investigator', phase: '3', status: 'Completed' },
    );
    prescribing.push(
      { period: 'Q3 2025', patients: 120, new_starts: 15, formulation: 'IV' },
      { period: 'Q2 2025', patients: 115, new_starts: 12, formulation: 'IV' },
    );
    competitive.push(
      { company: 'Amgen', type: 'Consultant', product: 'Nplate', year: 2025, payment: 20000 },
      { company: 'Novartis', type: 'Advisory Board', product: 'Promacta', year: 2024, payment: 12000 },
      { company: 'Rigel', type: 'Speaker', product: 'Tavalisse', year: 2024, payment: 6000 },
    );
  }

  if (physicianId === 'p015') {
    publications.push(
      { title: 'MG-ADL as a Composite Endpoint in Clinical Trials', journal: 'Neurology', date: '2025-04-10', impact_factor: 9.9 },
    );
    congress.push(
      { congress_name: 'AANEM 2025', role: 'Oral Presenter', year: 2025, presentation_type: 'Free Communication' },
    );
    trials.push(
      { trial_name: 'REGAIN', role: 'Co-Investigator', phase: '3', status: 'Completed' },
    );
  }

  return {
    identity: { ...phy, tier_score: phy.tier_score },
    prescribing,
    publications,
    congress,
    trials,
    sentiment: sentimentScores[physicianId] || [],
    engagements: engagementRecords[physicianId] || [],
    competitive,
  };
}

/* ================================================================== */
/*  Tier breakdown getter                                              */
/* ================================================================== */

export function getTierBreakdown(physicianId: string): TierBreakdownResponse {
  return (
    tierBreakdowns[physicianId] || {
      physician_id: physicianId,
      tier: null,
      tier_score: null,
      dimensions: [],
    }
  );
}

/* ================================================================== */
/*  Physician list with filtering + pagination                         */
/* ================================================================== */

export function getPhysicianList(params: {
  page?: number;
  page_size?: number;
  search?: string;
  status?: string;
  source_channel?: string;
  state?: string;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}): PhysicianListResponse {
  let filtered = [...physicians];

  // Search
  if (params.search) {
    const q = params.search.toLowerCase();
    filtered = filtered.filter(
      (p) =>
        `${p.first_name} ${p.last_name}`.toLowerCase().includes(q) ||
        (p.npi && p.npi.includes(q))
    );
  }

  // Status filter (comma-separated)
  if (params.status) {
    const statuses = params.status.split(',');
    filtered = filtered.filter((p) => statuses.includes(p.record_status));
  }

  // Source filter
  if (params.source_channel) {
    filtered = filtered.filter((p) => p.source_channel === params.source_channel);
  }

  // State filter
  if (params.state) {
    filtered = filtered.filter((p) => p.state === params.state);
  }

  // Sort
  const sortBy = params.sort_by || 'last_name';
  const sortOrder = params.sort_order || 'asc';
  filtered.sort((a, b) => {
    let aVal: any = (a as any)[sortBy];
    let bVal: any = (b as any)[sortBy];
    if (typeof aVal === 'string') aVal = aVal.toLowerCase();
    if (typeof bVal === 'string') bVal = bVal.toLowerCase();
    if (aVal == null) return 1;
    if (bVal == null) return -1;
    if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });

  const page = params.page || 1;
  const pageSize = params.page_size || 25;
  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const start = (page - 1) * pageSize;
  const items = filtered.slice(start, start + pageSize);

  return { items, total, page, page_size: pageSize, total_pages: totalPages };
}
