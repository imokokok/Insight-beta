import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PoolClient } from "pg";

const { hasDatabase, getClient } = vi.hoisted(() => ({
  hasDatabase: vi.fn<() => boolean>(),
  getClient: vi.fn(),
}));

const { logger } = vi.hoisted(() => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("@/lib/env", () => ({
  env: {
    INSIGHT_WORKER_ID: "test-worker",
    INSIGHT_DISABLE_EMBEDDED_WORKER: "true",
  },
}));

vi.mock("@/lib/logger", () => ({ logger }));

vi.mock("./oracleIndexer", () => ({
  ensureOracleSynced: vi.fn(async () => ({ updated: false, state: {} })),
  getOracleEnv: vi.fn(async () => ({ rpcUrl: "", contractAddress: "" })),
  isOracleSyncing: vi.fn(() => false),
}));

vi.mock("@/server/db", () => ({
  hasDatabase,
  getClient,
  query: vi.fn(),
}));

vi.mock("@/server/observability", () => ({
  createOrTouchAlert: vi.fn(),
  readAlertRules: vi.fn(async () => []),
}));

vi.mock("@/server/oracle", () => ({
  getSyncState: vi.fn(async () => ({
    lastProcessedBlock: 0n,
    latestBlock: null,
    safeBlock: null,
    lastSuccessProcessedBlock: null,
    consecutiveFailures: 0,
    rpcActiveUrl: null,
    rpcStats: null,
    sync: {
      lastAttemptAt: null,
      lastSuccessAt: null,
      lastDurationMs: null,
      lastError: null,
    },
    chain: "Local",
    contractAddress: null,
    owner: null,
  })),
  readOracleState: vi.fn(async () => ({})),
}));

vi.mock("@/server/kvStore", () => ({
  writeJsonFile: vi.fn(async () => void 0),
}));

vi.mock("@/server/oracle/priceFetcher", () => ({
  fetchCurrentPrice: vi.fn(),
}));

vi.mock("viem", () => ({
  createPublicClient: vi.fn(),
  http: vi.fn(),
  formatEther: vi.fn(),
  parseAbi: vi.fn(() => []),
}));

import { tickWorkerOnce, tryAcquireWorkerLock } from "./worker";

describe("worker advisory lock", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.insightWorkerLockClient = undefined;
    global.insightWorkerLockKey = undefined;
  });

  it("returns true when database is disabled", async () => {
    hasDatabase.mockReturnValue(false);
    const ok = await tryAcquireWorkerLock();
    expect(ok).toBe(true);
    expect(getClient).not.toHaveBeenCalled();
  });

  it("returns true when lock client already exists", async () => {
    hasDatabase.mockReturnValue(true);
    global.insightWorkerLockClient = {
      query: vi.fn(),
      release: vi.fn(),
    } as unknown as PoolClient;
    const ok = await tryAcquireWorkerLock();
    expect(ok).toBe(true);
    expect(getClient).not.toHaveBeenCalled();
  });

  it("returns false and releases client when lock not acquired", async () => {
    hasDatabase.mockReturnValue(true);
    const client = {
      query: vi.fn(async () => ({ rows: [{ ok: false }] })),
      release: vi.fn(),
    };
    getClient.mockResolvedValue(client);

    const ok = await tryAcquireWorkerLock();
    expect(ok).toBe(false);
    expect(client.release).toHaveBeenCalledTimes(1);
    expect(global.insightWorkerLockClient).toBeUndefined();
    expect(global.insightWorkerLockKey).toBeUndefined();
  });

  it("returns false and releases client when query throws", async () => {
    hasDatabase.mockReturnValue(true);
    const client = {
      query: vi.fn(async () => {
        throw new Error("db_down");
      }),
      release: vi.fn(),
    };
    getClient.mockResolvedValue(client);

    const ok = await tryAcquireWorkerLock();
    expect(ok).toBe(false);
    expect(logger.error).toHaveBeenCalledWith(
      "Failed to acquire worker lock",
      expect.any(Object),
    );
    expect(client.release).toHaveBeenCalledTimes(1);
    expect(global.insightWorkerLockClient).toBeUndefined();
  });

  it("stores lock client and key when acquired", async () => {
    hasDatabase.mockReturnValue(true);
    const client = {
      query: vi.fn(async () => ({ rows: [{ ok: true }] })),
      release: vi.fn(),
    };
    getClient.mockResolvedValue(client);

    const ok = await tryAcquireWorkerLock();
    expect(ok).toBe(true);
    expect(global.insightWorkerLockClient).toBe(
      client as unknown as PoolClient,
    );
    expect(global.insightWorkerLockKey).toMatch(/^\d+$/);
    expect(client.release).not.toHaveBeenCalled();
  });
});

describe("worker alerts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.insightWorkerTickInProgress = undefined;
    global.insightWorkerLastError = undefined;
  });

  it("emits sync_error missing_config when oracle config is missing", async () => {
    hasDatabase.mockReturnValue(false);

    const { readAlertRules, createOrTouchAlert } =
      await import("@/server/observability");
    (readAlertRules as unknown as ReturnType<typeof vi.fn>).mockResolvedValue([
      {
        id: "rule-1",
        enabled: true,
        event: "sync_error",
        severity: "critical",
        channels: ["webhook"],
        recipient: null,
      },
    ]);

    const { getOracleEnv } = await import("./oracleIndexer");
    (getOracleEnv as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      rpcUrl: "",
      contractAddress: "",
    });

    await tickWorkerOnce();

    expect(createOrTouchAlert).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "sync_error",
        title: "Oracle sync error",
        message: "missing_config",
      }),
    );
  });
});
