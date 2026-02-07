import axios from 'axios';
import type {
  Physician,
  PhysicianListResponse,
  PhysicianImportResult,
  SentimentScore,
  SentimentScoreCreate,
  SentimentBarrier,
  Engagement,
  EngagementCreate,
  PersonaOutput,
  TierDistribution,
  ConversionFunnelItem,
  GeographicCoverageItem,
  NetworkGraph,
} from '../types';

const api = axios.create({
  baseURL: '/api',
});

// Physicians
export const fetchPhysicians = async (params?: Record<string, string | number>): Promise<PhysicianListResponse> => {
  const { data } = await api.get('/physicians', { params });
  return data;
};

export const fetchPhysician = async (id: string): Promise<Physician> => {
  const { data } = await api.get(`/physicians/${id}`);
  return data;
};

export const fetchPersona = async (id: string): Promise<PersonaOutput> => {
  const { data } = await api.get(`/physicians/${id}/persona`);
  return data;
};

export const importPhysicians = async (file: File): Promise<PhysicianImportResult> => {
  const formData = new FormData();
  formData.append('file', file);
  const { data } = await api.post('/physicians/import', formData);
  return data;
};

// Sentiment
export const createSentimentScore = async (score: SentimentScoreCreate): Promise<SentimentScore> => {
  const { data } = await api.post('/sentiment/score', score);
  return data;
};

export const fetchSentimentHistory = async (physicianId: string): Promise<SentimentScore[]> => {
  const { data } = await api.get(`/sentiment/physician/${physicianId}/history`);
  return data;
};

export const fetchSentimentBarriers = async (physicianId: string): Promise<SentimentBarrier[]> => {
  const { data } = await api.get(`/sentiment/physician/${physicianId}/barriers`);
  return data;
};

// Engagements
export const createEngagement = async (engagement: EngagementCreate): Promise<Engagement> => {
  const { data } = await api.post('/engagements', engagement);
  return data;
};

export const fetchEngagements = async (physicianId: string): Promise<Engagement[]> => {
  const { data } = await api.get(`/engagements/physician/${physicianId}`);
  return data;
};

// Analytics
export const fetchTierDistribution = async (): Promise<TierDistribution[]> => {
  const { data } = await api.get('/analytics/tier-distribution');
  return data;
};

export const fetchConversionFunnel = async (): Promise<ConversionFunnelItem[]> => {
  const { data } = await api.get('/analytics/conversion-funnel');
  return data;
};

export const fetchGeographicCoverage = async (): Promise<GeographicCoverageItem[]> => {
  const { data } = await api.get('/analytics/geographic-coverage');
  return data;
};

// Network
export const fetchNetworkGraph = async (): Promise<NetworkGraph> => {
  const { data } = await api.get('/network/graph');
  return data;
};

export default api;
