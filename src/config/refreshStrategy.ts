/**
 * 数据刷新策略配置 - 简化版
 *
 * 定义不同视图的数据更新周期
 */

import type { TFunction } from '@/i18n';

export type RefreshStrategy = 'realtime' | 'frequent' | 'standard' | 'lazy' | 'static';

export interface RefreshStrategyConfig {
  id: RefreshStrategy;
  label: string;
  description: string;
  interval: number;
  useWebSocket: boolean;
}

export const getRefreshStrategies = (t: TFunction): Record<RefreshStrategy, RefreshStrategyConfig> => ({
  realtime: {
    id: 'realtime',
    label: t('common.refreshStrategies.realtime'),
    description: t('common.refreshStrategies.realtimeDesc'),
    interval: 0,
    useWebSocket: true,
  },
  frequent: {
    id: 'frequent',
    label: t('common.refreshStrategies.frequent'),
    description: t('common.refreshStrategies.frequentDesc'),
    interval: 30 * 1000,
    useWebSocket: false,
  },
  standard: {
    id: 'standard',
    label: t('common.refreshStrategies.standard'),
    description: t('common.refreshStrategies.standardDesc'),
    interval: 60 * 1000,
    useWebSocket: false,
  },
  lazy: {
    id: 'lazy',
    label: t('common.refreshStrategies.lazy'),
    description: t('common.refreshStrategies.lazyDesc'),
    interval: 5 * 60 * 1000,
    useWebSocket: false,
  },
  static: {
    id: 'static',
    label: t('common.refreshStrategies.static'),
    description: t('common.refreshStrategies.staticDesc'),
    interval: 0,
    useWebSocket: false,
  },
});

// Keep the original for backward compatibility during migration
export const REFRESH_STRATEGIES: Record<RefreshStrategy, RefreshStrategyConfig> = {
  realtime: {
    id: 'realtime',
    label: '实时',
    description: 'WebSocket 实时推送',
    interval: 0,
    useWebSocket: true,
  },
  frequent: {
    id: 'frequent',
    label: '高频',
    description: '每 30 秒自动刷新',
    interval: 30 * 1000,
    useWebSocket: false,
  },
  standard: {
    id: 'standard',
    label: '标准',
    description: '每 1 分钟自动刷新',
    interval: 60 * 1000,
    useWebSocket: false,
  },
  lazy: {
    id: 'lazy',
    label: '低频',
    description: '每 5 分钟自动刷新',
    interval: 5 * 60 * 1000,
    useWebSocket: false,
  },
  static: {
    id: 'static',
    label: '静态',
    description: '进入页面时加载一次',
    interval: 0,
    useWebSocket: false,
  },
};

export const PAGE_REFRESH_STRATEGIES: Record<string, RefreshStrategy> = {
  'dashboard-overview': 'standard',
  'dashboard-alerts': 'frequent',
  'dashboard-health': 'standard',
  'alerts-list': 'frequent',
  'alerts-detail': 'standard',
  'protocol-list': 'standard',
  'protocol-detail': 'standard',
  'disputes-list': 'frequent',
  'disputes-detail': 'standard',
  'security-dashboard': 'standard',
  'analytics-overview': 'lazy',
  'analytics-deviation': 'standard',
  watchlist: 'standard',
};

export function getRefreshStrategy(pageId: string): RefreshStrategyConfig {
  const strategyId = PAGE_REFRESH_STRATEGIES[pageId] || 'standard';
  return REFRESH_STRATEGIES[strategyId];
}

export function formatLastUpdated(lastUpdated: Date | null, t: TFunction | undefined): string {
  if (!lastUpdated) return t ? t('common.timeAgo.never') : 'Never';

  const diff = Date.now() - lastUpdated.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (seconds < 10) return t ? t('common.timeAgo.justNow') : 'Just now';
  if (seconds < 60) return t ? t('common.timeAgo.seconds', { seconds: String(seconds) }) : `${seconds}s ago`;
  if (minutes < 60) return t ? t('common.timeAgo.minutes', { minutes: String(minutes) }) : `${minutes}m ago`;
  if (hours < 24) return t ? t('common.timeAgo.hours', { hours: String(hours) }) : `${hours}h ago`;
  return lastUpdated.toLocaleString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}
