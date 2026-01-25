import { env } from "@/lib/env";
import { verifyAdmin, type AdminScope } from "@/server/adminAuth";
import { createOrTouchAlert } from "@/server/observability";
import { error } from "./response";

export type { AdminScope };

const globalForAdmin = globalThis as unknown as {
  insightAdminForbidden?: Map<string, number> | undefined;
};

const adminForbiddenCooldown =
  globalForAdmin.insightAdminForbidden ?? new Map<string, number>();
if (process.env.NODE_ENV !== "production")
  globalForAdmin.insightAdminForbidden = adminForbiddenCooldown;

function getTokenFromRequest(request: Request) {
  const headerToken = request.headers.get("x-admin-token")?.trim() ?? "";
  if (headerToken) return headerToken;
  const auth = request.headers.get("authorization")?.trim() ?? "";
  if (!auth) return "";
  const lower = auth.toLowerCase();
  if (!lower.startsWith("bearer ")) return "";
  return auth.slice(7).trim();
}

async function maybeAlertForbidden(
  request: Request,
  scope: AdminScope | undefined,
) {
  if (process.env.NODE_ENV !== "production") return;
  const token = getTokenFromRequest(request);
  if (!token) return;
  const now = Date.now();
  const bucket = Math.floor(now / 600_000);
  const scopeId = scope ?? "unknown";
  const fingerprint = `admin_forbidden:${scopeId}:${bucket}`;
  const lastAt = adminForbiddenCooldown.get(fingerprint) ?? 0;
  if (now - lastAt < 30_000) return;
  adminForbiddenCooldown.set(fingerprint, now);
  const url = (() => {
    try {
      return new URL(request.url).pathname;
    } catch {
      return request.url;
    }
  })();
  await createOrTouchAlert({
    fingerprint,
    type: "admin_forbidden",
    severity: "critical",
    title: "Admin access forbidden",
    message: `${request.method || "request"} ${url} blocked for scope ${scopeId}`,
    entityType: "security",
    entityId: scopeId,
  });
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
  await maybeAlertForbidden(request, opts?.scope);
  return error({ code: "forbidden" }, 403);
}

export function getAdminActor(request: Request) {
  const raw = request.headers.get("x-admin-actor")?.trim() ?? "";
  if (!raw) return "admin";
  let out = "";
  for (let i = 0; i < raw.length; i += 1) {
    const code = raw.charCodeAt(i);
    if (code < 32 || code === 127) continue;
    // Safe: raw is a string, i is a loop counter
    // eslint-disable-next-line security/detect-object-injection
    out += raw[i];
    if (out.length >= 80) break;
  }
  const cleaned = out.trim();
  return cleaned || "admin";
}
