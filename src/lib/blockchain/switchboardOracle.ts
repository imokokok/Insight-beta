/**
 * Switchboard Oracle Integration (Solana)
 *
 * 使用 SolanaOracleClient 基类实现的 Switchboard 预言机集成模块
 * 支持 Solana 主网和 devnet
 */

import { PublicKey } from '@solana/web3.js';

import { DEFAULT_STALENESS_THRESHOLDS } from '@/lib/config/constants';
import {
  getSwitchboardFeedId,
  getAvailableSwitchboardSymbols,
  SWITCHBOARD_PROGRAM_ID,
  SWITCHBOARD_DEFAULT_CONFIG,
  type SwitchboardAggregatorData,
} from '@/lib/config/switchboardPriceFeeds';
import { SolanaOracleClient } from '@/lib/shared/blockchain/SolanaOracleClient';
import { ErrorHandler, normalizeError } from '@/lib/shared/errors/ErrorHandler';
import type {
  SupportedChain,
  UnifiedPriceFeed,
  SwitchboardProtocolConfig,
} from '@/lib/types/unifiedOracleTypes';

// 重新导出配置
export {
  getSwitchboardFeedId,
  getAvailableSwitchboardSymbols,
  SWITCHBOARD_PROGRAM_ID,
  SWITCHBOARD_DEFAULT_CONFIG,
};

// ============================================================================
// Switchboard Client (使用 SolanaOracleClient 基类)
// ============================================================================

export class SwitchboardClient extends SolanaOracleClient {
  readonly protocol = 'switchboard' as const;
  readonly chain: SupportedChain;

  private clientConfig: SwitchboardProtocolConfig;

  constructor(chain: SupportedChain, rpcUrl: string, config: SwitchboardProtocolConfig = {}) {
    super({
      chain,
      protocol: 'switchboard',
      rpcUrl,
      timeoutMs: config.timeoutMs ?? 30000,
      defaultDecimals: 8,
      commitment: config.commitment ?? 'confirmed',
    });

    this.chain = chain;
    this.clientConfig = config;

    this.logger.info('Switchboard client initialized', {
      chain,
      rpcUrl: rpcUrl.slice(0, 20) + '...',
    });
  }

  // ============================================================================
  // 实现抽象方法
  // ============================================================================

  protected resolveProgramId(): PublicKey | undefined {
    const programId = this.clientConfig.programId || SWITCHBOARD_PROGRAM_ID.mainnet;
    try {
      return new PublicKey(programId);
    } catch {
      this.logger.error('Invalid Switchboard program ID', { programId });
      return undefined;
    }
  }

  protected getFeedId(symbol: string): PublicKey | undefined {
    return getSwitchboardFeedId(symbol);
  }

  protected async fetchRawPriceData(feedId: PublicKey): Promise<SwitchboardAggregatorData> {
    try {
      // 直接读取账户数据
      const accountInfo = await this.getAccountInfo(feedId);
      if (!accountInfo) {
        throw new Error(`Aggregator account not found: ${feedId.toBase58()}`);
      }

      // 解析账户数据
      return this.parseAggregatorData(accountInfo.data);
    } catch (error) {
      ErrorHandler.logError(this.logger, 'Failed to fetch Switchboard price', error, {
        chain: this.chain,
        feedId: feedId.toBase58(),
      });
      throw error;
    }
  }

