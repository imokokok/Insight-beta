/**
 * 全局常量配置中心
 *
 * 所有应用常量集中管理，按功能域分组
 * 避免魔法数字散落在代码各处
 */

// ============================================================================
// 价格相关常量
// ============================================================================

/** 默认 fallback 价格（用于测试或数据缺失时） */
export const DEFAULT_FALLBACK_PRICES = {
  BTC: 65000,
  ETH: 3500,
  DEFAULT: 100,
} as const;

/** 支持的交易对列表 */
export const SUPPORTED_TRADING_PAIRS = [
  'ETH/USD',
  'BTC/USD',
  'LINK/USD',
  'MATIC/USD',
  'AVAX/USD',
  'BNB/USD',
  'UNI/USD',
  'AAVE/USD',
  'MKR/USD',
  'USDC/USD',
  'USDT/USD',
  'DAI/USD',
] as const;

/** 价格精度配置 */
export const PRICE_DECIMALS = {
  ETH: 8,
  BTC: 8,
  DEFAULT: 8,
} as const;

// ============================================================================
// 预言机默认陈旧阈值 (秒)
// ============================================================================

/** 各协议默认陈旧阈值 */
export const DEFAULT_STALENESS_THRESHOLDS = {
  /** Pyth Network - 低延迟，60秒 */
  PYTH: 60,
  /** Chainlink - 较慢更新，3600秒 (1小时) */
  CHAINLINK: 3600,
  /** Band Protocol - 300秒 (5分钟) */
  BAND: 300,
  /** API3 - 300秒 (5分钟) */
  API3: 300,
  /** RedStone - 低延迟，60秒 */
  REDSTONE: 60,
  /** Switchboard - 300秒 (5分钟) */
  SWITCHBOARD: 300,
  /** Flux - 300秒 (5分钟) */
  FLUX: 300,
  /** DIA - 300秒 (5分钟) */
  DIA: 300,
  /** UMA - 600秒 (10分钟) */
  UMA: 600,
} as const;

// ============================================================================
// 数据库配置
// ============================================================================

export const DATABASE_CONFIG = {
  /** 默认连接池大小 */
  DEFAULT_POOL_SIZE: 20,
  /** 连接空闲超时（毫秒） */
  DEFAULT_IDLE_TIMEOUT: 30000,
  /** 连接超时（毫秒） */
  DEFAULT_CONNECTION_TIMEOUT: 5000,
  /** 最大使用次数 */
  DEFAULT_MAX_USES: 7500,
  /** 批量插入批次大小 */
  BATCH_SIZE: 100,
  /** 最大批量大小 */
  MAX_BATCH_SIZE: 1000,
} as const;

// ============================================================================
// 速率限制配置
// ============================================================================

export const RATE_LIMIT_CONFIG = {
  /** 内存限制 */
  DEFAULT_MEMORY_LIMIT: 5000,
  /** 时间窗口（毫秒） */
  DEFAULT_WINDOW_MS: 60000,
  /** 最大请求数 */
  DEFAULT_MAX_REQUESTS: 100,
  /** API 默认限制 */
  API_DEFAULT_LIMIT: 100,
  /** API 严格限制 */
  API_STRICT_LIMIT: 10,
} as const;

// ============================================================================
// 预言机核心配置
// ============================================================================

export const ORACLE_CONFIG = {
  /** 内存中最大投票键数量 */
  DEFAULT_MEMORY_MAX_VOTE_KEYS: 200_000,
  /** 投票区块窗口 */
  DEFAULT_MEMORY_VOTE_BLOCK_WINDOW: 50_000n,
  /** 内存中最大断言数 */
  DEFAULT_MEMORY_MAX_ASSERTIONS: 10_000,
  /** 内存中最大争议数 */
  DEFAULT_MEMORY_MAX_DISPUTES: 10_000,
  /** 同步指标保留数量 */
  DEFAULT_SYNC_METRICS_LIMIT: 600,
  /** 同步指标最大保留时间（分钟） */
  DEFAULT_SYNC_METRICS_MAX_AGE_MINUTES: 24 * 60,
  /** 事件最大缓存大小 */
  DEFAULT_ORACLE_EVENTS_MAX_SIZE: 2000,
  /** 默认批次大小 */
  DEFAULT_BATCH_SIZE: 100,
  /** 价格获取超时（毫秒） */
  DEFAULT_PRICE_FETCH_TIMEOUT: 5000,
  /** 价格获取重试延迟（毫秒） */
  DEFAULT_PRICE_FETCH_RETRY_DELAY: 1000,
  /** 默认同步间隔（毫秒） */
  DEFAULT_SYNC_INTERVAL_MS: 30_000,
  /** 最大同步间隔（毫秒） */
  MAX_SYNC_INTERVAL_MS: 300_000,
} as const;

// ============================================================================
// 图表配置
// ============================================================================

