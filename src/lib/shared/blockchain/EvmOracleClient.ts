/**
 * EvmOracleClient - EVM 预言机客户端抽象基类
 *
 * 为所有 EVM 兼容链的预言机客户端提供通用功能：
 * - viem 客户端初始化
 * - 区块号获取
 * - 健康检查
 * - 通用价格解析
 */

import { createPublicClient, http, type PublicClient, type Address, formatUnits } from 'viem';

import { VIEM_CHAIN_MAP } from '@/infrastructure/blockchain/chainConfig';
import { BaseOracleClient } from '@/infrastructure/blockchain/core/BaseOracleClient';
import type {
  OracleClientConfig,
  OracleHealthStatus,
  HealthStatus,
} from '@/infrastructure/blockchain/core/types';
import { normalizeSymbol } from '@/infrastructure/blockchain/core/types';
import { ErrorHandler, normalizeError } from '@/shared/errors';
import { LoggerFactory } from '@/lib/shared/logger/LoggerFactory';
import type { SupportedChain, UnifiedPriceFeed } from '@/types/unifiedOracleTypes';

export interface EvmOracleClientConfig extends OracleClientConfig {
  /** 合约 ABI */
  abi?: unknown[];
  /** 价格喂价精度（默认 8） */
  defaultDecimals?: number;
}

/**
 * EVM 预言机客户端抽象基类
 */
export abstract class EvmOracleClient extends BaseOracleClient {
  /** viem 公共客户端 */
  protected readonly publicClient: PublicClient;
  /** 合约地址 */
  protected readonly contractAddress: Address | undefined;
  /** 默认精度 */
  protected readonly defaultDecimals: number;

  constructor(config: EvmOracleClientConfig) {
    super(config);

    this.contractAddress = this.resolveContractAddress(config);
    this.defaultDecimals = config.defaultDecimals ?? 8;

    // 初始化 viem 客户端
    this.publicClient = createPublicClient({
      chain: VIEM_CHAIN_MAP[config.chain],
      transport: http(config.rpcUrl, { timeout: config.timeoutMs ?? 30000 }),
    }) as PublicClient;
  }

  /**
   * 获取日志记录器（延迟初始化，子类设置 protocol 和 chain 后可用）
   */
  protected getLogger() {
    return LoggerFactory.createOracleLogger(this.protocol, this.chain);
  }

  // ============================================================================
  // 抽象方法 - 子类必须实现
  // ============================================================================

  /**
   * 解析合约地址
   */
  protected abstract resolveContractAddress(config: EvmOracleClientConfig): Address | undefined;

  /**
   * 获取价格喂价的 Feed ID
   */
  protected abstract getFeedId(symbol: string): string | undefined;

  /**
   * 从合约原始数据解析价格
   */
  protected abstract parsePriceFromContract(
    rawData: unknown,
    symbol: string,
    feedId: string,
  ): UnifiedPriceFeed | null;

  /**
   * 从合约获取原始价格数据
   */
  protected abstract fetchRawPriceData(feedId: string): Promise<unknown>;

  // ============================================================================
  // 公共方法 - 通用实现
  // ============================================================================

  /**
   * 获取当前区块号
   */
  async getBlockNumber(): Promise<bigint> {
    return this.publicClient.getBlockNumber();
  }

  /**
   * 获取单个价格
   */
  async fetchPrice(symbol: string): Promise<UnifiedPriceFeed | null> {
    const normalizedSymbol = normalizeSymbol(symbol);
    const feedId = this.getFeedId(normalizedSymbol);

    if (!feedId) {
      this.logger.warn('No feed found for symbol', { symbol: normalizedSymbol });
      return null;
    }

    try {
      const rawData = await this.fetchRawPriceData(feedId);
      return this.parsePriceFromContract(rawData, normalizedSymbol, feedId);
    } catch (error) {
      throw ErrorHandler.createPriceFetchError(error, this.protocol, this.chain, normalizedSymbol);
    }
  }

  /**
   * 执行健康检查
   */
  async checkHealth(): Promise<Omit<OracleHealthStatus, 'lastUpdate'>> {
    const startTime = Date.now();

    try {
      await this.getBlockNumber();
      const latency = Date.now() - startTime;

      return {
        status: 'healthy' as HealthStatus,
        latency,
      };
    } catch (error) {
      const latency = Date.now() - startTime;
      const errorMessage = normalizeError(error).message;

      return {
        status: 'unhealthy' as HealthStatus,
        latency,
        issues: [errorMessage],
      };
    }
  }

  // ============================================================================
  // 保护方法 - 子类可用
  // ============================================================================

  /**
   * 格式化价格（根据精度）
   */
  protected formatPrice(rawPrice: bigint, decimals: number): number {
    return Number(formatUnits(rawPrice, decimals));
  }

  /**
   * 检查价格是否过期
   */
  protected isPriceStale(updatedAt: bigint, stalenessThresholdSeconds: number): boolean {
    const now = Math.floor(Date.now() / 1000);
    const updatedTime = Number(updatedAt);
    return now - updatedTime > stalenessThresholdSeconds;
  }

  /**
   * 计算陈旧秒数
   */
  protected calculateStalenessSeconds(updatedAt: bigint): number {
    const now = Math.floor(Date.now() / 1000);
    return Math.max(0, now - Number(updatedAt));
  }

  /**
   * 生成价格喂价 ID
   */
  protected generateFeedId(symbol: string, chain: SupportedChain): string {
    return `${this.protocol}-${chain}-${symbol.toLowerCase().replace('/', '-')}`;
  }
}
