import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || '';

const api = axios.create({
  baseURL: `${API_BASE}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Master List
export const fetchPhysicians = (params: Record<string, any>) =>
  api.get('/master-list', { params });

export const fetchPhysician = (id: string) =>
  api.get(`/master-list/${id}`);

export const updatePhysician = (id: string, data: Record<string, any>) =>
  api.put(`/master-list/${id}`, data);

export const transitionStatus = (id: string, data: { new_status: string; changed_by: string; reason?: string }) =>
  api.put(`/master-list/${id}/status`, data);

export const fetchMasterListStats = () =>
  api.get('/master-list/stats');

// Imports
export const uploadImport = (formData: FormData) =>
  api.post('/imports/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

export const fetchBatches = () =>
  api.get('/imports/batches');

export const fetchBatch = (id: string) =>
  api.get(`/imports/batches/${id}`);

export const fetchConflicts = (resolution?: string) =>
  api.get('/imports/conflicts', { params: { resolution: resolution || 'pending' } });

export const fetchBatchConflicts = (batchId: string) =>
  api.get(`/imports/conflicts/${batchId}`);

export const resolveConflict = (id: string, data: { resolution: string; resolved_by: string; manual_value?: string }) =>
  api.put(`/imports/conflicts/${id}/resolve`, data);

export const bulkResolveConflicts = (data: { conflict_ids: string[]; resolution: string; resolved_by: string }) =>
  api.post('/imports/conflicts/bulk-resolve', data);

// Nominations
export const createNomination = (data: Record<string, any>) =>
  api.post('/nominations', data);

export const fetchNominations = (review_status?: string) =>
  api.get('/nominations', { params: review_status ? { review_status } : {} });

export const reviewNomination = (id: string, data: { review_status: string; reviewed_by: string; review_notes?: string }) =>
  api.put(`/nominations/${id}/review`, data);

// Review Queue
export const fetchReviewQueue = () =>
  api.get('/review-queue');

export const fetchReviewQueueStats = () =>
  api.get('/review-queue/stats');

// Analytics
export const fetchListHealth = () =>
  api.get('/analytics/list-health');

export const fetchImportActivity = () =>
  api.get('/analytics/import-activity');

// Sentiment
export const createSentimentScore = (data: Record<string, any>) =>
  api.post('/sentiment/score', data);

export const fetchSentimentHistory = (physicianId: string) =>
  api.get(`/sentiment/physician/${physicianId}/history`);

export const fetchSentimentBarriers = (physicianId: string) =>
  api.get(`/sentiment/physician/${physicianId}/barriers`);

// Engagements
export const createEngagement = (data: Record<string, any>) =>
  api.post('/engagements', data);

export const fetchEngagements = (physicianId: string) =>
  api.get(`/engagements/physician/${physicianId}`);

// Persona
export const fetchPersona = (physicianId: string) =>
  api.get(`/physicians/${physicianId}/persona`);

// Tier Classification
export const fetchTierConfig = (diseaseId?: string) =>
  api.get('/tier/config', { params: diseaseId ? { disease_id: diseaseId } : {} });

export const updateTierConfig = (data: { disease_id?: string | null; weights: { dimension: string; weight: number }[] }) =>
  api.put('/tier/config', data);

export const fetchTierBreakdown = (physicianId: string) =>
  api.get(`/tier/physician/${physicianId}/breakdown`);

export const recomputeAllTiers = (diseaseId?: string) =>
  api.post('/tier/recompute', null, { params: diseaseId ? { disease_id: diseaseId } : {} });

export const recomputeSingleTier = (physicianId: string) =>
  api.post(`/tier/recompute/${physicianId}`);

export default api;
