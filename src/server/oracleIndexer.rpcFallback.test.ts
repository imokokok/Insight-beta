import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type OracleConfigLike = {
  rpcUrl: string;
  contractAddress: string | null;
  chain: string;
  startBlock?: number;
  maxBlockRange?: number;
  votingPeriodHours?: number;
  confirmationBlocks?: number;
};

const { readOracleConfig } = vi.hoisted(() => ({
  readOracleConfig: vi.fn<() => Promise<OracleConfigLike>>(),
}));

vi.mock("./oracleConfig", () => ({
  readOracleConfig,
  DEFAULT_ORACLE_INSTANCE_ID: "default",
}));

import { getOracleEnv } from "./oracleIndexer";

type EnvSnapshot = Record<string, string | undefined>;

function snapshotEnv(keys: string[]): EnvSnapshot {
  const out: EnvSnapshot = {};
  for (const k of keys) out[k] = process.env[k];
  return out;
}

function restoreEnv(snapshot: EnvSnapshot) {
  for (const [k, v] of Object.entries(snapshot)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
}

describe("getOracleEnv RPC fallback", () => {
  const keys = [
    "INSIGHT_RPC_URL",
    "INSIGHT_CHAIN",
    "INSIGHT_ORACLE_ADDRESS",
    "POLYGON_AMOY_RPC_URL",
    "POLYGON_RPC_URL",
    "ARBITRUM_RPC_URL",
    "OPTIMISM_RPC_URL",
  ];
  let envBefore: EnvSnapshot;

  beforeEach(() => {
    envBefore = snapshotEnv(keys);
    for (const k of keys) delete process.env[k];
    vi.clearAllMocks();
  });

  afterEach(() => {
    restoreEnv(envBefore);
  });

  it("uses chain-specific RPC when INSIGHT_RPC_URL and config.rpcUrl are empty", async () => {
    process.env.POLYGON_AMOY_RPC_URL = "https://amoy.rpc.example";
    process.env.INSIGHT_ORACLE_ADDRESS =
      "0x1111111111111111111111111111111111111111";

    readOracleConfig.mockResolvedValueOnce({
      rpcUrl: "",
      contractAddress: null,
      chain: "PolygonAmoy",
      startBlock: 0,
      maxBlockRange: 10_000,
      votingPeriodHours: 72,
      confirmationBlocks: 12,
    });

    const out = await getOracleEnv();
    expect(out.chain).toBe("PolygonAmoy");
    expect(out.rpcUrl).toBe("https://amoy.rpc.example");
  });

  it("prefers INSIGHT_RPC_URL over chain-specific RPC", async () => {
    process.env.INSIGHT_RPC_URL = "https://override.rpc.example";
    process.env.POLYGON_AMOY_RPC_URL = "https://amoy.rpc.example";
    process.env.INSIGHT_ORACLE_ADDRESS =
      "0x1111111111111111111111111111111111111111";

    readOracleConfig.mockResolvedValueOnce({
      rpcUrl: "",
      contractAddress: null,
      chain: "PolygonAmoy",
      startBlock: 0,
      maxBlockRange: 10_000,
      votingPeriodHours: 72,
      confirmationBlocks: 12,
    });

    const out = await getOracleEnv();
    expect(out.rpcUrl).toBe("https://override.rpc.example");
  });

  it("prefers config.rpcUrl over chain-specific RPC", async () => {
    process.env.POLYGON_AMOY_RPC_URL = "https://amoy.rpc.example";
    process.env.INSIGHT_ORACLE_ADDRESS =
      "0x1111111111111111111111111111111111111111";

    readOracleConfig.mockResolvedValueOnce({
      rpcUrl: "https://config.rpc.example",
      contractAddress: null,
      chain: "PolygonAmoy",
      startBlock: 0,
      maxBlockRange: 10_000,
      votingPeriodHours: 72,
      confirmationBlocks: 12,
    });

    const out = await getOracleEnv();
    expect(out.rpcUrl).toBe("https://config.rpc.example");
  });

  it("uses INSIGHT_CHAIN to select chain-specific RPC when config.chain is empty", async () => {
    process.env.INSIGHT_CHAIN = "Arbitrum";
    process.env.ARBITRUM_RPC_URL = "https://arbitrum.rpc.example";
    process.env.INSIGHT_ORACLE_ADDRESS =
      "0x1111111111111111111111111111111111111111";

    readOracleConfig.mockResolvedValueOnce({
      rpcUrl: "",
      contractAddress: null,
      chain: "",
      startBlock: 0,
      maxBlockRange: 10_000,
      votingPeriodHours: 72,
      confirmationBlocks: 12,
    });

    const out = await getOracleEnv();
    expect(out.chain).toBe("Arbitrum");
    expect(out.rpcUrl).toBe("https://arbitrum.rpc.example");
  });
});
