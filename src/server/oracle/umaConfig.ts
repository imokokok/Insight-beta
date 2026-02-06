import { logger } from '@/lib/logger';
import type { UMAChain } from '@/lib/types/oracleTypes';

import { query, hasDatabase } from '../db';
import { ensureSchema } from '../schema';

export interface UMAConfig {
  id: string;
  chain: UMAChain;
  rpcUrl: string;
  optimisticOracleV2Address?: string;
  optimisticOracleV3Address?: string;
  startBlock?: number;
  maxBlockRange?: number;
  votingPeriodHours?: number;
  confirmationBlocks?: number;
  enabled: boolean;
}

export const DEFAULT_UMA_INSTANCE_ID = 'uma-mainnet';

let umaConfigCache: UMAConfig | null = null;
let umaConfigCacheTime: number = 0;
const UMA_CONFIG_CACHE_TTL = 60_000;

export async function readUMAConfig(
  instanceId: string = DEFAULT_UMA_INSTANCE_ID,
): Promise<UMAConfig | null> {
  const now = Date.now();
  if (umaConfigCache && now - umaConfigCacheTime < UMA_CONFIG_CACHE_TTL) {
    return umaConfigCache;
  }

  await ensureSchema();

  const normalizedInstanceId = instanceId.trim() || DEFAULT_UMA_INSTANCE_ID;

  if (!hasDatabase()) {
    const mem = (await import('../memoryBackend')).getMemoryUMAInstance(normalizedInstanceId);
    const config = mem.umaConfig;
    if (config) {
      umaConfigCache = config;
      umaConfigCacheTime = now;
      return config;
    }
    return getDefaultUMAConfig(normalizedInstanceId);
  }

  try {
    const res = await query<{
      id: string;
      chain: string;
      rpc_url: string;
      optimistic_oracle_v2_address: string | null;
      optimistic_oracle_v3_address: string | null;
      start_block: number | null;
      max_block_range: number | null;
      voting_period_hours: number | null;
      confirmation_blocks: number | null;
      enabled: boolean;
    }>(`SELECT * FROM uma_oracle_config WHERE id = $1`, [normalizedInstanceId]);

    if (res.rows.length > 0) {
      const row = res.rows[0];
      if (!row) return getDefaultUMAConfig(normalizedInstanceId);
      const config: UMAConfig = {
        id: row.id,
        chain: (row.chain as UMAChain) || 'Ethereum',
        rpcUrl: row.rpc_url || '',
        optimisticOracleV2Address: row.optimistic_oracle_v2_address || undefined,
        optimisticOracleV3Address: row.optimistic_oracle_v3_address || undefined,
        startBlock: row.start_block ?? undefined,
        maxBlockRange: row.max_block_range ?? undefined,
        votingPeriodHours: row.voting_period_hours ?? undefined,
        confirmationBlocks: row.confirmation_blocks ?? undefined,
        enabled: row.enabled,
      };
      umaConfigCache = config;
      umaConfigCacheTime = now;
      return config;
    }
  } catch (error) {
    logger.error('Failed to read UMA config from database', { error });
  }

  const defaultConfig = getDefaultUMAConfig(normalizedInstanceId);
  umaConfigCache = defaultConfig;
  umaConfigCacheTime = now;
  return defaultConfig;
}

