import { hasDatabase, query } from "./db";
import { ensureSchema } from "./schema";
import type { OracleChain, OracleConfig as SharedOracleConfig } from "@/lib/oracleTypes";
import { getMemoryStore } from "@/server/memoryBackend";

export type OracleConfig = SharedOracleConfig;

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
  if (value === "Polygon" || value === "Arbitrum" || value === "Optimism" || value === "Local") return value;
  return "Local";
}

function validateChain(value: unknown): OracleChain {
  if (typeof value !== "string") throw new Error("invalid_request_body");
  if (value === "Polygon" || value === "Arbitrum" || value === "Optimism" || value === "Local") return value;
  throw new Error("invalid_chain");
}

function normalizeOptionalNonNegativeInt(value: unknown) {
  if (typeof value === "number" && Number.isInteger(value) && value >= 0) return value;
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
  if (normalized === undefined && value !== undefined) throw new Error("invalid_request_body");
  return normalized;
}

function normalizeOptionalIntInRange(value: unknown, min: number, max: number) {
  const normalized = normalizeOptionalNonNegativeInt(value);
  if (normalized === undefined) return undefined;
  if (normalized < min || normalized > max) return undefined;
  return normalized;
}

function validateOptionalIntInRange(value: unknown, min: number, max: number, code: string) {
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
  if (next.rpcUrl !== undefined) patch.rpcUrl = withField("rpcUrl", () => validateRpcUrl(next.rpcUrl));
  if (next.contractAddress !== undefined) patch.contractAddress = withField("contractAddress", () => validateAddress(next.contractAddress));
  if (next.chain !== undefined) patch.chain = withField("chain", () => validateChain(next.chain));
  if (next.startBlock !== undefined) patch.startBlock = withField("startBlock", () => validateOptionalNonNegativeInt(next.startBlock));
  if (next.maxBlockRange !== undefined) patch.maxBlockRange = withField("maxBlockRange", () => validateOptionalIntInRange(next.maxBlockRange, 100, 200_000, "invalid_max_block_range"));
  if (next.votingPeriodHours !== undefined) patch.votingPeriodHours = withField("votingPeriodHours", () => validateOptionalIntInRange(next.votingPeriodHours, 1, 720, "invalid_voting_period_hours"));
  if (next.confirmationBlocks !== undefined) patch.confirmationBlocks = withField("confirmationBlocks", () => validateOptionalNonNegativeInt(next.confirmationBlocks));
  return patch;
}

export async function readOracleConfig(): Promise<OracleConfig> {
  await ensureDb();
  if (!hasDatabase()) {
    return getMemoryStore().oracleConfig;
  }
  const res = await query("SELECT * FROM oracle_config WHERE id = 1");
  const row = res.rows[0];
  if (!row) {
    return {
      rpcUrl: "",
      contractAddress: "",
      chain: "Local",
      startBlock: 0,
      maxBlockRange: 10_000,
      votingPeriodHours: 72,
      confirmationBlocks: 12
    };
  }
  return {
    rpcUrl: row.rpc_url || "",
    contractAddress: row.contract_address || "",
    chain: (row.chain as OracleChain) || "Local",
    startBlock: normalizeOptionalNonNegativeInt(row.start_block) ?? 0,
    maxBlockRange: normalizeOptionalIntInRange(row.max_block_range, 100, 200_000) ?? 10_000,
    votingPeriodHours: normalizeOptionalIntInRange(row.voting_period_hours, 1, 720) ?? 72,
    confirmationBlocks: normalizeOptionalNonNegativeInt(row.confirmation_blocks) ?? 12
  };
}

export async function writeOracleConfig(next: Partial<OracleConfig>) {
  await ensureDb();
  const prev = await readOracleConfig();
  const merged: OracleConfig = {
    rpcUrl: next.rpcUrl === undefined ? prev.rpcUrl : normalizeUrl(next.rpcUrl),
    contractAddress: next.contractAddress === undefined ? prev.contractAddress : normalizeAddress(next.contractAddress),
    chain: next.chain === undefined ? prev.chain : normalizeChain(next.chain),
    startBlock: next.startBlock === undefined ? prev.startBlock : (normalizeOptionalNonNegativeInt(next.startBlock) ?? 0),
    maxBlockRange: next.maxBlockRange === undefined ? prev.maxBlockRange : (normalizeOptionalIntInRange(next.maxBlockRange, 100, 200_000) ?? 10_000),
    votingPeriodHours: next.votingPeriodHours === undefined ? prev.votingPeriodHours : (normalizeOptionalIntInRange(next.votingPeriodHours, 1, 720) ?? 72),
    confirmationBlocks: next.confirmationBlocks === undefined ? prev.confirmationBlocks : (normalizeOptionalNonNegativeInt(next.confirmationBlocks) ?? 12)
  };
  
  if (!hasDatabase()) {
    getMemoryStore().oracleConfig = merged;
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
      merged.confirmationBlocks ?? 12
    ]
  );
  
  return merged;
}
