import { env } from "@/lib/env";
import { verifyAdmin, type AdminScope } from "@/server/adminAuth";
import { error } from "./response";

export type { AdminScope };

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
