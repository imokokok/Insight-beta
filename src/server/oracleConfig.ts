import { hasDatabase, query, getClient } from './db';
import { ensureSchema } from './schema';
import type {
  OracleChain,
  OracleConfig as SharedOracleConfig,
  OracleInstance,
} from '@/lib/types/oracleTypes';
import { getMemoryInstance, getMemoryStore } from '@/server/memoryBackend';
import { isIP } from 'node:net';
import { env } from '@/lib/config/env';
import { encryptString, decryptString, isEncryptionEnabled } from '@/lib/security/encryption';
import { logger } from '@/lib/logger';
import type { PoolClient } from 'pg';

export type OracleConfig = SharedOracleConfig;

export const DEFAULT_ORACLE_INSTANCE_ID = 'default';

export function redactOracleConfig(config: OracleConfig): OracleConfig {
  return { ...config, rpcUrl: '' };
}

let schemaEnsured = false;

async function ensureDb() {
  if (!hasDatabase()) return;
  if (!schemaEnsured) {
    try {
      await Promise.race([
        ensureSchema(),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('database_connection_timeout')), 10000),
        ),
      ]);
      schemaEnsured = true;
    } catch (error) {
      console.warn('Database connection failed, skipping schema initialization:', error);
      schemaEnsured = true;
    }
  }
}

const CHAIN_VALUES: readonly OracleChain[] = [
  'Polygon',
  'PolygonAmoy',
  'Arbitrum',
  'Optimism',
  'Local',
];

const ValidationErrors = {
  INVALID_REQUEST_BODY: 'invalid_request_body',
  INVALID_INSTANCE_ID: 'invalid_instance_id',
  INVALID_RPC_URL: 'invalid_rpc_url',
  INVALID_CONTRACT_ADDRESS: 'invalid_contract_address',
  INVALID_CHAIN: 'invalid_chain',
  INVALID_MAX_BLOCK_RANGE: 'invalid_max_block_range',
  INVALID_VOTING_PERIOD_HOURS: 'invalid_voting_period_hours',
} as const;

type ValidationErrorCode = (typeof ValidationErrors)[keyof typeof ValidationErrors];

class ValidationError extends Error {
  constructor(
    code: ValidationErrorCode,
    public field?: string,
    public details?: Record<string, unknown>,
  ) {
    super(code);
    this.name = 'ValidationError';
  }
}

function normalizeUrl(value: unknown): string {
  if (typeof value !== 'string') return '';
  return value.trim();
}

function normalizeInstanceId(value: unknown): string {
  if (typeof value !== 'string') return DEFAULT_ORACLE_INSTANCE_ID;
  const trimmed = value.trim();
  if (!trimmed) return DEFAULT_ORACLE_INSTANCE_ID;
  const lowered = trimmed.toLowerCase();
  if (!/^[a-z0-9][a-z0-9_-]{0,63}$/.test(lowered)) return DEFAULT_ORACLE_INSTANCE_ID;
  return lowered;
}

export function validateOracleInstanceId(value: unknown): string {
  if (typeof value !== 'string') throw new ValidationError(ValidationErrors.INVALID_REQUEST_BODY);
  const trimmed = value.trim().toLowerCase();
  if (!trimmed) return DEFAULT_ORACLE_INSTANCE_ID;
  if (!/^[a-z0-9][a-z0-9_-]{0,63}$/.test(trimmed)) {
    throw new ValidationError(ValidationErrors.INVALID_INSTANCE_ID);
  }
  return trimmed;
}

function allowPrivateRpcUrls(): boolean {
  const raw = (env.INSIGHT_ALLOW_PRIVATE_RPC_URLS ?? '').trim().toLowerCase();
  if (raw === '1' || raw === 'true') return true;
  if (raw === '0' || raw === 'false') return false;
  return process.env.NODE_ENV !== 'production';
}

function isPrivateIpv4(ip: string): boolean {
  const parts = ip.split('.').map((p) => Number(p));
  if (parts.length !== 4) return false;
  if (parts.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) return false;
  const [a, b] = parts as [number, number, number, number];

  return (
    a === 10 ||
    a === 127 ||
    a === 0 ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 100 && b >= 64 && b <= 127)
  );
}

