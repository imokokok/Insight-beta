'use client';

import { useState, useEffect, useCallback } from 'react';

import { logger } from '@/shared/logger';
import { fetchApiData } from '@/shared/utils';
import type { OracleProtocol } from '@/types/oracle';

export interface ProtocolMetrics {
  protocol: OracleProtocol;
  latency: number;
  accuracy: number;
  updateFrequency: number;
  priceDeviation: number;
  totalFeeds: number;
  activeFeeds: number;
  uptime: number;
  tvl: number;
}

interface MetricsResponse {
  metrics: ProtocolMetrics[];
  lastUpdated: string;
  isMock: boolean;
}

interface UseProtocolMetricsOptions {
  protocols?: OracleProtocol[];
  enabled?: boolean;
}

interface UseProtocolMetricsReturn {
  metrics: ProtocolMetrics[];
  isLoading: boolean;
  isError: boolean;
  error: string | null;
  isMock: boolean;
  lastUpdated: string | null;
  refresh: () => Promise<void>;
}

export function useProtocolMetrics(
  options: UseProtocolMetricsOptions = {},
): UseProtocolMetricsReturn {
  const { protocols, enabled = true } = options;

  const [metrics, setMetrics] = useState<ProtocolMetrics[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isMock, setIsMock] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  const fetchMetrics = useCallback(async () => {
    if (!enabled) return;

    try {
      setIsLoading(true);
      setIsError(false);
      setError(null);

      const params = protocols && protocols.length > 0 ? `?protocols=${protocols.join(',')}` : '';

      const response = await fetchApiData<MetricsResponse>(`/api/comparison/metrics${params}`);

      setMetrics(response.metrics);
      setIsMock(response.isMock);
      setLastUpdated(response.lastUpdated);
    } catch (err) {
      logger.error('Failed to fetch protocol metrics', { error: err });
      setIsError(true);
      setError(err instanceof Error ? err.message : 'Failed to fetch metrics');
    } finally {
      setIsLoading(false);
    }
  }, [protocols, enabled]);

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  return {
    metrics,
    isLoading,
    isError,
    error,
    isMock,
    lastUpdated,
    refresh: fetchMetrics,
  };
}
