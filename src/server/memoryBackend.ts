import { env } from '@/lib/config/env';
import type {
  Assertion,
  Dispute,
  OracleChain,
  OracleConfig,
  UMAAssertion,
  UMADispute,
  UMAVote,
  UMAConfig,
} from '@/lib/types/oracleTypes';

import type { UMASyncMeta } from './oracle/umaState';
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

export type MemoryUMAInstance = {
  id: string;
  enabled: boolean;
  umaConfig: UMAConfig;
  umaSync: {
    lastProcessedBlock: bigint;
    latestBlock?: bigint | null;
    safeBlock?: bigint | null;
    lastSuccessProcessedBlock?: bigint | null;
    consecutiveFailures?: number;
    rpcActiveUrl?: string | null;
    rpcStats?: unknown;
    meta: UMASyncMeta;
  };
  umaAssertions: Map<string, UMAAssertion>;
  umaDisputes: Map<string, UMADispute>;
  umaVotes: Map<string, UMAVote>;
};

type MemoryStore = {
  instances: Map<string, MemoryOracleInstance>;
  umaInstances: Map<string, MemoryUMAInstance>;
  kv: Map<string, MemoryKvItem>;
  alerts: Map<string, MemoryAlert>;
  nextAlertId: number;
  audit: MemoryAudit[];
  nextAuditId: number;
  metrics: Map<string, unknown>;
  configHistory?: Map<string, unknown[]>;
};

function createDefaultConfig(): OracleConfig {
  const chainEnv = env.INSIGHT_CHAIN;
  const validChains: OracleChain[] = ['Polygon', 'PolygonAmoy', 'Arbitrum', 'Optimism', 'Local'];
  const chain: OracleChain = validChains.includes(chainEnv as OracleChain)
    ? (chainEnv as OracleChain)
    : 'Local';
  return {
    rpcUrl: env.INSIGHT_RPC_URL,
    contractAddress: '',
    chain,
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
  const g = globalThis as unknown as { __oracleMonitorMemoryStore?: MemoryStore };
  if (!g.__oracleMonitorMemoryStore) {
    const instances = new Map<string, MemoryOracleInstance>();
    instances.set('default', createDefaultInstance('default'));
    g.__oracleMonitorMemoryStore = {
      instances,
      umaInstances: new Map(),
      kv: new Map(),
      alerts: new Map(),
      nextAlertId: 1,
      audit: [],
      nextAuditId: 1,
      metrics: new Map(),
    };
  }
  return g.__oracleMonitorMemoryStore;
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

function createDefaultUMASyncMeta(): UMASyncMeta {
  return {
    lastAttemptAt: null,
    lastSuccessAt: null,
    lastDurationMs: null,
    lastError: null,
  };
}

function createDefaultUMAConfig(id: string): UMAConfig {
  const chainDefaults: Record<string, Partial<UMAConfig>> = {
    Ethereum: {
      chain: 'Ethereum',
      optimisticOracleV2Address: '0x9923D42eF195B0fA36D6f80f5629Ce76D1eF8754',
      optimisticOracleV3Address: '0xA5B9d8a0B0Fa04B710D7ee40D90d2551E58d0F65',
    },
    Polygon: {
      chain: 'Polygon',
      optimisticOracleV2Address: '0x0b9cA86Ab0a5c94E262a5a9A4f8B5c5f2c3d5f7',
      optimisticOracleV3Address: '0xDd46919fE564dE5bC5Cfc966aF2B79dc5A60A73d',
    },
  };

  return {
    id,
    chain: 'Ethereum',
    rpcUrl: '',
    startBlock: 0,
    maxBlockRange: 10_000,
    votingPeriodHours: 72,
    confirmationBlocks: 12,
    enabled: true,
    ...chainDefaults['Ethereum'],
  };
}

function createDefaultUMAInstance(id: string): MemoryUMAInstance {
  return {
    id,
    enabled: true,
    umaConfig: createDefaultUMAConfig(id),
    umaSync: {
      lastProcessedBlock: 0n,
      latestBlock: null,
      safeBlock: null,
      lastSuccessProcessedBlock: null,
      consecutiveFailures: 0,
      rpcActiveUrl: null,
      rpcStats: null,
      meta: createDefaultUMASyncMeta(),
    },
    umaAssertions: new Map(),
    umaDisputes: new Map(),
    umaVotes: new Map(),
  };
}

export function getMemoryUMAInstance(instanceId: string) {
  const mem = getMemoryStore();
  const id = (instanceId || 'uma-mainnet').trim() || 'uma-mainnet';
  let inst = mem.umaInstances.get(id);
  if (!inst) {
    inst = createDefaultUMAInstance(id);
    mem.umaInstances.set(id, inst);
  }
  return inst;
}

export function memoryNowIso() {
  return new Date().toISOString();
}
