/**
 * HTTP Utilities
 *
 * 统一的 HTTP 请求工具函数
 */

const DEFAULT_TIMEOUT_MS = 30000;
const DEFAULT_RETRY_DELAY_MS = 5000;

export interface SafeFetchOptions {
  method?: string;
  headers?: Record<string, string>;
  body?: string;
  timeoutMs?: number;
  retries?: number;
  retryDelayMs?: number;
  signal?: AbortSignal;
}

export class HttpError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public response?: Response,
  ) {
    super(message);
    this.name = 'HttpError';
  }
}

import { TimeoutError } from '@/lib/errors/AppError';

export { TimeoutError };

export async function safeFetch<T>(url: string, options: SafeFetchOptions = {}): Promise<T> {
  const {
    timeoutMs = DEFAULT_TIMEOUT_MS,
    retries = 0,
    retryDelayMs = DEFAULT_RETRY_DELAY_MS,
    method = 'GET',
    headers,
    body,
    signal,
  } = options;

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      const response = await fetch(url, {
        method,
        headers,
        body,
        signal: signal || controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new HttpError(
          response.status,
          `HTTP ${response.status}: ${response.statusText}`,
          response,
        );
      }

      const data = await response.json();
      return data as T;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (error instanceof Error && error.name === 'AbortError') {
        throw new TimeoutError('HTTP request', timeoutMs);
      }

      if (attempt < retries) {
        await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
        continue;
      }

      throw lastError;
    }
  }

  throw lastError || new Error('Unknown error');
}

export async function safeFetchWithAuth<T>(
  url: string,
  token: string,
  options: SafeFetchOptions = {},
): Promise<T> {
  return safeFetch<T>(url, {
    ...options,
    headers: {
      ...options.headers,
      Authorization: `Bearer ${token}`,
    },
  });
}

export function isHttpError(error: unknown): error is HttpError {
  return error instanceof HttpError;
}

export function isTimeoutError(error: unknown): error is TimeoutError {
  return error instanceof TimeoutError;
}

export function getHttpErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}
