import crypto from "crypto";
import { env } from "@/lib/config/env";
import { readJsonFile, writeJsonFile } from "@/server/kvStore";

export type AdminScope =
  | "admin_kv_read"
  | "admin_kv_write"
  | "admin_tokens_manage"
  | "oracle_config_write"
  | "oracle_sync_trigger"
  | "alert_rules_write"
  | "alerts_update"
  | "audit_read";

export type AdminRole = "root" | "ops" | "alerts" | "viewer";

export type AdminTokenPublic = {
  id: string;
  label: string;
  role: AdminRole;
  createdAt: string;
  createdByActor: string;
  revokedAt: string | null;
};

type AdminTokenRecord = AdminTokenPublic & { hash: string };

type AdminTokenStore = {
  version: 1;
  tokens: AdminTokenRecord[];
};

const STORE_KEY = "admin_tokens_v1.json";

const tokenStoreLock = new Map<string, Promise<void>>();
async function withTokenStoreLock<T>(key: string, fn: () => Promise<T>): Promise<T> {
  let lockPromise = tokenStoreLock.get(key);
  if (!lockPromise) {
    lockPromise = (async () => {
      try {
        await fn();
      } finally {
        tokenStoreLock.delete(key);
      }
    })();
    tokenStoreLock.set(key, lockPromise);
    return lockPromise;
  }
  return lockPromise.then(() => fn());
}

const roleScopes: Record<AdminRole, ReadonlySet<AdminScope>> = {
  root: new Set([
    "admin_kv_read",
    "admin_kv_write",
    "admin_tokens_manage",
    "oracle_config_write",
    "oracle_sync_trigger",
    "alert_rules_write",
    "alerts_update",
    "audit_read",
  ]),
  ops: new Set(["oracle_config_write", "oracle_sync_trigger", "audit_read"]),
  alerts: new Set(["alert_rules_write", "alerts_update", "audit_read"]),
  viewer: new Set(["audit_read"]),
};

function timingSafeEqualString(a: string, b: string) {
  const aBuf = Buffer.from(a, "utf8");
  const bBuf = Buffer.from(b, "utf8");
  return aBuf.length === bBuf.length && crypto.timingSafeEqual(aBuf, bBuf);
}

function getTokenFromRequest(request: Request) {
  const headerToken = request.headers.get("x-admin-token")?.trim() ?? "";
  if (headerToken) return headerToken;
  const auth = request.headers.get("authorization")?.trim() ?? "";
  if (!auth) return "";
  const lower = auth.toLowerCase();
  if (!lower.startsWith("bearer ")) return "";
  return auth.slice(7).trim();
}

function getSalt() {
  const salt = env.INSIGHT_ADMIN_TOKEN_SALT.trim();
  return salt ? salt : "";
}

function hashToken(token: string, salt: string) {
  return crypto.createHash("sha256").update(`${salt}:${token}`).digest("hex");
}

function randomToken() {
  return crypto.randomBytes(32).toString("base64url");
}

function randomId() {
  return crypto.randomUUID();
}

let cached: { loadedAtMs: number; store: AdminTokenStore | null } | null = null;

async function readStoreCached() {
  const ttlMs = 5000;
  const now = Date.now();
  if (cached && now - cached.loadedAtMs < ttlMs) return cached.store;
  const store = await readJsonFile<AdminTokenStore | null>(STORE_KEY, null);
  cached = { loadedAtMs: now, store };
  return store;
}

function tokenHasScope(role: AdminRole, scope: AdminScope | undefined) {
  if (!scope) return true;
  // Safe: role is a literal type from AdminRole union
  // eslint-disable-next-line security/detect-object-injection
  return roleScopes[role].has(scope);
}

export async function verifyAdmin(
  request: Request,
  opts: { strict: boolean; scope?: AdminScope },
): Promise<{ ok: true; role: AdminRole; tokenId: string } | { ok: false }> {
  const token = getTokenFromRequest(request);
  if (!token) return { ok: false };
  const envToken = env.INSIGHT_ADMIN_TOKEN.trim();
  if (envToken) {
    if (timingSafeEqualString(token, envToken))
      return { ok: true, role: "root", tokenId: "env" };
  }

  const salt = getSalt();
  if (!salt) return { ok: false };

  const store = await readStoreCached();
  if (!store || store.version !== 1) return { ok: false };
  const hashed = hashToken(token, salt);
  const found = store.tokens.find((t) => timingSafeEqualString(t.hash, hashed));
  if (!found) return { ok: false };
  if (found.revokedAt) return { ok: false };
  if (!tokenHasScope(found.role, opts.scope)) return { ok: false };
  return { ok: true, role: found.role, tokenId: found.id };
}

export async function listAdminTokens(): Promise<AdminTokenPublic[]> {
  const store = await readStoreCached();
  if (!store || store.version !== 1) return [];
  return store.tokens.map((t) => {
    const { hash, ...rest } = t;
    void hash;
    return rest;
  });
}

export async function createAdminToken(input: {
  label: string;
  role: AdminRole;
  createdByActor: string;
}): Promise<{ token: string; record: AdminTokenPublic }> {
  const salt = getSalt();
  if (!salt) throw new Error("missing_admin_token_salt");
  const now = new Date().toISOString();
  const token = randomToken();
  const record: AdminTokenRecord = {
    id: randomId(),
    label: input.label.trim().slice(0, 80) || "token",
    role: input.role,
    createdAt: now,
    createdByActor: input.createdByActor,
    revokedAt: null,
    hash: hashToken(token, salt),
  };
  const existing = (await readStoreCached()) ?? {
    version: 1 as const,
    tokens: [],
  };
  const next: AdminTokenStore = {
    version: 1,
    tokens: [record, ...existing.tokens],
  };
  await writeJsonFile(STORE_KEY, next);
  cached = { loadedAtMs: Date.now(), store: next };
  const { hash, ...pub } = record;
  void hash;
  return { token, record: pub };
}

export async function revokeAdminToken(input: {
  id: string;
}): Promise<boolean> {
  const existing = await readStoreCached();
  if (!existing || existing.version !== 1) return false;
  const now = new Date().toISOString();
  const idx = existing.tokens.findIndex((t) => t.id === input.id);
  if (idx === -1) return false;
  const nextTokens = existing.tokens.map((t) =>
    t.id === input.id ? { ...t, revokedAt: t.revokedAt ?? now } : t,
  );
  const next: AdminTokenStore = { version: 1, tokens: nextTokens };
  await writeJsonFile(STORE_KEY, next);
  cached = { loadedAtMs: Date.now(), store: next };
  return true;
}
