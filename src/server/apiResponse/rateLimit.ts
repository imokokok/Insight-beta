import { env } from "@/lib/env";
import { hasDatabase, query } from "@/server/db";
import { createOrTouchAlert } from "@/server/observability";
import { ensureSchema } from "@/server/schema";
import { isIP } from "node:net";
import { error } from "./response";

type RateLimitEntry = { count: number; resetAtMs: number };

const globalForRate = globalThis as unknown as {
  insightRate?: Map<string, RateLimitEntry> | undefined;
  insightRateAlerts?: Map<string, number> | undefined;
};

const insightRate =
  globalForRate.insightRate ?? new Map<string, RateLimitEntry>();
if (process.env.NODE_ENV !== "production")
  globalForRate.insightRate = insightRate;

const rateAlertCooldown =
  globalForRate.insightRateAlerts ?? new Map<string, number>();
if (process.env.NODE_ENV !== "production")
  globalForRate.insightRateAlerts = rateAlertCooldown;

let lastRatePruneAtMs = 0;

let schemaEnsured = false;
async function ensureDb() {
  if (!hasDatabase()) return;
  if (!schemaEnsured) {
    await ensureSchema();
    schemaEnsured = true;
  }
}

async function maybeAlertRateLimited(input: {
  key: string;
  limit: number;
  windowMs: number;
}) {
  if (process.env.NODE_ENV !== "production") return;
  const now = Date.now();
  const bucket = Math.floor(now / 600_000);
  const fingerprint = `rate_limited:${input.key}:${bucket}`;
  const lastAt = rateAlertCooldown.get(fingerprint) ?? 0;
  if (now - lastAt < 30_000) return;
  rateAlertCooldown.set(fingerprint, now);
  const windowSeconds = Math.max(1, Math.round(input.windowMs / 1000));
  await createOrTouchAlert({
    fingerprint,
    type: "rate_limited",
    severity: "warning",
    title: "API rate limited",
    message: `${input.key} exceeded ${input.limit} requests per ${windowSeconds}s`,
    entityType: "security",
    entityId: input.key,
  });
}

function getClientIp(request: Request) {
  try {
    const trustMode = (env.INSIGHT_TRUST_PROXY || "").toLowerCase();
    const trustAny = ["1", "true"].includes(trustMode);
    const trustCloudflare = trustMode === "cloudflare";
    if (!trustAny && !trustCloudflare) return "unknown";

    const normalize = (raw: string | null | undefined) => {
      try {
        let s = raw?.trim() || "";
        if (!s) return null;
        const comma = s.indexOf(",");
        if (comma >= 0) s = s.slice(0, comma).trim();
        if (s.toLowerCase().startsWith("for=")) {
          s = s.slice(4).trim();
        }
        if (s.startsWith('"') && s.endsWith('"') && s.length >= 2) {
          s = s.slice(1, -1).trim();
        }
        if (s.includes(".") && s.includes(":") && !s.includes("::")) {
          const parts = s.split(":");
          if (parts.length === 2) s = parts[0]?.trim() ?? s;
        }
        if (s.startsWith("[") && s.endsWith("]")) s = s.slice(1, -1).trim();
        if (!s) return null;
        if (isIP(s) === 0) return null;
        return s;
      } catch {
        return null;
      }
    };

    const forwardedFor = () => {
      const header = request.headers.get("forwarded");
      if (!header) return null;
      const first = header.split(",")[0]?.trim() ?? "";
      if (!first) return null;
      const parts = first.split(";").map((p) => p.trim());
      const forPart = parts.find((p) => p.toLowerCase().startsWith("for="));
      return normalize(forPart ?? null);
    };

    const cfRay = request.headers.get("cf-ray")?.trim() ?? "";
    const cf = normalize(request.headers.get("cf-connecting-ip"));
    if (trustCloudflare) {
      if (cf && cfRay) return cf;
      return "unknown";
    }

    if (cf) return cf;
    const vercel = normalize(request.headers.get("x-vercel-forwarded-for"));
    if (vercel) return vercel;
    const real = normalize(request.headers.get("x-real-ip"));
    if (real) return real;
    const fly = normalize(request.headers.get("fly-client-ip"));
    if (fly) return fly;
    const forwarded = normalize(request.headers.get("x-forwarded-for"));
    if (forwarded) return forwarded;
    const std = forwardedFor();
    if (std) return std;
    return "unknown";
  } catch {
    return "unknown";
  }
}

