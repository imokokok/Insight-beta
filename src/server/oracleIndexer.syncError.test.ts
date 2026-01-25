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
  fetchAssertion,
  fetchDispute,
  upsertAssertion,
  upsertDispute,
  updateSyncState,
  insertSyncMetric,
  insertVoteEvent,
  insertOracleEvent,
  recomputeDisputeVotes,
  replayOracleEventsRange,
  createOrTouchAlert,
  readAlertRules,
  createPublicClient,
  http,
  parseAbi,
} = vi.hoisted(() => ({
  readOracleConfig: vi.fn(),
  readOracleState: vi.fn(),
  getSyncState: vi.fn<() => Promise<SyncStateLike>>(),
  fetchAssertion: vi.fn(),
  fetchDispute: vi.fn(),
  upsertAssertion: vi.fn(),
  upsertDispute: vi.fn(),
  updateSyncState: vi.fn(),
  insertSyncMetric: vi.fn(),
  insertVoteEvent: vi.fn(),
  insertOracleEvent: vi.fn(),
  recomputeDisputeVotes: vi.fn(),
  replayOracleEventsRange: vi.fn(async () => ({ applied: 0 })),
  createOrTouchAlert: vi.fn(),
  readAlertRules: vi.fn<() => Promise<AlertRuleLike[]>>(),
  createPublicClient: vi.fn(),
  http: vi.fn(),
  parseAbi: vi.fn((abi: unknown) => abi),
}));

vi.mock("./oracleConfig", () => ({
  readOracleConfig,
  DEFAULT_ORACLE_INSTANCE_ID: "default",
}));

vi.mock("./oracleState", () => ({
  readOracleState,
  getSyncState,
  fetchAssertion,
  fetchDispute,
  upsertAssertion,
  upsertDispute,
  updateSyncState,
  insertSyncMetric,
  insertVoteEvent,
  insertOracleEvent,
  recomputeDisputeVotes,
  replayOracleEventsRange,
}));

vi.mock("./observability", () => ({
  createOrTouchAlert,
  readAlertRules,
}));

vi.mock("@/lib/config/env", () => ({
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
    INSIGHT_ENABLE_VOTING: "true",
    INSIGHT_DISABLE_VOTE_TRACKING: "false",
    INSIGHT_VOTING_DEGRADATION: "false",
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
      "default",
    );

    expect(insertSyncMetric).toHaveBeenCalledWith(
      expect.objectContaining({
        lastProcessedBlock: 100n,
        error: "contract_not_found",
      }),
      "default",
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
        "default",
      );
    } finally {
      vi.useRealTimers();
    }
  });

  it("stores VoteCast logs and recomputes dispute votes", async () => {
    getSyncState.mockResolvedValue({
      ...baseSyncState,
      lastProcessedBlock: 0n,
      consecutiveFailures: 0,
    });

    const assertionId = `0x${"11".repeat(32)}`;
    const voter = "0x2222222222222222222222222222222222222222";
    const asserter = "0x3333333333333333333333333333333333333333";
    const disputer = "0x4444444444444444444444444444444444444444";

    fetchAssertion.mockResolvedValue(null);
    fetchDispute.mockResolvedValue(null);

    createPublicClient.mockReturnValue({
      getBytecode: vi.fn(async () => "0x1234"),
      getBlockNumber: vi.fn(async () => 20n),
      getLogs: vi.fn(async (opts: { event?: unknown } | undefined) => {
        const ev = opts?.event;
        if (typeof ev !== "string") return [];
        if (ev.includes("AssertionCreated")) {
          return [
            {
              args: {
                assertionId,
                asserter,
                protocol: "Demo",
                market: "ETH/USD",
                assertion: "YES",
                bondUsd: 100n,
                assertedAt: 1n,
                livenessEndsAt: 2n,
                txHash: `0x${"00".repeat(32)}`,
              },
              transactionHash: `0x${"aa".repeat(32)}`,
              blockNumber: 10n,
              logIndex: 0,
            },
          ];
        }
        if (ev.includes("AssertionDisputed")) {
          return [
            {
              args: {
                assertionId,
                disputer,
                reason: "Because",
                disputedAt: 3n,
              },
              transactionHash: `0x${"bb".repeat(32)}`,
              blockNumber: 11n,
              logIndex: 1,
            },
          ];
        }
        if (ev.includes("VoteCast")) {
          return [
            {
              args: {
                assertionId,
                voter,
                support: true,
                weight: 1n,
              },
              transactionHash: `0x${"cc".repeat(32)}`,
              blockNumber: 12n,
              logIndex: 2,
            },
          ];
        }
        return [];
      }),
    });

    insertVoteEvent.mockResolvedValue(true);

    const result = await ensureOracleSynced();
    expect(result.updated).toBe(true);

    expect(insertVoteEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        assertionId,
        voter,
        support: true,
        weight: 1n,
      }),
      "default",
    );
    expect(recomputeDisputeVotes).toHaveBeenCalledWith(assertionId, "default");
    expect(upsertDispute).toHaveBeenCalledWith(
      expect.objectContaining({
        id: `D:${assertionId}`,
        assertionId,
        status: "Voting",
      }),
      "default",
    );
  });
});
