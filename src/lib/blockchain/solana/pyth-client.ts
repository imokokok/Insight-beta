/**
 * Pyth Network Solana Client
 *
 * Pyth Network Solana 客户端实现
 * 使用 @pythnetwork/client 获取真实价格数据
 */

import { PriceStatus, PythHttpClient, getPythProgramKeyForCluster } from '@pythnetwork/client';
import { Connection, PublicKey, type Commitment } from '@solana/web3.js';

import { logger } from '@/lib/logger';

import { SolanaError, SolanaErrorCode } from './types';

import type { SolanaPriceFeed, SolanaOracleInstance } from './types';

// ============================================================================
// Pyth Client Configuration
// ============================================================================

const PYTH_PROGRAM_IDS = {
  mainnet: getPythProgramKeyForCluster('mainnet-beta'),
  devnet: getPythProgramKeyForCluster('devnet'),
};

const DEFAULT_COMMITMENT: Commitment = 'confirmed';

// ============================================================================
// Pyth Client
// ============================================================================

export class PythSolanaClient {
  private connection: Connection;
  private pythClient: PythHttpClient;
  private defaultTimeoutMs: number = 30000; // 默认30秒超时

  constructor(
    rpcUrl: string,
    cluster: 'mainnet-beta' | 'devnet' = 'mainnet-beta',
    commitment: Commitment = DEFAULT_COMMITMENT,
  ) {
    this.connection = new Connection(rpcUrl, commitment);
    const programKey = PYTH_PROGRAM_IDS[cluster === 'mainnet-beta' ? 'mainnet' : 'devnet'];
    this.pythClient = new PythHttpClient(this.connection, programKey);
  }

  /**
   * 设置请求超时
   */
  setTimeout(timeoutMs: number): void {
    this.defaultTimeoutMs = timeoutMs;
  }

