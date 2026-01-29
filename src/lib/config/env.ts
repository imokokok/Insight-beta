import { z } from 'zod';

export const env = {
  get DATABASE_URL() {
    return (process.env.DATABASE_URL ?? '').trim();
  },
  get SUPABASE_DB_URL() {
    return (process.env.SUPABASE_DB_URL ?? '').trim();
  },
  get SUPABASE_URL() {
    return (process.env.SUPABASE_URL ?? '').trim();
  },
  get SUPABASE_SERVICE_ROLE_KEY() {
    return (process.env.SUPABASE_SERVICE_ROLE_KEY ?? '').trim();
  },
  get INSIGHT_ADMIN_TOKEN() {
    return (process.env.INSIGHT_ADMIN_TOKEN ?? '').trim();
  },
  get INSIGHT_ADMIN_TOKEN_SALT() {
    return (process.env.INSIGHT_ADMIN_TOKEN_SALT ?? '').trim();
  },
  get INSIGHT_CRON_SECRET() {
    return (process.env.INSIGHT_CRON_SECRET ?? '').trim();
  },
  get CRON_SECRET() {
    return (process.env.CRON_SECRET ?? '').trim();
  },
  get INSIGHT_RPC_URL() {
    return (process.env.INSIGHT_RPC_URL ?? '').trim();
  },
  get INSIGHT_ALLOW_PRIVATE_RPC_URLS() {
    return (process.env.INSIGHT_ALLOW_PRIVATE_RPC_URLS ?? '').trim();
  },
  get INSIGHT_ORACLE_ADDRESS() {
    return (process.env.INSIGHT_ORACLE_ADDRESS ?? '').trim();
  },
  get INSIGHT_CHAIN() {
    return (process.env.INSIGHT_CHAIN ?? '').trim();
  },
  get INSIGHT_SLOW_REQUEST_MS() {
    return (process.env.INSIGHT_SLOW_REQUEST_MS ?? '').trim();
  },
  get INSIGHT_SLO_MAX_LAG_BLOCKS() {
    return (process.env.INSIGHT_SLO_MAX_LAG_BLOCKS ?? '').trim();
  },
  get INSIGHT_SLO_MAX_SYNC_STALENESS_MINUTES() {
    return (process.env.INSIGHT_SLO_MAX_SYNC_STALENESS_MINUTES ?? '').trim();
  },
  get INSIGHT_SLO_MAX_ALERT_MTTA_MINUTES() {
    return (process.env.INSIGHT_SLO_MAX_ALERT_MTTA_MINUTES ?? '').trim();
  },
  get INSIGHT_SLO_MAX_ALERT_MTTR_MINUTES() {
    return (process.env.INSIGHT_SLO_MAX_ALERT_MTTR_MINUTES ?? '').trim();
  },
  get INSIGHT_SLO_MAX_INCIDENT_MTTR_MINUTES() {
    return (process.env.INSIGHT_SLO_MAX_INCIDENT_MTTR_MINUTES ?? '').trim();
  },
  get INSIGHT_SLO_MAX_OPEN_ALERTS() {
    return (process.env.INSIGHT_SLO_MAX_OPEN_ALERTS ?? '').trim();
  },
  get INSIGHT_SLO_MAX_OPEN_CRITICAL_ALERTS() {
    return (process.env.INSIGHT_SLO_MAX_OPEN_CRITICAL_ALERTS ?? '').trim();
  },
  get INSIGHT_MEMORY_MAX_VOTE_KEYS() {
    return (process.env.INSIGHT_MEMORY_MAX_VOTE_KEYS ?? '').trim();
  },
  get INSIGHT_MEMORY_VOTE_BLOCK_WINDOW() {
    return (process.env.INSIGHT_MEMORY_VOTE_BLOCK_WINDOW ?? '').trim();
  },
  get INSIGHT_MEMORY_MAX_ASSERTIONS() {
    return (process.env.INSIGHT_MEMORY_MAX_ASSERTIONS ?? '').trim();
  },
  get INSIGHT_MEMORY_MAX_DISPUTES() {
    return (process.env.INSIGHT_MEMORY_MAX_DISPUTES ?? '').trim();
  },
  get INSIGHT_DISABLE_EMBEDDED_WORKER() {
    return (process.env.INSIGHT_DISABLE_EMBEDDED_WORKER ?? '').trim();
  },
  get INSIGHT_DEMO_MODE() {
    return (process.env.INSIGHT_DEMO_MODE ?? '').trim();
  },
  get INSIGHT_WORKER_ID() {
    return (process.env.INSIGHT_WORKER_ID ?? '').trim();
  },
  get INSIGHT_TRUST_PROXY() {
    return (process.env.INSIGHT_TRUST_PROXY ?? '').trim();
  },
  get INSIGHT_RATE_LIMIT_STORE() {
    return (process.env.INSIGHT_RATE_LIMIT_STORE ?? '').trim();
  },
  get INSIGHT_API_LOG_SAMPLE_RATE() {
    return (process.env.INSIGHT_API_LOG_SAMPLE_RATE ?? '').trim();
  },
  get INSIGHT_DEPENDENCY_TIMEOUT_MS() {
    return (process.env.INSIGHT_DEPENDENCY_TIMEOUT_MS ?? '').trim();
  },
  get INSIGHT_RPC_TIMEOUT_MS() {
    return (process.env.INSIGHT_RPC_TIMEOUT_MS ?? '').trim();
  },
  get INSIGHT_WEBHOOK_TIMEOUT_MS() {
    return (process.env.INSIGHT_WEBHOOK_TIMEOUT_MS ?? '').trim();
  },
  get INSIGHT_WEBHOOK_URL() {
    return (process.env.INSIGHT_WEBHOOK_URL ?? '').trim();
  },
  get INSIGHT_TELEGRAM_BOT_TOKEN() {
    return (process.env.INSIGHT_TELEGRAM_BOT_TOKEN ?? '').trim();
  },
  get INSIGHT_TELEGRAM_CHAT_ID() {
    return (process.env.INSIGHT_TELEGRAM_CHAT_ID ?? '').trim();
  },
  get INSIGHT_TELEGRAM_TIMEOUT_MS() {
    return (process.env.INSIGHT_TELEGRAM_TIMEOUT_MS ?? '').trim();
  },
  get INSIGHT_SMTP_HOST() {
    return (process.env.INSIGHT_SMTP_HOST ?? '').trim();
  },
  get INSIGHT_SMTP_PORT() {
    return (process.env.INSIGHT_SMTP_PORT ?? '').trim();
  },
  get INSIGHT_SMTP_USER() {
    return (process.env.INSIGHT_SMTP_USER ?? '').trim();
  },
  get INSIGHT_SMTP_PASS() {
    return (process.env.INSIGHT_SMTP_PASS ?? '').trim();
  },
  get INSIGHT_FROM_EMAIL() {
    return (process.env.INSIGHT_FROM_EMAIL ?? '').trim();
  },
  get INSIGHT_DEFAULT_EMAIL() {
    return (process.env.INSIGHT_DEFAULT_EMAIL ?? '').trim();
  },
  get INSIGHT_ENABLE_VOTING() {
    return (process.env.INSIGHT_ENABLE_VOTING ?? '').trim();
  },
  get INSIGHT_DISABLE_VOTE_TRACKING() {
    return (process.env.INSIGHT_DISABLE_VOTE_TRACKING ?? '').trim();
  },
  get INSIGHT_VOTING_DEGRADATION() {
    return (process.env.INSIGHT_VOTING_DEGRADATION ?? '').trim();
  },
  get INSIGHT_REFERENCE_PRICE_PROVIDER() {
    return (process.env.INSIGHT_REFERENCE_PRICE_PROVIDER ?? '').trim();
  },
  get INSIGHT_PRICE_SYMBOL() {
    return (process.env.INSIGHT_PRICE_SYMBOL ?? '').trim();
  },
  get INSIGHT_DEX_TWAP_POOL() {
    return (process.env.INSIGHT_DEX_TWAP_POOL ?? '').trim();
  },
  get INSIGHT_DEX_TWAP_SECONDS() {
    return (process.env.INSIGHT_DEX_TWAP_SECONDS ?? '').trim();
  },
  get INSIGHT_DEX_PRICE_INVERT() {
    return (process.env.INSIGHT_DEX_PRICE_INVERT ?? '').trim();
  },
  get INSIGHT_FALLBACK_BTC_PRICE() {
    return (process.env.INSIGHT_FALLBACK_BTC_PRICE ?? '').trim();
  },
  get INSIGHT_FALLBACK_ETH_PRICE() {
    return (process.env.INSIGHT_FALLBACK_ETH_PRICE ?? '').trim();
  },
  get INSIGHT_FALLBACK_DEFAULT_PRICE() {
    return (process.env.INSIGHT_FALLBACK_DEFAULT_PRICE ?? '').trim();
  },
  get POLYGON_AMOY_RPC_URL() {
    return (process.env.POLYGON_AMOY_RPC_URL ?? '').trim();
  },
  get POLYGON_RPC_URL() {
    return (process.env.POLYGON_RPC_URL ?? '').trim();
  },
  get ARBITRUM_RPC_URL() {
    return (process.env.ARBITRUM_RPC_URL ?? '').trim();
  },
  get OPTIMISM_RPC_URL() {
    return (process.env.OPTIMISM_RPC_URL ?? '').trim();
  },
  get INSIGHT_CONFIG_ENCRYPTION_KEY() {
    return (process.env.INSIGHT_CONFIG_ENCRYPTION_KEY ?? '').trim();
  },
};

