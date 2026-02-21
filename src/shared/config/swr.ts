import type { SWRConfiguration } from 'swr';

export const defaultSwrConfig: SWRConfiguration = {
  dedupingInterval: 5000,
  revalidateOnFocus: true,
  revalidateOnReconnect: true,
  errorRetryCount: 3,
};

export type { SWRConfiguration };
