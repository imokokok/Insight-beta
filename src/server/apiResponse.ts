import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { verifyAdmin, type AdminScope } from "@/server/adminAuth";
import { hasDatabase, query } from "@/server/db";
import {
  deleteJsonKey,
  listJsonKeys,
  readJsonFile,
  writeJsonFile,
} from "@/server/kvStore";
import {
  createOrTouchAlert,
  readAlertRules,
  type AlertRule,
} from "@/server/observability";
import { context, trace } from "@opentelemetry/api";
import { ZodError } from "zod";
import { isIP } from "node:net";

export type ApiOk<T> = { ok: true; data: T };
export type ApiErrorPayload = { code: string; details?: unknown };
export type ApiError = { ok: false; error: string | ApiErrorPayload };

export function ok<T>(data: T, init?: { headers?: HeadersInit }) {
  return NextResponse.json({ ok: true, data } satisfies ApiOk<T>, {
    headers: init?.headers,
  });
}

export function error(
  error: string | ApiErrorPayload,
  status = 500,
  init?: { headers?: HeadersInit },
) {
  return NextResponse.json({ ok: false, error } satisfies ApiError, {
    status,
    headers: init?.headers,
  });
}

export type { AdminScope };

type ApiCacheRecord<T> = { expiresAtMs: number; value: T };

const globalForApiCache = globalThis as unknown as {
  insightApiCache?: Map<string, ApiCacheRecord<unknown>> | undefined;
};

const insightApiCache =
  globalForApiCache.insightApiCache ??
  new Map<string, ApiCacheRecord<unknown>>();
if (process.env.NODE_ENV !== "production")
  globalForApiCache.insightApiCache = insightApiCache;

type ApiRequestBucket = { total: number; errors: number };

const globalForApiAlerts = globalThis as unknown as {
  insightApiAlertRulesCache?: { loadedAtMs: number; rules: AlertRule[] } | null;
  insightApiAlertRulesInflight?: Promise<AlertRule[]> | null;
  insightApiAlertCooldown?: Map<string, number> | undefined;
  insightApiRequestBuckets?: Map<number, ApiRequestBucket> | undefined;
};

const apiAlertCooldown =
  globalForApiAlerts.insightApiAlertCooldown ?? new Map<string, number>();
const apiRequestBuckets =
  globalForApiAlerts.insightApiRequestBuckets ??
  new Map<number, ApiRequestBucket>();
if (process.env.NODE_ENV !== "production") {
  globalForApiAlerts.insightApiAlertCooldown = apiAlertCooldown;
  globalForApiAlerts.insightApiRequestBuckets = apiRequestBuckets;
}

async function getAlertRulesCached(): Promise<AlertRule[]> {
  const now = Date.now();
  const cached = globalForApiAlerts.insightApiAlertRulesCache;
  if (cached && now - cached.loadedAtMs < 5_000) return cached.rules;
  if (globalForApiAlerts.insightApiAlertRulesInflight)
    return globalForApiAlerts.insightApiAlertRulesInflight;
  const p = readAlertRules()
    .then((rules) => {
      globalForApiAlerts.insightApiAlertRulesCache = { loadedAtMs: now, rules };
      return rules;
    })
    .catch(() => {
      globalForApiAlerts.insightApiAlertRulesCache = {
        loadedAtMs: now,
        rules: [],
      };
      return [];
    })
    .finally(() => {
      globalForApiAlerts.insightApiAlertRulesInflight = null;
    });
  globalForApiAlerts.insightApiAlertRulesInflight = p;
  return p;
}

function shouldRunApiAlerts(path: string | undefined) {
  if (!path) return false;
  if (!path.startsWith("/api/")) return false;
  if (path.startsWith("/api/admin/")) return false;
  return true;
}

function getAlertCooldownKey(event: string, fingerprint: string): string {
  return `${event}:${fingerprint}`;
}