function getClientFallbackId(request: Request) {
  const ua = request.headers.get("user-agent")?.trim() ?? "";
  const acceptLang = request.headers.get("accept-language")?.trim() ?? "";
  const raw = `${ua}|${acceptLang}`;
  let out = "";
  for (let i = 0; i < raw.length; i += 1) {
    const code = raw.charCodeAt(i);
    if (code < 32 || code === 127) continue;
    // Safe: raw is a string, i is a loop counter
    // eslint-disable-next-line security/detect-object-injection
    out += raw[i];
    if (out.length >= 160) break;
  }
  const cleaned = out.trim();
  return cleaned ? `ua:${cleaned}` : "unknown";
}

async function rateLimitDb(
  opts: { key: string; limit: number; windowMs: number },
  clientId: string,
  now: number,
) {
  const resetAt = new Date(now + opts.windowMs);
  const bucketKey = `${opts.key}:${clientId}`;
  if (now - lastRatePruneAtMs > 5 * 60_000) {
    lastRatePruneAtMs = now;
    await query(`
      WITH expired AS (
        SELECT key FROM rate_limits WHERE reset_at <= NOW() LIMIT 2000
      )
      DELETE FROM rate_limits WHERE key IN (SELECT key FROM expired)
    `).catch(() => null);
  }
  const res = await query<{ count: number; reset_at: Date }>(
    `
    INSERT INTO rate_limits (key, reset_at, count)
    VALUES ($1, $2, 1)
    ON CONFLICT (key) DO UPDATE SET
      count = CASE WHEN rate_limits.reset_at <= NOW() THEN 1 ELSE rate_limits.count + 1 END,
      reset_at = CASE WHEN rate_limits.reset_at <= NOW() THEN excluded.reset_at ELSE rate_limits.reset_at END
    RETURNING count, reset_at
    `,
    [bucketKey, resetAt.toISOString()],
  );
  const row = res.rows[0];
  const count = Number(row?.count ?? 1);
  const resetAtMs =
    row?.reset_at instanceof Date ? row.reset_at.getTime() : resetAt.getTime();
  if (count > opts.limit) {
    const retryAfterSeconds = Math.max(1, Math.ceil((resetAtMs - now) / 1000));
    const headers = new Headers();
    headers.set("retry-after", String(retryAfterSeconds));
    headers.set("x-ratelimit-limit", String(opts.limit));
    headers.set("x-ratelimit-remaining", "0");
    headers.set("x-ratelimit-reset", String(resetAtMs));
    await maybeAlertRateLimited({
      key: opts.key,
      limit: opts.limit,
      windowMs: opts.windowMs,
    });
    return error({ code: "rate_limited" }, 429, { headers });
  }
  return null;
}

async function rateLimitKv(
  opts: { key: string; limit: number; windowMs: number },
  clientId: string,
  now: number,
) {
  if (!hasDatabase()) throw new Error("missing_database_url");
  const resetAtMs = now + opts.windowMs;
  const bucketKey = `rate_limit/v1/${opts.key}:${clientId}`;
  if (now - lastRatePruneAtMs > 5 * 60_000) {
    lastRatePruneAtMs = now;
    await query(
      `
      WITH expired AS (
        SELECT key
        FROM kv_store
        WHERE key LIKE 'rate_limit/v1/%'
          AND COALESCE((value->>'resetAtMs')::bigint, 0) <= $1
        LIMIT 2000
      )
      DELETE FROM kv_store WHERE key IN (SELECT key FROM expired)
      `,
      [now],
    ).catch(() => null);
  }

  const res = await query<{ count: number; resetatms: string }>(
    `
    INSERT INTO kv_store (key, value, updated_at)
    VALUES ($1, jsonb_build_object('count', 1, 'resetAtMs', $2::bigint), NOW())
    ON CONFLICT (key) DO UPDATE SET
      value = jsonb_build_object(
        'count',
          CASE
            WHEN COALESCE((kv_store.value->>'resetAtMs')::bigint, 0) <= $3::bigint THEN 1
            ELSE COALESCE((kv_store.value->>'count')::int, 0) + 1
          END,
        'resetAtMs',
          CASE
            WHEN COALESCE((kv_store.value->>'resetAtMs')::bigint, 0) <= $3::bigint THEN $2::bigint
            ELSE COALESCE((kv_store.value->>'resetAtMs')::bigint, $2::bigint)
          END
      ),
      updated_at = NOW()
    RETURNING
      COALESCE((value->>'count')::int, 1) as count,
      COALESCE((value->>'resetAtMs')::bigint, $2::bigint) as resetAtMs
    `,
    [bucketKey, resetAtMs, now],
  );

  const row = res.rows[0];
  const count = Number(row?.count ?? 1);
  const resetMs = Number(row?.resetatms ?? resetAtMs);
  if (count > opts.limit) {
    const retryAfterSeconds = Math.max(1, Math.ceil((resetMs - now) / 1000));
    const headers = new Headers();
    headers.set("retry-after", String(retryAfterSeconds));
    headers.set("x-ratelimit-limit", String(opts.limit));
    headers.set("x-ratelimit-remaining", "0");
    headers.set("x-ratelimit-reset", String(resetMs));
    await maybeAlertRateLimited({
      key: opts.key,
      limit: opts.limit,
      windowMs: opts.windowMs,
    });
    return error({ code: "rate_limited" }, 429, { headers });
  }
  return null;
}