function isPrivateIpv6(ip: string): boolean {
  const lower = ip.toLowerCase();
  if (lower === '::1' || lower === '::') return true;
  if (lower.startsWith('fe80:')) return true;
  if (lower.startsWith('fc') || lower.startsWith('fd')) return true;
  if (lower.startsWith('::ffff:')) {
    const maybeV4 = lower.slice('::ffff:'.length);
    if (isIP(maybeV4) === 4) return isPrivateIpv4(maybeV4);
  }
  return false;
}

function isPrivateHost(hostname: string): boolean {
  const lower = hostname.trim().toLowerCase();
  if (!lower) return false;
  if (lower === 'localhost') return true;
  if (lower === 'host.docker.internal') return true;
  if (lower.endsWith('.localhost')) return true;
  if (lower.endsWith('.local')) return true;

  const ipVer = isIP(lower);
  if (ipVer === 4) return isPrivateIpv4(lower);
  if (ipVer === 6) return isPrivateIpv6(lower);
  return false;
}

function validateRpcUrl(value: unknown): string {
  if (typeof value !== 'string') throw new ValidationError(ValidationErrors.INVALID_REQUEST_BODY);

  const trimmed = value.trim();
  if (!trimmed) return '';

  const parts = trimmed
    .split(/[,\s]+/g)
    .map((s) => s.trim())
    .filter(Boolean);

  if (parts.length === 0) return '';

  const normalized: string[] = [];

  for (const part of parts) {
    let url: URL;
    try {
      url = new URL(part);
    } catch {
      throw new ValidationError(ValidationErrors.INVALID_RPC_URL);
    }

    if (!['http:', 'https:', 'ws:', 'wss:'].includes(url.protocol)) {
      throw new ValidationError(ValidationErrors.INVALID_RPC_URL);
    }

    if (url.username || url.password) {
      throw new ValidationError(ValidationErrors.INVALID_RPC_URL);
    }

    if (!allowPrivateRpcUrls() && isPrivateHost(url.hostname)) {
      throw new ValidationError(ValidationErrors.INVALID_RPC_URL);
    }

    normalized.push(part);
  }

  return normalized.join(',');
}

function normalizeAddress(value: unknown): string {
  if (typeof value !== 'string') return '';
  const trimmed = value.trim();
  if (!trimmed) return '';
  const lowered = trimmed.toLowerCase();
  if (!/^0x[0-9a-f]{40}$/.test(lowered)) return '';
  return lowered;
}

function validateAddress(value: unknown): string {
  if (typeof value !== 'string') throw new ValidationError(ValidationErrors.INVALID_REQUEST_BODY);
  const trimmed = value.trim();
  if (!trimmed) return '';
  const lowered = trimmed.toLowerCase();
  if (!/^0x[0-9a-f]{40}$/.test(lowered)) {
    throw new ValidationError(ValidationErrors.INVALID_CONTRACT_ADDRESS);
  }
  return lowered;
}

function normalizeChain(value: unknown): OracleChain {
  if (CHAIN_VALUES.includes(value as OracleChain)) return value as OracleChain;
  return 'Local';
}

function validateChain(value: unknown): OracleChain {
  if (typeof value !== 'string') throw new ValidationError(ValidationErrors.INVALID_REQUEST_BODY);
  if (CHAIN_VALUES.includes(value as OracleChain)) return value as OracleChain;
  throw new ValidationError(ValidationErrors.INVALID_CHAIN);
}

function normalizeOptionalNonNegativeInt(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isInteger(value) && value >= 0) return value;

  if (typeof value === 'bigint') {
    if (value < 0n) return undefined;
    if (value > BigInt(Number.MAX_SAFE_INTEGER)) return undefined;
    return Number(value);
  }

  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;

  const num = Number(trimmed);
  if (!Number.isInteger(num) || num < 0) return undefined;
  return num;
}

function validateOptionalNonNegativeInt(value: unknown): number | undefined {
  if (value === null) return undefined;
  const normalized = normalizeOptionalNonNegativeInt(value);
  if (normalized === undefined && value !== undefined) {
    throw new ValidationError(ValidationErrors.INVALID_REQUEST_BODY);
  }
  return normalized;
}

