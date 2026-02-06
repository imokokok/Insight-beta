/**
 * Chainlink Solana Client
 *
 * Chainlink Solana 客户端实现
 * 使用 Chainlink Data Feeds on Solana 获取真实价格数据
 *
 * Reference: https://docs.chain.link/data-feeds/solana
 */

import { Connection, PublicKey, type Commitment } from '@solana/web3.js';

import { logger } from '@/lib/logger';

import { SolanaError, SolanaErrorCode } from './types';

import type { SolanaPriceFeed, SolanaOracleInstance } from './types';

// ============================================================================
// Chainlink Solana Configuration
// ============================================================================

const CHAINLINK_PROGRAM_IDS = {
  mainnet: new PublicKey('cjg3oHmg9uu1P6xhpwKU8M3WoG4ZWaCqh1zZr2gWkJd'),
  devnet: new PublicKey('6PxBxXabvsvvv6bFBrL8Pp3K2YhL9j3K5wQpQZ7v8J9k'),
};

const DEFAULT_COMMITMENT: Commitment = 'confirmed';

// Chainlink Store account data layout (simplified)
// Full implementation would use Borsh or similar for deserialization
interface ChainlinkStoreData {
  version: number;
  state: number;
  owner: PublicKey;
  proposedOwner: PublicKey;
  loweringAccessController: PublicKey;
  raisingAccessController: PublicKey;
  answer: BN;
  timestamp: BN;
  roundId: BN;
  decimals: number;
  description: string;
}

// Simple BN implementation for reading u64/u128
class BN {
  constructor(
    private data: Buffer,
    private offset: number,
    private length: number = 8,
  ) {
    // 验证参数
    if (offset < 0 || offset >= data.length) {
      throw new Error(`Invalid offset: ${offset}`);
    }
    if (length <= 0 || offset + length > data.length) {
      throw new Error(`Invalid length: ${length}`);
    }
  }

  toNumber(): number {
    try {
      if (this.length <= 6) {
        return this.data.readUIntLE(this.offset, this.length);
      }

      // 对于大数，使用 BigInt 进行转换并检查溢出
      const hex = this.data.slice(this.offset, this.offset + this.length).toString('hex');
      const bigIntVal = BigInt('0x' + hex);

      // 检查是否超出安全整数范围
      if (bigIntVal > BigInt(Number.MAX_SAFE_INTEGER)) {
        logger.warn('BN value exceeds safe integer range, returning MAX_SAFE_INTEGER');
        return Number.MAX_SAFE_INTEGER;
      }
      if (bigIntVal < BigInt(Number.MIN_SAFE_INTEGER)) {
        logger.warn('BN value below safe integer range, returning MIN_SAFE_INTEGER');
        return Number.MIN_SAFE_INTEGER;
      }

      return Number(bigIntVal);
    } catch (error) {
      logger.error('BN toNumber conversion failed', {
        error,
        offset: this.offset,
        length: this.length,
      });
      return 0;
    }
  }

  toString(): string {
    try {
      const hex = this.data.slice(this.offset, this.offset + this.length).toString('hex');
      return BigInt('0x' + hex).toString();
    } catch (error) {
      logger.error('BN toString conversion failed', {
        error,
        offset: this.offset,
        length: this.length,
      });
      return '0';
    }
  }

  /**
   * 获取 BigInt 值（推荐用于大数）
   */
  toBigInt(): bigint {
    try {
      const hex = this.data.slice(this.offset, this.offset + this.length).toString('hex');
      return BigInt('0x' + hex);
    } catch (error) {
      logger.error('BN toBigInt conversion failed', {
        error,
        offset: this.offset,
        length: this.length,
      });
      return 0n;
    }
  }
}

// ============================================================================
// Chainlink Client
// ============================================================================

export class ChainlinkSolanaClient {
  private connection: Connection;

  constructor(
    rpcUrl: string,
    private cluster: 'mainnet-beta' | 'devnet' = 'mainnet-beta',
    commitment: Commitment = DEFAULT_COMMITMENT,
  ) {
    this.connection = new Connection(rpcUrl, commitment);
  }

