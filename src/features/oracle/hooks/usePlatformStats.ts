'use client';

import { useEffect, useState, useCallback } from 'react';

import { fetchApiData } from '@/shared/utils';

export interface PlatformStats {
  totalProtocols: number;
  totalPriceFeeds: number;
  supportedChains: number;
  avgUpdateLatency: number;
}

const DEFAULT_STATS: PlatformStats = {
  totalProtocols: 10,
  totalPriceFeeds: 150,
  supportedChains: 15,
  avgUpdateLatency: 500,
};

export function usePlatformStats() {
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    try {
      const data = await fetchApiData<PlatformStats>('/api/oracle/unified/stats');
      setStats(data);
    } catch {
      setStats(DEFAULT_STATS);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return {
    stats: stats ?? DEFAULT_STATS,
    loading,
    refresh: fetchStats,
  };
}
