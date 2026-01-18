import { NextResponse } from "next/server";

export type ApiOk<T> = { ok: true; data: T };
export type ApiErrorPayload = { code: string; details?: unknown };
export type ApiError = { ok: false; error: string | ApiErrorPayload };

export function ok<T>(data: T, init?: { headers?: HeadersInit }) {
  const headers = new Headers(init?.headers);
  if (!headers.has("cache-control")) headers.set("cache-control", "no-store");
  return NextResponse.json({ ok: true, data } satisfies ApiOk<T>, {
    headers,
  });
}

export function error(
  error: string | ApiErrorPayload,
  status = 500,
  init?: { headers?: HeadersInit },
) {
  const headers = new Headers(init?.headers);
  if (!headers.has("cache-control")) headers.set("cache-control", "no-store");
  return NextResponse.json({ ok: false, error } satisfies ApiError, {
    status,
    headers,
  });
}
