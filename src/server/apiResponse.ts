import { NextResponse } from "next/server";
import { env } from "@/lib/env";

export type ApiOk<T> = { ok: true; data: T };
export type ApiError = { ok: false; error: string };

export function ok<T>(data: T) {
  return NextResponse.json({ ok: true, data } satisfies ApiOk<T>);
}

export function error(error: string, status = 500) {
  return NextResponse.json({ ok: false, error } satisfies ApiError, { status });
}

export function requireAdmin(request: Request) {
  const token = env.INSIGHT_ADMIN_TOKEN;
  if (!token) return null;
  const headerToken = request.headers.get("x-admin-token")?.trim() ?? "";
  const auth = request.headers.get("authorization")?.trim() ?? "";
  const bearer = auth.toLowerCase().startsWith("bearer ") ? auth.slice(7).trim() : "";
  if (headerToken === token || bearer === token) return null;
  return error("forbidden", 403);
}

export async function handleApi<T>(fn: () => Promise<T> | T) {
  try {
    const data = await fn();
    if (data instanceof Response) {
      return data;
    }
    return ok(data);
  } catch (e) {
    const message = e instanceof Error ? e.message : "unknown_error";
    return error(message, 500);
  }
}
