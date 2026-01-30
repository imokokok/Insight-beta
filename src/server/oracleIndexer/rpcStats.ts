/**
 * RPC 统计管理模块
 *
 * 提供 RPC 调用的统计和监控功能
 */

import { logger } from '@/lib/logger';
import { redactRpcUrl } from './rpcClient';
import type { RpcStats } from './types';

/**
 * 读取 RPC 统计
 * @param input - 原始统计数据
 * @returns 解析后的 RPC 统计
 */
export function readRpcStats(input: unknown): RpcStats {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return {};
  return input as RpcStats;
}

/**
 * 记录 RPC 调用成功
 * @param stats - RPC 统计对象
 * @param url - RPC URL
 * @param latencyMs - 延迟（毫秒）
 */
export function recordRpcOk(stats: RpcStats, url: string, latencyMs: number): void {
  const prev = stats[url] ?? {
    ok: 0,
    fail: 0,
    lastOkAt: null,
    lastFailAt: null,
    avgLatencyMs: null,
  };

  // 计算移动平均延迟
  const avg =
    prev.avgLatencyMs === null ? latencyMs : Math.round(prev.avgLatencyMs * 0.8 + latencyMs * 0.2);

  stats[url] = {
    ...prev,
    ok: prev.ok + 1,
    lastOkAt: new Date().toISOString(),
    avgLatencyMs: avg,
  };

  // 1% 采样记录日志
  if (Math.random() < 0.01) {
    logger.info('rpc_sample', { url: redactRpcUrl(url), ok: true, latencyMs });
  }
}

/**
 * 记录 RPC 调用失败
 * @param stats - RPC 统计对象
 * @param url - RPC URL
 */
export function recordRpcFail(stats: RpcStats, url: string): void {
  const prev = stats[url] ?? {
    ok: 0,
    fail: 0,
    lastOkAt: null,
    lastFailAt: null,
    avgLatencyMs: null,
  };

  stats[url] = {
    ...prev,
    fail: prev.fail + 1,
    lastFailAt: new Date().toISOString(),
  };

  // 1% 采样记录日志
  if (Math.random() < 0.01) {
    logger.warn('rpc_sample', { url: redactRpcUrl(url), ok: false });
  }
}

/**
 * 计算重试退避时间
 * @param attempt - 当前尝试次数
 * @param baseBackoff - 基础退避时间
 * @returns 退避时间（毫秒）
 */
export function calculateBackoff(attempt: number, baseBackoff: number): number {
  const backoff = Math.min(baseBackoff * Math.pow(2, attempt), 10000);
  const jitter = Math.random() * 0.3 * backoff;
  return backoff + jitter;
}

/**
 * 将错误转换为同步错误代码
 * @param error - 错误对象
 * @returns 错误代码
 */
export function toSyncErrorCode(
  error: unknown,
): 'contract_not_found' | 'rpc_unreachable' | 'sync_failed' {
  if (error instanceof Error) {
    const message = error.message;
    if (message === 'contract_not_found') return 'contract_not_found';

    const lowered = message.toLowerCase();
    if (
      lowered.includes('failed to fetch') ||
      lowered.includes('fetch failed') ||
      lowered.includes('econnrefused') ||
      lowered.includes('timeout') ||
      lowered.includes('timed out') ||
      lowered.includes('socket') ||
      lowered.includes('aborted') ||
      lowered.includes('abort')
    ) {
      return 'rpc_unreachable';
    }
  }
  return 'sync_failed';
}