  protected parsePriceFromContract(
    rawData: SwitchboardAggregatorData,
    symbol: string,
    _feedId: PublicKey,
  ): UnifiedPriceFeed | null {
    const [baseAsset, quoteAsset] = symbol.split('/');

    // 格式化价格 (考虑精度)
    const formattedPrice = this.formatPrice(
      rawData.result.mantissa,
      rawData.result.scale,
    );

    const publishTime = new Date(Number(rawData.lastUpdateTimestamp) * 1000);
    const stalenessSeconds = this.calculateStalenessSeconds(rawData.lastUpdateTimestamp);

    // 判断数据是否过期
    const stalenessThreshold =
      this.clientConfig.stalenessThreshold || DEFAULT_STALENESS_THRESHOLDS.SWITCHBOARD;
    const isStale = stalenessSeconds > stalenessThreshold;

    // 计算置信度 (基于方差阈值)
    const variancePercent =
      (Number(rawData.varianceThreshold.mantissa) / Math.pow(10, rawData.varianceThreshold.scale)) *
      100;
    const confidence = Math.max(0, 1 - variancePercent / 100);

    return {
      id: `switchboard-${this.chain}-${symbol}-${rawData.lastUpdateTimestamp.toString()}`,
      instanceId: `switchboard-${this.chain}`,
      protocol: 'switchboard',
      chain: this.chain,
      symbol,
      baseAsset: baseAsset || 'UNKNOWN',
      quoteAsset: quoteAsset || 'USD',
      price: formattedPrice,
      priceRaw: rawData.result.mantissa,
      decimals: rawData.result.scale,
      timestamp: publishTime.getTime(),
      blockNumber: Number(rawData.currentRound.slot),
      confidence,
      sources: ['switchboard'],
      isStale,
      stalenessSeconds,
    };
  }

  // ============================================================================
  // 公共方法
  // ============================================================================

