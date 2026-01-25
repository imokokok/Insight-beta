import { hasDatabase, query } from "./db";
import { ensureSchema } from "./schema";
import type {
  OracleChain,
  OracleConfig as SharedOracleConfig,
  OracleInstance,
} from "@/lib/types/oracleTypes";
import { getMemoryInstance, getMemoryStore } from "@/server/memoryBackend";
import { isIP } from "node:net";
import { env } from "@/lib/env";

export type OracleConfig = SharedOracleConfig;

export const DEFAULT_ORACLE_INSTANCE_ID = "default";

export function redactOracleConfig(config: OracleConfig): OracleConfig {
  return { ...config, rpcUrl: "" };
}

let schemaEnsured = false;
async function ensureDb() {
  if (!hasDatabase()) return;
  if (!schemaEnsured) {
    await ensureSchema();
    schemaEnsured = true;
  }
}

function normalizeUrl(value: unknown) {
  if (typeof value !== "string") return "";
  return value.trim();
}

function normalizeInstanceId(value: unknown) {
  if (typeof value !== "string") return DEFAULT_ORACLE_INSTANCE_ID;
  const trimmed = value.trim();
  if (!trimmed) return DEFAULT_ORACLE_INSTANCE_ID;
  const lowered = trimmed.toLowerCase();
  if (!/^[a-z0-9][a-z0-9_-]{0,63}$/.test(lowered))
    return DEFAULT_ORACLE_INSTANCE_ID;
  return lowered;
}

export function validateOracleInstanceId(value: unknown) {
  if (typeof value !== "string") throw new Error("invalid_request_body");
  const trimmed = value.trim().toLowerCase();
  if (!trimmed) return DEFAULT_ORACLE_INSTANCE_ID;
  if (!/^[a-z0-9][a-z0-9_-]{0,63}$/.test(trimmed))
    throw new Error("invalid_instance_id");
  return trimmed;
}

function allowPrivateRpcUrls() {
  const raw = (env.INSIGHT_ALLOW_PRIVATE_RPC_URLS ?? "").trim().toLowerCase();
  if (raw === "1" || raw === "true") return true;
  if (raw === "0" || raw === "false") return false;
  return process.env.NODE_ENV !== "production";
}

function isPrivateIpv4(ip: string) {
  const parts = ip.split(".").map((p) => Number(p));
  if (parts.length !== 4) return false;
  if (parts.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) return false;
  const [a, b] = parts as [number, number, number, number];
  if (a === 10) return true;
  if (a === 127) return true;
  if (a === 0) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 100 && b >= 64 && b <= 127) return true;
  return false;
}

function isPrivateIpv6(ip: string) {
  const lower = ip.toLowerCase();
  if (lower === "::1" || lower === "::") return true;
  if (lower.startsWith("fe80:")) return true;
  if (lower.startsWith("fc") || lower.startsWith("fd")) return true;
  if (lower.startsWith("::ffff:")) {
    const maybeV4 = lower.slice("::ffff:".length);
    if (isIP(maybeV4) === 4) return isPrivateIpv4(maybeV4);
  }
  return false;
}

function isPrivateHost(hostname: string) {
  const lower = hostname.trim().toLowerCase();
  if (!lower) return false;
  if (lower === "localhost") return true;
  if (lower === "host.docker.internal") return true;
  if (lower.endsWith(".localhost")) return true;
  if (lower.endsWith(".local")) return true;
  const ipVer = isIP(lower);
  if (ipVer === 4) return isPrivateIpv4(lower);
  if (ipVer === 6) return isPrivateIpv6(lower);
  return false;
}

function validateRpcUrl(value: unknown) {
  if (typeof value !== "string") throw new Error("invalid_request_body");
  const trimmed = value.trim();
  if (!trimmed) return "";
  const parts = trimmed
    .split(/[,\s]+/g)
    .map((s) => s.trim())
    .filter(Boolean);
  if (parts.length === 0) return "";
  const normalized: string[] = [];
  for (const part of parts) {
    let url: URL;
    try {
      url = new URL(part);
    } catch {
      throw new Error("invalid_rpc_url");
    }
    if (!["http:", "https:", "ws:", "wss:"].includes(url.protocol)) {
      throw new Error("invalid_rpc_url");
    }
    if (url.username || url.password) {
      throw new Error("invalid_rpc_url");
    }
    if (!allowPrivateRpcUrls() && isPrivateHost(url.hostname)) {
      throw new Error("invalid_rpc_url");
    }
    normalized.push(part);
  }
  return normalized.join(",");
}