async function createAlertIfNeeded(
  rule: AlertRule,
  fingerprint: string,
  title: string,
  message: string,
  entityId: string | null,
) {
  const now = Date.now();
  const cooldownKey = getAlertCooldownKey(rule.event, fingerprint);
  const lastAt = apiAlertCooldown.get(cooldownKey) ?? 0;

  if (now - lastAt < 30_000) return;

  apiAlertCooldown.set(cooldownKey, now);

  const silencedUntilRaw = (rule.silencedUntil ?? "").trim();
  const silencedUntilMs = silencedUntilRaw ? Date.parse(silencedUntilRaw) : NaN;
  const silenced = Number.isFinite(silencedUntilMs) && silencedUntilMs > now;

  await createOrTouchAlert({
    fingerprint,
    type: rule.event,
    severity: rule.severity,
    title,
    message,
    entityType: "api",
    entityId,
    notify: silenced
      ? { channels: [] }
      : {
          channels: rule.channels,
          recipient: rule.recipient ?? undefined,
        },
  });
}

function recordApiBucket(nowMs: number, isError: boolean) {
  const minute = Math.floor(nowMs / 60_000);
  const existing = apiRequestBuckets.get(minute) ?? { total: 0, errors: 0 };
  apiRequestBuckets.set(minute, {
    total: existing.total + 1,
    errors: existing.errors + (isError ? 1 : 0),
  });

  const pruneBefore = minute - 120;
  for (const k of apiRequestBuckets.keys()) {
    if (k < pruneBefore) apiRequestBuckets.delete(k);
  }
}

async function maybeAlertSlowApiRequest(input: {
  method: string | undefined;
  path: string | undefined;
  durationMs: number;
}) {
  if (!shouldRunApiAlerts(input.path)) return;

  const rules = await getAlertRulesCached();
  const slowRules = rules.filter(
    (r) => r.enabled && r.event === "slow_api_request",
  );

  if (slowRules.length === 0) return;

  const method = input.method || "UNKNOWN";
  const path = input.path;

  if (!path) return;

  for (const rule of slowRules) {
    const thresholdMs = Number(
      (rule.params as { thresholdMs?: unknown } | undefined)?.thresholdMs ??
        1000,
    );

    if (!Number.isFinite(thresholdMs) || thresholdMs <= 0) continue;
    if (input.durationMs < thresholdMs) continue;

    const fingerprint = `${rule.id}:${method}:${path}`;
    const message = `${method} ${path} took ${input.durationMs}ms (threshold ${thresholdMs}ms)`;

    await createAlertIfNeeded(
      rule,
      fingerprint,
      "Slow API request",
      message,
      path,
    );
  }
}

async function maybeAlertHighErrorRate(input: { path: string | undefined }) {
  if (!shouldRunApiAlerts(input.path)) return;

  const rules = await getAlertRulesCached();
  const rateRules = rules.filter(
    (r) => r.enabled && r.event === "high_error_rate",
  );

  if (rateRules.length === 0) return;

  const nowMs = Date.now();
  const minute = Math.floor(nowMs / 60_000);

  for (const rule of rateRules) {
    const thresholdPercent = Number(
      (rule.params as { thresholdPercent?: unknown } | undefined)
        ?.thresholdPercent ?? 5,
    );
    const windowMinutes = Number(
      (rule.params as { windowMinutes?: unknown } | undefined)?.windowMinutes ??
        5,
    );

    if (
      !Number.isFinite(thresholdPercent) ||
      thresholdPercent <= 0 ||
      thresholdPercent > 100
    )
      continue;
    if (!Number.isFinite(windowMinutes) || windowMinutes <= 0) continue;

    const window = Math.floor(windowMinutes);
    const startMinute = minute - window + 1;
    let total = 0;
    let errors = 0;

    for (let m = startMinute; m <= minute; m += 1) {
      const b = apiRequestBuckets.get(m);
      if (!b) continue;
      total += b.total;
      errors += b.errors;
    }

    if (total <= 0) continue;

    const rate = (errors / total) * 100;
    if (rate < thresholdPercent) continue;

    const fingerprint = `${rule.id}:global`;
    const message = `${rate.toFixed(1)}% errors (${errors}/${total}) over ${window}m`;

    await createAlertIfNeeded(
      rule,
      fingerprint,
      "High API error rate",
      message,
      null,
    );
  }
}

