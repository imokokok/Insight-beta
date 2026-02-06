/**
 * UMA Oracle Client - UMA 预言机客户端
 *
 * 基于新的核心架构实现的 UMA 协议客户端
 * 支持价格请求、断言和争议机制
 */

import {
  createPublicClient,
  http,
  type PublicClient,
  type Address,
  parseAbi,
  formatUnits,
  keccak256,
  stringToBytes,
} from 'viem';
import type {
  OracleProtocol,
  SupportedChain,
  UnifiedPriceFeed,
} from '@/lib/types/unifiedOracleTypes';
import {
  BaseOracleClient,
  type OracleClientConfig,
  type OracleHealthStatus,
  type OracleClientCapabilities,
} from '@/lib/blockchain/core';
import { VIEM_CHAIN_MAP } from '@/lib/blockchain/chainConfig';

// ============================================================================
// UMA ABI
// ============================================================================

const OPTIMISTIC_ORACLE_V2_ABI = parseAbi([
  'function getRequest(address requester, bytes32 identifier, uint256 timestamp, bytes memory ancillaryData) external view returns (tuple(address proposer, bool disputer, address currency, uint256 settled, bool proposedPrice, uint256 proposedPrice, bool resolvedPrice, uint256 resolvedPrice, uint256 expirationTime, uint256 reward, uint256 finalFee, uint256 bond, uint256 customLiveness))',
  'function hasPrice(address requester, bytes32 identifier, uint256 timestamp, bytes memory ancillaryData) external view returns (bool)',
  'function settle(address requester, bytes32 identifier, uint256 timestamp, bytes memory ancillaryData) external returns (uint256)',
  'function getCurrentTime() external view returns (uint256)',
]);

const OPTIMISTIC_ORACLE_V3_ABI = parseAbi([
  'function getAssertion(bytes32 assertionId) external view returns (tuple(bytes32 identifier, uint256 timestamp, bytes data, address requester, address currency, uint256 reward, uint256 finalFee, uint256 bond, uint256 customLiveness, bool settled, bool disputed, uint256 settlementResolution, address disputer, uint256 settlementTimestamp, address proposer, uint256 expirationTime))',
  'function settleAssertion(bytes32 assertionId) external',
]);

// ============================================================================
// UMA 合约地址
// ============================================================================

const UMA_CONTRACTS: Record<SupportedChain, { ooV2?: Address; ooV3?: Address }> = {
  ethereum: {
    ooV2: '0xC43767F4592DF265B4a9F1a398BCEfE5A96F6935',
    ooV3: '0xfb55F43fB9F48F63f9269DB7Dde3BbBe1ebDC0dE',
  },
  polygon: {
    ooV2: '0xee3afe347d5c74317041e2618c49534daf887c24',
  },
  arbitrum: {
    ooV2: '0x9f43A71F1e05D1C6d40E9E1C5F2E5d4C8E6F7A8B',
  },
  optimism: {
    ooV2: '0x3E893426E65Cf198D4DF266B77CfA46559c815eE',
  },
  base: {
    ooV2: '0x2aBf7e91442E87Ac125C5EEe9F27aE7D1e8f1C63',
  },
  // 其他链暂未支持
  avalanche: {},
  bsc: {},
  fantom: {},
  celo: {},
  gnosis: {},
  linea: {},
  scroll: {},
  mantle: {},
  mode: {},
  blast: {},
  solana: {},
  near: {},
  aptos: {},
  sui: {},
  polygonAmoy: {},
  sepolia: {
    ooV2: '0x4E6CCb1D4A6cD5E8aE6D83e8B3B6e6e6e6e6e6e6',
  },
  goerli: {},
  mumbai: {},
  local: {},
};

// ============================================================================
// UMA 特定类型
// ============================================================================

export interface UMAPriceRequest {
  identifier: string;
  timestamp: bigint;
  ancillaryData: string;
  currency: Address;
  reward: bigint;
  finalFee: bigint;
  bond: bigint;
  customLiveness: bigint;
  proposer?: Address;
  proposedPrice?: bigint;
  disputer?: Address;
  settled: boolean;
  resolvedPrice?: bigint;
}

export interface UMAAssertion {
  id: string;
  identifier: string;
  timestamp: bigint;
  data: string;
  requester: Address;
  currency: Address;
  reward: bigint;
  bond: bigint;
  settled: boolean;
  disputed: boolean;
  settlementResolution?: bigint;
  disputer?: Address;
  proposer?: Address;
  expirationTime: bigint;
}