  /**
   * 带超时的 Promise 包装器
   */
  private async withTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number,
    errorMessage: string,
  ): Promise<T> {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) => setTimeout(() => reject(new Error(errorMessage)), timeoutMs)),
    ]);
  }

  /**
   * Fetch price data for a single price feed
   */
  async fetchPrice(feedAddress: string, symbol: string): Promise<SolanaPriceFeed> {
    try {
      const publicKey = new PublicKey(feedAddress);

      // 使用超时控制获取账户信息
      const accountInfo = await this.withTimeout(
        this.connection.getAccountInfo(publicKey),
        this.defaultTimeoutMs,
        'Timeout getting account info',
      );

      if (!accountInfo) {
        throw new SolanaError(
          `Price feed account not found: ${feedAddress}`,
          SolanaErrorCode.ACCOUNT_NOT_FOUND,
        );
      }

      // 使用超时控制获取价格数据
      const priceData = await this.withTimeout(
        this.pythClient.getData(),
        this.defaultTimeoutMs,
        'Timeout fetching price data',
      );

      // Find the specific price feed
      const priceAccount = priceData.productPrice.get(feedAddress);

      if (!priceAccount) {
        throw new SolanaError(
          `Price data not available for ${symbol} (${feedAddress})`,
          SolanaErrorCode.PARSE_ERROR,
        );
      }

      // Check if price is valid
      if (priceAccount.status !== PriceStatus.Trading) {
        logger.warn(`Price feed ${symbol} is not trading`, {
          status: PriceStatus[priceAccount.status],
          feedAddress,
        });
      }

      // Calculate actual price from exponent
      const price = priceAccount.price
        ? priceAccount.price * Math.pow(10, priceAccount.exponent)
        : 0;
      const confidence = priceAccount.confidence
        ? priceAccount.confidence * Math.pow(10, priceAccount.exponent)
        : 0;

      return {
        symbol,
        price,
        confidence,
        timestamp: Date.now(),
        slot: Number(priceAccount.validSlot) || 0,
        source: 'pyth',
        decimals: Math.abs(priceAccount.exponent),
      };
    } catch (error) {
      if (error instanceof SolanaError) {
        throw error;
      }

      // 检查是否是超时错误
      if (error instanceof Error && error.message.includes('Timeout')) {
        logger.error('Pyth price fetch timed out', {
          error: error.message,
          feedAddress,
          symbol,
          timeoutMs: this.defaultTimeoutMs,
        });
        throw new SolanaError(
          `Timeout fetching Pyth price for ${symbol}`,
          SolanaErrorCode.RPC_ERROR,
          error,
        );
      }

      logger.error('Failed to fetch Pyth price', {
        error: error instanceof Error ? error.message : String(error),
        feedAddress,
        symbol,
      });

      throw new SolanaError(
        `Failed to fetch Pyth price for ${symbol}: ${error instanceof Error ? error.message : String(error)}`,
        SolanaErrorCode.RPC_ERROR,
        error,
      );
    }
  }

  /**
   * Fetch prices for multiple feeds in batch
   */
  async fetchPrices(feeds: { address: string; symbol: string }[]): Promise<SolanaPriceFeed[]> {
    const results: SolanaPriceFeed[] = [];

    try {
      // Get all price data from Pyth in one call
      const priceData = await this.pythClient.getData();

      for (const feed of feeds) {
        try {
          const priceAccount = priceData.productPrice.get(feed.address);

          if (!priceAccount) {
            logger.warn(`Price data not available for ${feed.symbol}`, {
              address: feed.address,
            });
            continue;
          }

          const price = priceAccount.price
            ? priceAccount.price * Math.pow(10, priceAccount.exponent)
            : 0;
          const confidence = priceAccount.confidence
            ? priceAccount.confidence * Math.pow(10, priceAccount.exponent)
            : 0;

          results.push({
            symbol: feed.symbol,
            price,
            confidence,
            timestamp: Date.now(),
            slot: Number(priceAccount.validSlot) || 0,
            source: 'pyth',
            decimals: Math.abs(priceAccount.exponent),
          });
        } catch (error) {
          logger.error(`Failed to process price for ${feed.symbol}`, {
            error: error instanceof Error ? error.message : String(error),
            address: feed.address,
          });
        }
      }

      return results;
    } catch (error) {
      logger.error('Failed to fetch batch prices from Pyth', {
        error: error instanceof Error ? error.message : String(error),
      });

      throw new SolanaError(
        'Failed to fetch batch prices from Pyth',
        SolanaErrorCode.RPC_ERROR,
        error,
      );
    }
  }

  /**
   * Get current slot
   */
  async getSlot(): Promise<number> {
    try {
      return await this.connection.getSlot();
    } catch (error) {
      throw new SolanaError('Failed to get current slot', SolanaErrorCode.RPC_ERROR, error);
    }
  }

  /**
   * Check if connection is healthy
   */
  async isHealthy(): Promise<boolean> {
    try {
      await this.connection.getVersion();
      return true;
    } catch {
      return false;
    }
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Create Pyth client from oracle instance config
 */
export function createPythClient(instance: SolanaOracleInstance): PythSolanaClient {
  const cluster = instance.chain === 'solanaDevnet' ? 'devnet' : 'mainnet-beta';
  return new PythSolanaClient(instance.config.rpcUrl || getDefaultRpcUrl(cluster), cluster);
}

/**
 * Get default RPC URL for cluster
 */
function getDefaultRpcUrl(cluster: 'mainnet-beta' | 'devnet'): string {
  if (cluster === 'devnet') {
    return 'https://api.devnet.solana.com';
  }
  // Use public RPC or environment variable
  return process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';
}

// ============================================================================
// Export Singleton Factory
// ============================================================================

const clientCache = new Map<string, PythSolanaClient>();

export function getPythClient(
  rpcUrl: string,
  cluster: 'mainnet-beta' | 'devnet' = 'mainnet-beta',
): PythSolanaClient {
  const key = `${cluster}:${rpcUrl}`;

  if (!clientCache.has(key)) {
    clientCache.set(key, new PythSolanaClient(rpcUrl, cluster));
  }

  return clientCache.get(key)!;
}

export function clearPythClientCache(): void {
  clientCache.clear();
}
