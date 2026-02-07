import { useCallback, useEffect, useState } from 'react';
import { fetchPersona } from '../api/client';
import type { PersonaOutput } from '../types';

export function usePersona(physicianId: string | undefined) {
  const [persona, setPersona] = useState<PersonaOutput | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!physicianId) return;
    setLoading(true);
    setError(null);
    try {
      const result = await fetchPersona(physicianId);
      setPersona(result);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch persona');
    } finally {
      setLoading(false);
    }
  }, [physicianId]);

  useEffect(() => { load(); }, [load]);

  return { persona, loading, error, reload: load };
}