  /**
   * Fetch price data from a Chainlink data feed
   *
   * Chainlink on Solana uses a different architecture than EVM chains.
   * Each price feed has its own store account that contains the latest answer.
   */
  async fetchPrice(feedAddress: string, symbol: string): Promise<SolanaPriceFeed> {
    try {
      const storePublicKey = new PublicKey(feedAddress);

      // Fetch the store account data
      const accountInfo = await this.connection.getAccountInfo(storePublicKey);

      if (!accountInfo) {
        throw new SolanaError(
          `Chainlink store account not found: ${feedAddress}`,
          SolanaErrorCode.ACCOUNT_NOT_FOUND,
        );
      }

      // Parse the store data
      const priceData = this.parseStoreData(accountInfo.data);

      if (!priceData) {
        throw new SolanaError(
          `Failed to parse Chainlink store data for ${symbol}`,
          SolanaErrorCode.PARSE_ERROR,
        );
      }

      // Calculate actual price based on decimals
      const price = priceData.answer.toNumber() / Math.pow(10, priceData.decimals);

      // Get current slot for reference
      const slot = await this.connection.getSlot();

      return {
        symbol,
        price,
        confidence: 0, // Chainlink doesn't provide confidence intervals
        timestamp: priceData.timestamp.toNumber() * 1000, // Convert to milliseconds
        slot,
        source: 'chainlink',
        decimals: priceData.decimals,
      };
    } catch (error) {
      if (error instanceof SolanaError) {
        throw error;
      }

      logger.error('Failed to fetch Chainlink price', {
        error: error instanceof Error ? error.message : String(error),
        feedAddress,
        symbol,
      });

      throw new SolanaError(
        `Failed to fetch Chainlink price for ${symbol}: ${error instanceof Error ? error.message : String(error)}`,
        SolanaErrorCode.RPC_ERROR,
        error,
      );
    }
  }

  /**
   * Parse Chainlink store account data
   *
   * This is a simplified parser. The actual layout may vary based on the
   * specific Chainlink program version.
   *
   * Store account layout (approximate):
   * - version: u8 (1 byte)
   * - state: u8 (1 byte)
   * - owner: Pubkey (32 bytes)
   * - proposed_owner: Pubkey (32 bytes)
   * - lowering_access_controller: Pubkey (32 bytes)
   * - raising_access_controller: Pubkey (32 bytes)
   * - answer: i128 (16 bytes) - latest price
   * - timestamp: u64 (8 bytes) - when answer was updated
   * - round_id: u64 (8 bytes)
   * - decimals: u8 (1 byte)
   * - description: string (variable length)
   */
  private parseStoreData(data: Buffer): ChainlinkStoreData | null {
    try {
      let offset = 0;

      // Read discriminator (8 bytes for Anchor programs)
      // Skip discriminator check for now - would verify in production
      offset += 8;

      // Read version
      const version = data[offset] ?? 0;
      offset += 1;

      // Read state
      const state = data[offset] ?? 0;
      offset += 1;

      // Skip owner, proposed_owner, access controllers (5 * 32 = 160 bytes)
      offset += 160;

      // Read answer (i128 = 16 bytes)
      const answer = new BN(data, offset, 16);
      offset += 16;

      // Read timestamp (u64 = 8 bytes)
      const timestamp = new BN(data, offset, 8);
      offset += 8;

      // Read round_id (u64 = 8 bytes)
      const roundId = new BN(data, offset, 8);
      offset += 8;

      // Read decimals (u8 = 1 byte)
      const decimals = data[offset] ?? 8;
      offset += 1;

      // Read description length
      const descLen = data.readUInt32LE(offset);
      offset += 4;

      // Read description
      const description = data.slice(offset, offset + descLen).toString('utf8');

      return {
        version,
        state,
        owner: new PublicKey(data.slice(8, 40)),
        proposedOwner: new PublicKey(data.slice(40, 72)),
        loweringAccessController: new PublicKey(data.slice(72, 104)),
        raisingAccessController: new PublicKey(data.slice(104, 136)),
        answer,
        timestamp,
        roundId,
        decimals,
        description,
      };
    } catch (error) {
      logger.error('Failed to parse Chainlink store data', {
        error: error instanceof Error ? error.message : String(error),
        dataLength: data.length,
      });
      return null;
    }
  }

