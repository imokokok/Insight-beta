/**
 * UMA Optimistic Oracle - 依赖注入接口定义
 *
 * 定义客户端所需的所有依赖接口，便于测试和替换实现
 */

import type { UMAOracleConfig, UMAPriceRequest, UMAAssertion } from './types';
import type { Address, Hash, PublicClient, Chain } from 'viem';

// ============================================================================
// 日志接口
// ============================================================================

export interface ILogger {
  info(message: string, meta?: Record<string, unknown>): void;
  warn(message: string, meta?: Record<string, unknown>): void;
  error(message: string, meta?: Record<string, unknown>): void;
  debug(message: string, meta?: Record<string, unknown>): void;
}

// ============================================================================
// 合约 ABI 接口
// ============================================================================

export interface IContractABI {
  readonly abi: readonly unknown[];
}

// ============================================================================
// 工具函数接口
// ============================================================================

export interface IIdentifierFormatter {
  format(identifier: string): `0x${string}`;
}

export interface IAncillaryDataFormatter {
  format(data: string): `0x${string}`;
}

// ============================================================================
// 区块链客户端工厂
// ============================================================================

export interface IChainFactory {
  createChain(config: UMAOracleConfig): Chain;
}

export interface IPublicClientFactory {
  createClient(chain: Chain, rpcUrl: string): PublicClient;
}

// ============================================================================
// 合约交互接口
// ============================================================================

export interface IPriceRequestService {
  getPriceRequest(
    identifier: string,
    timestamp: bigint,
    ancillaryData: string,
  ): Promise<UMAPriceRequest | null>;
  hasPrice(identifier: string, timestamp: bigint, ancillaryData: string): Promise<boolean>;
}

export interface IPriceProposalService {
  proposePrice(
    request: UMAPriceRequest,
    proposedPrice: bigint,
    proposer: Address,
  ): Promise<Hash | null>;
  disputePrice(
    identifier: string,
    timestamp: bigint,
    ancillaryData: string,
    disputer: Address,
  ): Promise<Hash | null>;
  settlePrice(
    identifier: string,
    timestamp: bigint,
    ancillaryData: string,
  ): Promise<{ price: bigint; settledAt: bigint } | null>;
}

export interface IAssertionService {
  getAssertion(assertionId: string): Promise<UMAAssertion | null>;
  assertTruth(
    claim: string,
    currency: Address,
    bond: bigint,
    identifier: string,
    asserter: Address,
  ): Promise<Hash | null>;
  settleAssertion(assertionId: string, settler: Address): Promise<boolean>;
  getAssertionResult(assertionId: string): Promise<boolean | null>;
  isAssertionDisputed(assertionId: string): Promise<boolean | null>;
}

// ============================================================================
// 地址解析接口
// ============================================================================

export interface IOracleAddressResolver {
  getOOAddress(): Address | null;
  getOOV3Address(): Address | null;
}

// ============================================================================
// 依赖容器接口
// ============================================================================

export interface IServiceContainer {
  logger: ILogger;
  chainFactory: IChainFactory;
  publicClientFactory: IPublicClientFactory;
  identifierFormatter: IIdentifierFormatter;
  ancillaryDataFormatter: IAncillaryDataFormatter;
  addressResolver: IOracleAddressResolver;
}