export function getEnv(key: keyof typeof env): string {
  // Safe: key is validated as keyof typeof env

  return env[key];
}

export function isEnvSet(key: keyof typeof env): boolean {
  // Safe: key is validated as keyof typeof env

  return !!env[key];
}

const envSchema = z.object({
  DATABASE_URL: z
    .string()
    .optional()
    .transform((v) => (v ?? '').trim())
    .refine(
      (value) => {
        if (!value) return true;
        try {
          const url = new URL(value);
          return ['postgres:', 'postgresql:'].includes(url.protocol);
        } catch {
          return false;
        }
      },
      { message: 'invalid_database_url' },
    ),
  SUPABASE_DB_URL: z
    .string()
    .optional()
    .transform((v) => (v ?? '').trim())
    .refine(
      (value) => {
        if (!value) return true;
        try {
          const url = new URL(value);
          return ['postgres:', 'postgresql:'].includes(url.protocol);
        } catch {
          return false;
        }
      },
      { message: 'invalid_supabase_db_url' },
    ),
  SUPABASE_URL: z.string().url().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
  INSIGHT_ADMIN_TOKEN: z.string().min(1).optional(),
  INSIGHT_ADMIN_TOKEN_SALT: z.string().min(16).optional(),
  INSIGHT_CRON_SECRET: z.string().min(16).optional(),
  CRON_SECRET: z.string().min(16).optional(),
  INSIGHT_RPC_URL: z
    .string()
    .optional()
    .transform((v) => (v ?? '').trim())
    .refine(
      (value) => {
        if (!value) return true;
        const urls = value
          .split(/[,\s]+/)
          .map((s) => s.trim())
          .filter(Boolean);
        if (urls.length === 0) return true;
        return urls.every((u) => {
          try {
            const url = new URL(u);
            return ['http:', 'https:', 'ws:', 'wss:'].includes(url.protocol);
          } catch {
            return false;
          }
        });
      },
      { message: 'invalid_rpc_url' },
    ),
  INSIGHT_ALLOW_PRIVATE_RPC_URLS: z.enum(['true', 'false', '1', '0']).optional(),
  INSIGHT_ORACLE_ADDRESS: z
    .string()
    .regex(/^0x[a-fA-F0-9]{40}$/, 'invalid_address')
    .optional(),
  INSIGHT_CHAIN: z.enum(['Polygon', 'PolygonAmoy', 'Arbitrum', 'Optimism', 'Local']).optional(),
  INSIGHT_SLOW_REQUEST_MS: z.coerce.number().int().min(0).optional(),
  INSIGHT_SLO_MAX_LAG_BLOCKS: z.coerce.number().int().min(0).optional(),
  INSIGHT_SLO_MAX_SYNC_STALENESS_MINUTES: z.coerce.number().int().min(0).optional(),
  INSIGHT_SLO_MAX_ALERT_MTTA_MINUTES: z.coerce.number().int().min(0).optional(),
  INSIGHT_SLO_MAX_ALERT_MTTR_MINUTES: z.coerce.number().int().min(0).optional(),
  INSIGHT_SLO_MAX_INCIDENT_MTTR_MINUTES: z.coerce.number().int().min(0).optional(),
  INSIGHT_SLO_MAX_OPEN_ALERTS: z.coerce.number().int().min(0).optional(),
  INSIGHT_SLO_MAX_OPEN_CRITICAL_ALERTS: z.coerce.number().int().min(0).optional(),
  INSIGHT_MEMORY_MAX_VOTE_KEYS: z.coerce.number().int().min(1).optional(),
  INSIGHT_MEMORY_VOTE_BLOCK_WINDOW: z.coerce.bigint().min(0n).optional(),
  INSIGHT_MEMORY_MAX_ASSERTIONS: z.coerce.number().int().min(1).optional(),
  INSIGHT_MEMORY_MAX_DISPUTES: z.coerce.number().int().min(1).optional(),
  INSIGHT_DISABLE_EMBEDDED_WORKER: z.enum(['true', 'false', '1', '0']).optional(),
  INSIGHT_DEMO_MODE: z.enum(['true', 'false', '1', '0']).optional(),
  INSIGHT_WORKER_ID: z.string().min(1).optional(),
  INSIGHT_TRUST_PROXY: z.enum(['true', 'false', '1', '0', 'cloudflare']).optional(),
  INSIGHT_RATE_LIMIT_STORE: z.enum(['auto', 'db', 'kv', 'memory', 'redis']).optional(),
  INSIGHT_API_LOG_SAMPLE_RATE: z.coerce.number().min(0).max(1).optional(),
  INSIGHT_DEPENDENCY_TIMEOUT_MS: z.preprocess(
    (v) => (v === '' ? undefined : v),
    z.coerce.number().int().min(1).optional(),
  ),
  INSIGHT_RPC_TIMEOUT_MS: z.preprocess(
    (v) => (v === '' ? undefined : v),
    z.coerce.number().int().min(1).optional(),
  ),
  INSIGHT_WEBHOOK_TIMEOUT_MS: z.preprocess(
    (v) => (v === '' ? undefined : v),
    z.coerce.number().int().min(1).optional(),
  ),
  INSIGHT_WEBHOOK_URL: z.string().url().optional(),
  INSIGHT_TELEGRAM_BOT_TOKEN: z.string().optional(),
  INSIGHT_TELEGRAM_CHAT_ID: z.string().optional(),
  INSIGHT_TELEGRAM_TIMEOUT_MS: z.preprocess(
    (v) => (v === '' ? undefined : v),
    z.coerce.number().int().min(1).optional(),
  ),
  INSIGHT_SMTP_HOST: z.string().optional(),
  INSIGHT_SMTP_PORT: z.string().optional(),
  INSIGHT_SMTP_USER: z.string().optional(),
  INSIGHT_SMTP_PASS: z.string().optional(),
  INSIGHT_FROM_EMAIL: z.string().email().optional(),
  INSIGHT_DEFAULT_EMAIL: z.string().email().optional(),
  INSIGHT_ENABLE_VOTING: z.enum(['true', 'false', '1', '0']).optional(),
  INSIGHT_DISABLE_VOTE_TRACKING: z.enum(['true', 'false', '1', '0']).optional(),
  INSIGHT_VOTING_DEGRADATION: z.enum(['true', 'false', '1', '0']).optional(),
  INSIGHT_REFERENCE_PRICE_PROVIDER: z.enum(['binance', 'coinbase', 'mock']).optional(),
  INSIGHT_PRICE_SYMBOL: z
    .string()
    .optional()
    .transform((v) => (v ?? '').trim())
    .refine((v) => !v || /^[A-Z0-9]{1,12}$/.test(v), {
      message: 'invalid_price_symbol',
    }),
  INSIGHT_DEX_TWAP_POOL: z
    .string()
    .optional()
    .transform((v) => (v ?? '').trim())
    .refine((v) => !v || /^0x[a-fA-F0-9]{40}$/.test(v), {
      message: 'invalid_dex_twap_pool',
    }),
  INSIGHT_DEX_TWAP_SECONDS: z.preprocess(
    (v) => (v === '' ? undefined : v),
    z.coerce
      .number()
      .int()
      .min(60)
      .max(7 * 24 * 3600)
      .optional(),
  ),
  INSIGHT_DEX_PRICE_INVERT: z.enum(['true', 'false', '1', '0']).optional(),
  INSIGHT_FALLBACK_BTC_PRICE: z.preprocess(
    (v) => (v === '' ? undefined : v),
    z.coerce.number().positive().optional(),
  ),
  INSIGHT_FALLBACK_ETH_PRICE: z.preprocess(
    (v) => (v === '' ? undefined : v),
    z.coerce.number().positive().optional(),
  ),
  INSIGHT_FALLBACK_DEFAULT_PRICE: z.preprocess(
    (v) => (v === '' ? undefined : v),
    z.coerce.number().positive().optional(),
  ),
  INSIGHT_BASE_URL: z.string().url().optional(),
  INSIGHT_CSP_MODE: z.enum(['relaxed', 'strict']).optional(),
  NEXT_PUBLIC_INSIGHT_ORACLE_ADDRESS: z
    .string()
    .optional()
    .transform((v) => (v ?? '').trim())
    .refine((value) => !value || /^0x[a-fA-F0-9]{40}$/.test(value), {
      message: 'invalid_address',
    }),
  POLYGON_AMOY_RPC_URL: z
    .string()
    .optional()
    .transform((v) => (v ?? '').trim())
    .refine(
      (value) => {
        if (!value) return true;
        const urls = value
          .split(/[,\s]+/)
          .map((s) => s.trim())
          .filter(Boolean);
        if (urls.length === 0) return true;
        return urls.every((u) => {
          try {
            const url = new URL(u);
            return ['http:', 'https:', 'ws:', 'wss:'].includes(url.protocol);
          } catch {
            return false;
          }
        });
      },
      { message: 'invalid_polygon_amoy_rpc_url' },
    ),
  POLYGON_RPC_URL: z
    .string()
    .optional()
    .transform((v) => (v ?? '').trim())
    .refine(
      (value) => {
        if (!value) return true;
        const urls = value
          .split(/[,\s]+/)
          .map((s) => s.trim())
          .filter(Boolean);
        if (urls.length === 0) return true;
        return urls.every((u) => {
          try {
            const url = new URL(u);
            return ['http:', 'https:', 'ws:', 'wss:'].includes(url.protocol);
          } catch {
            return false;
          }
        });
      },
      { message: 'invalid_polygon_rpc_url' },
    ),
  ARBITRUM_RPC_URL: z
    .string()
    .optional()
    .transform((v) => (v ?? '').trim())
    .refine(
      (value) => {
        if (!value) return true;
        const urls = value
          .split(/[,\s]+/)
          .map((s) => s.trim())
          .filter(Boolean);
        if (urls.length === 0) return true;
        return urls.every((u) => {
          try {
            const url = new URL(u);
            return ['http:', 'https:', 'ws:', 'wss:'].includes(url.protocol);
          } catch {
            return false;
          }
        });
      },
      { message: 'invalid_arbitrum_rpc_url' },
    ),
  OPTIMISM_RPC_URL: z
    .string()
    .optional()
    .transform((v) => (v ?? '').trim())
    .refine(
      (value) => {
        if (!value) return true;
        const urls = value
          .split(/[,\s]+/)
          .map((s) => s.trim())
          .filter(Boolean);
        if (urls.length === 0) return true;
        return urls.every((u) => {
          try {
            const url = new URL(u);
            return ['http:', 'https:', 'ws:', 'wss:'].includes(url.protocol);
          } catch {
            return false;
          }
        });
      },
      { message: 'invalid_optimism_rpc_url' },
    ),
  INSIGHT_CONFIG_ENCRYPTION_KEY: z.string().min(32).optional(),
});

