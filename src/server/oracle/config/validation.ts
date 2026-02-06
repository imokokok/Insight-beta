import { isIP } from 'node:net';

import { env } from '@/lib/config/env';

import {
  ValidationError,
  ValidationErrors,
  CHAIN_VALUES,
  DEFAULT_ORACLE_INSTANCE_ID,
} from './types';

/**
 * 检查是否允许使用私有 RPC URL
 */
function allowPrivateRpcUrls(): boolean {
  return env.INSIGHT_ALLOW_PRIVATE_RPC_URLS;
}

/**
 * 检查是否为私有 IPv4 地址
 */
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

/**
 * 检查是否为私有 IPv6 地址
 */
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

/**
 * 检查是否为私有主机地址
 */
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

/**
 * 规范化 URL
 */
export function normalizeUrl(value: unknown): string {
  if (typeof value !== 'string') return '';
  return value.trim();
}

/**
 * 规范化实例 ID
 */
export function normalizeInstanceId(value: unknown): string {
  if (typeof value !== 'string') return DEFAULT_ORACLE_INSTANCE_ID;
  const trimmed = value.trim();
  if (!trimmed) return DEFAULT_ORACLE_INSTANCE_ID;
  const lowered = trimmed.toLowerCase();
  if (!/^[a-z0-9][a-z0-9_-]{0,63}$/.test(lowered)) return DEFAULT_ORACLE_INSTANCE_ID;
  return lowered;
}

/**
 * 验证 Oracle 实例 ID
 */
export function validateOracleInstanceId(value: unknown): string {
  if (typeof value !== 'string') {
    throw new ValidationError(ValidationErrors.INVALID_REQUEST_BODY);
  }
  const trimmed = value.trim().toLowerCase();
  if (!trimmed) return DEFAULT_ORACLE_INSTANCE_ID;
  if (!/^[a-z0-9][a-z0-9_-]{0,63}$/.test(trimmed)) {
    throw new ValidationError(ValidationErrors.INVALID_INSTANCE_ID);
  }
  return trimmed;
}

/**
 * 验证 RPC URL
 */
export function validateRpcUrl(value: unknown): string {
  if (typeof value !== 'string') {
    throw new ValidationError(ValidationErrors.INVALID_REQUEST_BODY);
  }

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

/**
 * 规范化地址
 */
export function normalizeAddress(value: unknown): string {
  if (typeof value !== 'string') return '';
  return value.trim().toLowerCase();
}

/**
 * 验证合约地址
 */
export function validateContractAddress(value: unknown): string {
  if (typeof value !== 'string') {
    throw new ValidationError(ValidationErrors.INVALID_REQUEST_BODY);
  }
  const trimmed = value.trim();
  if (!trimmed) return '';
  if (!/^0x[a-f0-9]{40}$/i.test(trimmed)) {
    throw new ValidationError(ValidationErrors.INVALID_CONTRACT_ADDRESS);
  }
  return trimmed.toLowerCase();
}

/**
 * 验证链选择
 */
export function validateChain(value: unknown): string {
  if (typeof value !== 'string') {
    throw new ValidationError(ValidationErrors.INVALID_REQUEST_BODY);
  }
  const trimmed = value.trim();
  if (!trimmed) return CHAIN_VALUES[0] as string;
  const normalized = trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
  if (!CHAIN_VALUES.includes(normalized as (typeof CHAIN_VALUES)[number])) {
    throw new ValidationError(ValidationErrors.INVALID_CHAIN);
  }
  return normalized;
}

/**
 * 验证最大区块范围
 */
export function validateMaxBlockRange(value: unknown): number {
  if (typeof value !== 'number') {
    throw new ValidationError(ValidationErrors.INVALID_REQUEST_BODY);
  }
  if (!Number.isFinite(value) || value < 1 || value > 100000) {
    throw new ValidationError(ValidationErrors.INVALID_MAX_BLOCK_RANGE);
  }
  return Math.floor(value);
}

/**
 * 验证投票周期（小时）
 */
export function validateVotingPeriodHours(value: unknown): number {
  if (typeof value !== 'number') {
    throw new ValidationError(ValidationErrors.INVALID_REQUEST_BODY);
  }
  if (!Number.isFinite(value) || value < 1 || value > 720) {
    throw new ValidationError(ValidationErrors.INVALID_VOTING_PERIOD_HOURS);
  }
  return Math.floor(value);
}

/**
 * 脱敏 Oracle 配置（移除敏感信息）
 */
export function redactOracleConfig<T extends { rpcUrl?: string }>(config: T): T {
  return { ...config, rpcUrl: '' };
}