// ============================================================================
// UMA 客户端实现
// ============================================================================

export class UMAOracleClient extends BaseOracleClient {
  readonly protocol: OracleProtocol = 'uma';
  readonly chain: SupportedChain;
  private readonly publicClient: PublicClient;
  private readonly contracts: { ooV2?: Address; ooV3?: Address };

  constructor(config: OracleClientConfig) {
    super(config);
    this.chain = config.chain;
    this.contracts = UMA_CONTRACTS[config.chain];
    this.publicClient = this.createPublicClient(config);
  }

  // ============================================================================
  // 抽象方法实现
  // ============================================================================

  async fetchPrice(symbol: string): Promise<UnifiedPriceFeed | null> {
    // UMA 不直接提供价格喂送，需要通过价格请求获取
    // 这里返回一个模拟的价格，实际使用时需要通过 getPriceRequest 获取
    this.logger.warn('UMA does not provide direct price feeds. Use getPriceRequest() instead.', {
      symbol,
    });
    return null;
  }

  async fetchAllFeeds(): Promise<UnifiedPriceFeed[]> {
    // UMA 不提供价格喂送列表
    return [];
  }

  async checkHealth(): Promise<Omit<OracleHealthStatus, 'lastUpdate'>> {
    const startTime = Date.now();

    if (!this.contracts.ooV2 && !this.contracts.ooV3) {
      return {
        status: 'unhealthy',
        issues: ['No UMA contracts configured for this chain'],
      };
    }

    try {
      // 尝试读取当前时间作为健康检查
      if (this.contracts.ooV2) {
        await this.publicClient.readContract({
          address: this.contracts.ooV2,
          abi: OPTIMISTIC_ORACLE_V2_ABI,
          functionName: 'getCurrentTime',
        });
      }

      const latency = Date.now() - startTime;

      return {
        status: 'healthy',
        latency,
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        latency: Date.now() - startTime,
        issues: [error instanceof Error ? error.message : String(error)],
      };
    }
  }

  getCapabilities(): OracleClientCapabilities {
    return {
      priceFeeds: false, // UMA 不直接提供价格喂送
      assertions: true,
      disputes: true,
      vrf: false,
      customData: true,
      batchQueries: false,
      websocket: false,
    };
  }

  // ============================================================================
  // UMA 特定方法
  // ============================================================================

  /**
   * 获取价格请求
   */
  async getPriceRequest(
    identifier: string,
    timestamp: bigint,
    ancillaryData: string,
    requester?: Address,
  ): Promise<UMAPriceRequest | null> {
    if (!this.contracts.ooV2) {
      throw new Error('Optimistic Oracle V2 not available on this chain');
    }

    const requesterAddress = requester || this.contracts.ooV2;

    try {
      const request = (await this.publicClient.readContract({
        address: this.contracts.ooV2,
        abi: OPTIMISTIC_ORACLE_V2_ABI,
        functionName: 'getRequest',
        args: [requesterAddress, this.formatIdentifier(identifier), timestamp, ancillaryData],
      })) as {
        currency: Address;
        reward: bigint;
        finalFee: bigint;
        bond: bigint;
        customLiveness: bigint;
        proposer: Address;
        proposedPrice: bigint;
        disputer: Address;
        settled: boolean;
        resolvedPrice: bigint;
      };

      return {
        identifier,
        timestamp,
        ancillaryData,
        currency: request.currency,
        reward: request.reward,
        finalFee: request.finalFee,
        bond: request.bond,
        customLiveness: request.customLiveness,
        proposer: request.proposer,
        proposedPrice: request.proposedPrice,
        disputer: request.disputer,
        settled: request.settled,
        resolvedPrice: request.resolvedPrice,
      };
    } catch (error) {
      this.logger.error('Failed to get price request', { identifier, timestamp, error });
      return null;
    }
  }

  /**
   * 检查是否有价格
   */
  async hasPrice(
    identifier: string,
    timestamp: bigint,
    ancillaryData: string,
    requester?: Address,
  ): Promise<boolean> {
    if (!this.contracts.ooV2) {
      return false;
    }

    const requesterAddress = requester || this.contracts.ooV2;

    try {
      return (await this.publicClient.readContract({
        address: this.contracts.ooV2,
        abi: OPTIMISTIC_ORACLE_V2_ABI,
        functionName: 'hasPrice',
        args: [requesterAddress, this.formatIdentifier(identifier), timestamp, ancillaryData],
      })) as boolean;
    } catch (error) {
      this.logger.error('Failed to check price', { identifier, timestamp, error });
      return false;
    }
  }

