/**
 * Switchboard Solana Client
 *
 * Switchboard 预言机 Solana 客户端
 */

import { SOLANA_PRICE_FEEDS } from './config';
import type { SolanaPriceFeed, SwitchboardAggregator, Connection } from './types';
import { SolanaError, SolanaErrorCode } from './types';
import { fetchAccountInfo } from './connection';

// ============================================================================
// Switchboard Account Layout
// ============================================================================

// Switchboard Aggregator account layout (simplified)
const AGGREGATOR_ACCOUNT_DISCRIMINATOR = Buffer.from([217, 230, 65, 101, 201, 162, 27, 125]);

interface AggregatorAccountData {
  name: string;
  metadata: string;
  queuePubkey: string;
  oracleRequestBatchSize: number;
  minOracleResults: number;
  minJobResults: number;
  minUpdateDelaySeconds: number;
  startAfter: number;
  varianceThreshold: number;
  forceReportPeriod: number;
  expiration: number;
  consecutiveFailureCount: number;
  nextAllowedUpdateTime: number;
  isLocked: boolean;
  crankPubkey: string;
  latestConfirmedRound: AggregatorRound;
  currentRound: AggregatorRound;
  jobPubkeys: string[];
  jobHashes: Buffer[];
  jobRewards: number[];
  authority: string;
  historyBuffer: string;
  previousConfirmedRoundSlot: number;
  jobPubkeysSize: number;
  jobsChecksum: Buffer;
}

interface AggregatorRound {
  id: number;
  roundOpenSlot: number;
  roundOpenTimestamp: number;
  result: number;
  stdDeviation: number;
  minResponse: number;
  maxResponse: number;
  oracleKeys: string[];
  medians: number[];
  currentPayout: number[];
  errorsFulfilled: boolean[];
  numSuccess: number;
  numError: number;
  isClosed: boolean;
  roundConfirmedSlot: number;
}

// ============================================================================
// Account Parser
// ============================================================================

function parseAggregatorAccount(data: Buffer): Partial<AggregatorAccountData> {
  try {
    // Skip discriminator (8 bytes)
    let offset = 8;

    // Parse name (32 bytes)
    const nameBytes = data.slice(offset, offset + 32);
    const name = nameBytes.toString('utf8').replace(/\0/g, '');
    offset += 32;

    // Parse metadata (128 bytes)
    const metadataBytes = data.slice(offset, offset + 128);
    const metadata = metadataBytes.toString('utf8').replace(/\0/g, '');
    offset += 128;

    // Parse queue pubkey (32 bytes)
    const queuePubkey = data.slice(offset, offset + 32).toString('hex');
    offset += 32;

    // Parse authority (32 bytes)
    const authority = data.slice(offset, offset + 32).toString('hex');
    offset += 32;

    // Parse latest confirmed round (simplified)
    const latestConfirmedRound: AggregatorRound = {
      id: data.readUInt32LE(offset),
      roundOpenSlot: Number(data.readBigUInt64LE(offset + 4)),
      roundOpenTimestamp: Number(data.readBigUInt64LE(offset + 12)),
      result: Number(data.readBigInt64LE(offset + 20)),
      stdDeviation: Number(data.readBigInt64LE(offset + 28)),
      minResponse: Number(data.readBigInt64LE(offset + 36)),
      maxResponse: Number(data.readBigInt64LE(offset + 44)),
      oracleKeys: [],
      medians: [],
      currentPayout: [],
      errorsFulfilled: [],
      numSuccess: 0,
      numError: 0,
      isClosed: false,
      roundConfirmedSlot: 0,
    };

    return {
      name,
      metadata,
      queuePubkey,
      authority,
      latestConfirmedRound,
    };
  } catch (error) {
    throw new SolanaError(
      'Failed to parse Switchboard aggregator account',
      SolanaErrorCode.PARSE_ERROR,
      error,
    );
  }
}

// ============================================================================
// Switchboard Client
// ============================================================================

export class SwitchboardSolanaClient {
  constructor(private connection: Connection) {}

  /**
   * Get price feed for a symbol
   */
  async getPriceFeed(symbol: string): Promise<SolanaPriceFeed> {
    const feedConfig = SOLANA_PRICE_FEEDS[symbol];
    if (!feedConfig?.switchboard) {
      throw new SolanaError(
        `No Switchboard feed configured for ${symbol}`,
        SolanaErrorCode.ACCOUNT_NOT_FOUND,
      );
    }

    const aggregator = await this.getAggregator(feedConfig.switchboard);

    if (!aggregator.latestRoundResult) {
      throw new SolanaError(
        `No price data available for ${symbol}`,
        SolanaErrorCode.ACCOUNT_NOT_FOUND,
      );
    }

    const { result, roundOpenTimestamp, stdDeviation } = aggregator.latestRoundResult;

    // Convert from Switchboard format (usually 18 decimals) to standard format
    const price = result / Math.pow(10, feedConfig.decimals);
    const confidence = stdDeviation / Math.pow(10, feedConfig.decimals);

    return {
      symbol,
      price,
      confidence,
      timestamp: roundOpenTimestamp * 1000, // Convert to milliseconds
      slot: aggregator.latestRoundResult.roundOpenSlot,
      source: 'switchboard',
      decimals: feedConfig.decimals,
    };
  }

  /**
   * Get aggregator account data
   */
  async getAggregator(address: string): Promise<SwitchboardAggregator> {
    const accountInfo = await fetchAccountInfo(this.connection, address);

    if (!accountInfo) {
      throw new SolanaError(
        `Aggregator account not found: ${address}`,
        SolanaErrorCode.ACCOUNT_NOT_FOUND,
      );
    }

    // Verify discriminator
    const discriminator = accountInfo.data.slice(0, 8);
    if (!discriminator.equals(AGGREGATOR_ACCOUNT_DISCRIMINATOR)) {
      throw new SolanaError('Invalid Switchboard aggregator account', SolanaErrorCode.PARSE_ERROR);
    }

    const parsed = parseAggregatorAccount(accountInfo.data);

    return {
      address,
      name: parsed.name || 'Unknown',
      latestRoundResult: parsed.latestConfirmedRound
        ? {
            result: Number(parsed.latestConfirmedRound.result),
            roundOpenSlot: parsed.latestConfirmedRound.roundOpenSlot,
            roundOpenTimestamp: parsed.latestConfirmedRound.roundOpenTimestamp,
            minResponse: Number(parsed.latestConfirmedRound.minResponse),
            maxResponse: Number(parsed.latestConfirmedRound.maxResponse),
            stdDeviation: Number(parsed.latestConfirmedRound.stdDeviation),
          }
        : undefined,
      authority: parsed.authority || '',
      queueAddress: parsed.queuePubkey || '',
    };
  }

  /**
   * Get multiple price feeds
   */
  async getMultiplePriceFeeds(symbols: string[]): Promise<SolanaPriceFeed[]> {
    const results = await Promise.allSettled(symbols.map((symbol) => this.getPriceFeed(symbol)));

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
      .filter(([, config]) => config.switchboard)
      .map(([symbol]) => symbol);
  }

  /**
   * Check if feed is available
   */
  isFeedAvailable(symbol: string): boolean {
    return !!SOLANA_PRICE_FEEDS[symbol]?.switchboard;
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createSwitchboardClient(connection: Connection): SwitchboardSolanaClient {
  return new SwitchboardSolanaClient(connection);
}
