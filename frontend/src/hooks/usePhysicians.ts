import { useCallback, useEffect, useState } from 'react';
import { fetchPhysicians } from '../api/client';
import type { Physician, PhysicianListResponse } from '../types';

interface UsePhysiciansParams {
  tier?: string;
  state?: string;
  specialty?: string;
  search?: string;
  page?: number;
  page_size?: number;
}

export function usePhysicians(params: UsePhysiciansParams = {}) {
  const [data, setData] = useState<PhysicianListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const cleanParams: Record<string, string | number> = {};
      if (params.tier) cleanParams.tier = params.tier;
      if (params.state) cleanParams.state = params.state;
      if (params.specialty) cleanParams.specialty = params.specialty;
      if (params.search) cleanParams.search = params.search;
      if (params.page) cleanParams.page = params.page;
      if (params.page_size) cleanParams.page_size = params.page_size;
      const result = await fetchPhysicians(cleanParams);
      setData(result);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch physicians');
    } finally {
      setLoading(false);
    }
  }, [params.tier, params.state, params.specialty, params.search, params.page, params.page_size]);

  useEffect(() => { load(); }, [load]);

  return { data, loading, error, reload: load };
}
