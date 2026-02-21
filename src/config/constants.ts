/**
 * 全局配置常量
 *
 * 集中管理应用中的魔法数字和配置项
 */

// ============================================================================
// 支持的交易符号
// ============================================================================

export const SUPPORTED_SYMBOLS = {
  PRICE_PAIRS: ['ETH/USD', 'BTC/USD', 'LINK/USD', 'MATIC/USD', 'AVAX/USD', 'SOL/USD'] as const,
  TICKERS: ['BTC', 'ETH', 'SOL', 'LINK', 'AVAX'] as const,
} as const;

export type SupportedPricePair = (typeof SUPPORTED_SYMBOLS.PRICE_PAIRS)[number];
export type SupportedTicker = (typeof SUPPORTED_SYMBOLS.TICKERS)[number];

// ============================================================================
// SSE 连接配置
// ============================================================================

export const SSE_CONFIG = {
  MAX_CONNECTIONS: 100,
  HEARTBEAT_INTERVAL_MS: 30000,
  MAX_SYMBOLS_PER_REQUEST: 10,
} as const;

// ============================================================================
// 速率限制配置
// ============================================================================

export const RATE_LIMIT_CONFIG = {
  DEFAULT_WINDOW_MS: 60000,
  DEFAULT_MAX_REQUESTS: 100,
  STRICT_MAX_REQUESTS: 10,
  RELAXED_MAX_REQUESTS: 1000,
  SSE_MAX_REQUESTS: 5,
} as const;

// ============================================================================
// 分页配置
// ============================================================================

export const PAGINATION_CONFIG = {
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
} as const;

// ============================================================================
// WebSocket 配置
// ============================================================================

export const WS_CONFIG = {
  /** WebSocket URL */
  URL: process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001',
  /** 最大重连次数 */
  MAX_RECONNECT_ATTEMPTS: 5,
  /** 基础重连延迟（毫秒） */
  BASE_RECONNECT_DELAY_MS: 1000,
  /** 最大重连延迟（毫秒） */
  MAX_RECONNECT_DELAY_MS: 30000,
  /** 退避乘数 */
  BACKOFF_MULTIPLIER: 2,
  /** 心跳间隔（毫秒） */
  HEARTBEAT_INTERVAL: 30000,
  /** 心跳超时（毫秒） */
  HEARTBEAT_TIMEOUT: 60000,
} as const;

// ============================================================================
// 防抖/节流配置
// ============================================================================

export const DEBOUNCE_CONFIG = {
  /** 搜索输入防抖延迟（毫秒） */
  SEARCH_DELAY: 300,
  /** 窗口调整节流延迟（毫秒） */
  RESIZE_DELAY: 200,
  /** 滚动节流延迟（毫秒） */
  SCROLL_DELAY: 100,
} as const;

// ============================================================================
// 缓存配置
// ============================================================================

export const CACHE_CONFIG = {
  /** 默认缓存时间（毫秒） */
  DEFAULT_CACHE_TIME: 5 * 60 * 1000, // 5分钟
  /** 默认刷新间隔（毫秒） */
  DEFAULT_REFRESH_INTERVAL: 30 * 1000, // 30秒
  /** 默认去重间隔（毫秒） */
  DEFAULT_DEDUPING_INTERVAL: 2000, // 2秒
  /** 本地存储前缀 */
  STORAGE_PREFIX: 'oracle_',
} as const;

// ============================================================================
// 协议颜色（已移至 lib/theme/colors.ts）
// ============================================================================

export { PROTOCOL_COLORS } from '@/lib/design-system/tokens/colors';

// ============================================================================
// 数据新鲜度阈值配置（秒）
// ============================================================================

export const DEFAULT_STALENESS_THRESHOLDS = Object.freeze({
  PYTH: 60,
  CHAINLINK: 3600,
  REDSTONE: 60,
  UMA: 600,
  API3: 300,
  BAND: 300,
} as const);

// ============================================================================
// 数据库配置
// ============================================================================

export const DB_POOL_CONFIG = {
  MAX_CONNECTIONS: parseInt(process.env.DB_POOL_MAX ?? '20', 10),
  MIN_CONNECTIONS: parseInt(process.env.DB_POOL_MIN ?? '2', 10),
  IDLE_TIMEOUT_MS: parseInt(process.env.DB_IDLE_TIMEOUT ?? '30000', 10),
  CONNECTION_TIMEOUT_MS: parseInt(process.env.DB_CONNECTION_TIMEOUT ?? '10000', 10),
} as const;