export async function cachedJson<T>(
  key: string,
  ttlMs: number,
  compute: () => Promise<T> | T,
): Promise<T> {
  const now = Date.now();
  const mem = insightApiCache.get(key);
  if (mem && mem.expiresAtMs > now) return mem.value as T;

  const storeKey = `api_cache/v1/${key}`;
  let stored: ApiCacheRecord<T> | null = null;
  try {
    stored = await readJsonFile<ApiCacheRecord<T> | null>(storeKey, null);
  } catch {
    // Ignore read errors, will compute new value
  }
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
  if (!prefix) {
    insightApiCache.clear();
  } else {
    for (const key of insightApiCache.keys()) {
      if (key.startsWith(prefix)) insightApiCache.delete(key);
    }
  }

  const storePrefix = `api_cache/v1/${prefix}`;
  for (;;) {
    const page = await listJsonKeys({
      prefix: storePrefix,
      limit: 1000,
      offset: 0,
    }).catch(() => null);
    const items = page?.items ?? [];
    if (items.length === 0) break;
    await Promise.all(items.map((i) => deleteJsonKey(i.key).catch(() => null)));
    if (items.length < 1000) break;
  }
}

export async function requireAdmin(
  request: Request,
  opts?: { strict?: boolean; scope?: AdminScope },
) {
  const strict = opts?.strict ?? false;
  const hasEnvToken = !!env.INSIGHT_ADMIN_TOKEN.trim();
  const hasSalt = !!env.INSIGHT_ADMIN_TOKEN_SALT.trim();
  if (!hasEnvToken && !hasSalt) {
    if (strict) return error({ code: "forbidden" }, 403);
    if (process.env.NODE_ENV === "production")
      return error({ code: "forbidden" }, 403);
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

const insightRate =
  globalForRate.insightRate ?? new Map<string, RateLimitEntry>();
if (process.env.NODE_ENV !== "production")
  globalForRate.insightRate = insightRate;

let lastRatePruneAtMs = 0;

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

    const cfRay = request.headers.get("cf-ray")?.trim() ?? "";
    const cf = normalize(request.headers.get("cf-connecting-ip"));
    if (trustCloudflare) {
      if (cf && cfRay) return cf;
      return "unknown";
    }

    if (cf) return cf;
    const real = normalize(request.headers.get("x-real-ip"));
    if (real) return real;
    const forwarded = normalize(request.headers.get("x-forwarded-for"));
    if (forwarded) return forwarded;
    return "unknown";
  } catch {
    return "unknown";
  }
}

async function rateLimitDb(
  opts: { key: string; limit: number; windowMs: number },
  ip: string,
  now: number,
) {
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
    return error({ code: "rate_limited" }, 429, { headers });
  }
  return null;
}

async function rateLimitKv(
  opts: { key: string; limit: number; windowMs: number },
  ip: string,
  now: number,
) {
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
    return error({ code: "rate_limited" }, 429, { headers });
  }
  return null;
}

