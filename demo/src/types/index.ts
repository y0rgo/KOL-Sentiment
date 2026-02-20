export interface Physician {
  id: string;
  npi: string | null;
  first_name: string;
  last_name: string;
  credentials: string | null;
  specialty: string | null;
  subspecialty: string | null;
  practice_type: string | null;
  institution_name: string | null;
  institution_type: string | null;
  city: string | null;
  state: string | null;
  region: string | null;
  country: string | null;
  years_in_practice: number | null;
  fellowship_training: string | null;
  institutional_role: string | null;
  record_status: string;
  status_changed_at: string | null;
  status_changed_by: string | null;
  decline_reason: string | null;
  source_channel: string;
  source_detail: string | null;
  completeness_score: number;
  tier: string | null;
  tier_score: number | null;
  priority_score: number | null;
  priority_rank: number | null;
  is_active: boolean;
  notes: string | null;
  kol_power_index: number | null;
  engagement_priority: number | null;
  created_at: string;
  updated_at: string;
}

export interface PhysicianListResponse {
  items: Physician[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface ImportBatch {
  id: string;
  filename: string;
  uploaded_by: string;
  team: string;
  description: string;
  total_rows: number;
  new_records: number;
  updated_records: number;
  duplicate_records: number;
  error_records: number;
  status: string;
  created_at: string;
  completed_at: string | null;
  pending_conflicts?: number;
}

export interface ImportConflict {
  id: string;
  import_batch_id: string;
  physician_id: string;
  conflict_type: string;
  field_name: string;
  existing_value: string;
  incoming_value: string;
  resolution: string;
  resolved_by: string | null;
  resolved_at: string | null;
  created_at: string;
  physician_name?: string;
  physician_institution?: string;
}

export interface FieldNomination {
  id: string;
  npi: string | null;
  first_name: string;
  last_name: string;
  credentials: string | null;
  specialty: string | null;
  institution_name: string | null;
  city: string | null;
  state: string | null;
  nominated_by: string;
  nominator_role: string | null;
  disease_context: string | null;
  rationale: string;
  observed_influence: string | null;
  matched_physician_id: string | null;
  review_status: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_notes: string | null;
  created_at: string;
  existing_physician?: {
    id: string;
    name: string;
    record_status: string;
    institution_name: string;
  };
}

export interface ReviewQueueItem {
  type: 'discovery' | 'nomination';
  id: string;
  first_name: string;
  last_name: string;
  credentials: string | null;
  specialty: string | null;
  institution_name: string | null;
  city: string | null;
  state: string | null;
  evidence_or_rationale: string;
  source_detail: string;
  disease_context?: string;
  score: number | null;
  created_at: string;
}

export interface ReviewQueueStats {
  total_pending: number;
  pending_discoveries: number;
  pending_nominations: number;
  oldest_pending_date: string | null;
}

export interface SentimentScore {
  id: string;
  physician_id: string;
  disease_id: string | null;
  assessment_date: string;
  disease_belief_score: number | null;
  product_perception_score: number | null;
  behavioral_readiness_score: number | null;
  composite_score: number | null;
  conversion_stage: string | null;
  score_type: string | null;
  confidence_level: string | null;
  scored_by: string | null;
  notes: string | null;
  created_at: string;
}

export interface EngagementRecord {
  id: string;
  physician_id: string;
  engagement_type: string;
  engagement_date: string;
  channel: string | null;
  duration_minutes: number | null;
  topic: string | null;
  disease_id: string | null;
  field_notes: string | null;
  recorded_by: string | null;
  created_at: string;
}

export interface ListHealth {
  total_physicians: number;
  count_by_status: Record<string, number>;
  count_by_source: Record<string, number>;
  average_completeness: number;
  completeness_distribution: Record<string, number>;
  count_by_state: Record<string, number>;
}

export type PillarName = 'disease_belief' | 'treatment_philosophy' | 'competitive_positioning';

export interface PersonaPillar {
  name: PillarName;
  label: string;
  summary: string;
  key_points: string[];
}

export interface EvidenceSource {
  citation: string;
  title: string;
  insight: string;
  pillars: PillarName[];
}

export interface PersonaIntelligence {
  pillars: PersonaPillar[];
  evidence_map: EvidenceSource[];
  sentiment_rationale?: string;
  product_context?: string;
}

export interface Persona {
  identity: Physician & { tier_score: number | null };
  prescribing: any[];
  publications: any[];
  congress: any[];
  trials: any[];
  sentiment: SentimentScore[];
  engagements: EngagementRecord[];
  competitive: any[];
  intelligence?: PersonaIntelligence;
}

export interface TierDimensionScore {
  dimension: string;
  raw_score: number;
  weighted_score: number;
  weight?: number;
  computed_at?: string;
}

export interface TierBreakdownResponse {
  physician_id: string;
  tier: string | null;
  tier_score: number | null;
  dimensions: TierDimensionScore[];
}

export interface TierWeight {
  id: string;
  dimension: string;
  weight: number;
  is_active: boolean;
}

export interface TierConfigResponse {
  disease_id: string | null;
  weights: TierWeight[];
}
