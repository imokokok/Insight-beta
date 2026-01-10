import { z } from "zod";

export const env = {
  SUPABASE_URL: (process.env.SUPABASE_URL ?? "").trim(),
  SUPABASE_SERVICE_ROLE_KEY: (process.env.SUPABASE_SERVICE_ROLE_KEY ?? "").trim(),
  INSIGHT_ADMIN_TOKEN: (process.env.INSIGHT_ADMIN_TOKEN ?? "").trim(),
  INSIGHT_ADMIN_TOKEN_SALT: (process.env.INSIGHT_ADMIN_TOKEN_SALT ?? "").trim(),
  INSIGHT_RPC_URL: (process.env.INSIGHT_RPC_URL ?? "").trim(),
  INSIGHT_ORACLE_ADDRESS: (process.env.INSIGHT_ORACLE_ADDRESS ?? "").trim(),
  INSIGHT_CHAIN: (process.env.INSIGHT_CHAIN ?? "").trim(),
  INSIGHT_SLOW_REQUEST_MS: (process.env.INSIGHT_SLOW_REQUEST_MS ?? "").trim(),
  INSIGHT_DISABLE_EMBEDDED_WORKER: (process.env.INSIGHT_DISABLE_EMBEDDED_WORKER ?? "").trim(),
  INSIGHT_WORKER_ID: (process.env.INSIGHT_WORKER_ID ?? "").trim(),
  INSIGHT_WEBHOOK_URL: (process.env.INSIGHT_WEBHOOK_URL ?? "").trim()
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
        const urls = value.split(/[,\s]+/).map((s) => s.trim()).filter(Boolean);
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
      { message: "invalid_rpc_url" }
    ),
  INSIGHT_ORACLE_ADDRESS: z
    .string()
    .regex(/^0x[a-fA-F0-9]{40}$/, "invalid_address")
    .optional(),
  INSIGHT_CHAIN: z.enum(["Polygon", "Arbitrum", "Optimism", "Local"]).optional(),
  INSIGHT_SLOW_REQUEST_MS: z.coerce.number().int().min(0).optional(),
  INSIGHT_DISABLE_EMBEDDED_WORKER: z.enum(["1", "0", "true", "false"]).optional(),
  INSIGHT_WORKER_ID: z.string().min(1).optional(),
  INSIGHT_WEBHOOK_URL: z.string().url().optional()
});

export type EnvIssue = {
  key: keyof typeof env;
  kind: "missing" | "invalid";
  message: string;
};

export type EnvReport = {
  ok: boolean;
  issues: EnvIssue[];
};

export function getEnvReport(): EnvReport {
  const raw: Record<string, string | undefined> = {};
  for (const [k, v] of Object.entries(env)) {
    raw[k] = v ? v : undefined;
  }
  const parsed = envSchema.safeParse(raw);
  if (parsed.success) return { ok: true, issues: [] };
  const issues: EnvIssue[] = parsed.error.issues.map((i) => {
    const key = String(i.path[0]) as keyof typeof env;
    const kind: EnvIssue["kind"] = i.code === "invalid_type" ? "missing" : "invalid";
    return { key, kind, message: i.message };
  });
  return { ok: false, issues };
}
