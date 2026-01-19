import { beforeEach, describe, expect, it, vi } from "vitest";

type AlertRuleLike = {
  id: string;
  enabled: boolean;
  event: string;
  severity: string;
  channels: Array<"webhook" | "email">;
  recipient?: string | null;
  silencedUntil?: string | null;
};

type SyncStateLike = {
  lastProcessedBlock: bigint;
  latestBlock: bigint | null;
  safeBlock: bigint | null;
  lastSuccessProcessedBlock: bigint | null;
  consecutiveFailures: number;
  rpcActiveUrl: string | null;
  rpcStats: unknown;
  sync: {
    lastAttemptAt: string | null;
    lastSuccessAt: string | null;
    lastDurationMs: number | null;
    lastError: string | null;
  };
};

const {
  readOracleConfig,
  readOracleState,
  getSyncState,
  updateSyncState,
  insertSyncMetric,
  createOrTouchAlert,
  readAlertRules,
  createPublicClient,
  http,
  parseAbi,
} = vi.hoisted(() => ({
  readOracleConfig: vi.fn(),
  readOracleState: vi.fn(),
  getSyncState: vi.fn<() => Promise<SyncStateLike>>(),
  updateSyncState: vi.fn(),
  insertSyncMetric: vi.fn(),
  createOrTouchAlert: vi.fn(),
  readAlertRules: vi.fn<() => Promise<AlertRuleLike[]>>(),
  createPublicClient: vi.fn(),
  http: vi.fn(),
  parseAbi: vi.fn((abi: unknown) => abi),
}));

vi.mock("./oracleConfig", () => ({ readOracleConfig }));

vi.mock("./oracleState", () => ({
  readOracleState,
  getSyncState,
  fetchAssertion: vi.fn(),
  fetchDispute: vi.fn(),
  upsertAssertion: vi.fn(),
  upsertDispute: vi.fn(),
  updateSyncState,
  insertSyncMetric,
  insertVoteEvent: vi.fn(),
  recomputeDisputeVotes: vi.fn(),
}));

vi.mock("./observability", () => ({
  createOrTouchAlert,
  readAlertRules,
}));

vi.mock("@/lib/env", () => ({
  env: {
    INSIGHT_RPC_URL: "",
    INSIGHT_CHAIN: "",
    INSIGHT_ORACLE_ADDRESS: "",
    INSIGHT_RPC_TIMEOUT_MS: "",
    INSIGHT_DEPENDENCY_TIMEOUT_MS: "",
    POLYGON_AMOY_RPC_URL: "",
    POLYGON_RPC_URL: "",
    ARBITRUM_RPC_URL: "",
    OPTIMISM_RPC_URL: "",
  },
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("viem", () => ({
  createPublicClient,
  http,
  parseAbi,
}));

import { ensureOracleSynced } from "./oracleIndexer";

describe("oracleIndexer sync error handling", () => {
  const baseRule: AlertRuleLike = {
    id: "rule-1",
    enabled: true,
    event: "sync_error",
    severity: "critical",
    channels: ["webhook"],
    recipient: null,
    silencedUntil: null,
  };

  const baseSyncState: SyncStateLike = {
    lastProcessedBlock: 100n,
    latestBlock: null,
    safeBlock: null,
    lastSuccessProcessedBlock: null,
    consecutiveFailures: 2,
    rpcActiveUrl: null,
    rpcStats: null,
    sync: {
      lastAttemptAt: null,
      lastSuccessAt: "2020-01-01T00:00:00.000Z",
      lastDurationMs: 123,
      lastError: null,
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    readAlertRules.mockResolvedValue([baseRule]);
    readOracleConfig.mockResolvedValue({
      rpcUrl: "https://rpc.example",
      contractAddress: "0x1111111111111111111111111111111111111111",
      chain: "PolygonAmoy",
      startBlock: 0,
      maxBlockRange: 10_000,
      votingPeriodHours: 72,
      confirmationBlocks: 12,
    });
    getSyncState.mockResolvedValue({ ...baseSyncState });
    readOracleState.mockResolvedValue({
      version: 2,
      chain: "PolygonAmoy",
      contractAddress: "0x1111111111111111111111111111111111111111",
      lastProcessedBlock: 0n,
      sync: baseSyncState.sync,
      assertions: {},
      disputes: {},
    });
    updateSyncState.mockResolvedValue(void 0);
    insertSyncMetric.mockResolvedValue(void 0);
    createOrTouchAlert.mockResolvedValue(void 0);
  });

  it("records contract_not_found and increments consecutiveFailures", async () => {
    createPublicClient.mockReturnValue({
      getBytecode: vi.fn(async () => "0x"),
    });

    await expect(ensureOracleSynced()).rejects.toThrow("contract_not_found");

    expect(createOrTouchAlert).toHaveBeenCalledTimes(1);
    expect(createOrTouchAlert).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "sync_error",
        title: "Oracle sync error",
        message: "contract_not_found",
        entityType: "oracle",
      }),
    );

    expect(updateSyncState).toHaveBeenCalledWith(
      100n,
      expect.any(String),
      "2020-01-01T00:00:00.000Z",
      123,
      "contract_not_found",
      expect.objectContaining({
        consecutiveFailures: 3,
      }),
    );

    expect(insertSyncMetric).toHaveBeenCalledWith(
      expect.objectContaining({
        lastProcessedBlock: 100n,
        error: "contract_not_found",
      }),
    );
  });

  it("silences notifications when rule is silencedUntil in the future", async () => {
    readAlertRules.mockResolvedValue([
      { ...baseRule, silencedUntil: "2999-01-01T00:00:00.000Z" },
    ]);
    createPublicClient.mockReturnValue({
      getBytecode: vi.fn(async () => "0x"),
    });

    await expect(ensureOracleSynced()).rejects.toThrow("contract_not_found");

    expect(createOrTouchAlert).toHaveBeenCalledWith(
      expect.objectContaining({
        notify: { channels: [] },
      }),
    );
  });

  it("records rpc_unreachable and retries with backoff", async () => {
    vi.useFakeTimers();
    try {
      createPublicClient.mockReturnValue({
        getBytecode: vi.fn(async () => {
          throw new Error("fetch failed");
        }),
      });

      const p = ensureOracleSynced();
      const handled = p.catch((e) => e);
      await vi.runAllTimersAsync();
      const err = await handled;
      expect(err).toBeInstanceOf(Error);
      expect((err as Error).message).toBe("fetch failed");

      expect(updateSyncState).toHaveBeenCalledWith(
        100n,
        expect.any(String),
        "2020-01-01T00:00:00.000Z",
        123,
        "rpc_unreachable",
        expect.objectContaining({
          consecutiveFailures: 3,
        }),
      );
    } finally {
      vi.useRealTimers();
    }
  });
});
