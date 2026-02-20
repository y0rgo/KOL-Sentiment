/**
 * Mock API client — returns hardcoded data from mockData.ts
 * All functions return Promise<{ data: T }> to match the axios interface.
 */
import {
  physicians,
  importBatches,
  importConflicts,
  reviewQueueItems,
  reviewQueueStats,
  listHealth,
  tierConfigWeights,
  getPhysicianList,
  getPersona,
  getTierBreakdown,
} from '../mockData';

const wrap = <T>(data: T): Promise<{ data: T }> =>
  new Promise((resolve) => setTimeout(() => resolve({ data }), 150));

// Master List
export const fetchPhysicians = (params: Record<string, any>) =>
  wrap(getPhysicianList(params));

export const fetchPhysician = (id: string) => {
  const p = physicians.find((ph) => ph.id === id);
  if (!p) return Promise.reject({ response: { status: 404 } });
  return wrap(p);
};

export const updatePhysician = (_id: string, _data: Record<string, any>) =>
  wrap({ success: true });

export const transitionStatus = (_id: string, _data: { new_status: string; changed_by: string; reason?: string }) =>
  wrap({ success: true });

export const fetchMasterListStats = () => wrap(listHealth);

// Imports
export const uploadImport = (_formData: FormData) =>
  wrap({ batch_id: 'demo', new_records: 5, updated_records: 2, duplicate_records: 10, error_records: 0 });

export const fetchBatches = () => wrap(importBatches);

export const fetchBatch = (id: string) => {
  const b = importBatches.find((batch) => batch.id === id);
  return b ? wrap(b) : Promise.reject({ response: { status: 404 } });
};

export const fetchConflicts = (_resolution?: string) =>
  wrap(Object.values(importConflicts).flat());

export const fetchBatchConflicts = (batchId: string) =>
  wrap(importConflicts[batchId] || []);

export const resolveConflict = (_id: string, _data: { resolution: string; resolved_by: string; manual_value?: string }) =>
  wrap({ success: true });

export const bulkResolveConflicts = (_data: { conflict_ids: string[]; resolution: string; resolved_by: string }) =>
  wrap({ success: true });

// Nominations
export const createNomination = (_data: Record<string, any>) =>
  wrap({ success: true });

export const fetchNominations = (_review_status?: string) =>
  wrap([]);

export const reviewNomination = (_id: string, _data: { review_status: string; reviewed_by: string; review_notes?: string }) =>
  wrap({ success: true });

// Review Queue
export const fetchReviewQueue = () =>
  wrap(reviewQueueItems);

export const fetchReviewQueueStats = () =>
  wrap(reviewQueueStats);

// Analytics
export const fetchListHealth = () => wrap(listHealth);

export const fetchImportActivity = () => wrap(importBatches);

// Sentiment
export const createSentimentScore = (_data: Record<string, any>) =>
  wrap({ success: true });

export const fetchSentimentHistory = (_physicianId: string) =>
  wrap([]);

export const fetchSentimentBarriers = (_physicianId: string) =>
  wrap([]);

// Engagements
export const createEngagement = (_data: Record<string, any>) =>
  wrap({ success: true });

export const fetchEngagements = (_physicianId: string) =>
  wrap([]);

// Persona
export const fetchPersona = (physicianId: string) => {
  const persona = getPersona(physicianId);
  if (!persona) return Promise.reject({ response: { status: 404 } });
  return wrap(persona);
};

// Tier Classification
export const fetchTierConfig = (_diseaseId?: string) =>
  wrap(tierConfigWeights);

export const updateTierConfig = (_data: { disease_id?: string | null; weights: { dimension: string; weight: number }[] }) =>
  wrap({ success: true });

export const fetchTierBreakdown = (physicianId: string) =>
  wrap(getTierBreakdown(physicianId));

export const recomputeAllTiers = (_diseaseId?: string) =>
  wrap({
    total_computed: 12,
    tier_distribution: {
      global_national: 6,
      regional_institutional: 4,
      local_community: 1,
      rising_star: 1,
      emerging: 0,
    },
  });

export const recomputeSingleTier = (_physicianId: string) =>
  wrap({ success: true });
