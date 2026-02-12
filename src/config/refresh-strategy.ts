/**
 * 数据刷新策略配置
 *
 * 定义不同视图的数据更新周期和策略
 * 降低用户对"是不是卡住了"的疑惑
 */

/**
 * 刷新策略类型
 */
export type RefreshStrategy =
  | 'realtime' // 实时 WebSocket
  | 'frequent' // 高频轮询 (30s)
  | 'standard' // 标准轮询 (1min)
  | 'lazy' // 低频轮询 (5min)
  | 'static'; // 进入时一次

/**
 * 刷新策略配置接口
 */
export interface RefreshStrategyConfig {
  /** 策略标识 */
  id: RefreshStrategy;
  /** 显示名称 */
  label: string;
  /** 描述 */
  description: string;
  /** 轮询间隔（毫秒），0 表示不自动轮询 */
  interval: number;
  /** 是否使用 WebSocket */
  useWebSocket: boolean;
  /** 是否显示刷新指示器 */
  showIndicator: boolean;
  /** 指示器提示文案 */
  indicatorText: string;
}

/**
 * 预定义刷新策略
 */
export const REFRESH_STRATEGIES: Record<RefreshStrategy, RefreshStrategyConfig> = {
  realtime: {
    id: 'realtime',
    label: '实时',
    description: 'WebSocket 实时推送',
    interval: 0,
    useWebSocket: true,
    showIndicator: true,
    indicatorText: '实时更新',
  },
  frequent: {
    id: 'frequent',
    label: '高频',
    description: '每 30 秒自动刷新',
    interval: 30 * 1000,
    useWebSocket: false,
    showIndicator: true,
    indicatorText: '30秒刷新',
  },
  standard: {
    id: 'standard',
    label: '标准',
    description: '每 1 分钟自动刷新',
    interval: 60 * 1000,
    useWebSocket: false,
    showIndicator: true,
    indicatorText: '1分钟刷新',
  },
  lazy: {
    id: 'lazy',
    label: '低频',
    description: '每 5 分钟自动刷新',
    interval: 5 * 60 * 1000,
    useWebSocket: false,
    showIndicator: true,
    indicatorText: '5分钟刷新',
  },
  static: {
    id: 'static',
    label: '静态',
    description: '进入页面时加载一次',
    interval: 0,
    useWebSocket: false,
    showIndicator: false,
    indicatorText: '',
  },
};

/**
 * 页面刷新策略映射
 * 为每个页面/视图配置合适的刷新策略
 */
export const PAGE_REFRESH_STRATEGIES: Record<string, RefreshStrategy> = {
  // Dashboard 核心指标
  'dashboard-overview': 'standard',
  'dashboard-alerts': 'frequent',
  'dashboard-health': 'standard',
  'dashboard-price-trends': 'lazy',

  // Alerts 页面
  'alerts-list': 'frequent',
  'alerts-detail': 'standard',

  // Protocol 页面
  'protocol-list': 'standard',
  'protocol-detail': 'standard',
  'protocol-feeds': 'frequent',

  // Disputes 页面
  'disputes-list': 'frequent',
  'disputes-detail': 'standard',

  // Optimistic Oracle
  'optimistic-overview': 'standard',
  'optimistic-assertions': 'frequent',
  'optimistic-disputes': 'frequent',

  // Security
  'security-dashboard': 'standard',
  'security-risks': 'frequent',

  // Analytics
  'analytics-overview': 'lazy',
  'analytics-deviation': 'standard',
  'analytics-history': 'static',

  // Audit & Watchlist
  'audit-logs': 'lazy',
  watchlist: 'standard',
};

/**
 * 获取页面刷新策略配置
 */
export function getRefreshStrategy(pageId: string): RefreshStrategyConfig {
  const strategyId = PAGE_REFRESH_STRATEGIES[pageId] || 'standard';
  return REFRESH_STRATEGIES[strategyId];
}

/**
 * 格式化最后更新时间
 */
export function formatLastUpdated(lastUpdated: Date | null): string {
  if (!lastUpdated) {
    return '从未更新';
  }

  const now = new Date();
  const diff = now.getTime() - lastUpdated.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (seconds < 10) {
    return '刚刚';
  } else if (seconds < 60) {
    return `${seconds}秒前`;
  } else if (minutes < 60) {
    return `${minutes}分钟前`;
  } else if (hours < 24) {
    return `${hours}小时前`;
  } else {
    return lastUpdated.toLocaleString('zh-CN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }
}
