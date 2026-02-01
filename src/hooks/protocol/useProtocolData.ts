'use client';

import useSWR from 'swr';
import type { OracleProtocol, OracleStats, SupportedChain } from '@/lib/types';

interface UseProtocolDataOptions {
  protocol?: OracleProtocol;
  chain?: SupportedChain;
  refreshInterval?: number;
}

interface ProtocolDataResponse {
  stats: OracleStats;
  protocols: OracleProtocol[];
  chains: SupportedChain[];
}

const fetcher = async (url: string) => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('Failed to fetch protocol data');
  }
  return response.json();
};

export function useProtocolData(options: UseProtocolDataOptions = {}) {
  const { protocol, chain, refreshInterval = 30000 } = options;

  const params = new URLSearchParams();
  if (protocol) params.append('protocol', protocol);
  if (chain) params.append('chain', chain);

  const url = `/api/oracle/stats?${params.toString()}`;

  const { data, error, isLoading, mutate } = useSWR<ProtocolDataResponse>(url, fetcher, {
    refreshInterval,
    revalidateOnFocus: true,
    dedupingInterval: 5000,
  });

  return {
    stats: data?.stats,
    protocols: data?.protocols,
    chains: data?.chains,
    isLoading,
    error,
    refresh: mutate,
  };
}

export function useProtocolStats(protocol: OracleProtocol, chain?: SupportedChain) {
  const { stats, isLoading, error, refresh } = useProtocolData({
    protocol,
    chain,
  });

  return {
    stats,
    isLoading,
    error,
    refresh,
  };
}

export function useAllProtocols() {
  const { protocols, chains, isLoading, error } = useProtocolData();

  return {
    protocols,
    chains,
    isLoading,
    error,
  };
}
