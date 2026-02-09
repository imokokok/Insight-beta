import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock env module using vi.hoisted
const { mockEnv } = vi.hoisted(() => ({
  mockEnv: {
    INSIGHT_RPC_URL: undefined as string | undefined,
    INSIGHT_CHAIN: undefined as string | undefined,
    INSIGHT_ORACLE_ADDRESS: undefined as string | undefined,
    POLYGON_AMOY_RPC_URL: undefined as string | undefined,
    POLYGON_RPC_URL: undefined as string | undefined,
    ARBITRUM_RPC_URL: undefined as string | undefined,
    OPTIMISM_RPC_URL: undefined as string | undefined,
    INSIGHT_VOTING_DEGRADATION: undefined as string | undefined,
    INSIGHT_ENABLE_VOTING: undefined as string | undefined,
    INSIGHT_DISABLE_VOTE_TRACKING: undefined as string | undefined,
  },
}));

vi.mock('@/lib/config/env', () => ({
  env: mockEnv,
}));

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

vi.mock('./oracleConfig', () => ({
  readOracleConfig,
  DEFAULT_ORACLE_INSTANCE_ID: 'default',
}));

import { getOracleEnv } from './oracleIndexer';

describe('getOracleEnv RPC fallback', () => {
  beforeEach(() => {
    // Reset mock env
    Object.keys(mockEnv).forEach((key) => {
      (mockEnv as Record<string, string | undefined>)[key] = undefined;
    });
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('uses chain-specific RPC when INSIGHT_RPC_URL and config.rpcUrl are empty', async () => {
    mockEnv.POLYGON_AMOY_RPC_URL = 'https://amoy.rpc.example';
    mockEnv.INSIGHT_ORACLE_ADDRESS = '0x1111111111111111111111111111111111111111';

    readOracleConfig.mockResolvedValueOnce({
      rpcUrl: '',
      contractAddress: null,
      chain: 'PolygonAmoy',
      startBlock: 0,
      maxBlockRange: 10_000,
      votingPeriodHours: 72,
      confirmationBlocks: 12,
    });

    const out = await getOracleEnv();
    expect(out.chain).toBe('PolygonAmoy');
    expect(out.rpcUrl).toBe('https://amoy.rpc.example');
  });

  it('prefers INSIGHT_RPC_URL over chain-specific RPC', async () => {
    mockEnv.INSIGHT_RPC_URL = 'https://override.rpc.example';
    mockEnv.POLYGON_AMOY_RPC_URL = 'https://amoy.rpc.example';
    mockEnv.INSIGHT_ORACLE_ADDRESS = '0x1111111111111111111111111111111111111111';

    readOracleConfig.mockResolvedValueOnce({
      rpcUrl: '',
      contractAddress: null,
      chain: 'PolygonAmoy',
      startBlock: 0,
      maxBlockRange: 10_000,
      votingPeriodHours: 72,
      confirmationBlocks: 12,
    });

    const out = await getOracleEnv();
    expect(out.rpcUrl).toBe('https://override.rpc.example');
  });

  it('prefers config.rpcUrl over chain-specific RPC', async () => {
    mockEnv.POLYGON_AMOY_RPC_URL = 'https://amoy.rpc.example';
    mockEnv.INSIGHT_ORACLE_ADDRESS = '0x1111111111111111111111111111111111111111';

    readOracleConfig.mockResolvedValueOnce({
      rpcUrl: 'https://config.rpc.example',
      contractAddress: null,
      chain: 'PolygonAmoy',
      startBlock: 0,
      maxBlockRange: 10_000,
      votingPeriodHours: 72,
      confirmationBlocks: 12,
    });

    const out = await getOracleEnv();
    expect(out.rpcUrl).toBe('https://config.rpc.example');
  });

  it('uses INSIGHT_CHAIN to select chain-specific RPC when config.chain is empty', async () => {
    mockEnv.INSIGHT_CHAIN = 'Arbitrum';
    mockEnv.ARBITRUM_RPC_URL = 'https://arbitrum.rpc.example';
    mockEnv.INSIGHT_ORACLE_ADDRESS = '0x1111111111111111111111111111111111111111';

    readOracleConfig.mockResolvedValueOnce({
      rpcUrl: '',
      contractAddress: null,
      chain: '',
      startBlock: 0,
      maxBlockRange: 10_000,
      votingPeriodHours: 72,
      confirmationBlocks: 12,
    });

    const out = await getOracleEnv();
    expect(out.chain).toBe('Arbitrum');
    expect(out.rpcUrl).toBe('https://arbitrum.rpc.example');
  });
});
