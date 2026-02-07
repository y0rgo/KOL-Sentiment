import { useCallback, useEffect, useState } from 'react';
import { fetchNetworkGraph } from '../api/client';
import type { NetworkGraph } from '../types';

export function useNetwork() {
  const [graph, setGraph] = useState<NetworkGraph | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await fetchNetworkGraph();
      setGraph(result);
    } catch {
      setGraph(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return { graph, loading, reload: load };
}