export const CHART_CONFIG = {
  /** 默认图表数据点数量 */
  DEFAULT_CHART_LIMIT: 720,
  /** 默认图表时间范围（分钟） */
  DEFAULT_CHART_MINUTES: 360,
  /** 市场统计默认天数 */
  DEFAULT_MARKET_STATS_DAYS: 30,
  /** 市场统计默认限制 */
  DEFAULT_MARKET_STATS_LIMIT: 10,
  /** 精度分析默认天数 */
  DEFAULT_ACCURACY_DAYS: 30,
  /** 精度分析默认交易对 */
  DEFAULT_ACCURACY_SYMBOL: 'ETH',
  /** 精度警告阈值 */
  ACCURACY_THRESHOLD_WARNING: 0.02,
  /** 精度严重阈值 */
  ACCURACY_THRESHOLD_CRITICAL: 0.05,
  /** 最大异常值数量 */
  MAX_ANOMALIES: 5,
} as const;

// ============================================================================
// API 配置
// ============================================================================

export const API_CONFIG = {
  /** 默认分页大小 */
  DEFAULT_PAGE_SIZE: 20,
  /** 最大分页大小 */
  MAX_PAGE_SIZE: 100,
  /** 默认排序 */
  DEFAULT_SORT_ORDER: 'desc',
  /** 最大请求体大小 */
  MAX_REQUEST_BODY_SIZE: '10mb',
  /** 默认超时（毫秒） */
  DEFAULT_TIMEOUT: 30000,
  /** 最大 URL 长度 */
  MAX_URL_LENGTH: 2048,
  /** 最大查询字符串长度 */
  MAX_QUERY_STRING_LENGTH: 1024,
} as const;

// ============================================================================
// 缓存配置
// ============================================================================

export const CACHE_CONFIG = {
  /** LRU 缓存默认大小 */
  DEFAULT_LRU_CACHE_SIZE: 1000,
  /** 默认缓存 TTL（毫秒） */
  DEFAULT_CACHE_TTL: 300000,
  /** 默认去重间隔（毫秒） */
  DEFAULT_DEDUPING_INTERVAL: 15000,
  /** 默认刷新间隔（毫秒） */
  DEFAULT_REFRESH_INTERVAL: 30000,
  /** Redis 默认 TTL（秒） */
  REDIS_DEFAULT_TTL: 300,
  /** 缓存预热批次大小 */
  WARMUP_BATCH_SIZE: 50,
} as const;

// ============================================================================
// 安全配置
// ============================================================================

export const SECURITY_CONFIG = {
  /** 最大 URL 长度 */
  MAX_URL_LENGTH: 2048,
  /** 最大查询字符串长度 */
  MAX_QUERY_STRING_LENGTH: 1024,
  /** 最大请求头大小 */
  MAX_HEADER_SIZE: 8192,
  /** 默认 Token 长度 */
  DEFAULT_TOKEN_LENGTH: 32,
  /** 默认签名长度 */
  DEFAULT_SIGNATURE_LENGTH: 132,
  /** 密码最小长度 */
  MIN_PASSWORD_LENGTH: 8,
  /** 密码最大长度 */
  MAX_PASSWORD_LENGTH: 128,
} as const;

// ============================================================================
// 验证配置
// ============================================================================

export const VALIDATION_CONFIG = {
  /** 地址最小长度 */
  MIN_ADDRESS_LENGTH: 40,
  /** 地址最大长度 */
  MAX_ADDRESS_LENGTH: 42,
  /** 交易哈希最小长度 */
  MIN_TX_HASH_LENGTH: 64,
  /** 交易哈希最大长度 */
  MAX_TX_HASH_LENGTH: 66,
  /** 私钥最小长度 */
  MIN_PRIVATE_KEY_LENGTH: 64,
  /** 私钥最大长度 */
  MAX_PRIVATE_KEY_LENGTH: 66,
  /** 默认字符串最大长度 */
  DEFAULT_STRING_MAX_LENGTH: 255,
  /** 默认文本最大长度 */
  DEFAULT_TEXT_MAX_LENGTH: 65535,
  /** 最大标签数量 */
  MAX_TAGS: 10,
  /** 标签最大长度 */
  MAX_TAG_LENGTH: 50,
} as const;

// ============================================================================
// 网络配置
// ============================================================================

export const NETWORK_CONFIG = {
  /** RPC 默认超时（毫秒） */
  DEFAULT_RPC_TIMEOUT: 30000,
  /** RPC 重试次数 */
  DEFAULT_RPC_RETRY_ATTEMPTS: 3,
  /** RPC 重试延迟（毫秒） */
  DEFAULT_RPC_RETRY_DELAY: 1000,
  /** 默认区块确认数 */
  DEFAULT_BLOCK_CONFIRMATIONS: 2,
  /** Gas 价格倍数 */
  DEFAULT_GAS_PRICE_MULTIPLIER: 1.1,
  /** 最小区块窗口 */
  MIN_BLOCK_WINDOW: 500n,
  /** 最大区块窗口 */
  MAX_BLOCK_WINDOW: 50_000n,
  /** 自适应增长因子 */
  ADAPTIVE_GROWTH_FACTOR: 1.5,
  /** 自适应收缩因子 */
  ADAPTIVE_SHRINK_FACTOR: 0.5,
} as const;

