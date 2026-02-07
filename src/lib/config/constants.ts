/**
 * 全局配置常量
 *
 * 集中管理应用中的魔法数字和配置项
 */

// ============================================================================
// WebSocket 配置
// ============================================================================

export const WS_CONFIG = {
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
// 分页配置
// ============================================================================

export const PAGINATION_CONFIG = {
  /** 默认每页条数 */
  DEFAULT_PAGE_SIZE: 20,
  /** 最大每页条数 */
  MAX_PAGE_SIZE: 100,
  /** 默认页码 */
  DEFAULT_PAGE: 1,
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
// 告警阈值配置
// ============================================================================

export const ALERT_THRESHOLDS = {
  /** 精度警告阈值 */
  ACCURACY: {
    WARNING: 0.02,
    CRITICAL: 0.05,
  },
  /** 最大显示异常数 */
  MAX_DISPLAY_ANOMALIES: 5,
  /** 价格偏差警告阈值 */
  PRICE_DEVIATION: {
    WARNING: 0.01,
    CRITICAL: 0.05,
  },
} as const;

// ============================================================================
// UI 配置
// ============================================================================

export const UI_CONFIG = {
  /** 动画持续时间（毫秒） */
  ANIMATION_DURATION: 300,
  /** Toast 显示时间（毫秒） */
  TOAST_DURATION: 5000,
  /** 模态框遮罩透明度 */
  MODAL_OVERLAY_OPACITY: 0.5,
  /** 表格行高 */
  TABLE_ROW_HEIGHT: 48,
  /** 最大显示标签数 */
  MAX_VISIBLE_TAGS: 3,
} as const;

// ============================================================================
// 协议配置
// ============================================================================

export const PROTOCOL_COLORS = Object.freeze({
  chainlink: '#375bd2',
  pyth: '#e6c35c',
  band: '#00b2a9',
  api3: '#7ce3cb',
  redstone: '#ff6b6b',
  uma: '#ff4d4d',
  default: '#888888',
} as const);

export const PROTOCOL_NAMES = Object.freeze({
  chainlink: 'Chainlink',
  pyth: 'Pyth Network',
  band: 'Band Protocol',
  api3: 'API3',
  redstone: 'RedStone',
  uma: 'UMA',
} as const);

// ============================================================================
// 状态配置
// ============================================================================

export const STATUS_CONFIG = Object.freeze({
  excellent: {
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    label: 'Excellent',
  },
  good: {
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-50',
    borderColor: 'border-emerald-200',
    label: 'Good',
  },
  warning: {
    color: 'text-amber-600',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
    label: 'Warning',
  },
  critical: {
    color: 'text-rose-600',
    bgColor: 'bg-rose-50',
    borderColor: 'border-rose-200',
    label: 'Critical',
  },
  info: {
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    label: 'Info',
  },
} as const);

// ============================================================================
// 时间配置
// ============================================================================

export const TIME_CONFIG = {
  /** 一分钟（毫秒） */
  ONE_MINUTE: 60 * 1000,
  /** 一小时（毫秒） */
  ONE_HOUR: 60 * 60 * 1000,
  /** 一天（毫秒） */
  ONE_DAY: 24 * 60 * 60 * 1000,
  /** 一周（毫秒） */
  ONE_WEEK: 7 * 24 * 60 * 60 * 1000,
} as const;

// ============================================================================
// 数据新鲜度阈值配置（秒）
// ============================================================================

export const DEFAULT_STALENESS_THRESHOLDS = Object.freeze({
  PYTH: 60,
  CHAINLINK: 3600,
  BAND: 300,
  API3: 300,
  REDSTONE: 60,
  SWITCHBOARD: 300,
  FLUX: 300,
  DIA: 300,
  UMA: 600,
} as const);

// ============================================================================
// 速率限制配置
// ============================================================================

export const RATE_LIMIT_CONFIG = {
  /** 默认内存限制 */
  DEFAULT_MEMORY_LIMIT: 10000,
  /** 默认窗口大小（毫秒） */
  DEFAULT_WINDOW_MS: 60000,
  /** 默认最大请求数 */
  DEFAULT_MAX_REQUESTS: 100,
} as const;

// ============================================================================
// 数据库配置
// ============================================================================

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
