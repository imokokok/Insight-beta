/**
 * UMA Optimistic Oracle - 接口定义
 *
 * 定义服务接口，用于依赖注入
 */

import type { Chain, PublicClient } from 'viem';
import type { UMAOracleConfig } from './types';

/**
 * 日志接口
 */
export interface ILogger {
  info(message: string, meta?: Record<string, unknown>): void;
  warn(message: string, meta?: Record<string, unknown>): void;
  error(message: string, meta?: Record<string, unknown>): void;
  debug(message: string, meta?: Record<string, unknown>): void;
}

/**
 * 链工厂接口
 */
export interface IChainFactory {
  createChain(config: UMAOracleConfig): Chain;
}

/**
 * PublicClient 工厂接口
 */
export interface IPublicClientFactory {
  createClient(chain: Chain, rpcUrl: string): PublicClient;
}

/**
 * 标识符格式化接口
 */
export interface IIdentifierFormatter {
  format(identifier: string): `0x${string}`;
}

/**
 * 辅助数据格式化接口
 */
export interface IAncillaryDataFormatter {
  format(data: string): `0x${string}`;
}

/**
 * 预言机地址解析接口
 */
export interface IOracleAddressResolver {
  getOOAddress(): `0x${string}` | null;
  getOOV3Address(): `0x${string}` | null;
}

/**
 * 服务容器接口
 */
export interface IServiceContainer {
  logger: ILogger;
  chainFactory: IChainFactory;
  publicClientFactory: IPublicClientFactory;
  identifierFormatter: IIdentifierFormatter;
  ancillaryDataFormatter: IAncillaryDataFormatter;
  addressResolver: IOracleAddressResolver;
}
