/**
 * 链上活动数据类型定义
 */

export interface OnChainActivityDay {
  /** 日期字符串 (例如：'Jan 15') */
  date: string;
  /** 时间戳 */
  timestamp: number;
  /** 数据更新次数 */
  updates: number;
  /** 活跃价格源数量 */
  activeFeeds: number;
}

export interface OnChainActivityStats {
  /** Chainlink 统计数据 */
  chainlink: {
    totalUpdates: number;
    activeFeeds: number;
    avgLatency: number;
  };
  /** Pyth 统计数据 */
  pyth: {
    totalUpdates: number;
    activeFeeds: number;
    avgLatency: number;
  };
  /** 聚合数据 */
  aggregated: {
    totalUpdates: number;
    totalActiveFeeds: number;
  };
}

export interface OnChainActivityData {
  /** 最近 7 天的活动数据 */
  dailyData: OnChainActivityDay[];
  /** 统计摘要 */
  stats: OnChainActivityStats;
  /** 最后更新时间 */
  lastUpdated: string;
}

export interface UseOnChainActivityReturn {
  /** 活动数据 */
  data: OnChainActivityData | null;
  /** 是否正在加载 */
  loading: boolean;
  /** 错误信息 */
  error: Error | null;
  /** 重新加载数据 */
  refresh: () => Promise<void>;
}
