/**
 * Environment Variables - 环境变量配置
 *
 * 使用 Zod 进行类型安全的验证和解析
 */

import { z } from 'zod';

// ============================================================================
// 辅助函数
// ============================================================================

function optionalString(defaultValue?: string) {
  return z
    .string()
    .optional()
    .default(defaultValue ?? '');
}

function optionalNumber(defaultValue: number) {
  return z.coerce.number().optional().default(defaultValue);
}

function optionalBoolean(defaultValue: boolean) {
  return z.coerce.boolean().optional().default(defaultValue);
}

function urlString() {
  return z.string().url().optional().or(z.literal(''));
}

// ============================================================================
// 环境变量 Schema 定义
// ============================================================================

const envSchema = z.object({
  // =============================================================================
  // 基础配置
  // =============================================================================
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  NEXT_RUNTIME: z.enum(['nodejs', 'edge']).optional(),

  // =============================================================================
  // 数据库配置 (Supabase)
  // =============================================================================
  DATABASE_URL: optionalString(),

  // Supabase 配置
  SUPABASE_URL: optionalString(),
  SUPABASE_SERVICE_ROLE_KEY: optionalString(),
  SUPABASE_DB_URL: optionalString(),

  // =============================================================================
  // RPC 配置 - 主网
  // =============================================================================
  ETHEREUM_RPC_URL: optionalString(),
  POLYGON_RPC_URL: optionalString(),
  ARBITRUM_RPC_URL: optionalString(),
  OPTIMISM_RPC_URL: optionalString(),
  BASE_RPC_URL: optionalString(),
  AVALANCHE_RPC_URL: optionalString(),
  BSC_RPC_URL: optionalString(),
  FANTOM_RPC_URL: optionalString(),
  SOLANA_RPC_URL: optionalString(),

  // Alchemy 配置
  ALCHEMY_API_KEY: optionalString(),
  ALCHEMY_ETHEREUM_URL: optionalString(),
  ALCHEMY_POLYGON_URL: optionalString(),
  ALCHEMY_ARBITRUM_URL: optionalString(),
  ALCHEMY_OPTIMISM_URL: optionalString(),
  ALCHEMY_BASE_URL: optionalString(),
  ALCHEMY_AVALANCHE_URL: optionalString(),

  // Infura 配置
  INFURA_API_KEY: optionalString(),
  INFURA_ETHEREUM_URL: optionalString(),
  INFURA_POLYGON_URL: optionalString(),
  INFURA_ARBITRUM_URL: optionalString(),
  INFURA_OPTIMISM_URL: optionalString(),
  INFURA_AVALANCHE_URL: optionalString(),

  // QuickNode 配置
  QUICKNODE_ETHEREUM_URL: optionalString(),
  QUICKNODE_POLYGON_URL: optionalString(),
  QUICKNODE_ARBITRUM_URL: optionalString(),
  QUICKNODE_OPTIMISM_URL: optionalString(),
  QUICKNODE_BASE_URL: optionalString(),
  QUICKNODE_SOLANA_URL: optionalString(),

  // =============================================================================
  // RPC 配置 - 测试网
  // =============================================================================
  SEPOLIA_RPC_URL: optionalString(),
  GOERLI_RPC_URL: optionalString(),
  MUMBAI_RPC_URL: optionalString(),
  POLYGON_AMOY_RPC_URL: optionalString(),

  // =============================================================================
  // WebSocket 配置
  // =============================================================================
  WS_PORT: optionalNumber(3001),
  WS_HOST: optionalString('0.0.0.0'),

  // =============================================================================
  // 监控和日志
  // =============================================================================
  // Sentry DSN - 支持旧名 SENTRY_DSN 和新名 NEXT_PUBLIC_SENTRY_DSN
  SENTRY_DSN: urlString(),
  NEXT_PUBLIC_SENTRY_DSN: urlString(),
  SENTRY_ORG: optionalString(),
  SENTRY_PROJECT: optionalString(),
  SENTRY_AUTH_TOKEN: optionalString(),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),

  // 日志采样率 (0.0 - 1.0)，生产环境建议 0.1 (10%)
  LOG_SAMPLE_RATE: optionalNumber(1),

  // =============================================================================
  // 安全
  // =============================================================================
  INSIGHT_ADMIN_TOKEN: optionalString(),
  INSIGHT_ADMIN_TOKEN_SALT: optionalString(),
  INSIGHT_CRON_SECRET: optionalString(),
  CRON_SECRET: optionalString(),
  JWT_SECRET: optionalString(),

  // =============================================================================
  // Insight 特定配置
  // =============================================================================
  INSIGHT_RPC_URL: optionalString(),
  INSIGHT_ALLOW_PRIVATE_RPC_URLS: optionalBoolean(false),
  INSIGHT_CHAIN: optionalString('ethereum'),
  INSIGHT_SLOW_REQUEST_MS: optionalNumber(5000),

  // SLO 配置
  INSIGHT_SLO_MAX_LAG_BLOCKS: optionalNumber(10),
  INSIGHT_SLO_MAX_SYNC_STALENESS_MINUTES: optionalNumber(5),
  INSIGHT_SLO_MAX_ALERT_MTTA_MINUTES: optionalNumber(5),
  INSIGHT_SLO_MAX_ALERT_MTTR_MINUTES: optionalNumber(30),
  INSIGHT_SLO_MAX_INCIDENT_MTTR_MINUTES: optionalNumber(60),
  INSIGHT_SLO_MAX_OPEN_ALERTS: optionalNumber(100),
  INSIGHT_SLO_MAX_OPEN_CRITICAL_ALERTS: optionalNumber(10),

  // 内存配置
  INSIGHT_MEMORY_MAX_VOTE_KEYS: optionalNumber(1000),
  INSIGHT_MEMORY_VOTE_BLOCK_WINDOW: optionalNumber(100),
  INSIGHT_MEMORY_MAX_ASSERTIONS: optionalNumber(10000),
  INSIGHT_MEMORY_MAX_DISPUTES: optionalNumber(5000),

  // 缓存配置
  INSIGHT_PRICE_CACHE_TTL_MS: optionalNumber(30000),
  INSIGHT_DEX_TWAP_CACHE_TTL_MS: optionalNumber(60000),
  INSIGHT_POOL_META_CACHE_TTL_MS: optionalNumber(300000),

  // 价格回退配置
  INSIGHT_FALLBACK_BTC_PRICE: optionalNumber(30000),
  INSIGHT_FALLBACK_ETH_PRICE: optionalNumber(2000),
  INSIGHT_FALLBACK_DEFAULT_PRICE: optionalNumber(1),

  // DEX TWAP 配置
  INSIGHT_DEX_TWAP_POOL: optionalString(),
  INSIGHT_DEX_TWAP_SECONDS: optionalNumber(1800),
  INSIGHT_DEX_PRICE_INVERT: optionalBoolean(false),

  // 参考价格提供商
  INSIGHT_REFERENCE_PRICE_PROVIDER: optionalString('chainlink'),

  // 功能开关
  INSIGHT_DISABLE_EMBEDDED_WORKER: optionalBoolean(false),
  INSIGHT_DEMO_MODE: optionalBoolean(false),
  INSIGHT_WORKER_ID: optionalString(),
  INSIGHT_TRUST_PROXY: optionalBoolean(false),

  // 投票功能
  INSIGHT_VOTING_DEGRADATION: optionalBoolean(false),
  INSIGHT_ENABLE_VOTING: optionalBoolean(true),
  INSIGHT_DISABLE_VOTE_TRACKING: optionalBoolean(false),

  // 限流配置
  INSIGHT_API_LOG_SAMPLE_RATE: optionalNumber(1),

  // 超时配置
  INSIGHT_DEPENDENCY_TIMEOUT_MS: optionalNumber(5000),
  INSIGHT_RPC_TIMEOUT_MS: optionalNumber(30000),
  INSIGHT_WEBHOOK_TIMEOUT_MS: optionalNumber(10000),

  // =============================================================================
  // 告警通知配置
  // =============================================================================
  // Webhook
  INSIGHT_WEBHOOK_URL: urlString(),

  // Telegram
  INSIGHT_TELEGRAM_BOT_TOKEN: optionalString(),
  INSIGHT_TELEGRAM_CHAT_ID: optionalString(),
  INSIGHT_TELEGRAM_TIMEOUT_MS: optionalNumber(10000),

  // Slack
  SLACK_WEBHOOK_URL: urlString(),
  INSIGHT_SLACK_WEBHOOK_URL: urlString(),
  INSIGHT_SLACK_TIMEOUT_MS: optionalNumber(10000),

  // SMTP
  INSIGHT_SMTP_HOST: optionalString(),
  INSIGHT_SMTP_PORT: optionalNumber(587),
  INSIGHT_SMTP_USER: optionalString(),
  INSIGHT_SMTP_PASS: optionalString(),
  INSIGHT_FROM_EMAIL: optionalString(),
  INSIGHT_DEFAULT_EMAIL: optionalString(),

  // PagerDuty
  PAGERDUTY_API_KEY: optionalString(),

  // =============================================================================
  // UMA 配置
  // =============================================================================
  UMA_REWARDS_SYNC_INTERVAL_MS: optionalNumber(60000),
  UMA_TVL_SYNC_INTERVAL_MS: optionalNumber(60000),

  // =============================================================================
  // CDN 配置
  // =============================================================================
  CDN_URL: optionalString(),
  CDN_IMAGE_URL: optionalString(),

  // =============================================================================
  // CSP 配置
  // =============================================================================
  INSIGHT_CSP_MODE: z.enum(['strict', 'relaxed']).default('relaxed'),

  // =============================================================================
  // 其他配置
  // =============================================================================
  INSIGHT_CONFIG_ENCRYPTION_KEY: optionalString(),
  INSIGHT_PRICE_SYMBOL: optionalString('ETH/USD'),
});