// ============================================================================
// 监控配置
// ============================================================================

export const MONITORING_CONFIG = {
  /** 健康检查间隔（毫秒） */
  DEFAULT_HEALTH_CHECK_INTERVAL: 30000,
  /** 指标保留天数 */
  DEFAULT_METRICS_RETENTION_DAYS: 30,
  /** 告警冷却时间（分钟） */
  DEFAULT_ALERT_COOLDOWN_MINUTES: 5,
  /** 异常检测窗口（毫秒） */
  DEFAULT_ANOMALY_DETECTION_WINDOW: 24 * 60 * 60 * 1000,
  /** Sentry 采样率 */
  SENTRY_SAMPLE_RATE: 0.1,
  /** 性能监控采样率 */
  PERFORMANCE_SAMPLE_RATE: 0.1,
} as const;

// ============================================================================
// 熔断器配置
// ============================================================================

export const CIRCUIT_BREAKER_CONFIG = {
  /** 失败阈值 */
  FAILURE_THRESHOLD: 5,
  /** 冷却时间（毫秒） */
  COOLING_PERIOD_MS: 30_000,
  /** 半开状态测试请求数 */
  HALF_OPEN_REQUESTS: 3,
} as const;

// ============================================================================
// 超时配置
// ============================================================================

export const TIMEOUTS = {
  /** RPC 调用超时 */
  RPC: 30_000,
  /** Webhook 通知超时 */
  WEBHOOK: 10_000,
  /** 数据库查询超时 */
  DATABASE: 30_000,
  /** 同步任务超时 */
  SYNC: 60_000,
  /** 价格获取超时 */
  PRICE_FETCH: 10_000,
  /** API 请求超时 */
  API: 30_000,
  /** 缓存操作超时 */
  CACHE: 5_000,
} as const;

// ============================================================================
// Webhook 配置
// ============================================================================

export const WEBHOOK_CONFIG = {
  /** 最大重试次数 */
  MAX_RETRIES: 3,
  /** 重试退避基数（毫秒） */
  RETRY_BACKOFF_BASE_MS: 1000,
  /** 最大重试退避（毫秒） */
  MAX_RETRY_BACKOFF_MS: 10_000,
  /** 死信队列保留时间（小时） */
  DLQ_RETENTION_HOURS: 24,
} as const;

// ============================================================================
// 分页配置
// ============================================================================

export const PAGINATION_CONFIG = {
  /** 默认页码 */
  DEFAULT_PAGE: 1,
  /** 默认每页数量 */
  DEFAULT_PAGE_SIZE: 20,
  /** 最小每页数量 */
  MIN_PAGE_SIZE: 1,
  /** 最大每页数量 */
  MAX_PAGE_SIZE: 100,
  /** 默认游标 */
  DEFAULT_CURSOR: null,
} as const;

// ============================================================================
// 时间格式配置
// ============================================================================

export const TIME_FORMATS = {
  /** ISO 8601 格式 */
  ISO: 'YYYY-MM-DDTHH:mm:ss.sssZ',
  /** 日期格式 */
  DATE: 'YYYY-MM-DD',
  /** 时间格式 */
  TIME: 'HH:mm:ss',
  /** 日期时间格式 */
  DATETIME: 'YYYY-MM-DD HH:mm:ss',
} as const;

// ============================================================================
// 状态版本
// ============================================================================

export const STATE_VERSION = 2;

// ============================================================================
// 导出聚合
// ============================================================================

/** 所有配置的聚合对象（用于调试和日志） */
export const ALL_CONFIG = {
  prices: DEFAULT_FALLBACK_PRICES,
  database: DATABASE_CONFIG,
  rateLimit: RATE_LIMIT_CONFIG,
  oracle: ORACLE_CONFIG,
  chart: CHART_CONFIG,
  api: API_CONFIG,
  cache: CACHE_CONFIG,
  security: SECURITY_CONFIG,
  validation: VALIDATION_CONFIG,
  network: NETWORK_CONFIG,
  monitoring: MONITORING_CONFIG,
  circuitBreaker: CIRCUIT_BREAKER_CONFIG,
  timeouts: TIMEOUTS,
  webhook: WEBHOOK_CONFIG,
  pagination: PAGINATION_CONFIG,
  timeFormats: TIME_FORMATS,
  stateVersion: STATE_VERSION,
} as const;
