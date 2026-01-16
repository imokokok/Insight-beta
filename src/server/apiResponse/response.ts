import { NextResponse } from "next/server";

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
