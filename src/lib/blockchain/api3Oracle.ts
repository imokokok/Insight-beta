/**
 * API3 Oracle Integration
 *
 * API3 是第一方预言机协议，使用 Airnode 技术提供签名数据
 * 主要特点：
 * - dAPIs: 去中心化 API 数据源
 * - Airnode: 第一方数据提供商节点
 * - 签名数据验证
 * - OEV (Oracle Extractable Value) 监控
 */

import {
  type Address,
  parseAbi,
  keccak256,
  encodeAbiParameters,
  parseAbiParameters,
  recoverAddress,
} from 'viem';

import { DEFAULT_STALENESS_THRESHOLDS } from '@/config/constants';
import { ErrorHandler, normalizeError } from '@/lib/errors';
import { EvmOracleClient } from '@/lib/shared';
import { logger } from '@/shared/logger';
import type {
  SupportedChain,
  UnifiedPriceFeed,
  API3ProtocolConfig,
} from '@/types/unifiedOracleTypes';

// ============================================================================
// API3 ABI
// ============================================================================

const API3_DAPI_ABI = parseAbi([
  'function readDataFeedValueWithId(bytes32 dataFeedId) external view returns (int224 value, uint32 timestamp)',
  'function readDataFeedWithId(bytes32 dataFeedId) external view returns (int224 value, uint32 timestamp, int224 emaValue)',
  'function dataFeeds(bytes32 dataFeedId) external view returns (address dataFeed)',
]);

// ============================================================================
// API3 合约地址配置
// ============================================================================

export const API3_CONTRACT_ADDRESSES: Record<SupportedChain, Address | undefined> = {
  ethereum: '0x0Be1f1B46e077eD9D5072600Be2aB8eB4e0B1083',
  polygon: '0x0Be1f1B46e077eD9D5072600Be2aB8eB4e0B1083',
  arbitrum: '0x0Be1f1B46e077eD9D5072600Be2aB8eB4e0B1083',
  optimism: '0x0Be1f1B46e077eD9D5072600Be2aB8eB4e0B1083',
  avalanche: '0x0Be1f1B46e077eD9D5072600Be2aB8eB4e0B1083',
  bsc: '0x0Be1f1B46e077eD9D5072600Be2aB8eB4e0B1083',
  base: '0x0Be1f1B46e077eD9D5072600Be2aB8eB4e0B1083',
  fantom: undefined,
  celo: undefined,
  gnosis: undefined,
  linea: undefined,
  scroll: undefined,
  mantle: undefined,
  mode: undefined,
  blast: undefined,
  solana: undefined,
  near: undefined,
  aptos: undefined,
  sui: undefined,
  polygonAmoy: undefined,
  sepolia: undefined,
  goerli: undefined,
  mumbai: undefined,
  local: undefined,
};

// ============================================================================
// API3 Feed IDs
// ============================================================================

export const API3_FEED_IDS: Record<string, `0x${string}`> = {
  'ETH/USD': '0x4554482f55534400000000000000000000000000000000000000000000000000',
  'BTC/USD': '0x4254432f55534400000000000000000000000000000000000000000000000000',
  'LINK/USD': '0x4c494e4b2f555344000000000000000000000000000000000000000000000000',
  'USDC/USD': '0x555344432f555344000000000000000000000000000000000000000000000000',
  'USDT/USD': '0x555344542f555344000000000000000000000000000000000000000000000000',
  'DAI/USD': '0x4441492f55534400000000000000000000000000000000000000000000000000',
  'MATIC/USD': '0x4d415449432f5553440000000000000000000000000000000000000000000000',
  'AVAX/USD': '0x415641582f555344000000000000000000000000000000000000000000000000',
  'BNB/USD': '0x424e422f55534400000000000000000000000000000000000000000000000000',
  'SOL/USD': '0x534f4c2f55534400000000000000000000000000000000000000000000000000',
  'ARB/USD': '0x4152422f55534400000000000000000000000000000000000000000000000000',
  'OP/USD': '0x4f502f5553440000000000000000000000000000000000000000000000000000',
  'ATOM/USD': '0x41544f4d2f555344000000000000000000000000000000000000000000000000',
  'DOGE/USD': '0x444f47452f555344000000000000000000000000000000000000000000000000',
  'DOT/USD': '0x444f542f55534400000000000000000000000000000000000000000000000000',
  'UNI/USD': '0x554e492f55534400000000000000000000000000000000000000000000000000',
  'AAVE/USD': '0x414156452f555344000000000000000000000000000000000000000000000000',
};

