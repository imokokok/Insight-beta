/**
 * SWR Configuration - SWR 全局配置
 */

import type { SWRConfiguration } from 'swr';

export const defaultSwrConfig: SWRConfiguration = {
  revalidateOnFocus: false,
  revalidateOnReconnect: true,
  refreshInterval: 0,
  errorRetryCount: 3,
  errorRetryInterval: 5000,
  dedupingInterval: 2000,
  loadingTimeout: 3000,
};

export const realtimeSwrConfig: SWRConfiguration = {
  ...defaultSwrConfig,
  refreshInterval: 30000, // 30秒自动刷新
  revalidateOnFocus: true,
};

export const staticSwrConfig: SWRConfiguration = {
  ...defaultSwrConfig,
  revalidateOnFocus: false,
  revalidateOnReconnect: false,
  errorRetryCount: 1,
};