  /**
   * 获取断言
   */
  async getAssertion(assertionId: string): Promise<UMAAssertion | null> {
    if (!this.contracts.ooV3) {
      throw new Error('Optimistic Oracle V3 not available on this chain');
    }

    try {
      const assertion = (await this.publicClient.readContract({
        address: this.contracts.ooV3,
        abi: OPTIMISTIC_ORACLE_V3_ABI,
        functionName: 'getAssertion',
        args: [assertionId as `0x${string}`],
      })) as {
        identifier: string;
        timestamp: bigint;
        data: string;
        requester: Address;
        currency: Address;
        reward: bigint;
        bond: bigint;
        settled: boolean;
        disputed: boolean;
        settlementResolution: bigint;
        disputer: Address;
        proposer: Address;
        expirationTime: bigint;
      };

      return {
        id: assertionId,
        identifier: assertion.identifier,
        timestamp: assertion.timestamp,
        data: assertion.data,
        requester: assertion.requester,
        currency: assertion.currency,
        reward: assertion.reward,
        bond: assertion.bond,
        settled: assertion.settled,
        disputed: assertion.disputed,
        settlementResolution: assertion.settlementResolution,
        disputer: assertion.disputer,
        proposer: assertion.proposer,
        expirationTime: assertion.expirationTime,
      };
    } catch (error) {
      this.logger.error('Failed to get assertion', { assertionId, error });
      return null;
    }
  }

  /**
   * 将价格请求转换为统一价格格式
   */
  async priceRequestToUnifiedFeed(request: UMAPriceRequest): Promise<UnifiedPriceFeed | null> {
    if (!request.settled || request.resolvedPrice === undefined) {
      return null;
    }

    const symbol = this.identifierToSymbol(request.identifier);
    const [baseAsset, quoteAsset] = symbol.split('/');

    return {
      id: `uma-${this.chain}-${request.identifier}-${request.timestamp.toString()}`,
      symbol,
      protocol: this.protocol,
      chain: this.chain,
      price: Number(formatUnits(request.resolvedPrice, 18)),
      priceRaw: request.resolvedPrice,
      timestamp: Number(request.timestamp) * 1000,
      confidence: 1,
      source: 'uma',
      decimals: 18,
      isStale: false,
      stalenessSeconds: 0,
      baseAsset: baseAsset || 'UNKNOWN',
      quoteAsset: quoteAsset || 'USD',
    };
  }

  // ============================================================================
  // 工具方法
  // ============================================================================

  private createPublicClient(config: OracleClientConfig): PublicClient {
    const rpcUrl = config.rpcUrl || this.getDefaultRpcUrl(config.chain);

    if (!rpcUrl) {
      throw new Error(`No RPC URL available for chain ${config.chain}`);
    }

    return createPublicClient({
      chain: VIEM_CHAIN_MAP[config.chain],
      transport: http(rpcUrl, { timeout: config.timeoutMs ?? 30000 }),
    }) as PublicClient;
  }

  private getDefaultRpcUrl(chain: SupportedChain): string | undefined {
    const envVar = `${chain.toUpperCase()}_RPC_URL`;
    return process.env[envVar];
  }

  private formatIdentifier(identifier: string): `0x${string}` {
    // UMA 使用 keccak256 哈希作为标识符
    return keccak256(stringToBytes(identifier));
  }

  private identifierToSymbol(identifier: string): string {
    // 将标识符转换回交易对符号
    // 例如: "ETH/USD" -> "ETH/USD"
    return identifier;
  }
}

// ============================================================================
// 工厂函数
// ============================================================================

export function createUMAClient(
  chain: SupportedChain = 'ethereum',
  config?: Partial<Omit<OracleClientConfig, 'protocol' | 'chain'>>,
): UMAOracleClient {
  return new UMAOracleClient({
    protocol: 'uma',
    chain,
    ...config,
  });
}

// ============================================================================
// 工具函数
// ============================================================================

export function isUMASupportedOnChain(chain: SupportedChain): boolean {
  const contracts = UMA_CONTRACTS[chain];
  return !!(contracts.ooV2 || contracts.ooV3);
}

export function getUMAContractAddresses(chain: SupportedChain): { ooV2?: Address; ooV3?: Address } {
  return UMA_CONTRACTS[chain];
}