// ============================================================================
// 类型定义
// ============================================================================

export interface API3PriceData {
  value: bigint;
  timestamp: bigint;
  emaValue?: bigint;
}

export interface API3SignedData {
  value: bigint;
  timestamp: bigint;
  signature: `0x${string}`;
  airnode: Address;
  templateId: `0x${string}`;
}

export interface API3OEVData {
  dataFeedId: `0x${string}`;
  updateId: string;
  value: bigint;
  timestamp: bigint;
  oevAmount: bigint;
}

export interface API3HealthStatus {
  healthy: boolean;
  lastUpdate: Date;
  stalenessSeconds: number;
  issues: string[];
  airnodeStatus?: {
    online: boolean;
    lastHeartbeat: Date;
  };
}

// ============================================================================
// API3 Client (使用 EvmOracleClient 基类)
// ============================================================================

export class API3Client extends EvmOracleClient {
  readonly protocol = 'api3' as const;
  readonly chain: SupportedChain;

  private clientConfig: API3ProtocolConfig;

  constructor(chain: SupportedChain, rpcUrl: string, config: API3ProtocolConfig = {}) {
    super({
      chain,
      protocol: 'api3',
      rpcUrl,
      timeoutMs: (config as { timeoutMs?: number }).timeoutMs ?? 30000,
      defaultDecimals: 18,
    });

    this.chain = chain;
    this.clientConfig = config;
  }

  // ============================================================================
  // 实现抽象方法
  // ============================================================================

  protected resolveContractAddress(): Address | undefined {
    const configAddress = this.clientConfig?.dapisContractAddress;
    if (configAddress) {
      return configAddress as Address;
    }
    return API3_CONTRACT_ADDRESSES[this.chain];
  }

  protected getFeedId(symbol: string): string | undefined {
    return API3_FEED_IDS[symbol];
  }

  protected async fetchRawPriceData(feedId: string): Promise<API3PriceData> {
    if (!this.contractAddress) {
      throw new Error('Contract address is not set');
    }
    try {
      const priceData = await this.publicClient.readContract({
        address: this.contractAddress,
        abi: API3_DAPI_ABI,
        functionName: 'readDataFeedWithId',
        args: [feedId as `0x${string}`],
      });

      return {
        value: priceData[0],
        timestamp: BigInt(priceData[1]),
        emaValue: priceData[2],
      };
    } catch (error) {
      ErrorHandler.logError(this.logger, 'Failed to fetch API3 price', error, {
        chain: this.chain,
        feedId,
      });
      throw error;
    }
  }

  /**
   * 获取客户端能力
   */
  getCapabilities() {
    return {
      priceFeeds: true,
      assertions: false,
      disputes: false,
      vrf: false,
      customData: true,
      batchQueries: true,
    };
  }

  protected parsePriceFromContract(
    rawData: API3PriceData,
    symbol: string,
    _feedId: string,
  ): UnifiedPriceFeed | null {
    const parts = symbol.split('/');
    const baseAsset = parts[0] || 'UNKNOWN';
    const quoteAsset = parts[1] || 'USD';

    const formattedPrice = this.formatPrice(rawData.value, 18);

    if (!Number.isFinite(formattedPrice) || formattedPrice <= 0) {
      logger.error('Invalid price from API3', { symbol, price: rawData.value, formattedPrice });
      return null;
    }

    const timestamp = new Date(Number(rawData.timestamp) * 1000);
    const stalenessSeconds = this.calculateStalenessSeconds(rawData.timestamp);

    const stalenessThreshold =
      (this.clientConfig as { stalenessThreshold?: number }).stalenessThreshold ||
      DEFAULT_STALENESS_THRESHOLDS.API3;
    const isStale = stalenessSeconds > stalenessThreshold;

    return {
      id: `api3-${this.chain}-${symbol}-${rawData.timestamp.toString()}`,
      instanceId: `api3-${this.chain}`,
      protocol: 'api3',
      chain: this.chain,
      symbol,
      baseAsset: baseAsset || 'UNKNOWN',
      quoteAsset: quoteAsset || 'USD',
      price: formattedPrice,
      priceRaw: rawData.value,
      decimals: 18,
      timestamp: timestamp.getTime(),
      confidence: 1.0,
      sources: ['api3'],
      isStale,
      stalenessSeconds,
    };
  }

  // ============================================================================
  // 公共方法
  // ============================================================================