// ============================================================================
// 解析环境变量
// ============================================================================

function parseEnv() {
  // 在客户端只暴露 NEXT_PUBLIC_ 开头的变量
  const isServer = typeof window === 'undefined';

  const rawEnv = {
    ...process.env,
  };

  const result = envSchema.safeParse(rawEnv);

  if (!result.success) {
    const errors = result.error.errors.map((e) => `  - ${e.path.join('.')}: ${e.message}`);

    // 在构建时抛出错误
    if (isServer && process.env.NODE_ENV === 'production') {
      throw new Error(`Environment validation failed:\n${errors.join('\n')}`);
    }

    // 开发环境只打印警告
    console.warn('Environment validation warnings:\n' + errors.join('\n'));

    // 返回默认值
    return envSchema.parse({});
  }

  return result.data;
}

// ============================================================================
// 导出验证后的环境变量
// ============================================================================

export const env = parseEnv();

// ============================================================================
// 类型导出
// ============================================================================

export type Env = z.infer<typeof envSchema>;

// ============================================================================
// 便捷访问函数
// ============================================================================

/**
 * 获取 RPC URL 的优先级：
 * 1. 直接配置的 RPC_URL
 * 2. Alchemy URL
 * 3. Infura URL
 * 4. QuickNode URL
 */
