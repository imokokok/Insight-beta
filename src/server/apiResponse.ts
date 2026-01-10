import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { verifyAdmin, type AdminScope } from "@/server/adminAuth";
import { hasDatabase, query } from "@/server/db";
import { deleteJsonKey, listJsonKeys, readJsonFile, writeJsonFile } from "@/server/kvStore";
import { ZodError } from "zod";
import { isIP } from "node:net";

export type ApiOk<T> = { ok: true; data: T };
export type ApiErrorPayload = { code: string; details?: unknown };
export type ApiError = { ok: false; error: string | ApiErrorPayload };

export function ok<T>(data: T, init?: { headers?: HeadersInit }) {
  return NextResponse.json({ ok: true, data } satisfies ApiOk<T>, { headers: init?.headers });
}

export function error(error: string | ApiErrorPayload, status = 500, init?: { headers?: HeadersInit }) {
  return NextResponse.json({ ok: false, error } satisfies ApiError, { status, headers: init?.headers });
}

export type { AdminScope };

type ApiCacheRecord<T> = { expiresAtMs: number; value: T };

const globalForApiCache = globalThis as unknown as {
  insightApiCache?: Map<string, ApiCacheRecord<unknown>> | undefined;
};

const insightApiCache = globalForApiCache.insightApiCache ?? new Map<string, ApiCacheRecord<unknown>>();
if (process.env.NODE_ENV !== "production") globalForApiCache.insightApiCache = insightApiCache;

export async function cachedJson<T>(
  key: string,
  ttlMs: number,
  compute: () => Promise<T> | T
): Promise<T> {
  const now = Date.now();
  const mem = insightApiCache.get(key);
  if (mem && mem.expiresAtMs > now) return mem.value as T;

  const storeKey = `api_cache/v1/${key}`;
  const stored = await readJsonFile<ApiCacheRecord<T> | null>(storeKey, null);
  if (
    stored &&
    typeof stored === "object" &&
    typeof (stored as ApiCacheRecord<unknown>).expiresAtMs === "number" &&
    (stored as ApiCacheRecord<unknown>).expiresAtMs > now
  ) {
    insightApiCache.set(key, stored as ApiCacheRecord<unknown>);
    return (stored as ApiCacheRecord<T>).value;
  }

  const value = await compute();
  const record: ApiCacheRecord<T> = { expiresAtMs: now + ttlMs, value };
  insightApiCache.set(key, record as ApiCacheRecord<unknown>);
  await writeJsonFile(storeKey, record).catch(() => null);
  return value;
}

export async function invalidateCachedJson(prefix: string) {
  insightApiCache.clear();
  for (let offset = 0; offset < 50_000; offset += 1000) {
    const page = await listJsonKeys({ prefix: `api_cache/v1/${prefix}`, limit: 1000, offset }).catch(
      () => null
    );
    const items = page?.items ?? [];
    if (items.length === 0) break;
    await Promise.all(items.map((i) => deleteJsonKey(i.key).catch(() => null)));
  }
}

export async function requireAdmin(request: Request, opts?: { strict?: boolean; scope?: AdminScope }) {
  const strict = opts?.strict ?? false;
  const hasEnvToken = !!env.INSIGHT_ADMIN_TOKEN.trim();
  const hasSalt = !!env.INSIGHT_ADMIN_TOKEN_SALT.trim();
  if (!hasEnvToken && !hasSalt) {
    if (strict) return error({ code: "forbidden" }, 403);
    if (process.env.NODE_ENV === "production") return error({ code: "forbidden" }, 403);
    return null;
  }
  const verified = await verifyAdmin(request, { strict, scope: opts?.scope });
  if (verified.ok) return null;
  return error({ code: "forbidden" }, 403);
}

export function getAdminActor(request: Request) {
  const raw = request.headers.get("x-admin-actor")?.trim() ?? "";
  if (!raw) return "admin";
  let out = "";
  for (let i = 0; i < raw.length; i += 1) {
    const code = raw.charCodeAt(i);
    if (code < 32 || code === 127) continue;
    out += raw[i];
    if (out.length >= 80) break;
  }
  const cleaned = out.trim();
  return cleaned || "admin";
}

type RateLimitEntry = { count: number; resetAtMs: number };

const globalForRate = globalThis as unknown as {
  insightRate?: Map<string, RateLimitEntry> | undefined;
};