  /**
   * 获取指定交易对的价格（兼容旧接口）
   */
  async getPriceForSymbol(symbol: string): Promise<UnifiedPriceFeed | null> {
    return this.fetchPrice(symbol);
  }

  /**
   * 获取多个价格喂价
   */
  async getMultiplePrices(symbols: string[]): Promise<UnifiedPriceFeed[]> {
    const results = await Promise.allSettled(
      symbols.map(async (symbol) => {
        try {
          return await this.getPriceForSymbol(symbol);
        } catch (error) {
          this.logger.error(`Failed to get API3 price for ${symbol}`, {
            error: normalizeError(error).message,
          });
          return null;
        }
      }),
    );

    return results
      .filter(
        (result): result is PromiseFulfilledResult<UnifiedPriceFeed | null> =>
          result.status === 'fulfilled',
      )
      .map((result) => result.value)
      .filter((feed): feed is UnifiedPriceFeed => feed !== null);
  }

  /**
   * 获取所有可用价格喂价
   */
  async fetchAllFeeds(): Promise<UnifiedPriceFeed[]> {
    const symbols = Object.keys(API3_FEED_IDS);
    return this.getMultiplePrices(symbols);
  }

  /**
   * 检查价格喂价健康状态
   */
  async checkFeedHealth(dataFeedId: string): Promise<API3HealthStatus> {
    const issues: string[] = [];

    try {
      const rawData = await this.fetchRawPriceData(dataFeedId);
      const lastUpdate = new Date(Number(rawData.timestamp) * 1000);
      const stalenessSeconds = this.calculateStalenessSeconds(rawData.timestamp);

      const stalenessThreshold =
        (this.clientConfig as { stalenessThreshold?: number }).stalenessThreshold ||
        DEFAULT_STALENESS_THRESHOLDS.API3;
      if (stalenessSeconds > stalenessThreshold) {
        issues.push(`Data is stale: ${stalenessSeconds}s old`);
      }

      if (rawData.value === 0n) {
        issues.push('Price is zero');
      }

      return {
        healthy: issues.length === 0,
        lastUpdate,
        stalenessSeconds,
        issues,
      };
    } catch (error) {
      return {
        healthy: false,
        lastUpdate: new Date(0),
        stalenessSeconds: Infinity,
        issues: [`Failed to read feed: ${normalizeError(error).message}`],
      };
    }
  }

  /**
   * 获取 EMA (指数移动平均) 价格
   */
  async getEmaPrice(dataFeedId: string): Promise<{
    value: bigint;
    timestamp: bigint;
    emaValue: bigint;
    formattedPrice: number;
    formattedEma: number;
  }> {
    const rawData = await this.fetchRawPriceData(dataFeedId);

    const formattedPrice = this.formatPrice(rawData.value, 18);
    const formattedEma = rawData.emaValue ? this.formatPrice(rawData.emaValue, 18) : 0;

    return {
      value: rawData.value,
      timestamp: rawData.timestamp,
      emaValue: rawData.emaValue ?? 0n,
      formattedPrice,
      formattedEma,
    };
  }

  /**
   * 获取数据源地址
   */
  async getDataFeedAddress(dataFeedId: string): Promise<Address | null> {
    if (!this.contractAddress) {
      throw new Error('Contract address is not set');
    }
    try {
      const dataFeedAddress = (await this.publicClient.readContract({
        address: this.contractAddress,
        abi: API3_DAPI_ABI,
        functionName: 'dataFeeds',
        args: [dataFeedId as `0x${string}`],
      })) as Address;

      return dataFeedAddress;
    } catch (error) {
      ErrorHandler.logError(this.logger, 'Failed to get data feed address', error, {
        chain: this.chain,
        dataFeedId,
      });
      return null;
    }
  }