export async function rateLimit(
  request: Request,
  opts: { key: string; limit: number; windowMs: number },
) {
  const ip = getClientIp(request);
  const clientId = ip === "unknown" ? getClientFallbackId(request) : ip;
  const now = Date.now();
  const store = (env.INSIGHT_RATE_LIMIT_STORE || "auto").toLowerCase();

  const wantMemory = store === "memory";
  const wantDb = store === "db";
  const wantKv = store === "kv" || store === "redis";
  const wantAuto =
    store === "auto" || store === "" || (!wantMemory && !wantDb && !wantKv);

  if (hasDatabase() && (wantDb || wantKv || wantAuto)) {
    try {
      await ensureDb();
    } catch {
      void 0;
    }
  }

  if (!wantMemory && hasDatabase()) {
    const primary = wantKv ? "kv" : "db";
    const order =
      wantAuto || wantDb || wantKv
        ? primary === "kv"
          ? (["kv", "db"] as const)
          : (["db", "kv"] as const)
        : ([] as const);

    for (const mode of order) {
      try {
        const limited =
          mode === "kv"
            ? await rateLimitKv(opts, clientId, now)
            : await rateLimitDb(opts, clientId, now);
        if (limited) return limited;
        return null;
      } catch {
        continue;
      }
    }
  }

  if (insightRate.size > 5000 && now - lastRatePruneAtMs > 60_000) {
    lastRatePruneAtMs = now;
    const keysToDelete: string[] = [];
    for (const [k, v] of insightRate.entries()) {
      if (v.resetAtMs <= now) keysToDelete.push(k);
      if (keysToDelete.length >= 1000) break;
    }
    for (const k of keysToDelete) {
      insightRate.delete(k);
    }
    if (insightRate.size > 5000) {
      const excessKeys = Array.from(insightRate.keys()).slice(
        0,
        insightRate.size - 4000,
      );
      for (const k of excessKeys) {
        insightRate.delete(k);
      }
    }
  }
  const bucketKey = `${opts.key}:${clientId}`;
  const existing = insightRate.get(bucketKey);
  if (!existing || existing.resetAtMs <= now) {
    insightRate.set(bucketKey, { count: 1, resetAtMs: now + opts.windowMs });
    return null;
  }
  if (existing.count >= opts.limit) {
    const retryAfterSeconds = Math.max(
      1,
      Math.ceil((existing.resetAtMs - now) / 1000),
    );
    const headers = new Headers();
    headers.set("retry-after", String(retryAfterSeconds));
    headers.set("x-ratelimit-limit", String(opts.limit));
    headers.set("x-ratelimit-remaining", "0");
    headers.set("x-ratelimit-reset", String(existing.resetAtMs));
    await maybeAlertRateLimited({
      key: opts.key,
      limit: opts.limit,
      windowMs: opts.windowMs,
    });
    return error({ code: "rate_limited" }, 429, { headers });
  }
  existing.count += 1;
  insightRate.set(bucketKey, existing);
  return null;
}
