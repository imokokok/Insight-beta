import type { SWRConfiguration } from 'swr';

const BASE_CONFIG = {
  revalidateOnFocus: true,
  revalidateOnReconnect: true,
  errorRetryCount: 3,
  errorRetryInterval: 1000,
  focusThrottleInterval: 3000,
  loadingTimeout: 10000,
} as const;

export const realtimeDataConfig: SWRConfiguration = {
  ...BASE_CONFIG,
  refreshInterval: 5000,
  dedupingInterval: 2000,
  keepPreviousData: true,
};

export const priceDataConfig: SWRConfiguration = {
  ...BASE_CONFIG,
  refreshInterval: 5000,
  dedupingInterval: 1000,
  keepPreviousData: true,
  errorRetryCount: 5,
};

export const latencyDataConfig: SWRConfiguration = {
  ...BASE_CONFIG,
  refreshInterval: 10000,
  dedupingInterval: 2000,
  keepPreviousData: true,
};

export const historicalDataConfig: SWRConfiguration = {
  ...BASE_CONFIG,
  refreshInterval: 60000,
  dedupingInterval: 10000,
  revalidateOnFocus: false,
};

export const configDataConfig: SWRConfiguration = {
  ...BASE_CONFIG,
  refreshInterval: 300000,
  dedupingInterval: 30000,
  revalidateOnFocus: false,
  errorRetryCount: 2,
};

export const defaultSwrConfig: SWRConfiguration = {
  ...BASE_CONFIG,
  dedupingInterval: 5000,
};

export const getSwrConfig = (
  type: 'realtime' | 'price' | 'latency' | 'historical' | 'config'
): SWRConfiguration => {
  const configMap = {
    realtime: realtimeDataConfig,
    price: priceDataConfig,
    latency: latencyDataConfig,
    historical: historicalDataConfig,
    config: configDataConfig,
  } as const;

  return configMap[type];
};

export type { SWRConfiguration };