function normalizeAddress(value: unknown) {
  if (typeof value !== "string") return "";
  const trimmed = value.trim();
  if (!trimmed) return "";
  const lowered = trimmed.toLowerCase();
  if (!/^0x[0-9a-f]{40}$/.test(lowered)) return "";
  return lowered;
}

function validateAddress(value: unknown) {
  if (typeof value !== "string") throw new Error("invalid_request_body");
  const trimmed = value.trim();
  if (!trimmed) return "";
  const lowered = trimmed.toLowerCase();
  if (!/^0x[0-9a-f]{40}$/.test(lowered)) {
    throw new Error("invalid_contract_address");
  }
  return lowered;
}

function normalizeChain(value: unknown): OracleChain {
  if (
    value === "Polygon" ||
    value === "PolygonAmoy" ||
    value === "Arbitrum" ||
    value === "Optimism" ||
    value === "Local"
  )
    return value;
  return "Local";
}

function validateChain(value: unknown): OracleChain {
  if (typeof value !== "string") throw new Error("invalid_request_body");
  if (
    value === "Polygon" ||
    value === "PolygonAmoy" ||
    value === "Arbitrum" ||
    value === "Optimism" ||
    value === "Local"
  )
    return value;
  throw new Error("invalid_chain");
}

function normalizeOptionalNonNegativeInt(value: unknown) {
  if (typeof value === "number" && Number.isInteger(value) && value >= 0)
    return value;
  if (typeof value === "bigint") {
    if (value < 0n) return undefined;
    if (value > BigInt(Number.MAX_SAFE_INTEGER)) return undefined;
    return Number(value);
  }
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const num = Number(trimmed);
  if (!Number.isInteger(num) || num < 0) return undefined;
  return num;
}

function validateOptionalNonNegativeInt(value: unknown) {
  if (value === null) return undefined;
  const normalized = normalizeOptionalNonNegativeInt(value);
  if (normalized === undefined && value !== undefined)
    throw new Error("invalid_request_body");
  return normalized;
}

function normalizeOptionalIntInRange(value: unknown, min: number, max: number) {
  const normalized = normalizeOptionalNonNegativeInt(value);
  if (normalized === undefined) return undefined;
  if (normalized < min || normalized > max) return undefined;
  return normalized;
}

function validateOptionalIntInRange(
  value: unknown,
  min: number,
  max: number,
  code: string,
) {
  if (value === null) return undefined;
  if (value === undefined) return undefined;
  const normalized = normalizeOptionalNonNegativeInt(value);
  if (normalized === undefined) throw new Error("invalid_request_body");
  if (normalized < min || normalized > max) throw new Error(code);
  return normalized;
}

type OracleConfigField = keyof OracleConfig;

function withField<T>(field: OracleConfigField, fn: () => T) {
  try {
    return fn();
  } catch (e) {
    const code = e instanceof Error ? e.message : "unknown_error";
    throw Object.assign(new Error(code), { field });
  }
}

export function validateOracleConfigPatch(next: Partial<OracleConfig>) {
  const patch: Partial<OracleConfig> = {};
  if (next.rpcUrl !== undefined)
    patch.rpcUrl = withField("rpcUrl", () => validateRpcUrl(next.rpcUrl));
  if (next.contractAddress !== undefined)
    patch.contractAddress = withField("contractAddress", () =>
      validateAddress(next.contractAddress),
    );
  if (next.chain !== undefined)
    patch.chain = withField("chain", () => validateChain(next.chain));
  if (next.startBlock !== undefined)
    patch.startBlock = withField("startBlock", () =>
      validateOptionalNonNegativeInt(next.startBlock),
    );
  if (next.maxBlockRange !== undefined)
    patch.maxBlockRange = withField("maxBlockRange", () =>
      validateOptionalIntInRange(
        next.maxBlockRange,
        100,
        200_000,
        "invalid_max_block_range",
      ),
    );
  if (next.votingPeriodHours !== undefined)
    patch.votingPeriodHours = withField("votingPeriodHours", () =>
      validateOptionalIntInRange(
        next.votingPeriodHours,
        1,
        720,
        "invalid_voting_period_hours",
      ),
    );
  if (next.confirmationBlocks !== undefined)
    patch.confirmationBlocks = withField("confirmationBlocks", () =>
      validateOptionalNonNegativeInt(next.confirmationBlocks),
    );
  return patch;
}

