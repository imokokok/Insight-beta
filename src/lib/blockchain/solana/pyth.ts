/**
 * Pyth Solana Client
 *
 * Pyth 预言机 Solana 客户端
 */

import { SOLANA_PRICE_FEEDS } from './config';
import { fetchAccountInfo } from './connection';
import { SolanaError, SolanaErrorCode } from './types';

import type { SolanaPriceFeed, PythPriceData, Connection } from './types';

// ============================================================================
// Pyth Account Layout
// ============================================================================

// Pyth price account layout
const PYTH_PRICE_ACCOUNT_DISCRIMINATOR = Buffer.from([255, 174, 251, 44, 188, 69, 25, 98]);

interface PythPriceAccount {
  magic: number;
  version: number;
  type: number;
  size: number;
  priceType: number;
  exponent: number;
  numComponentPrices: number;
  lastSlot: bigint;
  validSlot: bigint;
  twapComponent: bigint;
  twapComponentNumerator: bigint;
  twapDenominator: bigint;
  cumulativePrice: bigint;
  numDowngrades: bigint;
  numUpgrades: bigint;
  price: bigint;
  confidence: bigint;
  status: number;
  corpAct: number;
  timestamp: bigint;
}

// Pyth price status enum
enum PythPriceStatus {
  UNKNOWN = 0,
  TRADING = 1,
  HALTED = 2,
  AUCTION = 3,
  IGNORED = 4,
}

// ============================================================================
// Account Parser
// ============================================================================

function parsePythPriceAccount(data: Buffer): PythPriceAccount {
  try {
    // Skip discriminator (8 bytes)
    const offset = 8;

    return {
      magic: data.readUInt32LE(offset),
      version: data.readUInt32LE(offset + 4),
      type: data.readUInt32LE(offset + 8),
      size: data.readUInt32LE(offset + 12),
      priceType: data.readUInt32LE(offset + 16),
      exponent: data.readInt32LE(offset + 20),
      numComponentPrices: data.readUInt32LE(offset + 24),
      lastSlot: data.readBigUInt64LE(offset + 28),
      validSlot: data.readBigUInt64LE(offset + 36),
      twapComponent: data.readBigInt64LE(offset + 44),
      twapComponentNumerator: data.readBigInt64LE(offset + 52),
      twapDenominator: data.readBigInt64LE(offset + 60),
      cumulativePrice: data.readBigInt64LE(offset + 68),
      numDowngrades: data.readBigUInt64LE(offset + 76),
      numUpgrades: data.readBigUInt64LE(offset + 84),
      price: data.readBigInt64LE(offset + 92),
      confidence: data.readBigUInt64LE(offset + 100),
      status: data.readUInt32LE(offset + 108),
      corpAct: data.readUInt32LE(offset + 112),
      timestamp: data.readBigInt64LE(offset + 116),
    };
  } catch (error) {
    throw new SolanaError('Failed to parse Pyth price account', SolanaErrorCode.PARSE_ERROR, error);
  }
}

// ============================================================================
// Pyth Client
// ============================================================================

export class PythSolanaClient {
  constructor(_connection: Connection) {}

  /**
   * Get price feed for a symbol
   */
  async getPriceFeed(symbol: string): Promise<SolanaPriceFeed> {
    const feedConfig = SOLANA_PRICE_FEEDS[symbol];
    if (!feedConfig?.pyth) {
      throw new SolanaError(
        `No Pyth feed configured for ${symbol}`,
        SolanaErrorCode.ACCOUNT_NOT_FOUND,
      );
    }

    const priceData = await this.getPriceData(feedConfig.pyth);

    if (priceData.status !== 'trading') {
      throw new SolanaError(
        `Pyth feed for ${symbol} is not trading (status: ${priceData.status})`,
        SolanaErrorCode.ACCOUNT_NOT_FOUND,
      );
    }

    return {
      symbol,
      price: priceData.price,
      confidence: priceData.confidence,
      timestamp: priceData.timestamp * 1000, // Convert to milliseconds
      slot: Number(priceData.timestamp), // Use timestamp as slot approximation
      source: 'pyth',
      decimals: feedConfig.decimals,
    };
  }