// Auto-validate on import
try {
  const isServer = typeof window === 'undefined';
  const isProd = process.env.NODE_ENV === 'production';
  if (isServer && typeof process !== 'undefined' && process.env) {
    const parsed = envSchema.safeParse(process.env);
    if (!parsed.success) {
      if (isProd) {
        throw new Error(`Invalid environment variables: ${JSON.stringify(parsed.error.format())}`);
      }
      console.error(
        '❌ Invalid environment variables:',
        JSON.stringify(parsed.error.format(), null, 2),
      );
    }
  }
} catch (e) {
  if (e instanceof z.ZodError) {
    console.error('❌ Invalid environment variables:', JSON.stringify(e.format(), null, 2));
    if (process.env.NODE_ENV === 'production') {
      throw new Error(`Invalid environment variables: ${JSON.stringify(e.format())}`);
    }
  } else {
    throw e;
  }
}

export function getEnvReport() {
  const issues: string[] = [];
  try {
    envSchema.parse(process.env);
  } catch (e) {
    if (e instanceof z.ZodError) {
      for (const err of e.issues) {
        issues.push(`${err.path.join('.')}: ${err.message}`);
      }
    } else {
      issues.push(e instanceof Error ? e.message : String(e));
    }
  }
  const isProd = process.env.NODE_ENV === 'production';
  if (isProd) {
    const demoModeEnabled = ['1', 'true'].includes(
      (process.env.INSIGHT_DEMO_MODE ?? '').toLowerCase(),
    );
    if (demoModeEnabled) issues.push('INSIGHT_DEMO_MODE: demo_mode_enabled_in_production');
    const hasDatabaseConfig = Boolean(process.env.DATABASE_URL || process.env.SUPABASE_DB_URL);
    if (!hasDatabaseConfig) issues.push('DATABASE_URL: required_in_production');
    const hasAdminToken = Boolean((process.env.INSIGHT_ADMIN_TOKEN ?? '').trim());
    const hasAdminSalt = Boolean((process.env.INSIGHT_ADMIN_TOKEN_SALT ?? '').trim());
    if (!hasAdminToken && !hasAdminSalt) issues.push('INSIGHT_ADMIN_TOKEN: required_in_production');
    const hasCronSecret = Boolean(
      (process.env.INSIGHT_CRON_SECRET ?? '').trim() || (process.env.CRON_SECRET ?? '').trim(),
    );
    if (!hasCronSecret) issues.push('CRON_SECRET: required_in_production');
    const allowPrivateRpc =
      (process.env.INSIGHT_ALLOW_PRIVATE_RPC_URLS ?? '').trim().toLowerCase() === 'true' ||
      (process.env.INSIGHT_ALLOW_PRIVATE_RPC_URLS ?? '').trim() === '1';
    if (allowPrivateRpc) issues.push('INSIGHT_ALLOW_PRIVATE_RPC_URLS: enabled_in_production');
  }
  return {
    ok: issues.length === 0,
    issues,
  };
}
