import { query } from "./db";
import { ensureSchema } from "./schema";
import type { OracleChain, OracleConfig as SharedOracleConfig } from "@/lib/oracleTypes";

export type OracleConfig = SharedOracleConfig;

let schemaEnsured = false;
async function ensureDb() {
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
  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    throw new Error("invalid_rpc_url");
  }
  if (!["http:", "https:", "ws:", "wss:"].includes(url.protocol)) {
    throw new Error("invalid_rpc_url");
  }
  return trimmed;
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

export function validateOracleConfigPatch(next: Partial<OracleConfig>) {
  const patch: Partial<OracleConfig> = {};
  if (next.rpcUrl !== undefined) patch.rpcUrl = validateRpcUrl(next.rpcUrl);
  if (next.contractAddress !== undefined) patch.contractAddress = validateAddress(next.contractAddress);
  if (next.chain !== undefined) patch.chain = validateChain(next.chain);
  return patch;
}

export async function readOracleConfig(): Promise<OracleConfig> {
  await ensureDb();
  const res = await query("SELECT * FROM oracle_config WHERE id = 1");
  const row = res.rows[0];
  if (!row) {
    return {
      rpcUrl: "",
      contractAddress: "",
      chain: "Local"
    };
  }
  return {
    rpcUrl: row.rpc_url || "",
    contractAddress: row.contract_address || "",
    chain: (row.chain as OracleChain) || "Local"
  };
}

export async function writeOracleConfig(next: Partial<OracleConfig>) {
  await ensureDb();
  const prev = await readOracleConfig();
  const merged: OracleConfig = {
    rpcUrl: next.rpcUrl === undefined ? prev.rpcUrl : normalizeUrl(next.rpcUrl),
    contractAddress: next.contractAddress === undefined ? prev.contractAddress : normalizeAddress(next.contractAddress),
    chain: next.chain === undefined ? prev.chain : normalizeChain(next.chain)
  };
  
  await query(
    `INSERT INTO oracle_config (id, rpc_url, contract_address, chain)
     VALUES (1, $1, $2, $3)
     ON CONFLICT (id) DO UPDATE SET
       rpc_url = excluded.rpc_url,
       contract_address = excluded.contract_address,
       chain = excluded.chain
    `,
    [merged.rpcUrl, merged.contractAddress, merged.chain]
  );
  
  return merged;
}