  /**
   * 验证签名数据
   *
   * API3 使用 ECDSA 签名，签名格式为 65 字节 (r: 32字节, s: 32字节, v: 1字节)
   * 签名消息 = keccak256(abi.encode(timestamp, value, templateId))
   */
  async verifySignedData(signedData: API3SignedData): Promise<boolean> {
    try {
      if (signedData.value <= 0n) {
        this.logger.warn('Signed data value must be positive');
        return false;
      }

      const now = Math.floor(Date.now() / 1000);
      const timestamp = Number(signedData.timestamp);
      const maxAge = 3600;

      if (timestamp <= 0) {
        this.logger.warn('Invalid timestamp', { timestamp });
        return false;
      }

      if (now < timestamp) {
        this.logger.warn('Timestamp is in the future', {
          timestamp,
          now,
        });
        return false;
      }

      if (now - timestamp > maxAge) {
        this.logger.warn('Signed data is too old', {
          timestamp,
          age: now - timestamp,
          maxAge,
        });
        return false;
      }

      if (!this.isValidSignatureFormat(signedData.signature)) {
        this.logger.warn('Invalid signature format', {
          signatureLength: signedData.signature.length,
        });
        return false;
      }

      const recoveredAddress = await this.recoverSignerAddress(signedData);
      if (!recoveredAddress) {
        this.logger.warn('Failed to recover signer address from signature');
        return false;
      }

      const isAuthorized = recoveredAddress.toLowerCase() === signedData.airnode.toLowerCase();
      if (!isAuthorized) {
        this.logger.warn('Signature signer is not authorized', {
          recoveredAddress,
          expectedAirnode: signedData.airnode,
        });
        return false;
      }

      return true;
    } catch (error) {
      this.logger.error('Failed to verify signed data', {
        error: normalizeError(error).message,
      });
      return false;
    }
  }

  /**
   * 验证签名格式
   * ECDSA 签名格式: 65 字节 = r(32) + s(32) + v(1)
   * 十六进制字符串: 0x + 130 个字符
   */
  private isValidSignatureFormat(signature: `0x${string}`): boolean {
    if (!signature.startsWith('0x')) {
      return false;
    }

    const hexPart = signature.slice(2);
    if (!/^[a-fA-F0-9]+$/.test(hexPart)) {
      return false;
    }

    return hexPart.length === 130;
  }

  /**
   * 从签名中恢复签名者地址
   *
   * API3 签名消息格式: keccak256(abi.encode(timestamp, value, templateId))
   */
  private async recoverSignerAddress(signedData: API3SignedData): Promise<Address | null> {
    try {
      const messageHash = this.constructMessageHash(signedData);

      const recovered = await recoverAddress({
        hash: messageHash,
        signature: signedData.signature,
      });

      return recovered;
    } catch (error) {
      this.logger.error('Failed to recover address', {
        error: normalizeError(error).message,
      });
      return null;
    }
  }

  /**
   * 构造签名消息哈希
   *
   * API3 的签名消息结构:
   * keccak256(abi.encode(timestamp, value, templateId))
   */
  private constructMessageHash(signedData: API3SignedData): `0x${string}` {
    const encoded = encodeAbiParameters(parseAbiParameters('uint256, int224, bytes32'), [
      signedData.timestamp,
      signedData.value,
      signedData.templateId,
    ]);

    return keccak256(encoded);
  }

  /**
   * 完整验证签名数据并返回详细结果
   */
  async verifySignedDataDetailed(
    signedData: API3SignedData,
    options: { maxAgeSeconds?: number; expectedValue?: bigint } = {},
  ): Promise<{
    isValid: boolean;
    signer?: Address;
    checks: {
      valuePositive: boolean;
      timestampValid: boolean;
      notExpired: boolean;
      signatureValid: boolean;
      signerAuthorized: boolean;
    };
    errors: string[];
  }> {
    const errors: string[] = [];
    const checks = {
      valuePositive: false,
      timestampValid: false,
      notExpired: false,
      signatureValid: false,
      signerAuthorized: false,
    };

    const maxAge = options.maxAgeSeconds ?? 3600;
    let recoveredSigner: Address | null = null;

    if (signedData.value <= 0n) {
      errors.push('Value must be positive');
    } else {
      checks.valuePositive = true;
    }

    if (options.expectedValue !== undefined && signedData.value !== options.expectedValue) {
      errors.push(`Value mismatch: expected ${options.expectedValue}, got ${signedData.value}`);
    }

    const now = Math.floor(Date.now() / 1000);
    const timestamp = Number(signedData.timestamp);

    if (timestamp <= 0) {
      errors.push('Invalid timestamp');
    } else if (now < timestamp) {
      errors.push('Timestamp is in the future');
    } else {
      checks.timestampValid = true;
    }

    if (checks.timestampValid) {
      const age = now - timestamp;
      if (age > maxAge) {
        errors.push(`Data expired: ${age}s old (max: ${maxAge}s)`);
      } else {
        checks.notExpired = true;
      }
    }

    if (!this.isValidSignatureFormat(signedData.signature)) {
      errors.push('Invalid signature format');
    } else {
      recoveredSigner = await this.recoverSignerAddress(signedData);
      if (!recoveredSigner) {
        errors.push('Failed to recover signer address');
      } else {
        checks.signatureValid = true;

        if (recoveredSigner.toLowerCase() === signedData.airnode.toLowerCase()) {
          checks.signerAuthorized = true;
        } else {
          errors.push(`Unauthorized signer: ${recoveredSigner}`);
        }
      }
    }

    const isValid =
      checks.valuePositive &&
      checks.timestampValid &&
      checks.notExpired &&
      checks.signatureValid &&
      checks.signerAuthorized;

    return {
      isValid,
      signer: recoveredSigner ?? undefined,
      checks,
      errors,
    };
  }

