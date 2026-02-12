/**
 * SolanaOracleClient - Solana 预言机客户端抽象基类
 *
 * 为所有 Solana 链的预言机客户端提供通用功能：
 * - Solana Web3.js 客户端初始化
 * - 区块号/Slot 获取
 * - 健康检查
 * - 通用价格解析
 */

import { Connection, type PublicKey, type Commitment } from '@solana/web3.js';

import { BaseOracleClient } from '@/lib/blockchain/core/BaseOracleClient';
import type {
  OracleClientConfig,
  OracleHealthStatus,
  HealthStatus,
} from '@/lib/blockchain/core/types';
import { normalizeSymbol } from '@/lib/blockchain/core/types';
import { ErrorHandler, normalizeError } from '@/lib/errors';
import { LoggerFactory } from '@/lib/shared/logger/LoggerFactory';
import type { SupportedChain, UnifiedPriceFeed } from '@/types/unifiedOracleTypes';

export interface SolanaOracleClientConfig extends OracleClientConfig {
  /** 程序 ID (合约地址) */
  programId?: string;
  /** 价格喂价精度（默认 8） */
  defaultDecimals?: number;
  /** Solana 连接确认级别 */
  commitment?: Commitment;
}

/**
 * Solana 预言机客户端抽象基类
 */
export abstract class SolanaOracleClient extends BaseOracleClient {
  /** Solana 连接客户端 */
  protected readonly connection: Connection;
  /** 程序 ID (合约地址) */
  protected readonly programId: PublicKey | undefined;
  /** 默认精度 */
  protected readonly defaultDecimals: number;
  /** 确认级别 */
  protected readonly commitment: Commitment;

  constructor(config: SolanaOracleClientConfig) {
    super(config);

    this.programId = this.resolveProgramId(config);
    this.defaultDecimals = config.defaultDecimals ?? 8;
    this.commitment = config.commitment ?? 'confirmed';

    // 初始化 Solana 连接
    const rpcUrl = config.rpcUrl ?? '';
    if (!rpcUrl) {
      throw new Error('RPC URL is required for SolanaOracleClient');
    }
    this.connection = new Connection(rpcUrl, {
      commitment: this.commitment,
      confirmTransactionInitialTimeout: config.timeoutMs ?? 30000,
    });
  }

  /**
   * 获取日志记录器
   */
  protected getLogger() {
    return LoggerFactory.createOracleLogger(this.protocol, this.chain);
  }

  // ============================================================================
  // 抽象方法 - 子类必须实现
  // ============================================================================

  /**
   * 解析程序 ID (合约地址)
   */
  protected abstract resolveProgramId(config: SolanaOracleClientConfig): PublicKey | undefined;

  /**
   * 获取价格喂价的 Feed ID (账户地址)
   */
  protected abstract getFeedId(symbol: string): PublicKey | undefined;

  /**
   * 从链上原始数据解析价格
   */
  protected abstract parsePriceFromContract(
    rawData: unknown,
    symbol: string,
    feedId: PublicKey,
  ): UnifiedPriceFeed | null;

  /**
   * 从链上获取原始价格数据
   */
  protected abstract fetchRawPriceData(feedId: PublicKey): Promise<unknown>;

  // ============================================================================
  // 公共方法 - 通用实现
  // ============================================================================

  /**
   * 获取当前 Slot (类似于 EVM 的区块号)
   */
  async getBlockNumber(): Promise<bigint> {
    const slot = await this.connection.getSlot();
    return BigInt(slot);
  }

  /**
   * 获取当前区块时间
   */
  async getBlockTime(): Promise<number> {
    const slot = await this.connection.getSlot();
    const blockTime = await this.connection.getBlockTime(slot);
    return blockTime ?? Date.now() / 1000;
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
      // 检查连接状态
      const slot = await this.connection.getSlot();
      const blockTime = await this.connection.getBlockTime(slot);
      const latency = Date.now() - startTime;

      // 检查区块时间是否过期 (超过 2 分钟认为不健康)
      const now = Date.now() / 1000;
      const isStale = blockTime ? now - blockTime > 120 : true;

      return {
        status: isStale ? ('degraded' as HealthStatus) : ('healthy' as HealthStatus),
        latency,
        issues: isStale ? ['Block time is stale'] : undefined,
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
    return Number(rawPrice) / Math.pow(10, decimals);
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
  protected calculateStalenessSeconds(updatedAt: bigint | number): number {
    const now = Math.floor(Date.now() / 1000);
    return Math.max(0, now - Number(updatedAt));
  }

  /**
   * 生成价格喂价 ID
   */
  protected generateFeedId(symbol: string, chain: SupportedChain): string {
    return `${this.protocol}-${chain}-${symbol.toLowerCase().replace('/', '-')}`;
  }

  /**
   * 获取账户信息
   */
  protected async getAccountInfo(publicKey: PublicKey) {
    return this.connection.getAccountInfo(publicKey, this.commitment);
  }

  /**
   * 批量获取账户信息
   */
  protected async getMultipleAccountsInfo(publicKeys: PublicKey[]) {
    return this.connection.getMultipleAccountsInfo(publicKeys, this.commitment);
  }
}
