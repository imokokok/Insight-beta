/**
 * Oracle Indexer 环境配置模块
 *
 * 提供 Oracle 环境配置的读取和管理功能
 */

import { env } from '@/lib/config/env';
import { DEFAULT_ORACLE_INSTANCE_ID, readOracleConfig } from '../oracleConfig';
import type { Address } from 'viem';
import type { OracleEnv } from './types';

/**
 * 获取 Oracle 环境配置
 * @param instanceId - 实例 ID
 * @returns Oracle 环境配置
 */
export async function getOracleEnv(
  instanceId: string = DEFAULT_ORACLE_INSTANCE_ID,
): Promise<OracleEnv> {
  const normalizedInstanceId = (instanceId || DEFAULT_ORACLE_INSTANCE_ID).trim();
  const config = await readOracleConfig(normalizedInstanceId);
  const useEnvOverrides = normalizedInstanceId === DEFAULT_ORACLE_INSTANCE_ID;

  // 确定链类型
  const chain = (config.chain ||
    (useEnvOverrides ? (env.INSIGHT_CHAIN as string | undefined) : undefined) ||
    'Local') as string;

  // 获取链特定的 RPC URL
  const chainRpcUrl =
    chain === 'PolygonAmoy'
      ? env.POLYGON_AMOY_RPC_URL
      : chain === 'Polygon'
        ? env.POLYGON_RPC_URL
        : chain === 'Arbitrum'
          ? env.ARBITRUM_RPC_URL
          : chain === 'Optimism'
            ? env.OPTIMISM_RPC_URL
            : '';

  // 合并配置优先级：环境变量 > 配置 > 链默认值
  const rpcUrl = (useEnvOverrides ? env.INSIGHT_RPC_URL : '') || config.rpcUrl || chainRpcUrl;
  const contractAddress = (config.contractAddress || '') as Address;
  const startBlock = BigInt(config.startBlock ?? 0);
  const maxBlockRange = BigInt(config.maxBlockRange ?? 10_000);
  const votingPeriodMs = Number(config.votingPeriodHours ?? 72) * 3600 * 1000;
  const confirmationBlocks = BigInt(config.confirmationBlocks ?? 12);

  return {
    rpcUrl,
    contractAddress,
    chain,
    startBlock,
    maxBlockRange,
    votingPeriodMs,
    confirmationBlocks,
  };
}

/**
 * 检查是否启用了降级模式
 * @returns 是否降级
 */
export function isDegradedMode(): boolean {
  return ['1', 'true'].includes((env.INSIGHT_VOTING_DEGRADATION || '').toLowerCase());
}

/**
 * 检查是否启用了投票跟踪
 * @returns 是否启用
 */
export function isVoteTrackingEnabled(): boolean {
  const enabled = ['1', 'true'].includes((env.INSIGHT_ENABLE_VOTING || '').toLowerCase());
  const disabled = ['1', 'true'].includes((env.INSIGHT_DISABLE_VOTE_TRACKING || '').toLowerCase());
  return enabled && !disabled;
}
