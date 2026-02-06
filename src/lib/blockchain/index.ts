/**
 * Blockchain Module - 区块链模块统一入口
 *
 * 提供统一的预言机客户端访问接口
 */

// ============================================================================
// 核心模块
// ============================================================================

export {
  // 基类
  BaseOracleClient,
  // 工厂
  OracleClientFactory,
  oracleClientFactory,
} from './core';

// 错误类重新导出
export { OracleClientError, PriceFetchError, HealthCheckError } from './core/types';

export type {
  // 接口
  IOracleClient,
  // 配置类型
  OracleClientConfig,
  RequiredOracleClientConfig,
  // 状态类型
  OracleHealthStatus,
  HealthStatus,
  OracleClientCapabilities,
  // 选项类型
  PriceFetchOptions,
  BatchPriceResult,
  // 日志类型
  OracleClientLogger,
} from './core';

// ============================================================================
// 协议客户端
// ============================================================================

// Pyth
export { PythOracleClient, createPythClient } from './protocols/pyth';

// Chainlink
export {
  ChainlinkOracleClient,
  createChainlinkClient,
  getSupportedChainlinkSymbols,
  isSymbolSupportedByChainlink,
  getChainlinkFeedAddress,
} from './protocols/chainlink';

// UMA
export {
  UMAOracleClient,
  createUMAClient,
  isUMASupportedOnChain,
  getUMAContractAddresses,
} from './protocols/uma';

export type { UMAPriceRequest, UMAAssertion } from './protocols/uma';

// Band
export {
  BandOracleClient,
  createBandClient,
  getSupportedBandSymbols,
  isSymbolSupportedByBand,
} from './protocols/band';

// DIA
export {
  DIAOracleClient,
  createDIAClient,
  getSupportedDIAAssets,
  getAvailableDIASymbols,
  isChainSupportedByDIA,
} from './protocols/dia';

// RedStone
export {
  RedStoneOracleClient,
  createRedStoneClient,
  getSupportedRedStoneSymbols,
  isChainSupportedByRedStone,
  getRedStoneFeedId,
} from './protocols/redstone';

// API3
export {
  API3OracleClient,
  createAPI3Client,
  getSupportedAPI3Dapis,
  isChainSupportedByAPI3,
} from './protocols/api3';

// Switchboard
export {
  SwitchboardOracleClient,
  createSwitchboardClient,
  getSupportedSwitchboardSymbols,
  isChainSupportedBySwitchboard,
} from './protocols/switchboard';

// ============================================================================
// 初始化 - 注册所有协议客户端
// ============================================================================

import type { SupportedChain, OracleProtocol } from '@/lib/types/unifiedOracleTypes';

import { oracleClientFactory } from './core';
import { API3OracleClient } from './protocols/api3';
import { BandOracleClient } from './protocols/band';
import { ChainlinkOracleClient } from './protocols/chainlink';
import { DIAOracleClient } from './protocols/dia';
import { PythOracleClient } from './protocols/pyth';
import { RedStoneOracleClient } from './protocols/redstone';
import { SwitchboardOracleClient } from './protocols/switchboard';
import { UMAOracleClient } from './protocols/uma';

// 注册 Pyth 客户端
oracleClientFactory.register('pyth', PythOracleClient, [
  'ethereum',
  'polygon',
  'arbitrum',
  'optimism',
  'base',
  'avalanche',
  'bsc',
  'solana',
]);

// 注册 Chainlink 客户端
oracleClientFactory.register('chainlink', ChainlinkOracleClient, [
  'ethereum',
  'polygon',
  'arbitrum',
  'optimism',
  'base',
  'avalanche',
  'bsc',
  'fantom',
]);

// 注册 UMA 客户端
oracleClientFactory.register('uma', UMAOracleClient, [
  'ethereum',
  'polygon',
  'arbitrum',
  'optimism',
  'base',
  'sepolia',
]);

// 注册 Band 客户端
oracleClientFactory.register('band', BandOracleClient, [
  'ethereum',
  'polygon',
  'arbitrum',
  'optimism',
  'base',
  'avalanche',
  'bsc',
  'fantom',
]);

// 注册 DIA 客户端
oracleClientFactory.register('dia', DIAOracleClient, [
  'ethereum',
  'polygon',
  'arbitrum',
  'optimism',
  'base',
  'avalanche',
  'bsc',
  'fantom',
]);

// 注册 RedStone 客户端
oracleClientFactory.register('redstone', RedStoneOracleClient, [
  'ethereum',
  'polygon',
  'arbitrum',
  'optimism',
  'base',
  'avalanche',
  'bsc',
  'fantom',
  'sepolia',
]);

// 注册 API3 客户端
oracleClientFactory.register('api3', API3OracleClient, [
  'ethereum',
  'polygon',
  'arbitrum',
  'optimism',
  'base',
  'avalanche',
  'bsc',
  'fantom',
  'sepolia',
]);

// 注册 Switchboard 客户端
oracleClientFactory.register('switchboard', SwitchboardOracleClient, [
  'solana',
  'ethereum',
  'polygon',
  'arbitrum',
  'optimism',
  'base',
  'avalanche',
]);

// ============================================================================
// 便捷函数
// ============================================================================

import type { IOracleClient, OracleClientConfig } from './core';

/**
 * 创建预言机客户端
 */
export function createOracleClient(config: OracleClientConfig): IOracleClient {
  return oracleClientFactory.create(config);
}

/**
 * 获取已存在的客户端或创建新客户端
 */
export function getOrCreateOracleClient(config: OracleClientConfig): IOracleClient {
  return oracleClientFactory.getOrCreate(config);
}

/**
 * 获取已存在的客户端
 */
export function getOracleClient(
  protocol: OracleProtocol,
  chain: SupportedChain,
): IOracleClient | undefined {
  return oracleClientFactory.get(protocol, chain);
}

/**
 * 检查协议是否已注册
 */
export function isProtocolSupported(protocol: OracleProtocol): boolean {
  return oracleClientFactory.isProtocolRegistered(protocol);
}

/**
 * 获取协议支持的链列表
 */
export function getSupportedChains(protocol: OracleProtocol): SupportedChain[] {
  return oracleClientFactory.getSupportedChains(protocol);
}

/**
 * 获取所有已注册的协议
 */
export function getRegisteredProtocols(): OracleProtocol[] {
  return oracleClientFactory.getRegisteredProtocols();
}

/**
 * 对所有活跃客户端执行健康检查
 */
export async function healthCheckAll(): Promise<
  Array<{
    protocol: OracleProtocol;
    chain: SupportedChain;
    status: Awaited<ReturnType<IOracleClient['healthCheck']>>;
  }>
> {
  return oracleClientFactory.healthCheckAll();
}

/**
 * 销毁指定客户端
 */
export async function destroyOracleClient(
  protocol: OracleProtocol,
  chain: SupportedChain,
): Promise<void> {
  return oracleClientFactory.destroy(protocol, chain);
}

/**
 * 销毁所有客户端
 */
export async function destroyAllOracleClients(): Promise<void> {
  return oracleClientFactory.destroyAll();
}