export function getRpcUrl(chain: string): string | undefined {
  const upperChain = chain.toUpperCase();

  // 1. 直接配置
  const directUrl = env[`${upperChain}_RPC_URL` as keyof typeof env];
  if (directUrl) return directUrl as string;

  // 2. Alchemy
  if (env.ALCHEMY_API_KEY) {
    const alchemyUrl = env[`ALCHEMY_${upperChain}_URL` as keyof typeof env];
    if (alchemyUrl) return alchemyUrl as string;
  }

  // 3. Infura
  if (env.INFURA_API_KEY) {
    const infuraUrl = env[`INFURA_${upperChain}_URL` as keyof typeof env];
    if (infuraUrl) return infuraUrl as string;
  }

  // 4. QuickNode
  const quicknodeUrl = env[`QUICKNODE_${upperChain}_URL` as keyof typeof env];
  if (quicknodeUrl) return quicknodeUrl as string;

  return undefined;
}

/**
 * 检查是否处于开发环境
 */
export function isDevelopment(): boolean {
  return env.NODE_ENV === 'development';
}

/**
 * 检查是否处于生产环境
 */
export function isProduction(): boolean {
  return env.NODE_ENV === 'production';
}

/**
 * 检查是否处于测试环境
 */
export function isTest(): boolean {
  return env.NODE_ENV === 'test';
}

/**
 * 检查是否启用了演示模式
 */
export function isDemoMode(): boolean {
  return env.INSIGHT_DEMO_MODE;
}

/**
 * 获取日志级别
 */
export function getLogLevel(): typeof env.LOG_LEVEL {
  return env.LOG_LEVEL;
}

/**
 * 检查是否配置了告警通知
 */
export function hasAlertConfig(): boolean {
  return !!(
    env.INSIGHT_SLACK_WEBHOOK_URL ||
    env.SLACK_WEBHOOK_URL ||
    env.INSIGHT_TELEGRAM_BOT_TOKEN ||
    env.INSIGHT_WEBHOOK_URL ||
    env.INSIGHT_SMTP_HOST
  );
}

/**
 * 获取告警超时时间
 */
export function getAlertTimeoutMs(channel: 'slack' | 'telegram' | 'webhook'): number {
  switch (channel) {
    case 'slack':
      return env.INSIGHT_SLACK_TIMEOUT_MS;
    case 'telegram':
      return env.INSIGHT_TELEGRAM_TIMEOUT_MS;
    case 'webhook':
      return env.INSIGHT_WEBHOOK_TIMEOUT_MS;
    default:
      return 10000;
  }
}

/**
 * 获取 Sentry DSN
 * 优先使用 NEXT_PUBLIC_SENTRY_DSN（客户端需要），如果不存在则回退到 SENTRY_DSN
 */
export function getSentryDsn(): string | undefined {
  return env.NEXT_PUBLIC_SENTRY_DSN || env.SENTRY_DSN || undefined;
}

/**
 * 获取环境变量报告
 */
export function getEnvReport(): Record<string, string> {
  return {
    NODE_ENV: env.NODE_ENV,
    DATABASE_URL: env.DATABASE_URL ? 'configured' : 'not configured',
    INSIGHT_CHAIN: env.INSIGHT_CHAIN,
    INSIGHT_DEMO_MODE: String(env.INSIGHT_DEMO_MODE),
  };
}