export async function listOracleInstances(): Promise<OracleInstance[]> {
  await ensureDb();
  if (!hasDatabase()) {
    const mem = getMemoryStore();
    return Array.from(mem.instances.values()).map((inst) => ({
      id: inst.id,
      name: inst.name,
      enabled: inst.enabled,
      chain: inst.oracleConfig.chain,
      contractAddress: inst.oracleConfig.contractAddress,
    }));
  }

  const res = await query<{
    id: string;
    name: string;
    enabled: boolean;
    chain: OracleChain | null;
    contract_address: string | null;
  }>(
    "SELECT id, name, enabled, chain, contract_address FROM oracle_instances ORDER BY id ASC",
  );

  if (res.rows.length > 0) {
    return res.rows.map((row) => ({
      id: row.id,
      name: row.name,
      enabled: Boolean(row.enabled),
      chain: (row.chain as OracleChain) || "Local",
      contractAddress: (row.contract_address ?? "") || "",
    }));
  }

  const fallback = await readOracleConfig(DEFAULT_ORACLE_INSTANCE_ID);
  return [
    {
      id: DEFAULT_ORACLE_INSTANCE_ID,
      name: "Default",
      enabled: true,
      chain: fallback.chain,
      contractAddress: fallback.contractAddress,
    },
  ];
}

export async function readOracleConfig(
  instanceId: string = DEFAULT_ORACLE_INSTANCE_ID,
): Promise<OracleConfig> {
  await ensureDb();
  const normalizedInstanceId = normalizeInstanceId(instanceId);
  if (!hasDatabase()) {
    return getMemoryInstance(normalizedInstanceId).oracleConfig;
  }

  const res = await query("SELECT * FROM oracle_instances WHERE id = $1", [
    normalizedInstanceId,
  ]);
  const row = res.rows[0] as
    | {
        rpc_url?: unknown;
        contract_address?: unknown;
        chain?: unknown;
        start_block?: unknown;
        max_block_range?: unknown;
        voting_period_hours?: unknown;
        confirmation_blocks?: unknown;
      }
    | undefined;
  if (row) {
    return {
      rpcUrl: typeof row.rpc_url === "string" ? row.rpc_url : "",
      contractAddress:
        typeof row.contract_address === "string" ? row.contract_address : "",
      chain: normalizeChain(row.chain),
      startBlock: normalizeOptionalNonNegativeInt(row.start_block) ?? 0,
      maxBlockRange:
        normalizeOptionalIntInRange(row.max_block_range, 100, 200_000) ??
        10_000,
      votingPeriodHours:
        normalizeOptionalIntInRange(row.voting_period_hours, 1, 720) ?? 72,
      confirmationBlocks:
        normalizeOptionalNonNegativeInt(row.confirmation_blocks) ?? 12,
    };
  }

  if (normalizedInstanceId !== DEFAULT_ORACLE_INSTANCE_ID) {
    return {
      rpcUrl: "",
      contractAddress: "",
      chain: "Local",
      startBlock: 0,
      maxBlockRange: 10_000,
      votingPeriodHours: 72,
      confirmationBlocks: 12,
    };
  }

  const legacy = await query("SELECT * FROM oracle_config WHERE id = 1");
  const legacyRow = legacy.rows[0] as
    | {
        rpc_url?: unknown;
        contract_address?: unknown;
        chain?: unknown;
        start_block?: unknown;
        max_block_range?: unknown;
        voting_period_hours?: unknown;
        confirmation_blocks?: unknown;
      }
    | undefined;
  if (!legacyRow) {
    return {
      rpcUrl: "",
      contractAddress: "",
      chain: "Local",
      startBlock: 0,
      maxBlockRange: 10_000,
      votingPeriodHours: 72,
      confirmationBlocks: 12,
    };
  }
  return {
    rpcUrl: typeof legacyRow.rpc_url === "string" ? legacyRow.rpc_url : "",
    contractAddress:
      typeof legacyRow.contract_address === "string"
        ? legacyRow.contract_address
        : "",
    chain: normalizeChain(legacyRow.chain),
    startBlock: normalizeOptionalNonNegativeInt(legacyRow.start_block) ?? 0,
    maxBlockRange:
      normalizeOptionalIntInRange(legacyRow.max_block_range, 100, 200_000) ??
      10_000,
    votingPeriodHours:
      normalizeOptionalIntInRange(legacyRow.voting_period_hours, 1, 720) ?? 72,
    confirmationBlocks:
      normalizeOptionalNonNegativeInt(legacyRow.confirmation_blocks) ?? 12,
  };
}