  /**
   * Airnode 健康检查
   */
  async checkAirnodeHealth(_airnodeAddress: Address): Promise<{
    online: boolean;
    lastHeartbeat: Date | null;
    responseTime: number;
  }> {
    const startTime = Date.now();

    try {
      await this.getBlockNumber();
      const responseTime = Date.now() - startTime;

      return {
        online: true,
        lastHeartbeat: new Date(),
        responseTime,
      };
    } catch {
      return {
        online: false,
        lastHeartbeat: null,
        responseTime: Date.now() - startTime,
      };
    }
  }

  /**
   * 获取 OEV 相关数据
   */
  async getOEVData(dataFeedId: string): Promise<API3OEVData | null> {
    if (!this.clientConfig?.oevEnabled) {
      this.logger.warn('OEV monitoring is not enabled');
      return null;
    }

    try {
      const rawData = await this.fetchRawPriceData(dataFeedId);

      return {
        dataFeedId: dataFeedId as `0x${string}`,
        updateId: `${dataFeedId}-${rawData.timestamp}`,
        value: rawData.value,
        timestamp: rawData.timestamp,
        oevAmount: 0n,
      };
    } catch (error) {
      this.logger.error('Failed to get OEV data', {
        error: normalizeError(error).message,
        dataFeedId,
      });
      return null;
    }
  }

  /**
   * 批量获取 OEV 数据
   */
  async getBatchOEVData(dataFeedIds: string[]): Promise<Map<string, API3OEVData>> {
    const results = new Map<string, API3OEVData>();

    if (!this.clientConfig?.oevEnabled) {
      this.logger.warn('OEV monitoring is not enabled');
      return results;
    }

    for (const feedId of dataFeedIds) {
      const oevData = await this.getOEVData(feedId);
      if (oevData) {
        results.set(feedId, oevData);
      }
    }

    return results;
  }
}

// ============================================================================
// 工厂函数
// ============================================================================

export function createAPI3Client(
  chain: SupportedChain,
  rpcUrl: string,
  config?: API3ProtocolConfig,
): API3Client {
  return new API3Client(chain, rpcUrl, config);
}

// ============================================================================
// 工具函数
// ============================================================================

/**
 * 获取所有可用的价格喂价符号
 */
export function getAvailableAPI3Symbols(): string[] {
  return Object.keys(API3_FEED_IDS);
}

/**
 * 获取支持的 API3 链列表
 */
export function getSupportedAPI3Chains(): SupportedChain[] {
  return Object.entries(API3_CONTRACT_ADDRESSES)
    .filter(([, address]) => address !== undefined)
    .map(([chain]) => chain as SupportedChain);
}

/**
 * 检查链是否被 API3 支持
 */
export function isChainSupportedByAPI3(chain: SupportedChain): boolean {
  return API3_CONTRACT_ADDRESSES[chain] !== undefined;
}

/**
 * 获取数据喂价 ID
 */
export function getDataFeedId(symbol: string): `0x${string}` | undefined {
  return API3_FEED_IDS[symbol];
}

/**
 * 获取 API3 合约地址
 */
export function getAPI3ContractAddress(chain: SupportedChain): Address | undefined {
  return API3_CONTRACT_ADDRESSES[chain];
}

/**
 * 将符号转换为 API3 格式的 Feed ID
 */
export function symbolToFeedId(symbol: string): `0x${string}` {
  const padded = symbol.padEnd(16, '\0');
  const hex = Buffer.from(padded).toString('hex');
  return `0x${hex.padEnd(64, '0')}` as `0x${string}`;
}

/**
 * 从 Feed ID 解析符号
 */
export function feedIdToSymbol(feedId: string): string {
  const hex = feedId.replace('0x', '');
  const buffer = Buffer.from(hex.slice(0, 32), 'hex');
  return buffer.toString('utf8').replace(/\0/g, '');
}