function normalizeOptionalIntInRange(value: unknown, min: number, max: number): number | undefined {
  const normalized = normalizeOptionalNonNegativeInt(value);
  if (normalized === undefined) return undefined;
  if (normalized < min || normalized > max) return undefined;
  return normalized;
}

function validateOptionalIntInRange(
  value: unknown,
  min: number,
  max: number,
  code: ValidationErrorCode,
): number | undefined {
  if (value === null) return undefined;
  if (value === undefined) return undefined;

  const normalized = normalizeOptionalNonNegativeInt(value);
  if (normalized === undefined) throw new ValidationError(ValidationErrors.INVALID_REQUEST_BODY);
  if (normalized < min || normalized > max) throw new ValidationError(code);
  return normalized;
}

type OracleConfigField = keyof OracleConfig;

function withField<T>(field: OracleConfigField, fn: () => T): T {
  try {
    return fn();
  } catch (e) {
    if (e instanceof ValidationError) {
      throw Object.assign(new Error(e.message), { field });
    }
    throw e;
  }
}

export function validateOracleConfigPatch(next: Partial<OracleConfig>): Partial<OracleConfig> {
  const patch: Partial<OracleConfig> = {};

  if (next.rpcUrl !== undefined) {
    patch.rpcUrl = withField('rpcUrl', () => validateRpcUrl(next.rpcUrl));
  }

  if (next.contractAddress !== undefined) {
    patch.contractAddress = withField('contractAddress', () =>
      validateAddress(next.contractAddress),
    );
  }

  if (next.chain !== undefined) {
    patch.chain = withField('chain', () => validateChain(next.chain));
  }

  if (next.startBlock !== undefined) {
    patch.startBlock = withField('startBlock', () =>
      validateOptionalNonNegativeInt(next.startBlock),
    );
  }

  if (next.maxBlockRange !== undefined) {
    patch.maxBlockRange = withField('maxBlockRange', () =>
      validateOptionalIntInRange(
        next.maxBlockRange,
        100,
        200_000,
        ValidationErrors.INVALID_MAX_BLOCK_RANGE,
      ),
    );
  }

  if (next.votingPeriodHours !== undefined) {
    patch.votingPeriodHours = withField('votingPeriodHours', () =>
      validateOptionalIntInRange(
        next.votingPeriodHours,
        1,
        720,
        ValidationErrors.INVALID_VOTING_PERIOD_HOURS,
      ),
    );
  }

  if (next.confirmationBlocks !== undefined) {
    patch.confirmationBlocks = withField('confirmationBlocks', () =>
      validateOptionalNonNegativeInt(next.confirmationBlocks),
    );
  }

  return patch;
}

interface DbInstanceRow {
  id: string;
  name: string;
  enabled: boolean;
  chain: OracleChain | null;
  contract_address: string | null;
}

interface DbConfigRow {
  rpc_url?: unknown;
  contract_address?: unknown;
  chain?: unknown;
  start_block?: unknown;
  max_block_range?: unknown;
  voting_period_hours?: unknown;
  confirmation_blocks?: unknown;
}

function parseConfigRow(row: DbConfigRow): OracleConfig {
  return {
    rpcUrl: typeof row.rpc_url === 'string' ? (decryptString(row.rpc_url) ?? '') : '',
    contractAddress: typeof row.contract_address === 'string' ? row.contract_address : '',
    chain: normalizeChain(row.chain),
    startBlock: normalizeOptionalNonNegativeInt(row.start_block) ?? 0,
    maxBlockRange: normalizeOptionalIntInRange(row.max_block_range, 100, 200_000) ?? 10_000,
    votingPeriodHours: normalizeOptionalIntInRange(row.voting_period_hours, 1, 720) ?? 72,
    confirmationBlocks: normalizeOptionalNonNegativeInt(row.confirmation_blocks) ?? 12,
  };
}

function createDefaultConfig(): OracleConfig {
  return {
    rpcUrl: '',
    contractAddress: '',
    chain: 'Local',
    startBlock: 0,
    maxBlockRange: 10_000,
    votingPeriodHours: 72,
    confirmationBlocks: 12,
  };
}