  /**
   * Fetch prices for multiple feeds
   */
  async fetchPrices(feeds: { address: string; symbol: string }[]): Promise<SolanaPriceFeed[]> {
    const results: SolanaPriceFeed[] = [];

    for (const feed of feeds) {
      try {
        const priceFeed = await this.fetchPrice(feed.address, feed.symbol);
        results.push(priceFeed);
      } catch (error) {
        logger.error(`Failed to fetch price for ${feed.symbol}`, {
          error: error instanceof Error ? error.message : String(error),
          address: feed.address,
        });
      }
    }

    return results;
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

  /**
   * Get Chainlink program ID for current cluster
   */
  getProgramId(): PublicKey {
    return CHAINLINK_PROGRAM_IDS[this.cluster === 'mainnet-beta' ? 'mainnet' : 'devnet'];
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Create Chainlink client from oracle instance config
 */
export function createChainlinkClient(instance: SolanaOracleInstance): ChainlinkSolanaClient {
  const cluster = instance.chain === 'solanaDevnet' ? 'devnet' : 'mainnet-beta';
  return new ChainlinkSolanaClient(instance.config.rpcUrl || getDefaultRpcUrl(cluster), cluster);
}

/**
 * Get default RPC URL for cluster
 */
function getDefaultRpcUrl(cluster: 'mainnet-beta' | 'devnet'): string {
  if (cluster === 'devnet') {
    return 'https://api.devnet.solana.com';
  }
  return process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';
}

// ============================================================================
// Export Singleton Factory
// ============================================================================

const clientCache = new Map<string, ChainlinkSolanaClient>();

export function getChainlinkClient(
  rpcUrl: string,
  cluster: 'mainnet-beta' | 'devnet' = 'mainnet-beta',
): ChainlinkSolanaClient {
  const key = `${cluster}:${rpcUrl}`;

  if (!clientCache.has(key)) {
    clientCache.set(key, new ChainlinkSolanaClient(rpcUrl, cluster));
  }

  return clientCache.get(key)!;
}

export function clearChainlinkClientCache(): void {
  clientCache.clear();
}

// ============================================================================
// Chainlink Feed Addresses (Mainnet)
// ============================================================================

// Chainlink Solana Mainnet Price Feeds
// 来源: https://docs.chain.link/data-feeds/price-feeds/addresses?network=solana
export const CHAINLINK_SOLANA_FEEDS: Record<string, string> = {
  // 已验证的 Chainlink Solana 价格源
  // 注意: Chainlink 在 Solana 上的部署有限，以下地址需要验证
  // 建议通过 addFeed 方法动态添加或使用配置文件
};

/**
 * 验证 Solana 地址格式
 */
function isValidSolanaAddress(address: string): boolean {
  // Solana 地址是 base58 编码，长度 32-44 字符
  if (!address || typeof address !== 'string') return false;
  if (address.length < 32 || address.length > 44) return false;
  // 基本 base58 字符检查
  return /^[1-9A-HJ-NP-Za-km-z]+$/.test(address);
}

/**
 * 添加 Chainlink 价格源
 */
export function addChainlinkFeed(symbol: string, address: string): void {
  if (!isValidSolanaAddress(address)) {
    throw new Error(`Invalid Solana address for ${symbol}: ${address}`);
  }
  CHAINLINK_SOLANA_FEEDS[symbol] = address;
}

/**
 * Get Chainlink feed address for a symbol
 */
export function getChainlinkFeedAddress(symbol: string): string | undefined {
  return CHAINLINK_SOLANA_FEEDS[symbol];
}