export async function writeOracleConfig(
  next: Partial<OracleConfig>,
  instanceId: string = DEFAULT_ORACLE_INSTANCE_ID,
) {
  await ensureDb();
  const normalizedInstanceId = normalizeInstanceId(instanceId);
  const prev = await readOracleConfig(normalizedInstanceId);
  const merged: OracleConfig = {
    rpcUrl: next.rpcUrl === undefined ? prev.rpcUrl : normalizeUrl(next.rpcUrl),
    contractAddress:
      next.contractAddress === undefined
        ? prev.contractAddress
        : normalizeAddress(next.contractAddress),
    chain: next.chain === undefined ? prev.chain : normalizeChain(next.chain),
    startBlock:
      next.startBlock === undefined
        ? prev.startBlock
        : (normalizeOptionalNonNegativeInt(next.startBlock) ?? 0),
    maxBlockRange:
      next.maxBlockRange === undefined
        ? prev.maxBlockRange
        : (normalizeOptionalIntInRange(next.maxBlockRange, 100, 200_000) ??
          10_000),
    votingPeriodHours:
      next.votingPeriodHours === undefined
        ? prev.votingPeriodHours
        : (normalizeOptionalIntInRange(next.votingPeriodHours, 1, 720) ?? 72),
    confirmationBlocks:
      next.confirmationBlocks === undefined
        ? prev.confirmationBlocks
        : (normalizeOptionalNonNegativeInt(next.confirmationBlocks) ?? 12),
  };

  if (!hasDatabase()) {
    getMemoryInstance(normalizedInstanceId).oracleConfig = merged;
    return merged;
  }

  const defaultName =
    normalizedInstanceId === DEFAULT_ORACLE_INSTANCE_ID
      ? "Default"
      : normalizedInstanceId;

  await query(
    `INSERT INTO oracle_instances (
      id, name, enabled, rpc_url, contract_address, chain, start_block, max_block_range, voting_period_hours, confirmation_blocks, updated_at
    ) VALUES ($1, COALESCE((SELECT name FROM oracle_instances WHERE id = $1), $2), true, $3, $4, $5, $6, $7, $8, $9, NOW())
    ON CONFLICT (id) DO UPDATE SET
      rpc_url = excluded.rpc_url,
      contract_address = excluded.contract_address,
      chain = excluded.chain,
      start_block = excluded.start_block,
      max_block_range = excluded.max_block_range,
      voting_period_hours = excluded.voting_period_hours,
      confirmation_blocks = excluded.confirmation_blocks,
      updated_at = NOW()
    `,
    [
      normalizedInstanceId,
      defaultName,
      merged.rpcUrl,
      merged.contractAddress,
      merged.chain,
      String(merged.startBlock ?? 0),
      merged.maxBlockRange ?? 10_000,
      merged.votingPeriodHours ?? 72,
      merged.confirmationBlocks ?? 12,
    ],
  );

  if (normalizedInstanceId !== DEFAULT_ORACLE_INSTANCE_ID) {
    return merged;
  }

  await query(
    `INSERT INTO oracle_config (id, rpc_url, contract_address, chain, start_block, max_block_range, voting_period_hours, confirmation_blocks)
     VALUES (1, $1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT (id) DO UPDATE SET
       rpc_url = excluded.rpc_url,
       contract_address = excluded.contract_address,
       chain = excluded.chain,
       start_block = excluded.start_block,
       max_block_range = excluded.max_block_range,
       voting_period_hours = excluded.voting_period_hours,
       confirmation_blocks = excluded.confirmation_blocks
    `,
    [
      merged.rpcUrl,
      merged.contractAddress,
      merged.chain,
      String(merged.startBlock ?? 0),
      merged.maxBlockRange ?? 10_000,
      merged.votingPeriodHours ?? 72,
      merged.confirmationBlocks ?? 12,
    ],
  );

  return merged;
}
