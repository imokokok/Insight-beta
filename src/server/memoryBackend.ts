import type { Assertion, Dispute, OracleConfig } from "@/lib/oracleTypes";
import type { SyncMeta } from "@/server/oracleState";

type MemoryAlert = {
  id: number;
  fingerprint: string;
  type: string;
  severity: "info" | "warning" | "critical";
  title: string;
  message: string;
  entityType: string | null;
  entityId: string | null;
  status: "Open" | "Acknowledged" | "Resolved";
  occurrences: number;
  firstSeenAt: string;
  lastSeenAt: string;
  acknowledgedAt: string | null;
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

type MemoryAudit = {
  id: number;
  createdAt: string;
  actor: string | null;
  action: string;
  entityType: string | null;
  entityId: string | null;
  details: unknown;
};

type MemoryKvItem = { value: unknown; updatedAt: string };

type MemoryStore = {
  oracleConfig: OracleConfig;
  sync: { lastProcessedBlock: bigint; meta: SyncMeta };
  assertions: Map<string, Assertion>;
  disputes: Map<string, Dispute>;
  kv: Map<string, MemoryKvItem>;
  alerts: Map<string, MemoryAlert>;
  nextAlertId: number;
  audit: MemoryAudit[];
  nextAuditId: number;
};

function createDefaultConfig(): OracleConfig {
  return {
    rpcUrl: "",
    contractAddress: "",
    chain: "Local",
    startBlock: 0,
    maxBlockRange: 10_000,
    votingPeriodHours: 72
  };
}

function createDefaultSyncMeta(): SyncMeta {
  return {
    lastAttemptAt: null,
    lastSuccessAt: null,
    lastDurationMs: null,
    lastError: null
  };
}

export function getMemoryStore(): MemoryStore {
  const g = globalThis as unknown as { __insightMemoryStore?: MemoryStore };
  if (!g.__insightMemoryStore) {
    g.__insightMemoryStore = {
      oracleConfig: createDefaultConfig(),
      sync: { lastProcessedBlock: 0n, meta: createDefaultSyncMeta() },
      assertions: new Map(),
      disputes: new Map(),
      kv: new Map(),
      alerts: new Map(),
      nextAlertId: 1,
      audit: [],
      nextAuditId: 1
    };
  }
  return g.__insightMemoryStore;
}

export function memoryNowIso() {
  return new Date().toISOString();
}

