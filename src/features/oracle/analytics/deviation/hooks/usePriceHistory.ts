import useSWR from 'swr';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export interface PriceHistoryRecord {
  id: number;
  protocol: string;
  symbol: string;
  chain: string | null;
  price: number;
  confidence: number | null;
  source_price: number | null;
  deviation: number | null;
  latency_ms: number | null;
  timestamp: string;
  created_at: string;
}

export interface PriceHistoryResponse {
  success: boolean;
  protocol: string;
  symbol: string;
  count: number;
  data: PriceHistoryRecord[];
}

export function usePriceHistory(
  protocol: string,
  symbol: string,
  options?: {
    startTime?: Date;
    endTime?: Date;
    limit?: number;
  },
) {
  const params = new URLSearchParams();
  params.set('protocol', protocol);
  params.set('symbol', symbol);
  if (options?.startTime) params.set('startTime', options.startTime.toISOString());
  if (options?.endTime) params.set('endTime', options.endTime.toISOString());
  if (options?.limit) params.set('limit', options.limit.toString());

  const { data, error, isLoading, mutate } = useSWR<PriceHistoryResponse>(
    `/api/oracle/history/prices?${params.toString()}`,
    fetcher,
    {
      refreshInterval: 60000,
      revalidateOnFocus: false,
    },
  );

  return {
    data: data?.data ?? [],
    count: data?.count ?? 0,
    isLoading,
    isError: !!error,
    error: error?.message,
    refresh: mutate,
  };
}

export function useLatestPrices(protocol?: string, symbol?: string) {
  const params = new URLSearchParams();
  params.set('latest', 'true');
  if (protocol) params.set('protocol', protocol);
  if (symbol) params.set('symbol', symbol);

  const { data, error, isLoading, mutate } = useSWR<PriceHistoryResponse>(
    `/api/oracle/history/prices?${params.toString()}`,
    fetcher,
    {
      refreshInterval: 30000,
      revalidateOnFocus: false,
    },
  );

  return {
    data: data?.data ?? [],
    isLoading,
    isError: !!error,
    error: error?.message,
    refresh: mutate,
  };
}
