import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { logger } from "@/lib/logger";

export function parseRpcUrls(value: string) {
  const parts = value
    .split(/[,\s]+/g)
    .map((s) => s.trim())
    .filter(Boolean);
  const out: string[] = [];
  for (const p of parts) {
    try {
      const u = new URL(p);
      if (!["http:", "https:", "ws:", "wss:"].includes(u.protocol)) continue;
      if (!out.includes(p)) out.push(p);
    } catch {
      continue;
    }
  }
  return out;
}

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function isZeroBytes32(value: `0x${string}` | undefined) {
  if (!value) return true;
  return /^0x0{64}$/i.test(value);
}

export function toIsoFromSeconds(seconds: bigint) {
  const ms = Number(seconds) * 1000;
  return new Date(ms).toISOString();
}

export function formatUsdCompact(amount: number, locale: string) {
  const formatted = new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(amount);
  return formatted;
}

export function formatUsd(amount: number, locale: string) {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatNumberCompact(amount: number, locale: string) {
  return new Intl.NumberFormat(locale, {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(amount);
}

export function formatTime(iso: string | null | undefined, locale: string) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return "—";
  return new Intl.DateTimeFormat(locale, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

export function calculatePercentage(part: number, total: number) {
  if (total === 0) return 0;
  return Math.round((part / total) * 100);
}

export function formatDurationMinutes(totalMinutes: number) {
  if (!Number.isFinite(totalMinutes) || totalMinutes <= 0) return "—";
  const hours = Math.floor(totalMinutes / 60);
  const minutes = Math.floor(totalMinutes % 60);
  if (hours <= 0) return `${minutes}m`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}m`;
}

export function getExplorerUrl(
  chain: string | undefined | null,
  value: string,
  type: "tx" | "address" | "block" = "tx"
) {
  if (!value) return null;
  const c = chain?.toLowerCase() || "";

  let baseUrl = "";
  if (c.includes("polygon") || c === "137") baseUrl = "https://polygonscan.com";
  else if (c.includes("arbitrum") || c === "42161")
    baseUrl = "https://arbiscan.io";
  else if (c.includes("optimism") || c === "10")
    baseUrl = "https://optimistic.etherscan.io";
  else if (c.includes("mainnet") || c === "1") baseUrl = "https://etherscan.io";
  else if (c.includes("base") || c === "8453") baseUrl = "https://basescan.org";
  else return null;

  return `${baseUrl}/${type}/${value}`;
}

export async function copyToClipboard(text: string): Promise<boolean> {
  if (typeof navigator === "undefined") return false;
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    void 0;
  }

  try {
    const el = document.createElement("textarea");
    el.value = text;
    el.setAttribute("readonly", "");
    el.style.position = "fixed";
    el.style.left = "-9999px";
    el.style.top = "-9999px";
    document.body.appendChild(el);
    el.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(el);
    return ok;
  } catch {
    return false;
  }
}

export function getAssertionStatusColor(status: string) {
  switch (status) {
    case "Pending":
      return "bg-blue-500/10 text-blue-700 ring-1 ring-blue-500/20";
    case "Disputed":
      return "bg-rose-500/10 text-rose-700 ring-1 ring-rose-500/20";
    case "Resolved":
      return "bg-emerald-500/10 text-emerald-700 ring-1 ring-emerald-500/20";
    default:
      return "bg-gray-500/10 text-gray-700 ring-1 ring-gray-500/20";
  }
}

interface ApiResponse<T> {
  ok: boolean;
  data?: T;
  error?: string | { code?: unknown; details?: unknown };
}

export class ApiClientError extends Error {
  code: string;
  details?: unknown;

  constructor(code: string, details?: unknown) {
    super(code);
    this.code = code;
    this.details = details;
  }
}

export function getErrorCode(error: unknown) {
  if (error instanceof ApiClientError) return error.code;
  if (error instanceof Error) return error.message;
  return "unknown_error";
}

export function getErrorDetails(error: unknown) {
  if (error instanceof ApiClientError) return error.details;
  return undefined;
}

export async function fetchApiData<T>(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<T> {
  try {
    const normalizedInput = (() => {
      if (typeof input === "string" && input.startsWith("/")) {
        const base =
          typeof window !== "undefined" &&
          typeof window.location?.origin === "string" &&
          window.location.origin !== "null"
            ? window.location.origin
            : "http://localhost";
        return new URL(input, base);
      }
      return input;
    })();
    const res = await fetch(normalizedInput, init);

    let json: unknown;
    try {
      json = await res.json();
    } catch {
      // If parsing fails, throw http status or generic error
      if (!res.ok) throw new ApiClientError(`http_${res.status}`);
      throw new ApiClientError("invalid_json");
    }

    if (!res.ok) {
      if (json && typeof json === "object") {
        const record = json as Record<string, unknown>;
        if (record.ok === false) {
          const err = record.error;
          if (typeof err === "string") throw new ApiClientError(err);
          if (err && typeof err === "object") {
            const obj = err as Record<string, unknown>;
            const code = typeof obj.code === "string" ? obj.code : "api_error";
            throw new ApiClientError(code, obj.details);
          }
          throw new ApiClientError("api_error");
        }
      }
      throw new ApiClientError(`http_${res.status}`);
    }

    if (!json || typeof json !== "object") {
      throw new ApiClientError("invalid_api_response");
    }

    const record = json as ApiResponse<T>;
    if (record.ok && record.data !== undefined) {
      return record.data;
    }

    if (record.error) {
      if (typeof record.error === "string") {
        throw new ApiClientError(record.error);
      }
      if (record.error && typeof record.error === "object") {
        const err = record.error as { code?: unknown; details?: unknown };
        const code = typeof err.code === "string" ? err.code : "api_error";
        throw new ApiClientError(code, err.details);
      }
      throw new ApiClientError("api_error");
    }

    throw new ApiClientError("unknown_error");
  } catch (error) {
    const name =
      error && typeof error === "object" && "name" in error
        ? String((error as { name?: unknown }).name)
        : "";
    if (name !== "AbortError") logger.error("Fetch error:", error);
    throw error;
  }
}