export const DATABASE_CONFIG = {
  /** 默认连接池大小 */
  DEFAULT_POOL_SIZE: 10,
  /** 默认空闲超时（毫秒） */
  DEFAULT_IDLE_TIMEOUT: 30000,
  /** 默认连接超时（毫秒） */
  DEFAULT_CONNECTION_TIMEOUT: 5000,
  /** 默认最大使用次数 */
  DEFAULT_MAX_USES: 7500,
} as const;

// ============================================================================
// 默认回退价格配置
// ============================================================================

export const DEFAULT_FALLBACK_PRICES = Object.freeze({
  BTC: 50000,
  ETH: 3000,
  DEFAULT: 100,
} as const);

// ============================================================================
// 跨链 API 支持的交易对
// ============================================================================

export const VALID_SYMBOLS = ['BTC', 'ETH', 'SOL', 'LINK', 'AVAX', 'MATIC', 'UNI', 'AAVE'] as const;

// ============================================================================
// 支持的区块链网络配置
// ============================================================================

export interface ChainInfo {
  id: string;
  name: string;
  symbol: string;
  chainId: number;
  category: 'mainnet' | 'layer2' | 'alt';
  explorer: string;
}

export const SUPPORTED_CHAINS: ChainInfo[] = [
  {
    id: 'ethereum',
    name: 'Ethereum',
    symbol: 'ETH',
    chainId: 1,
    category: 'mainnet',
    explorer: 'https://etherscan.io',
  },
  {
    id: 'polygon',
    name: 'Polygon',
    symbol: 'MATIC',
    chainId: 137,
    category: 'mainnet',
    explorer: 'https://polygonscan.com',
  },
  {
    id: 'arbitrum',
    name: 'Arbitrum One',
    symbol: 'ETH',
    chainId: 42161,
    category: 'layer2',
    explorer: 'https://arbiscan.io',
  },
  {
    id: 'optimism',
    name: 'Optimism',
    symbol: 'ETH',
    chainId: 10,
    category: 'layer2',
    explorer: 'https://optimistic.etherscan.io',
  },
  {
    id: 'base',
    name: 'Base',
    symbol: 'ETH',
    chainId: 8453,
    category: 'layer2',
    explorer: 'https://basescan.org',
  },
  {
    id: 'bsc',
    name: 'BNB Smart Chain',
    symbol: 'BNB',
    chainId: 56,
    category: 'mainnet',
    explorer: 'https://bscscan.com',
  },
  {
    id: 'avalanche',
    name: 'Avalanche C-Chain',
    symbol: 'AVAX',
    chainId: 43114,
    category: 'mainnet',
    explorer: 'https://snowtrace.io',
  },
];

export const SUPPORTED_CHAIN_IDS = Object.freeze(
  SUPPORTED_CHAINS.reduce(
    (acc, chain) => {
      acc[chain.id] = chain.chainId;
      return acc;
    },
    {} as Record<string, number>,
  ),
);

export const LAYER2_CHAINS = Object.freeze(
  SUPPORTED_CHAINS.filter((chain) => chain.category === 'layer2').map((chain) => chain.id),
);

export type SupportedChain = (typeof SUPPORTED_CHAINS)[number]['id'];

// ============================================================================
// 告警阈值配置
// ============================================================================

export const ALERT_THRESHOLDS = Object.freeze({
  /** 价格偏差严重程度阈值（小数形式，如 0.05 = 5%） */
  severity: {
    /** 严重级别阈值 - 偏差 >= 5% */
    critical: 0.05,
    /** 高级别阈值 - 偏差 >= 3% */
    high: 0.03,
    /** 中级别阈值 - 偏差 >= 1% */
    medium: 0.01,
  },
  /** 跨链偏差阈值（百分比形式） */
  crossChain: {
    /** 严重级别阈值 */
    critical: 2.0,
    /** 警告级别阈值 */
    warning: 0.5,
  },
  /** 数据陈旧阈值（秒） */
  staleness: {
    /** 数据过期阈值 - 超过此时间视为过期 */
    expired: 300,
    /** 数据警告阈值 */
    warning: 60,
  },
} as const);

export type AlertSeverityThreshold = typeof ALERT_THRESHOLDS.severity;
export type AlertCrossChainThreshold = typeof ALERT_THRESHOLDS.crossChain;

export const TIME_RANGE_OPTIONS = [
  { value: '1h', label: '1H' },
  { value: '24h', label: '24H' },
  { value: '7d', label: '7D' },
  { value: '30d', label: '30D' },
] as const;

export type TimeRange = (typeof TIME_RANGE_OPTIONS)[number]['value'];