const insightRate = globalForRate.insightRate ?? new Map<string, RateLimitEntry>();
if (process.env.NODE_ENV !== "production") globalForRate.insightRate = insightRate;

let lastRatePruneAtMs = 0;

function getClientIp(request: Request) {
  const trustMode = (env.INSIGHT_TRUST_PROXY || "").toLowerCase();
  const trustAny = ["1", "true"].includes(trustMode);
  const trustCloudflare = trustMode === "cloudflare";
  if (!trustAny && !trustCloudflare) return "unknown";

  const normalize = (raw: string) => {
    let s = raw.trim();
    if (!s) return null;
    const comma = s.indexOf(",");
    if (comma >= 0) s = s.slice(0, comma).trim();
    if (s.includes(".") && s.includes(":") && !s.includes("::")) {
      const parts = s.split(":");
      if (parts.length === 2) s = parts[0]?.trim() ?? s;
    }
    if (s.startsWith("[") && s.endsWith("]")) s = s.slice(1, -1).trim();
    if (!s) return null;
    if (isIP(s) === 0) return null;
    return s;
  };

  const cfRay = request.headers.get("cf-ray")?.trim() ?? "";
  const cf = normalize(request.headers.get("cf-connecting-ip") ?? "");
  if (trustCloudflare) {
    if (cf && cfRay) return cf;
    return "unknown";
  }

  if (cf) return cf;
  const real = normalize(request.headers.get("x-real-ip") ?? "");
  if (real) return real;
  const forwarded = normalize(request.headers.get("x-forwarded-for") ?? "");
  if (forwarded) return forwarded;
  return "unknown";
}

async function rateLimitDb(opts: { key: string; limit: number; windowMs: number }, ip: string, now: number) {
  const resetAt = new Date(now + opts.windowMs);
  const bucketKey = `${opts.key}:${ip}`;
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
    [bucketKey, resetAt.toISOString()]
  );
  const row = res.rows[0];
  const count = Number(row?.count ?? 1);
  const resetAtMs = row?.reset_at instanceof Date ? row.reset_at.getTime() : resetAt.getTime();
  if (count > opts.limit) {
    const retryAfterSeconds = Math.max(1, Math.ceil((resetAtMs - now) / 1000));
    const headers = new Headers();
    headers.set("retry-after", String(retryAfterSeconds));
    headers.set("x-ratelimit-limit", String(opts.limit));
    headers.set("x-ratelimit-remaining", "0");
    headers.set("x-ratelimit-reset", String(resetAtMs));
    return error({ code: "rate_limited" }, 429, { headers });
  }
  return null;
}

async function rateLimitKv(opts: { key: string; limit: number; windowMs: number }, ip: string, now: number) {
  if (!hasDatabase()) throw new Error("missing_database_url");
  const resetAtMs = now + opts.windowMs;
  const bucketKey = `rate_limit/v1/${opts.key}:${ip}`;
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
      [now]
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
    [bucketKey, resetAtMs, now]
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
    return error({ code: "rate_limited" }, 429, { headers });
  }
  return null;
}

export async function rateLimit(
  request: Request,
  opts: { key: string; limit: number; windowMs: number }
) {
  const ip = getClientIp(request);
  const now = Date.now();
  const store = (env.INSIGHT_RATE_LIMIT_STORE || "auto").toLowerCase();
  const useDb = store === "db" || (store === "auto" && hasDatabase());
  const useKv = store === "kv";
  if (useKv) {
    try {
      const limited = await rateLimitKv(opts, ip, now);
      if (limited) return limited;
      return null;
    } catch {
      // fall through
    }
  }
  if (useDb) {
    try {
      return await rateLimitDb(opts, ip, now);
    } catch {
      // fall through
    }
  }
  if (insightRate.size > 5000 && now - lastRatePruneAtMs > 60_000) {
    lastRatePruneAtMs = now;
    for (const [k, v] of insightRate.entries()) {
      if (v.resetAtMs <= now) insightRate.delete(k);
    }
  }
  const bucketKey = `${opts.key}:${ip}`;
  const existing = insightRate.get(bucketKey);
  if (!existing || existing.resetAtMs <= now) {
    insightRate.set(bucketKey, { count: 1, resetAtMs: now + opts.windowMs });
    return null;
  }
  if (existing.count >= opts.limit) {
    const retryAfterSeconds = Math.max(1, Math.ceil((existing.resetAtMs - now) / 1000));
    const headers = new Headers();
    headers.set("retry-after", String(retryAfterSeconds));
    headers.set("x-ratelimit-limit", String(opts.limit));
    headers.set("x-ratelimit-remaining", "0");
    headers.set("x-ratelimit-reset", String(existing.resetAtMs));
    return error({ code: "rate_limited" }, 429, { headers });
  }
  existing.count += 1;
  insightRate.set(bucketKey, existing);
  return null;
}

