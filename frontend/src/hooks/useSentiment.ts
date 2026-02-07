import { useCallback, useEffect, useState } from 'react';
import { fetchSentimentHistory, fetchSentimentBarriers } from '../api/client';
import type { SentimentScore, SentimentBarrier } from '../types';

export function useSentimentHistory(physicianId: string | undefined) {
  const [scores, setScores] = useState<SentimentScore[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!physicianId) return;
    setLoading(true);
    try {
      const result = await fetchSentimentHistory(physicianId);
      setScores(result);
    } catch {
      setScores([]);
    } finally {
      setLoading(false);
    }
  }, [physicianId]);

  useEffect(() => { load(); }, [load]);

  return { scores, loading, reload: load };
}

export function useSentimentBarriers(physicianId: string | undefined) {
  const [barriers, setBarriers] = useState<SentimentBarrier[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!physicianId) return;
    setLoading(true);
    try {
      const result = await fetchSentimentBarriers(physicianId);
      setBarriers(result);
    } catch {
      setBarriers([]);
    } finally {
      setLoading(false);
    }
  }, [physicianId]);

  useEffect(() => { load(); }, [load]);

  return { barriers, loading, reload: load };
}
