import { z } from "zod";

export const env = {
  get SUPABASE_URL() {
    return (process.env.SUPABASE_URL ?? "").trim();
  },
  get SUPABASE_SERVICE_ROLE_KEY() {
    return (process.env.SUPABASE_SERVICE_ROLE_KEY ?? "").trim();
  },
  get INSIGHT_ADMIN_TOKEN() {
    return (process.env.INSIGHT_ADMIN_TOKEN ?? "").trim();
  },
  get INSIGHT_ADMIN_TOKEN_SALT() {
    return (process.env.INSIGHT_ADMIN_TOKEN_SALT ?? "").trim();
  },
  get INSIGHT_RPC_URL() {
    return (process.env.INSIGHT_RPC_URL ?? "").trim();
  },
  get INSIGHT_ORACLE_ADDRESS() {
    return (process.env.INSIGHT_ORACLE_ADDRESS ?? "").trim();
  },
  get INSIGHT_CHAIN() {
    return (process.env.INSIGHT_CHAIN ?? "").trim();
  },
  get INSIGHT_SLOW_REQUEST_MS() {
    return (process.env.INSIGHT_SLOW_REQUEST_MS ?? "").trim();
  },
  get INSIGHT_MEMORY_MAX_VOTE_KEYS() {
    return (process.env.INSIGHT_MEMORY_MAX_VOTE_KEYS ?? "").trim();
  },
  get INSIGHT_MEMORY_VOTE_BLOCK_WINDOW() {
    return (process.env.INSIGHT_MEMORY_VOTE_BLOCK_WINDOW ?? "").trim();
  },
  get INSIGHT_MEMORY_MAX_ASSERTIONS() {
    return (process.env.INSIGHT_MEMORY_MAX_ASSERTIONS ?? "").trim();
  },
  get INSIGHT_MEMORY_MAX_DISPUTES() {
    return (process.env.INSIGHT_MEMORY_MAX_DISPUTES ?? "").trim();
  },
  get INSIGHT_DISABLE_EMBEDDED_WORKER() {
    return (process.env.INSIGHT_DISABLE_EMBEDDED_WORKER ?? "").trim();
  },
  get INSIGHT_WORKER_ID() {
    return (process.env.INSIGHT_WORKER_ID ?? "").trim();
  },
  get INSIGHT_TRUST_PROXY() {
    return (process.env.INSIGHT_TRUST_PROXY ?? "").trim();
  },
  get INSIGHT_RATE_LIMIT_STORE() {
    return (process.env.INSIGHT_RATE_LIMIT_STORE ?? "").trim();
  },
  get INSIGHT_API_LOG_SAMPLE_RATE() {
    return (process.env.INSIGHT_API_LOG_SAMPLE_RATE ?? "").trim();
  },
  get INSIGHT_WEBHOOK_URL() {
    return (process.env.INSIGHT_WEBHOOK_URL ?? "").trim();
  },
  get INSIGHT_SMTP_HOST() {
    return (process.env.INSIGHT_SMTP_HOST ?? "").trim();
  },
  get INSIGHT_SMTP_PORT() {
    return (process.env.INSIGHT_SMTP_PORT ?? "").trim();
  },
  get INSIGHT_SMTP_USER() {
    return (process.env.INSIGHT_SMTP_USER ?? "").trim();
  },
  get INSIGHT_SMTP_PASS() {
    return (process.env.INSIGHT_SMTP_PASS ?? "").trim();
  },
  get INSIGHT_FROM_EMAIL() {
    return (process.env.INSIGHT_FROM_EMAIL ?? "").trim();
  },
  get INSIGHT_DEFAULT_EMAIL() {
    return (process.env.INSIGHT_DEFAULT_EMAIL ?? "").trim();
  },
};

export function getEnv(key: keyof typeof env): string {
  return env[key];
}

export function isEnvSet(key: keyof typeof env): boolean {
  return !!env[key];
}

const envSchema = z.object({
  SUPABASE_URL: z.string().url().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
  INSIGHT_ADMIN_TOKEN: z.string().min(1).optional(),
  INSIGHT_ADMIN_TOKEN_SALT: z.string().min(16).optional(),
  INSIGHT_RPC_URL: z
    .string()
    .optional()
    .transform((v) => (v ?? "").trim())
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
            return ["http:", "https:", "ws:", "wss:"].includes(url.protocol);
          } catch {
            return false;
          }
        });
      },
      { message: "invalid_rpc_url" },
    ),
  INSIGHT_ORACLE_ADDRESS: z
    .string()
    .regex(/^0x[a-fA-F0-9]{40}$/, "invalid_address")
    .optional(),
  INSIGHT_CHAIN: z
    .enum(["Polygon", "Arbitrum", "Optimism", "Local"])
    .optional(),
  INSIGHT_SLOW_REQUEST_MS: z.coerce.number().int().min(0).optional(),
  INSIGHT_MEMORY_MAX_VOTE_KEYS: z.coerce.number().int().min(1).optional(),
  INSIGHT_MEMORY_VOTE_BLOCK_WINDOW: z.coerce.bigint().min(0n).optional(),
  INSIGHT_MEMORY_MAX_ASSERTIONS: z.coerce.number().int().min(1).optional(),
  INSIGHT_MEMORY_MAX_DISPUTES: z.coerce.number().int().min(1).optional(),
  INSIGHT_DISABLE_EMBEDDED_WORKER: z
    .enum(["true", "false", "1", "0"])
    .optional(),
  INSIGHT_WORKER_ID: z.string().min(1).optional(),
  INSIGHT_TRUST_PROXY: z
    .enum(["true", "false", "1", "0", "cloudflare"])
    .optional(),
  INSIGHT_RATE_LIMIT_STORE: z
    .enum(["auto", "db", "kv", "memory", "redis"])
    .optional(),
  INSIGHT_API_LOG_SAMPLE_RATE: z.coerce.number().min(0).max(1).optional(),
  INSIGHT_WEBHOOK_URL: z.string().url().optional(),
  INSIGHT_SMTP_HOST: z.string().optional(),
  INSIGHT_SMTP_PORT: z.string().optional(),
  INSIGHT_SMTP_USER: z.string().optional(),
  INSIGHT_SMTP_PASS: z.string().optional(),
  INSIGHT_FROM_EMAIL: z.string().email().optional(),
  INSIGHT_DEFAULT_EMAIL: z.string().email().optional(),
});

// Auto-validate on import
try {
  const isServer = typeof window === "undefined";
  const isProd = process.env.NODE_ENV === "production";
  if (isServer && typeof process !== "undefined" && process.env) {
    const parsed = envSchema.safeParse(process.env);
    if (!parsed.success) {
      if (isProd) {
        throw new Error(
          `Invalid environment variables: ${JSON.stringify(parsed.error.format())}`,
        );
      }
      console.error(
        "❌ Invalid environment variables:",
        JSON.stringify(parsed.error.format(), null, 2),
      );
    }
  }
} catch (e) {
  if (e instanceof z.ZodError) {
    console.error(
      "❌ Invalid environment variables:",
      JSON.stringify(e.format(), null, 2),
    );
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        `Invalid environment variables: ${JSON.stringify(e.format())}`,
      );
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
        issues.push(`${err.path.join(".")}: ${err.message}`);
      }
    } else {
      issues.push(e instanceof Error ? e.message : String(e));
    }
  }
  return {
    ok: issues.length === 0,
    issues,
  };
}
