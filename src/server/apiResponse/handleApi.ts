import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { context, trace } from "@opentelemetry/api";
import { ZodError } from "zod";
import { error, ok } from "./response";
import { runApiAlerts } from "./alerts";

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
  if (durationMs >= slowMs) {
    logger.warn("api_slow", { ...logData, thresholdMs: slowMs });
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
