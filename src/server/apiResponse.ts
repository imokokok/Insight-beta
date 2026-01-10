import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { verifyAdmin, type AdminScope } from "@/server/adminAuth";
import { ZodError } from "zod";

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

function getClientIp(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for")?.trim() ?? "";
  if (forwarded) return forwarded.split(",")[0]?.trim() || "unknown";
  return (
    request.headers.get("cf-connecting-ip")?.trim() ||
    request.headers.get("x-real-ip")?.trim() ||
    "unknown"
  );
}

export function rateLimit(
  request: Request,
  opts: { key: string; limit: number; windowMs: number }
) {
  const ip = getClientIp(request);
  const now = Date.now();
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
  const slowMsRaw = Number(env.INSIGHT_SLOW_REQUEST_MS || 500);
  const slowMs = Number.isFinite(slowMsRaw) && slowMsRaw >= 0 ? slowMsRaw : 500;
  const startedAt = Date.now();
  try {
    const data = await fn();
    if (data instanceof Response) {
      const response = attachRequestId(data, requestId);
      const durationMs = Date.now() - startedAt;
      if (durationMs >= slowMs) {
        logger.warn("api_slow", { requestId, method, url, durationMs, status: response.status });
      }
      return response;
    }
    const response = attachRequestId(ok(data), requestId);
    const durationMs = Date.now() - startedAt;
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
      "rpc_unreachable",
      "contract_not_found",
      "sync_failed"
    ]);
    if (message === "forbidden") return attachRequestId(error({ code: "forbidden" }, 403), requestId);
    if (known400.has(message)) return attachRequestId(error({ code: message }, 400), requestId);
    if (message.startsWith("http_")) return attachRequestId(error({ code: message }, 500), requestId);
    return attachRequestId(error({ code: "unknown_error" }, 500), requestId);
  }
}