export async function rateLimit(
  request: Request,
  opts: { key: string; limit: number; windowMs: number },
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
    const retryAfterSeconds = Math.max(
      1,
      Math.ceil((existing.resetAtMs - now) / 1000),
    );
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

function getActiveTraceContext(): {
  traceId: string | null;
  spanId: string | null;
} {
  try {
    const span = trace.getSpan(context.active());
    if (!span) return { traceId: null, spanId: null };
    const spanContext = span.spanContext();
    const traceId = spanContext?.traceId || null;
    const spanId = spanContext?.spanId || null;
    if (!traceId) return { traceId: null, spanId: null };
    return { traceId, spanId };
  } catch {
    return { traceId: null, spanId: null };
  }
}

function getRequestId(request: Request | undefined, traceId: string | null) {
  if (!request) return null;
  const existing = request.headers.get("x-request-id")?.trim();
  if (existing) return existing;
  if (traceId) return traceId;
  const hasCrypto =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function";
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

function logApiAccess(
  requestId: string | null,
  traceId: string | null,
  spanId: string | null,
  method: string | undefined,
  path: string | undefined,
  durationMs: number,
  status: number,
  sampleRate: number,
  url: string | undefined,
) {
  // Enhanced logging with more metrics
  const logData = {
    requestId,
    traceId,
    spanId,
    method,
    path,
    durationMs,
    status,
    timestamp: new Date().toISOString(),
  };

  if (sampleRate > 0 && Math.random() < sampleRate && url) {
    logger.info("api_access", logData);
  }

  return logData;
}

function checkSlowRequest(
  logData: {
    requestId: string | null;
    traceId: string | null;
    spanId: string | null;
    method: string | undefined;
    path: string | undefined;
    durationMs: number;
    status: number;
    timestamp: string;
  },
  durationMs: number,
  slowMs: number,
) {
  // Alert for slow requests
  if (durationMs >= slowMs) {
    logger.warn("api_slow", { ...logData, thresholdMs: slowMs });
  }
}

async function runApiAlerts(
  path: string | undefined,
  isError: boolean,
  durationMs: number,
  slowMs: number,
  method: string | undefined,
) {
  if (shouldRunApiAlerts(path)) {
    recordApiBucket(Date.now(), isError);
    if (durationMs >= slowMs) {
      maybeAlertSlowApiRequest({ method, path, durationMs }).catch(
        () => void 0,
      );
    }
    if (isError) {
      maybeAlertHighErrorRate({ path }).catch(() => void 0);
    }
  }
}

function enhanceResponse(
  response: Response,
  durationMs: number,
  requestId: string | null,
  traceId: string | null,
  spanId: string | null,
  errorCode?: string,
) {
  // Add response headers with timing info
  response.headers.set("x-response-time", durationMs.toString());
  response.headers.set("x-request-id", requestId || "");
  if (traceId) response.headers.set("x-trace-id", traceId);
  if (spanId) response.headers.set("x-span-id", spanId);
  if (errorCode) {
    response.headers.set("x-error-code", errorCode);
  }
  return response;
}

function getSampleRate(): number {
  const sampleRateRaw = Number(env.INSIGHT_API_LOG_SAMPLE_RATE || "");
  return Number.isFinite(sampleRateRaw) &&
    sampleRateRaw >= 0 &&
    sampleRateRaw <= 1
    ? sampleRateRaw
    : 0.01;
}

function getSlowRequestThreshold(): number {
  const slowMsRaw = Number(env.INSIGHT_SLOW_REQUEST_MS || 500);
  return Number.isFinite(slowMsRaw) && slowMsRaw >= 0 ? slowMsRaw : 500;
}

function getRequestPath(url: string | undefined): string | undefined {
  if (!url) return undefined;
  try {
    return new URL(url).pathname;
  } catch {
    return undefined;
  }
}

async function handleApiSuccess<T>(
  data: T | Response,
  _request: Request | undefined,
  requestId: string | null,
  traceId: string | null,
  spanId: string | null,
  method: string | undefined,
  url: string | undefined,
  startedAt: number,
  sampleRate: number,
  slowMs: number,
): Promise<Response> {
  if (data instanceof Response) {
    const response = attachRequestId(data, requestId);
    const durationMs = Date.now() - startedAt;
    const path = getRequestPath(url);
    const logData = logApiAccess(
      requestId,
      traceId,
      spanId,
      method,
      path,
      durationMs,
      response.status,
      sampleRate,
      url,
    );

    checkSlowRequest(logData, durationMs, slowMs);
    await runApiAlerts(
      path,
      response.status >= 500,
      durationMs,
      slowMs,
      method,
    );

    return enhanceResponse(response, durationMs, requestId, traceId, spanId);
  }

  const response = attachRequestId(ok(data), requestId);
  const durationMs = Date.now() - startedAt;
  const path = getRequestPath(url);
  const logData = logApiAccess(
    requestId,
    traceId,
    spanId,
    method,
    path,
    durationMs,
    response.status,
    sampleRate,
    url,
  );

  checkSlowRequest(logData, durationMs, slowMs);
  await runApiAlerts(path, response.status >= 500, durationMs, slowMs, method);

  return enhanceResponse(response, durationMs, requestId, traceId, spanId);
}

function getErrorStatusCodeAndCode(message: string): {
  status: number;
  errorCode: string;
} {
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

  let status = 500;
  let errorCode = "unknown_error";

  if (message === "forbidden") {
    status = 403;
    errorCode = "forbidden";
  } else if (message === "rpc_unreachable" || message === "sync_failed") {
    status = 502;
    errorCode = message;
  } else if (known400.has(message)) {
    status = 400;
    errorCode = message;
  } else if (message.startsWith("http_")) {
    status = 500;
    errorCode = message;
  }

  return { status, errorCode };
}

async function handleApiError(
  e: unknown,
  _request: Request | undefined,
  requestId: string | null,
  traceId: string | null,
  spanId: string | null,
  method: string | undefined,
  url: string | undefined,
  startedAt: number,
  slowMs: number,
): Promise<Response> {
  const durationMs = Date.now() - startedAt;
  const path = getRequestPath(url);

  // Enhanced error logging
  const errorData = {
    requestId,
    traceId,
    spanId,
    method,
    path,
    durationMs,
    timestamp: new Date().toISOString(),
  };

  if (e instanceof Response) {
    const response = attachRequestId(e, requestId);
    logger.error("api_error", {
      ...errorData,
      message: `http_${response.status}`,
      status: response.status,
    });

    await runApiAlerts(
      path,
      response.status >= 500,
      durationMs,
      slowMs,
      method,
    );
    return enhanceResponse(response, durationMs, requestId, traceId, spanId);
  }

  if (e instanceof ZodError) {
    const messages = e.issues.map((i) => i.message);
    const errorCode = messages.includes("invalid_address")
      ? "invalid_address"
      : "invalid_request_body";
    const response = attachRequestId(
      error({ code: errorCode, details: e.issues }, 400),
      requestId,
    );

    logger.error("api_error", {
      ...errorData,
      message: errorCode,
      status: 400,
      details: e.issues,
    });

    await runApiAlerts(path, false, durationMs, slowMs, method);
    return enhanceResponse(response, durationMs, requestId, traceId, spanId);
  }

  const message = e instanceof Error ? e.message : "unknown_error";
  logger.error("api_error", {
    ...errorData,
    message,
    status: 500,
    stack: e instanceof Error ? e.stack : undefined,
  });

  const { status, errorCode } = getErrorStatusCodeAndCode(message);
  const response = attachRequestId(
    error({ code: errorCode }, status),
    requestId,
  );

  await runApiAlerts(path, status >= 500, durationMs, slowMs, method);
  return enhanceResponse(
    response,
    durationMs,
    requestId,
    traceId,
    spanId,
    errorCode,
  );
}

export async function handleApi<T>(
  arg1: Request | (() => Promise<T | Response> | T | Response),
  arg2?: () => Promise<T | Response> | T | Response,
) {
  const request = typeof arg1 === "function" ? undefined : arg1;
  const fn = typeof arg1 === "function" ? arg1 : (arg2 as () => Promise<T> | T);
  const traceCtx = getActiveTraceContext();
  const requestId = getRequestId(request, traceCtx.traceId);
  const method = request?.method;
  const url = request ? request.url : undefined;
  const sampleRate = getSampleRate();
  const slowMs = getSlowRequestThreshold();
  const startedAt = Date.now();

  try {
    const data = await fn();
    return await handleApiSuccess(
      data,
      request,
      requestId,
      traceCtx.traceId,
      traceCtx.spanId,
      method,
      url,
      startedAt,
      sampleRate,
      slowMs,
    );
  } catch (e) {
    return await handleApiError(
      e,
      request,
      requestId,
      traceCtx.traceId,
      traceCtx.spanId,
      method,
      url,
      startedAt,
      slowMs,
    );
  }
}