  /**
   * Get price account data
   */
  async getPriceData(address: string): Promise<PythPriceData> {
    const accountInfo = await fetchAccountInfo(address);

    if (!accountInfo) {
      throw new SolanaError(
        `Price account not found: ${address}`,
        SolanaErrorCode.ACCOUNT_NOT_FOUND,
      );
    }

    // Verify discriminator
    const discriminator = accountInfo.data.slice(0, 8);
    if (!discriminator.equals(PYTH_PRICE_ACCOUNT_DISCRIMINATOR)) {
      throw new SolanaError('Invalid Pyth price account', SolanaErrorCode.PARSE_ERROR);
    }

    const parsed = parsePythPriceAccount(accountInfo.data);

    // Convert price based on exponent
    const price = Number(parsed.price) * Math.pow(10, parsed.exponent);
    const confidence = Number(parsed.confidence) * Math.pow(10, parsed.exponent);

    // Map status
    const statusMap: Record<number, PythPriceData['status']> = {
      [PythPriceStatus.TRADING]: 'trading',
      [PythPriceStatus.HALTED]: 'halted',
      [PythPriceStatus.AUCTION]: 'auction',
      [PythPriceStatus.IGNORED]: 'ignored',
    };

    return {
      address,
      symbol: 'Unknown', // Would need to look up from config
      priceType: parsed.priceType === 1 ? 'price' : 'ema',
      price,
      confidence,
      exponent: parsed.exponent,
      timestamp: Number(parsed.timestamp),
      status: statusMap[parsed.status] || 'ignored',
      corpAct: parsed.corpAct === 0 ? 'noCorpAct' : 'corpAct',
    };
  }

  /**
   * 并发控制辅助函数
   */
  private async runWithConcurrencyLimit<T>(
    items: string[],
    fn: (item: string) => Promise<T>,
    concurrencyLimit: number = 5,
  ): Promise<PromiseSettledResult<T>[]> {
    const results: PromiseSettledResult<T>[] = [];
    const executing: Promise<void>[] = [];

    for (const item of items) {
      const promise = fn(item).then(
        (value): PromiseSettledResult<T> => ({ status: 'fulfilled', value }),
        (reason): PromiseSettledResult<T> => ({ status: 'rejected', reason }),
      );

      results.push(promise as unknown as PromiseSettledResult<T>);

      if (items.length >= concurrencyLimit) {
        const execution = promise.then(() => {});
        executing.push(execution);

        if (executing.length >= concurrencyLimit) {
          await Promise.race(executing);
          executing.splice(
            executing.findIndex((p) => p === execution),
            1,
          );
        }
      }
    }

    return Promise.all(results);
  }

  /**
   * Get multiple price feeds with concurrency limit
   */
  async getMultiplePriceFeeds(
    symbols: string[],
    concurrencyLimit: number = 5,
  ): Promise<SolanaPriceFeed[]> {
    const results = await this.runWithConcurrencyLimit(
      symbols,
      (symbol) => this.getPriceFeed(symbol),
      concurrencyLimit,
    );

    return results
      .filter(
        (result): result is PromiseFulfilledResult<SolanaPriceFeed> =>
          result.status === 'fulfilled',
      )
      .map((result) => result.value);
  }

  /**
   * Get all available price feeds
   */
  getAvailableFeeds(): string[] {
    return Object.entries(SOLANA_PRICE_FEEDS)
      .filter(([, config]) => config.pyth)
      .map(([symbol]) => symbol);
  }

  /**
   * Check if feed is available
   */
  isFeedAvailable(symbol: string): boolean {
    return !!SOLANA_PRICE_FEEDS[symbol]?.pyth;
  }

  /**
   * Get EMA price for a symbol
   */
  async getEmaPrice(symbol: string): Promise<SolanaPriceFeed> {
    const feedConfig = SOLANA_PRICE_FEEDS[symbol];
    if (!feedConfig?.pyth) {
      throw new SolanaError(
        `No Pyth feed configured for ${symbol}`,
        SolanaErrorCode.ACCOUNT_NOT_FOUND,
      );
    }

    const priceData = await this.getPriceData(feedConfig.pyth);

    return {
      symbol,
      price: priceData.price,
      confidence: priceData.confidence,
      timestamp: priceData.timestamp * 1000,
      slot: Number(priceData.timestamp),
      source: 'pyth',
      decimals: feedConfig.decimals,
    };
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createPythClient(connection: Connection): PythSolanaClient {
  return new PythSolanaClient(connection);
}
