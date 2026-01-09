import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

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
    if (record.ok === true && "data" in record) {
      return record.data as T;
    }
    if (record.ok === false) {
      throw new Error(record.error || "api_error");
    }

    // Fallback if structure is weird but ok is missing
    throw new Error("invalid_api_structure");
  } catch (e) {
    throw e instanceof Error ? e : new Error(String(e));
  }
}
