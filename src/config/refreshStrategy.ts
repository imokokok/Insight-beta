/**
 * Refresh Strategy - 数据刷新策略配置
 */

export interface RefreshStrategyConfig {
  interval: number;
  enabled: boolean;
  maxRetries: number;
}

export const DEFAULT_REFRESH_STRATEGY: RefreshStrategyConfig = {
  interval: 30000,
  enabled: true,
  maxRetries: 3,
};

export const getRefreshStrategy = (_key: string): RefreshStrategyConfig => {
  return DEFAULT_REFRESH_STRATEGY;
};

export const formatLastUpdated = (date: Date | null): string => {
  if (!date) return '';

  const now = new Date();
  const diff = now.getTime() - date.getTime();

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (seconds < 60) {
    return 'Just now';
  } else if (minutes < 60) {
    return `${minutes}m ago`;
  } else if (hours < 24) {
    return `${hours}h ago`;
  } else {
    return date.toLocaleDateString();
  }
};
