import { useState, useEffect } from 'react';

const STORAGE_KEY = 'oracleFilters';
const DEFAULT_INSTANCE_ID = 'default';

interface OracleFilters {
  instanceId?: string;
}

export function useOracleFilters() {
  const [instanceId, setInstanceId] = useState<string>(DEFAULT_INSTANCE_ID);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (!saved) {
        setInstanceId(DEFAULT_INSTANCE_ID);
        return;
      }

      const parsed = JSON.parse(saved) as OracleFilters | null;
      const value = parsed?.instanceId;

      if (typeof value === 'string' && value.trim()) {
        setInstanceId(value.trim());
      } else {
        setInstanceId(DEFAULT_INSTANCE_ID);
      }
    } catch {
      setInstanceId(DEFAULT_INSTANCE_ID);
    }
  }, []);

  const updateInstanceId = (newInstanceId: string) => {
    const normalized = newInstanceId.trim() || DEFAULT_INSTANCE_ID;
    setInstanceId(normalized);

    if (typeof window !== 'undefined') {
      try {
        const filters: OracleFilters = { instanceId: normalized };
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(filters));
      } catch (error) {
        console.error('Failed to save instanceId:', error);
      }
    }
  };

  const clearInstanceId = () => {
    setInstanceId(DEFAULT_INSTANCE_ID);

    if (typeof window !== 'undefined') {
      try {
        window.localStorage.removeItem(STORAGE_KEY);
      } catch (error) {
        console.error('Failed to clear instanceId:', error);
      }
    }
  };

  return {
    instanceId,
    setInstanceId: updateInstanceId,
    clearInstanceId,
    isDefault: instanceId === DEFAULT_INSTANCE_ID,
  };
}
