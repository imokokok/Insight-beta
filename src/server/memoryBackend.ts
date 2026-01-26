import type { Assertion, Dispute, OracleChain, OracleConfig } from '@/lib/types/oracleTypes';
import type { SyncMeta } from './oracleState';

type MemoryAlert = {
  id: number;
  fingerprint: string;
  type: string;
  severity: 'info' | 'warning' | 'critical';
  title: string;
  message: string;
  entityType: string | null;
  entityId: string | null;
  status: 'Open' | 'Acknowledged' | 'Resolved';
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

type MemoryOracleEvent = {
  id: number;
  chain: OracleChain;
  eventType: string;
  assertionId: string | null;
  txHash: string;
  blockNumber: bigint;
  logIndex: number;
  payload: unknown;
  payloadChecksum: string | null;
};

export type MemoryOracleInstance = {
  id: string;
  name: string;
  enabled: boolean;
  oracleConfig: OracleConfig;
  sync: {
    lastProcessedBlock: bigint;
    latestBlock?: bigint | null;
    safeBlock?: bigint | null;
    lastSuccessProcessedBlock?: bigint | null;
    consecutiveFailures?: number;
    rpcActiveUrl?: string | null;
    rpcStats?: unknown;
    meta: SyncMeta;
    metrics?: {
      recordedAt: string;
      lagBlocks: bigint | null;
      durationMs: number | null;
      error: string | null;
    }[];
  };
  assertions: Map<string, Assertion>;
  disputes: Map<string, Dispute>;
  votes: Map<
    string,
    {
      assertionId: string;
      support: boolean;
      weight: bigint;
      blockNumber: bigint;
    }
  >;
  voteSums: Map<string, { forWeight: bigint; againstWeight: bigint }>;
  oracleEvents: Map<string, MemoryOracleEvent>;
  nextOracleEventId: number;
};

type MemoryStore = {
  instances: Map<string, MemoryOracleInstance>;
  kv: Map<string, MemoryKvItem>;
  alerts: Map<string, MemoryAlert>;
  nextAlertId: number;
  audit: MemoryAudit[];
  nextAuditId: number;
};

function createDefaultConfig(): OracleConfig {
  // Import env here to avoid circular dependencies
  const { env } = require('@/lib/config/env');
  return {
    rpcUrl: env.INSIGHT_RPC_URL,
    contractAddress: env.INSIGHT_ORACLE_ADDRESS,
    chain: env.INSIGHT_CHAIN || 'Local',
    startBlock: 0,
    maxBlockRange: 10_000,
    votingPeriodHours: 72,
    confirmationBlocks: 12,
  };
}

function createDefaultSyncMeta(): SyncMeta {
  return {
    lastAttemptAt: null,
    lastSuccessAt: null,
    lastDurationMs: null,
    lastError: null,
  };
}

function createDefaultInstance(id: string): MemoryOracleInstance {
  return {
    id,
    name: id === 'default' ? 'Default' : id,
    enabled: true,
    oracleConfig: createDefaultConfig(),
    sync: {
      lastProcessedBlock: 0n,
      latestBlock: null,
      safeBlock: null,
      lastSuccessProcessedBlock: null,
      consecutiveFailures: 0,
      rpcActiveUrl: null,
      rpcStats: null,
      meta: createDefaultSyncMeta(),
      metrics: [],
    },
    assertions: new Map(),
    disputes: new Map(),
    votes: new Map(),
    voteSums: new Map(),
    oracleEvents: new Map(),
    nextOracleEventId: 1,
  };
}

export function getMemoryStore(): MemoryStore {
  const g = globalThis as unknown as { __insightMemoryStore?: MemoryStore };
  if (!g.__insightMemoryStore) {
    const instances = new Map<string, MemoryOracleInstance>();
    instances.set('default', createDefaultInstance('default'));
    g.__insightMemoryStore = {
      instances,
      kv: new Map(),
      alerts: new Map(),
      nextAlertId: 1,
      audit: [],
      nextAuditId: 1,
    };
  }
  return g.__insightMemoryStore;
}

export function getMemoryInstance(instanceId: string) {
  const mem = getMemoryStore();
  const id = (instanceId || 'default').trim() || 'default';
  let inst = mem.instances.get(id);
  if (!inst) {
    inst = createDefaultInstance(id);
    mem.instances.set(id, inst);
  }
  return inst;
}

export function memoryNowIso() {
  return new Date().toISOString();
}