export async function listOracleInstances(): Promise<OracleInstance[]> {
  await ensureDb();

  if (!hasDatabase()) {
    const mem = getMemoryStore();
    return Array.from(mem.instances.values()).map((inst) => ({
      id: inst.id,
      name: inst.name,
      enabled: inst.enabled,
      chain: inst.oracleConfig.chain,
      contractAddress: inst.oracleConfig.contractAddress,
    }));
  }

  const res = await query<DbInstanceRow>(
    'SELECT id, name, enabled, chain, contract_address FROM oracle_instances ORDER BY id ASC',
  );

  if (res.rows.length > 0) {
    return res.rows.map((row) => ({
      id: row.id,
      name: row.name,
      enabled: Boolean(row.enabled),
      chain: (row.chain as OracleChain) || 'Local',
      contractAddress: (row.contract_address ?? '') || '',
    }));
  }

  const fallback = await readOracleConfig(DEFAULT_ORACLE_INSTANCE_ID);
  return [
    {
      id: DEFAULT_ORACLE_INSTANCE_ID,
      name: 'Default',
      enabled: true,
      chain: fallback.chain,
      contractAddress: fallback.contractAddress,
    },
  ];
}

export async function readOracleConfig(
  instanceId: string = DEFAULT_ORACLE_INSTANCE_ID,
): Promise<OracleConfig> {
  try {
    await ensureDb();
    const normalizedInstanceId = normalizeInstanceId(instanceId);
    const memoryConfig = getMemoryInstance(normalizedInstanceId).oracleConfig;

    if (!hasDatabase()) {
      return memoryConfig;
    }

    try {
      const res = await query<DbConfigRow>('SELECT * FROM oracle_instances WHERE id = $1', [
        normalizedInstanceId,
      ]);

      if (res.rows[0]) {
        return parseConfigRow(res.rows[0]);
      }

      if (normalizedInstanceId !== DEFAULT_ORACLE_INSTANCE_ID) {
        return memoryConfig;
      }

      const legacy = await query<DbConfigRow>('SELECT * FROM oracle_config WHERE id = 1');
      if (legacy.rows[0]) {
        return parseConfigRow(legacy.rows[0]);
      }
    } catch (error) {
      console.warn('Database query failed, falling back to memory store:', error);
      return memoryConfig;
    }
  } catch (error) {
    console.warn('Error reading oracle config, returning default:', error);
    return createDefaultConfig();
  }

  return createDefaultConfig();
}

function mergeConfig(prev: OracleConfig, next: Partial<OracleConfig>): OracleConfig {
  return {
    rpcUrl: next.rpcUrl === undefined ? prev.rpcUrl : normalizeUrl(next.rpcUrl),
    contractAddress:
      next.contractAddress === undefined
        ? prev.contractAddress
        : normalizeAddress(next.contractAddress),
    chain: next.chain === undefined ? prev.chain : normalizeChain(next.chain),
    startBlock:
      next.startBlock === undefined
        ? prev.startBlock
        : (normalizeOptionalNonNegativeInt(next.startBlock) ?? 0),
    maxBlockRange:
      next.maxBlockRange === undefined
        ? prev.maxBlockRange
        : (normalizeOptionalIntInRange(next.maxBlockRange, 100, 200_000) ?? 10_000),
    votingPeriodHours:
      next.votingPeriodHours === undefined
        ? prev.votingPeriodHours
        : (normalizeOptionalIntInRange(next.votingPeriodHours, 1, 720) ?? 72),
    confirmationBlocks:
      next.confirmationBlocks === undefined
        ? prev.confirmationBlocks
        : (normalizeOptionalNonNegativeInt(next.confirmationBlocks) ?? 12),
  };
}