  /**
   * 获取客户端能力
   */
  getCapabilities() {
    return {
      priceFeeds: true,
      assertions: false,
      disputes: false,
      vrf: true, // Switchboard 支持 VRF
      customData: true,
      batchQueries: true,
    };
  }

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
          this.logger.error(`Failed to get Switchboard price for ${symbol}`, {
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
    const symbols = getAvailableSwitchboardSymbols();
    return this.getMultiplePrices(symbols);
  }

  /**
   * 检查价格喂价健康状态
   */
  async checkFeedHealth(feedId: PublicKey): Promise<{
    healthy: boolean;
    lastUpdate: Date;
    stalenessSeconds: number;
    issues: string[];
  }> {
    const issues: string[] = [];

    try {
      const rawData = await this.fetchRawPriceData(feedId);
      const lastUpdate = new Date(Number(rawData.lastUpdateTimestamp) * 1000);
      const stalenessSeconds = this.calculateStalenessSeconds(rawData.lastUpdateTimestamp);

      // 检查数据新鲜度
      const stalenessThreshold =
        this.clientConfig.stalenessThreshold || DEFAULT_STALENESS_THRESHOLDS.SWITCHBOARD;
      if (stalenessSeconds > stalenessThreshold) {
        issues.push(`Data is stale: ${stalenessSeconds}s old`);
      }

      // 检查价格是否为0
      if (rawData.result.mantissa === BigInt(0)) {
        issues.push('Price is zero');
      }

      // 检查任务数量
      if (rawData.jobCount === 0) {
        issues.push('No jobs configured');
      }

      // 检查最小 oracle 结果数
      if (rawData.minOracleResults === 0) {
        issues.push('Min oracle results is zero');
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
   * 获取聚合器详细信息
   */
  async getAggregatorInfo(feedId: PublicKey): Promise<{
    address: string;
    jobCount: number;
    minOracleResults: number;
    batchSize: number;
    minUpdateDelaySeconds: number;
    queueAddress: string;
  } | null> {
    try {
      const rawData = await this.fetchRawPriceData(feedId);

      return {
        address: feedId.toBase58(),
        jobCount: rawData.jobCount,
        minOracleResults: rawData.minOracleResults,
        batchSize: rawData.config.batchSize,
        minUpdateDelaySeconds: rawData.config.minUpdateDelaySeconds,
        queueAddress: rawData.queuePubkey.toBase58(),
      };
    } catch (error) {
      this.logger.error('Failed to get aggregator info', {
        feedId: feedId.toBase58(),
        error: normalizeError(error).message,
      });
      return null;
    }
  }

  // ============================================================================
  // 私有方法
  // ============================================================================

  private parseAggregatorData(data: Buffer): SwitchboardAggregatorData {
    // Switchboard Aggregator 账户数据结构
    // 基于 Switchboard 2.0 的账户布局
    // https://docs.switchboard.xyz/solana/account-structure

    const defaultData: SwitchboardAggregatorData = {
      result: {
        mantissa: BigInt(0),
        scale: 8,
      },
      lastUpdateTimestamp: BigInt(Math.floor(Date.now() / 1000)),
      currentRound: {
        roundId: BigInt(0),
        slot: BigInt(0),
      },
      jobCount: 0,
      minOracleResults: 0,
      varianceThreshold: {
        mantissa: BigInt(0),
        scale: 8,
      },
      queuePubkey: PublicKey.default,
      config: {
        batchSize: 1,
        minUpdateDelaySeconds: 10,
      },
    };

    try {
      if (data.length < 200) {
        return defaultData;
      }

      // 解析 Switchboard Aggregator 账户数据
      // 账户布局参考:
      // - 0-8: Discriminator
      // - 8-16: 版本信息
      // - 16-48: 配置数据
      // - 48-80: 当前结果 (mantissa + scale)
      // - 80-88: 最后更新时间戳
      // - 88-96: 当前轮次 ID
      // - 96-104: 当前 Slot
      // - 104-112: 任务数量
      // - 112-120: 最小 Oracle 结果数
      // - 120-152: 方差阈值
      // - 152-184: 队列公钥

      let offset = 8; // 跳过 discriminator

      // 读取版本 (8 bytes)
      offset += 8;

      // 读取配置数据 (32 bytes)
      const batchSize = data.readUInt32LE(offset);
      const minUpdateDelaySeconds = data.readUInt32LE(offset + 4);
      offset += 32;

      // 读取当前结果 (16 bytes: 8 bytes mantissa + 4 bytes scale + 4 bytes padding)
      const mantissa = data.readBigInt64LE(offset);
      const scale = data.readUInt32LE(offset + 8);
      offset += 16;

      // 读取最后更新时间戳 (8 bytes)
      const lastUpdateTimestamp = data.readBigInt64LE(offset);
      offset += 8;

      // 读取当前轮次 (16 bytes: 8 bytes roundId + 8 bytes slot)
      const roundId = data.readBigInt64LE(offset);
      const slot = data.readBigInt64LE(offset + 8);
      offset += 16;

      // 读取任务数量 (4 bytes)
      const jobCount = data.readUInt32LE(offset);
      offset += 4;

      // 读取最小 Oracle 结果数 (4 bytes)
      const minOracleResults = data.readUInt32LE(offset);
      offset += 4;

      // 读取方差阈值 (16 bytes)
      const varianceMantissa = data.readBigInt64LE(offset);
      const varianceScale = data.readUInt32LE(offset + 8);
      offset += 16;

      // 读取队列公钥 (32 bytes)
      const queuePubkeyBytes = data.slice(offset, offset + 32);
      const queuePubkey = new PublicKey(queuePubkeyBytes);

      return {
        result: {
          mantissa,
          scale,
        },
        lastUpdateTimestamp,
        currentRound: {
          roundId,
          slot,
        },
        jobCount,
        minOracleResults,
        varianceThreshold: {
          mantissa: varianceMantissa,
          scale: varianceScale,
        },
        queuePubkey,
        config: {
          batchSize,
          minUpdateDelaySeconds,
        },
      };
    } catch (error) {
      this.logger.warn('Failed to parse aggregator data, using defaults', {
        error: normalizeError(error).message,
        dataLength: data.length,
      });
      return defaultData;
    }
  }
}

// ============================================================================
// 工厂函数
// ============================================================================

export function createSwitchboardClient(
  chain: SupportedChain,
  rpcUrl: string,
  config?: SwitchboardProtocolConfig,
): SwitchboardClient {
  return new SwitchboardClient(chain, rpcUrl, config);
}

// ============================================================================
// 工具函数
// ============================================================================

/**
 * 获取支持的 Switchboard 链列表
 */
export function getSupportedSwitchboardChains(): SupportedChain[] {
  return ['solana'];
}

/**
 * 获取所有可用的价格喂价符号
 */
export function getAvailableSymbols(): string[] {
  return getAvailableSwitchboardSymbols();
}

/**
 * 检查链是否支持 Switchboard
 */
export function isChainSupported(chain: SupportedChain): boolean {
  return chain === 'solana';
}

/**
 * 检查符号是否支持
 */
export function isSymbolSupported(symbol: string): boolean {
  return getAvailableSwitchboardSymbols().includes(symbol.toUpperCase());
}
