export interface Physician {
  id: string;
  npi: string;
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
  years_in_practice: number | null;
  fellowship_training: string | null;
  institutional_role: string | null;
  tier: string | null;
  tier_score: number | null;
  tier_last_assessed: string | null;
  source: string | null;
  is_active: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface PhysicianListResponse {
  items: Physician[];
  total: number;
  page: number;
  page_size: number;
}

export interface PhysicianImportResult {
  total_rows: number;
  created: number;
  updated: number;
  errors: string[];
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

export interface SentimentScoreCreate {
  physician_id: string;
  disease_id?: string;
  disease_belief_score: number;
  product_perception_score: number;
  behavioral_readiness_score: number;
  score_type?: string;
  scored_by?: string;
  notes?: string;
  objections_tagged?: string[];
}

export interface SentimentBarrier {
  id: string;
  barrier_type: string;
  severity: string | null;
  source: string | null;
  detail: string | null;
  created_at: string;
}

export interface Engagement {
  id: string;
  physician_id: string;
  engagement_type: string;
  engagement_date: string;
  channel: string | null;
  duration_minutes: number | null;
  topic: string | null;
  disease_id: string | null;
  field_disease_belief_score: number | null;
  field_product_perception_score: number | null;
  field_behavioral_readiness_score: number | null;
  objections_tagged: string[] | null;
  field_notes: string | null;
  recorded_by: string | null;
  created_at: string;
}

export interface EngagementCreate {
  physician_id: string;
  engagement_type: string;
  engagement_date: string;
  channel?: string;
  duration_minutes?: number;
  topic?: string;
  disease_id?: string;
  field_disease_belief_score?: number;
  field_product_perception_score?: number;
  field_behavioral_readiness_score?: number;
  objections_tagged?: string[];
  field_notes?: string;
  recorded_by?: string;
}

export interface PersonaOutput {
  identity: IdentityDomain;
  prescribing: PrescribingDomain;
  research: ResearchDomain;
  influence: InfluenceDomain;
  competitive: CompetitiveDomain;
  sentiment: SentimentDomain;
  engagement: EngagementDomain;
  recommended_actions: RecommendedAction[];
}

export interface IdentityDomain {
  id: string;
  npi: string;
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
  years_in_practice: number | null;
  tier: string | null;
  tier_score: number | null;
  institutional_role: string | null;
}

export interface PrescribingDomain {
  total_patients: number;
  products: Record<string, unknown>[];
  trend: Record<string, unknown>[];
  pa_rate: number | null;
}

export interface ResearchDomain {
  total_publications: number;
  publications: Record<string, unknown>[];
  congress_presentations: Record<string, unknown>[];
}

export interface InfluenceDomain {
  referral_connections: number;
  referrals_in: Record<string, unknown>[];
  referrals_out: Record<string, unknown>[];
  trial_participation: Record<string, unknown>[];
}

export interface CompetitiveDomain {
  affiliations: Record<string, unknown>[];
  total_payments: number | null;
}

export interface SentimentDomain {
  current_scores: Record<string, unknown> | null;
  history: Record<string, unknown>[];
  barriers: Record<string, unknown>[];
  conversion_stage: string | null;
  confidence: string | null;
}

export interface EngagementDomain {
  total_engagements: number;
  recent: Record<string, unknown>[];
  by_type: Record<string, number>;
  last_engagement_date: string | null;
}

export interface RecommendedAction {
  action: string;
  rationale: string;
  priority: string;
}

export interface TierDistribution {
  tier: string;
  count: number;
}

export interface ConversionFunnelItem {
  stage: string;
  count: number;
}

export interface GeographicCoverageItem {
  state: string;
  physician_count: number;
  avg_sentiment: number | null;
}

export interface NetworkGraph {
  nodes: { id: string; name: string; tier: string | null }[];
  links: { source: string; target: string; volume: number | null }[];
}

export const OBJECTION_OPTIONS = [
  'wants_more_rwe',
  'igG_lowering_concern',
  'ivig_access_easier',
  'patient_sc_reluctance',
  'retreatment_timing_unclear',
  'cost_concern',
  'diagnostic_uncertainty',
  'competitive_preference',
  'institutional_barrier',
] as const;

export const ENGAGEMENT_TYPES = [
  'advisory_board',
  'speaker_program',
  'msl_visit',
  'commercial_call',
  'congress_meeting',
  'investigator_study',
  'peer_to_peer',
  'preceptorship',
  'publication_collab',
  'medical_info_request',
  'patient_program_interaction',
] as const;

export const TIER_ORDER = [
  'global_national',
  'regional_institutional',
  'local_community',
  'rising_star',
  'monitor',
] as const;

export const CONVERSION_STAGES = [
  'unaware',
  'skeptical',
  'trialing',
  'adopting',
  'advocating',
] as const;
