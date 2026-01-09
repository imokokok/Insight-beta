import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { logger } from "@/lib/logger";

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
    maximumFractionDigits: 1
  }).format(amount);
  return formatted;
}

export function formatUsd(amount: number, locale: string) {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0
  }).format(amount);
}

export function formatNumberCompact(amount: number, locale: string) {
  return new Intl.NumberFormat(locale, {
    notation: "compact",
    maximumFractionDigits: 1
  }).format(amount);
}

export function formatTime(iso: string, locale: string) {
  return new Intl.DateTimeFormat(locale, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(iso));
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

export function getExplorerUrl(chain: string, hash: string) {
  if (!hash) return null;
  if (chain === "Polygon") return `https://polygonscan.com/tx/${hash}`;
  if (chain === "Arbitrum") return `https://arbiscan.io/tx/${hash}`;
  if (chain === "Optimism") return `https://optimistic.etherscan.io/tx/${hash}`;
  return null;
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
  error?: string;
}

export async function fetchApiData<T>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
  try {
    const res = await fetch(input, init);
    
    let json: unknown;
    try {
      json = await res.json();
    } catch {
      // If parsing fails, throw http status or generic error
      if (!res.ok) throw new Error(`http_${res.status}`);
      throw new Error("invalid_json_response");
    }

    if (!res.ok) {
      if (json && typeof json === "object") {
        const record = json as Record<string, unknown>;
        if (record.ok === false) {
          const error = typeof record.error === "string" ? record.error : "api_error";
          throw new Error(error);
        }
      }
      throw new Error(`http_${res.status}`);
    }

    if (!json || typeof json !== "object") {
      throw new Error("invalid_api_response");
    }

    const record = json as ApiResponse<T>;
    if (record.ok && record.data !== undefined) {
      return record.data;
    }
    
    if (record.error) {
      throw new Error(record.error);
    }
    
    throw new Error("api_unknown_error");

  } catch (error) {
    logger.error("Fetch error:", error);
    throw error;
  }
}