function getRequestId(request?: Request) {
  if (!request) return null;
  const existing = request.headers.get("x-request-id")?.trim();
  if (existing) return existing;
  const hasCrypto = typeof crypto !== "undefined" && typeof crypto.randomUUID === "function";
  if (hasCrypto) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function attachRequestId(response: Response, requestId: string | null) {
  if (!requestId) return response;
  try {
    response.headers.set("x-request-id", requestId);
  } catch {
    return response;
  }
  return response;
}

export async function handleApi<T>(
  arg1: Request | (() => Promise<T | Response> | T | Response),
  arg2?: () => Promise<T | Response> | T | Response
) {
  const request = typeof arg1 === "function" ? undefined : arg1;
  const fn = typeof arg1 === "function" ? arg1 : (arg2 as () => Promise<T> | T);
  const requestId = getRequestId(request);
  const method = request?.method;
  const url = request ? request.url : undefined;
  const sampleRateRaw = Number(env.INSIGHT_API_LOG_SAMPLE_RATE || "");
  const sampleRate =
    Number.isFinite(sampleRateRaw) && sampleRateRaw >= 0 && sampleRateRaw <= 1 ? sampleRateRaw : 0.01;
  const slowMsRaw = Number(env.INSIGHT_SLOW_REQUEST_MS || 500);
  const slowMs = Number.isFinite(slowMsRaw) && slowMsRaw >= 0 ? slowMsRaw : 500;
  const startedAt = Date.now();
  try {
    const data = await fn();
    if (data instanceof Response) {
      const response = attachRequestId(data, requestId);
      const durationMs = Date.now() - startedAt;
      if (sampleRate > 0 && Math.random() < sampleRate && url) {
        const path = new URL(url).pathname;
        logger.info("api_access", { requestId, method, path, durationMs, status: response.status });
      }
      if (durationMs >= slowMs) {
        logger.warn("api_slow", { requestId, method, url, durationMs, status: response.status });
      }
      return response;
    }
    const response = attachRequestId(ok(data), requestId);
    const durationMs = Date.now() - startedAt;
    if (sampleRate > 0 && Math.random() < sampleRate && url) {
      const path = new URL(url).pathname;
      logger.info("api_access", { requestId, method, path, durationMs, status: response.status });
    }
    if (durationMs >= slowMs) {
      logger.warn("api_slow", { requestId, method, url, durationMs, status: response.status });
    }
    return response;
  } catch (e) {
    if (e instanceof Response) {
      const response = attachRequestId(e, requestId);
      const durationMs = Date.now() - startedAt;
      logger.error("api_error", { requestId, method, url, message: `http_${response.status}`, durationMs });
      return response;
    }

    if (e instanceof ZodError) {
      const messages = e.issues.map((i) => i.message);
      if (messages.includes("invalid_address")) {
        return attachRequestId(error({ code: "invalid_address", details: e.issues }, 400), requestId);
      }
      return attachRequestId(error({ code: "invalid_request_body", details: e.issues }, 400), requestId);
    }

    const message = e instanceof Error ? e.message : "unknown_error";
    const durationMs = Date.now() - startedAt;
    logger.error("api_error", { requestId, method, url, message, durationMs });
    const known400 = new Set([
      "invalid_request_body",
      "invalid_address",
      "missing_config",
      "missing_database_url",
      "invalid_rpc_url",
      "invalid_contract_address",
      "invalid_chain",
      "invalid_max_block_range",
      "invalid_voting_period_hours",
      "contract_not_found",
    ]);
    if (message === "forbidden") return attachRequestId(error({ code: "forbidden" }, 403), requestId);
    if (message === "rpc_unreachable") return attachRequestId(error({ code: message }, 502), requestId);
    if (message === "sync_failed") return attachRequestId(error({ code: message }, 502), requestId);
    if (known400.has(message)) return attachRequestId(error({ code: message }, 400), requestId);
    if (message.startsWith("http_")) return attachRequestId(error({ code: message }, 500), requestId);
    return attachRequestId(error({ code: "unknown_error" }, 500), requestId);
  }
}