function getDefaultUMAConfig(instanceId: string): UMAConfig {
  const chainDefaults: Record<string, Partial<UMAConfig>> = {
    Ethereum: {
      chain: 'Ethereum',
      optimisticOracleV2Address: '0x9923D42eF195B0fA36D6f80f5629Ce76D1eF8754',
      optimisticOracleV3Address: '0xA5B9d8a0B0Fa04B710D7ee40D90d2551E58d0F65',
    },
    Polygon: {
      chain: 'Polygon',
      optimisticOracleV2Address: '0xbA5bA5eB5A32a7A5aB75bFA9e9cA5f2a3d5f7a9',
      optimisticOracleV3Address: '0xDd46919fE564dE5bC5Cfc966aF2B79dc5A60A73d',
    },
    Arbitrum: {
      chain: 'Arbitrum',
      optimisticOracleV2Address: '0x0b9cA86Ab0a5c94E262a5a9A4f8B5c5f2c3d5f7',
      optimisticOracleV3Address: '0x2d0D2cB02b5eBA6e82b8277BDeF58612f650B401',
    },
    Optimism: {
      chain: 'Optimism',
      optimisticOracleV2Address: '0x0b9cA86Ab0a5c94E262a5a9A4f8B5c5f2c3d5f7',
      optimisticOracleV3Address: '0x0335B4C63c688d560C24c80295a6Ca09C5eC93d4',
    },
    Base: {
      chain: 'Base',
      optimisticOracleV2Address: '0x0b9cA86Ab0a5c94E262a5a9A4f8B5c5f2c3d5f7',
      optimisticOracleV3Address: '0x0b9cA86Ab0a5c94E262a5a9A4f8B5c5f2c3d5f7',
    },
    PolygonAmoy: {
      chain: 'PolygonAmoy',
      optimisticOracleV2Address: '0x0b9cA86Ab0a5c94E262a5a9A4f8B5c5f2c3d5f7',
      optimisticOracleV3Address: '0x0b9cA86Ab0a5c94E262a5a9A4f8B5c5f2c3d5f7',
    },
  };

  return {
    id: instanceId,
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

export async function writeUMAConfig(
  config: Partial<UMAConfig>,
  instanceId: string = DEFAULT_UMA_INSTANCE_ID,
): Promise<UMAConfig> {
  await ensureSchema();

  const normalizedInstanceId = instanceId.trim() || DEFAULT_UMA_INSTANCE_ID;
  const fullConfig = await readUMAConfig(normalizedInstanceId);

  if (!fullConfig) {
    throw new Error(`UMA config not found for instance: ${normalizedInstanceId}`);
  }

  const mergedConfig: UMAConfig = {
    ...fullConfig,
    ...config,
    id: normalizedInstanceId,
  };

  if (!hasDatabase()) {
    const mem = (await import('../memoryBackend')).getMemoryUMAInstance(normalizedInstanceId);
    mem.umaConfig = mergedConfig;
    umaConfigCache = mergedConfig;
    umaConfigCacheTime = Date.now();
    return mergedConfig;
  }

  await query(
    `INSERT INTO uma_oracle_config (id, chain, rpc_url, optimistic_oracle_v2_address, optimistic_oracle_v3_address, start_block, max_block_range, voting_period_hours, confirmation_blocks, enabled)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     ON CONFLICT (id) DO UPDATE SET
       chain = excluded.chain,
       rpc_url = excluded.rpc_url,
       optimistic_oracle_v2_address = excluded.optimistic_oracle_v2_address,
       optimistic_oracle_v3_address = excluded.optimistic_oracle_v3_address,
       start_block = excluded.start_block,
       max_block_range = excluded.max_block_range,
       voting_period_hours = excluded.voting_period_hours,
       confirmation_blocks = excluded.confirmation_blocks,
       enabled = excluded.enabled`,
    [
      normalizedInstanceId,
      mergedConfig.chain,
      mergedConfig.rpcUrl,
      mergedConfig.optimisticOracleV2Address || null,
      mergedConfig.optimisticOracleV3Address || null,
      mergedConfig.startBlock ?? 0,
      mergedConfig.maxBlockRange ?? 10_000,
      mergedConfig.votingPeriodHours ?? 72,
      mergedConfig.confirmationBlocks ?? 12,
      mergedConfig.enabled,
    ],
  );

  umaConfigCache = mergedConfig;
  umaConfigCacheTime = Date.now();
  return mergedConfig;
}

export async function listUMAConfigs(): Promise<UMAConfig[]> {
  await ensureSchema();

  if (!hasDatabase()) {
    const config = await readUMAConfig(DEFAULT_UMA_INSTANCE_ID);
    return config ? [config] : [];
  }

  try {
    const res = await query<{
      id: string;
      chain: string;
      rpc_url: string;
      optimistic_oracle_v2_address: string | null;
      optimistic_oracle_v3_address: string | null;
      start_block: number | null;
      max_block_range: number | null;
      voting_period_hours: number | null;
      confirmation_blocks: number | null;
      enabled: boolean;
    }>(`SELECT * FROM uma_oracle_config ORDER BY id`);

    return res.rows.map(
      (row): UMAConfig => ({
        id: row.id,
        chain: (row.chain as UMAChain) || 'Ethereum',
        rpcUrl: row.rpc_url || '',
        optimisticOracleV2Address: row.optimistic_oracle_v2_address || undefined,
        optimisticOracleV3Address: row.optimistic_oracle_v3_address || undefined,
        startBlock: row.start_block ?? undefined,
        maxBlockRange: row.max_block_range ?? undefined,
        votingPeriodHours: row.voting_period_hours ?? undefined,
        confirmationBlocks: row.confirmation_blocks ?? undefined,
        enabled: row.enabled,
      }),
    );
  } catch (error) {
    logger.error('Failed to list UMA configs', { error });
    const config = await readUMAConfig(DEFAULT_UMA_INSTANCE_ID);
    return config ? [config] : [];
  }
}

export function invalidateUMAConfigCache() {
  umaConfigCache = null;
  umaConfigCacheTime = 0;
}