export async function writeOracleConfig(
  next: Partial<OracleConfig>,
  instanceId: string = DEFAULT_ORACLE_INSTANCE_ID,
): Promise<OracleConfig> {
  await ensureDb();

  const normalizedInstanceId = normalizeInstanceId(instanceId);
  const prev = await readOracleConfig(normalizedInstanceId);
  const merged = mergeConfig(prev, next);

  if (!hasDatabase()) {
    getMemoryInstance(normalizedInstanceId).oracleConfig = merged;
    return merged;
  }

  const defaultName =
    normalizedInstanceId === DEFAULT_ORACLE_INSTANCE_ID ? 'Default' : normalizedInstanceId;

  // Encrypt sensitive fields
  const encryptedRpcUrl = encryptString(merged.rpcUrl) ?? merged.rpcUrl;

  // Use transaction for data consistency
  let client: PoolClient | null = null;

  try {
    client = await getClient();
    await client.query('BEGIN');

    // First write: oracle_instances table
    await client.query(
      `INSERT INTO oracle_instances (
        id, name, enabled, rpc_url, contract_address, chain, start_block, max_block_range, voting_period_hours, confirmation_blocks, updated_at
      ) VALUES ($1, COALESCE((SELECT name FROM oracle_instances WHERE id = $1), $2), true, $3, $4, $5, $6, $7, $8, $9, NOW())
      ON CONFLICT (id) DO UPDATE SET
        rpc_url = excluded.rpc_url,
        contract_address = excluded.contract_address,
        chain = excluded.chain,
        start_block = excluded.start_block,
        max_block_range = excluded.max_block_range,
        voting_period_hours = excluded.voting_period_hours,
        confirmation_blocks = excluded.confirmation_blocks,
        updated_at = NOW()
      `,
      [
        normalizedInstanceId,
        defaultName,
        encryptedRpcUrl,
        merged.contractAddress,
        merged.chain,
        String(merged.startBlock ?? 0),
        merged.maxBlockRange ?? 10_000,
        merged.votingPeriodHours ?? 72,
        merged.confirmationBlocks ?? 12,
      ],
    );

    // Second write: oracle_config table (only for default instance, for backward compatibility)
    if (normalizedInstanceId === DEFAULT_ORACLE_INSTANCE_ID) {
      await client.query(
        `INSERT INTO oracle_config (id, rpc_url, contract_address, chain, start_block, max_block_range, voting_period_hours, confirmation_blocks)
         VALUES (1, $1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (id) DO UPDATE SET
           rpc_url = excluded.rpc_url,
           contract_address = excluded.contract_address,
           chain = excluded.chain,
           start_block = excluded.start_block,
           max_block_range = excluded.max_block_range,
           voting_period_hours = excluded.voting_period_hours,
           confirmation_blocks = excluded.confirmation_blocks
        `,
        [
          encryptedRpcUrl,
          merged.contractAddress,
          merged.chain,
          String(merged.startBlock ?? 0),
          merged.maxBlockRange ?? 10_000,
          merged.votingPeriodHours ?? 72,
          merged.confirmationBlocks ?? 12,
        ],
      );
    }

    await client.query('COMMIT');
  } catch (error) {
    if (client) {
      try {
        await client.query('ROLLBACK');
      } catch (rollbackError) {
        logger.error('Transaction rollback failed', { rollbackError });
      }
    }
    logger.error('Database transaction failed', {
      error,
      instanceId: normalizedInstanceId,
      operation: 'writeOracleConfig',
    });
    throw error;
  } finally {
    if (client) {
      client.release();
    }
  }

  return merged;
}

export async function getConfigEncryptionStatus(): Promise<{
  enabled: boolean;
  keyLength: number;
  canEncrypt: boolean;
  canDecrypt: boolean;
}> {
  const enabled = isEncryptionEnabled();
  const keyLength = enabled ? env.INSIGHT_CONFIG_ENCRYPTION_KEY.length : 0;

  let canEncrypt = false;
  let canDecrypt = false;

  if (enabled) {
    try {
      // Test encryption/decryption
      const testData = 'test-encryption';
      const encrypted = encryptString(testData);
      if (encrypted) {
        canEncrypt = true;
        const decrypted = decryptString(encrypted);
        canDecrypt = decrypted === testData;
      }
    } catch (error) {
      logger.error('Encryption test failed', { error });
    }
  }

  return {
    enabled,
    keyLength,
    canEncrypt,
    canDecrypt,
  };
}
