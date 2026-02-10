/**
 * Unified Price Service
 *
 * Provides a unified price data access interface, replacing multiple legacy services:
 * - Replaces priceHistoryService
 * - Replaces unified_price_feeds queries
 * - Supports partitioned tables and materialized view queries
 */

import { translations } from '@/i18n/translations';
import { logger } from '@/lib/logger';
import { supabaseAdmin } from '@/lib/supabase/server';
import type { OracleProtocol, SupportedChain } from '@/lib/types/unifiedOracleTypes';

import type { SupabaseClient } from '@supabase/supabase-js';

// Default language for server-side messages
const DEFAULT_LANG: keyof typeof translations = 'en';

// Helper function to get translated message
function t(key: string, values?: Record<string, string>): string {
  // Only allow specific translation keys to prevent object injection
  const allowedKeys = [
    'errors.failedToFetchPriceHistory',
    'errors.failedToFetchOhlcvData',
    'errors.failedToFetchCurrentPrices',
    'errors.failedToFetchCurrentPrice',
    'errors.failedToFetchPriceUpdateEvents',
    'errors.failedToFetchPriceStats',
    'errors.failedToInsertPriceHistory',
    'errors.failedToRefreshMaterializedView',
    'errors.noPriceDataFound',
    'oracle.priceService.refreshedMaterializedView',
    'oracle.priceService.refreshingMaterializedView',
    'oracle.priceService.priceUpdateReceived',
    'oracle.priceService.priceDeviationDetected',
    'oracle.priceService.historicalDataPurge',
  ];

  if (!allowedKeys.includes(key)) {
    return key;
  }

  const keys = key.split('.');
  let result: unknown = translations[DEFAULT_LANG];

  for (const k of keys) {
    if (result && typeof result === 'object' && Object.prototype.hasOwnProperty.call(result, k)) {
      result = (result as Record<string, unknown>)[k];
    } else {
      return key; // Return key if translation not found
    }
  }

  if (typeof result !== 'string') {
    return key;
  }

  // Simple interpolation with safe replacement
  if (values) {
    return result.replace(/\{\{(\w+)\}\}/g, (substring: string, match: string) => {
      // eslint-disable-next-line security/detect-object-injection
      return Object.prototype.hasOwnProperty.call(values, match)
        ? (values[match] ?? substring)
        : substring;
    });
  }

  return result;
}

// ============================================================================
// Type Definitions
// ============================================================================

export interface PriceHistoryRecord {
  id: number;
  feedId: string;
  protocol: OracleProtocol;
  chain: SupportedChain;
  symbol: string;
  baseAsset: string;
  quoteAsset: string;
  price: number;
  priceRaw: string;
  decimals: number;
  timestamp: Date;
  blockNumber?: number;
  confidence?: number;
  sources?: number;
  isStale?: boolean;
  stalenessSeconds?: number;
  txHash?: string;
  logIndex?: number;
  volume24h?: number;
  change24h?: number;
  createdAt: Date;
}

export interface PriceHistoryQuery {
  symbol?: string;
  protocol?: OracleProtocol;
  chain?: SupportedChain;
  feedId?: string;
  startTime: Date;
  endTime: Date;
  interval?: 'raw' | '1min' | '5min' | '1hour' | '1day';
  limit?: number;
  offset?: number;
  orderBy?: 'timestamp' | 'price';
  orderDirection?: 'asc' | 'desc';
}

export interface OHLCVData {
  timestamp: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
  sampleCount: number;
  avgConfidence?: number;
}

export interface PriceStats {
  symbol: string;
  min: number;
  max: number;
  avg: number;
  first: number;
  last: number;
  change: number;
  /** Price change percentage in decimal form (e.g., 0.01 = 1%) */
  changePercent: number;
  volatility: number;
  count: number;
}

export interface CurrentPriceFeed {
  id: number;
  feedId: string;
  protocol: OracleProtocol;
  chain: SupportedChain;
  symbol: string;
  baseAsset: string;
  quoteAsset: string;
  price: number;
  priceRaw: string;
  decimals: number;
  timestamp: Date;
  blockNumber?: number;
  confidence?: number;
  sources?: number;
  isStale?: boolean;
  stalenessSeconds?: number;
  txHash?: string;
  logIndex?: number;
  createdAt: Date;
}

export interface PriceUpdateEvent {
  id: number;
  feedId: string;
  protocol: OracleProtocol;
  chain: SupportedChain;
  symbol: string;
  previousPrice?: number;
  currentPrice: number;
  priceChange?: number;
  /** Price change percentage in decimal form (e.g., 0.01 = 1%) */
  priceChangePercent?: number;
  timestamp: Date;
  blockNumber?: number;
  txHash?: string;
  createdAt: Date;
}

// ============================================================================
// Unified Price Service
// ============================================================================

export class UnifiedPriceService {
  private supabase: SupabaseClient;

  constructor() {
    this.supabase = supabaseAdmin;
  }

  // ============================================================================
  // Price History Queries
  // ============================================================================

  /**
   * Query price history data
   */
  async getPriceHistory(query: PriceHistoryQuery): Promise<PriceHistoryRecord[]> {
    try {
      const tableName = this.getTableNameForInterval(query.interval);
      let dbQuery = this.supabase
        .from(tableName)
        .select('*')
        .gte('timestamp', query.startTime.toISOString())
        .lte('timestamp', query.endTime.toISOString());

      // Apply filters
      if (query.symbol) {
        dbQuery = dbQuery.eq('symbol', query.symbol);
      }
      if (query.protocol) {
        dbQuery = dbQuery.eq('protocol', query.protocol);
      }
      if (query.chain) {
        dbQuery = dbQuery.eq('chain', query.chain);
      }
      if (query.feedId) {
        dbQuery = dbQuery.eq('feed_id', query.feedId);
      }

      // Apply sorting
      const orderBy = query.orderBy || 'timestamp';
      const orderDirection = query.orderDirection || 'desc';
      dbQuery = dbQuery.order(orderBy, { ascending: orderDirection === 'asc' });

      // Apply pagination
      if (query.limit) {
        dbQuery = dbQuery.limit(query.limit);
      }
      if (query.offset) {
        dbQuery = dbQuery.range(query.offset, query.offset + (query.limit || 1000) - 1);
      }

      const { data, error } = await dbQuery;

      if (error) {
        throw new Error(`${t('errors.failedToFetchPriceHistory')}: ${error.message}`);
      }

      return (data || []).map(this.mapToPriceHistoryRecord);
    } catch (error) {
      logger.error(t('errors.failedToFetchPriceHistory'), {
        error: error instanceof Error ? error.message : String(error),
        query,
      });
      throw error;
    }
  }

  /**
   * Query OHLCV data (candlestick data)
   */
  async getOHLCVData(query: PriceHistoryQuery): Promise<OHLCVData[]> {
    try {
      // OHLCV data can only be retrieved from materialized views
      const tableName = this.getTableNameForInterval(query.interval || '1min');

      let dbQuery = this.supabase
        .from(tableName)
        .select('*')
        .gte('timestamp', query.startTime.toISOString())
        .lte('timestamp', query.endTime.toISOString());

      if (query.symbol) {
        dbQuery = dbQuery.eq('symbol', query.symbol);
      }
      if (query.protocol) {
        dbQuery = dbQuery.eq('protocol', query.protocol);
      }
      if (query.chain) {
        dbQuery = dbQuery.eq('chain', query.chain);
      }
      if (query.feedId) {
        dbQuery = dbQuery.eq('feed_id', query.feedId);
      }

      dbQuery = dbQuery.order('timestamp', { ascending: true });

      if (query.limit) {
        dbQuery = dbQuery.limit(query.limit);
      }

      const { data, error } = await dbQuery;

      if (error) {
        throw new Error(`${t('errors.failedToFetchOhlcvData')}: ${error.message}`);
      }

      return (data || []).map(this.mapToOHLCVData);
    } catch (error) {
      logger.error(t('errors.failedToFetchOhlcvData'), {
        error: error instanceof Error ? error.message : String(error),
        query,
      });
      throw error;
    }
  }

  // ============================================================================
  // Current Price Queries
  // ============================================================================

  /**
   * Get all current prices
   */
  async getCurrentPrices(): Promise<CurrentPriceFeed[]> {
    try {
      const { data, error } = await this.supabase.from('current_price_feeds').select('*');

      if (error) {
        throw new Error(`${t('errors.failedToFetchCurrentPrices')}: ${error.message}`);
      }

      return (data || []).map(this.mapToCurrentPriceFeed);
    } catch (error) {
      logger.error(t('errors.failedToFetchCurrentPrices'), {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Get current price for a specific feed
   */
  async getCurrentPrice(feedId: string): Promise<CurrentPriceFeed | null> {
    try {
      const { data, error } = await this.supabase
        .from('current_price_feeds')
        .select('*')
        .eq('feed_id', feedId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // Not found
        }
        throw new Error(`${t('errors.failedToFetchCurrentPrice')}: ${error.message}`);
      }

      return data ? this.mapToCurrentPriceFeed(data) : null;
    } catch (error) {
      logger.error(t('errors.failedToFetchCurrentPrice'), {
        error: error instanceof Error ? error.message : String(error),
        feedId,
      });
      throw error;
    }
  }

  /**
   * Get current prices for multiple feeds in batch
   */
  async getCurrentPricesByFeeds(feedIds: string[]): Promise<Map<string, CurrentPriceFeed>> {
    const results = new Map<string, CurrentPriceFeed>();

    try {
      const { data, error } = await this.supabase
        .from('current_price_feeds')
        .select('*')
        .in('feed_id', feedIds);

      if (error) {
        throw new Error(`${t('errors.failedToFetchCurrentPrices')}: ${error.message}`);
      }

      (data || []).forEach((item: Record<string, unknown>) => {
        const record = this.mapToCurrentPriceFeed(item);
        results.set(record.feedId, record);
      });

      return results;
    } catch (error) {
      logger.error(t('errors.failedToFetchCurrentPrices'), {
        error: error instanceof Error ? error.message : String(error),
        feedIds,
      });
      throw error;
    }
  }

  // ============================================================================
  // Price Update Events
  // ============================================================================

  /**
   * Get price update events
   */
  async getPriceUpdateEvents(options: {
    feedId?: string;
    protocol?: OracleProtocol;
    chain?: SupportedChain;
    symbol?: string;
    startTime?: Date;
    endTime?: Date;
    limit?: number;
    offset?: number;
  }): Promise<PriceUpdateEvent[]> {
    try {
      let query = this.supabase.from('price_update_events').select('*');

      if (options.feedId) {
        query = query.eq('feed_id', options.feedId);
      }
      if (options.protocol) {
        query = query.eq('protocol', options.protocol);
      }
      if (options.chain) {
        query = query.eq('chain', options.chain);
      }
      if (options.symbol) {
        query = query.eq('symbol', options.symbol);
      }
      if (options.startTime) {
        query = query.gte('timestamp', options.startTime.toISOString());
      }
      if (options.endTime) {
        query = query.lte('timestamp', options.endTime.toISOString());
      }

      query = query.order('timestamp', { ascending: false });

      if (options.limit) {
        query = query.limit(options.limit);
      }
      if (options.offset) {
        query = query.range(options.offset, options.offset + (options.limit || 100) - 1);
      }

      const { data, error } = await query;

      if (error) {
        throw new Error(`${t('errors.failedToFetchPriceUpdateEvents')}: ${error.message}`);
      }

      return (data || []).map(this.mapToPriceUpdateEvent);
    } catch (error) {
      logger.error(t('errors.failedToFetchPriceUpdateEvents'), {
        error: error instanceof Error ? error.message : String(error),
        options,
      });
      throw error;
    }
  }

  // ============================================================================
  // Statistics
  // ============================================================================

  /**
   * Get price statistics
   */
  async getPriceStats(options: {
    symbol: string;
    protocol?: OracleProtocol;
    chain?: SupportedChain;
    startTime: Date;
    endTime: Date;
  }): Promise<PriceStats> {
    try {
      const { data, error } = await this.supabase
        .from('price_history')
        .select('price')
        .eq('symbol', options.symbol)
        .gte('timestamp', options.startTime.toISOString())
        .lte('timestamp', options.endTime.toISOString());

      if (error) {
        throw new Error(`${t('errors.failedToFetchPriceStats')}: ${error.message}`);
      }

      const prices = (data || []).map((d: { price: number }) => d.price);

      if (prices.length === 0) {
        throw new Error(t('errors.noPriceDataFound'));
      }

      const min = Math.min(...prices);
      const max = Math.max(...prices);
      const avg = prices.reduce((a: number, b: number) => a + b, 0) / prices.length;
      const first = prices[0] ?? 0;
      const last = prices[prices.length - 1] ?? 0;
      const change = last - first;
      // Price change percentage in decimal form (0.01 = 1%)
      const changePercent = first > 0 ? change / first : 0;

      // Calculate volatility (standard deviation)
      const variance =
        prices.reduce((sum: number, price: number) => sum + Math.pow(price - avg, 2), 0) /
        prices.length;
      const volatility = Math.sqrt(variance);

      return {
        symbol: options.symbol,
        min,
        max,
        avg,
        first,
        last,
        change,
        changePercent,
        volatility,
        count: prices.length,
      };
    } catch (error) {
      logger.error(t('errors.failedToFetchPriceStats'), {
        error: error instanceof Error ? error.message : String(error),
        options,
      });
      throw error;
    }
  }

  // ============================================================================
  // Data Write Operations
  // ============================================================================

  /**
   * Insert price history records
   */
  async insertPriceHistory(records: Omit<PriceHistoryRecord, 'id' | 'createdAt'>[]): Promise<void> {
    try {
      const dbRecords = records.map((record) => ({
        feed_id: record.feedId,
        protocol: record.protocol,
        chain: record.chain,
        symbol: record.symbol,
        base_asset: record.baseAsset,
        quote_asset: record.quoteAsset,
        price: record.price,
        price_raw: record.priceRaw,
        decimals: record.decimals,
        timestamp: record.timestamp.toISOString(),
        block_number: record.blockNumber,
        confidence: record.confidence,
        sources: record.sources,
        is_stale: record.isStale,
        staleness_seconds: record.stalenessSeconds,
        tx_hash: record.txHash,
        log_index: record.logIndex,
        volume_24h: record.volume24h,
        change_24h: record.change24h,
      }));

      const { error } = await this.supabase.from('price_history').insert(dbRecords);

      if (error) {
        throw new Error(`${t('errors.failedToInsertPriceHistory')}: ${error.message}`);
      }
    } catch (error) {
      logger.error(t('errors.failedToInsertPriceHistory'), {
        error: error instanceof Error ? error.message : String(error),
        recordCount: records.length,
      });
      throw error;
    }
  }

  // ============================================================================
  // Materialized View Management
  // ============================================================================

  /**
   * Refresh materialized view
   */
  async refreshMaterializedView(viewName: '1min' | '5min' | '1hour' | '1day'): Promise<void> {
    try {
      const functionName = `refresh_price_history_${viewName}`;
      const { error } = await this.supabase.rpc(functionName);

      if (error) {
        throw new Error(`${t('errors.failedToRefreshMaterializedView')}: ${error.message}`);
      }

      logger.info(t('oracle.priceService.refreshedMaterializedView', { viewName }));
    } catch (error) {
      logger.error(t('errors.failedToRefreshMaterializedView'), {
        error: error instanceof Error ? error.message : String(error),
        viewName,
      });
      throw error;
    }
  }

  /**
   * Refresh all materialized views
   */
  async refreshAllMaterializedViews(): Promise<void> {
    const views: Array<'1min' | '5min' | '1hour' | '1day'> = ['1min', '5min', '1hour', '1day'];

    for (const view of views) {
      await this.refreshMaterializedView(view);
    }
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  private getTableNameForInterval(interval?: string): string {
    switch (interval) {
      case '1min':
        return 'price_history_1min';
      case '5min':
        return 'price_history_5min';
      case '1hour':
        return 'price_history_1hour';
      case '1day':
        return 'price_history_1day';
      case 'raw':
      default:
        return 'price_history';
    }
  }

  // ============================================================================
  // Data Mapping
  // ============================================================================

  private mapToPriceHistoryRecord(data: Record<string, unknown>): PriceHistoryRecord {
    return {
      id: data.id as number,
      feedId: data.feed_id as string,
      protocol: data.protocol as OracleProtocol,
      chain: data.chain as SupportedChain,
      symbol: data.symbol as string,
      baseAsset: data.base_asset as string,
      quoteAsset: data.quote_asset as string,
      price: data.price as number,
      priceRaw: data.price_raw as string,
      decimals: data.decimals as number,
      timestamp: new Date(data.timestamp as string),
      blockNumber: data.block_number as number | undefined,
      confidence: data.confidence as number | undefined,
      sources: data.sources as number | undefined,
      isStale: data.is_stale as boolean | undefined,
      stalenessSeconds: data.staleness_seconds as number | undefined,
      txHash: data.tx_hash as string | undefined,
      logIndex: data.log_index as number | undefined,
      volume24h: data.volume_24h as number | undefined,
      change24h: data.change_24h as number | undefined,
      createdAt: new Date(data.created_at as string),
    };
  }

  private mapToCurrentPriceFeed(data: Record<string, unknown>): CurrentPriceFeed {
    return {
      id: data.id as number,
      feedId: data.feed_id as string,
      protocol: data.protocol as OracleProtocol,
      chain: data.chain as SupportedChain,
      symbol: data.symbol as string,
      baseAsset: data.base_asset as string,
      quoteAsset: data.quote_asset as string,
      price: data.price as number,
      priceRaw: data.price_raw as string,
      decimals: data.decimals as number,
      timestamp: new Date(data.timestamp as string),
      blockNumber: data.block_number as number | undefined,
      confidence: data.confidence as number | undefined,
      sources: data.sources as number | undefined,
      isStale: data.is_stale as boolean | undefined,
      stalenessSeconds: data.staleness_seconds as number | undefined,
      txHash: data.tx_hash as string | undefined,
      logIndex: data.log_index as number | undefined,
      createdAt: new Date(data.created_at as string),
    };
  }

  private mapToOHLCVData(data: Record<string, unknown>): OHLCVData {
    return {
      timestamp: new Date(data.timestamp as string),
      open: data.price_open as number,
      high: data.price_high as number,
      low: data.price_low as number,
      close: data.price_close as number,
      volume: data.volume as number | undefined,
      sampleCount: data.sample_count as number,
      avgConfidence: data.avg_confidence as number | undefined,
    };
  }

  private mapToPriceUpdateEvent(data: Record<string, unknown>): PriceUpdateEvent {
    return {
      id: data.id as number,
      feedId: data.feed_id as string,
      protocol: data.protocol as OracleProtocol,
      chain: data.chain as SupportedChain,
      symbol: data.symbol as string,
      previousPrice: data.previous_price as number | undefined,
      currentPrice: data.current_price as number,
      priceChange: data.price_change as number | undefined,
      priceChangePercent: data.price_change_percent as number | undefined,
      timestamp: new Date(data.timestamp as string),
      blockNumber: data.block_number as number | undefined,
      txHash: data.tx_hash as string | undefined,
      createdAt: new Date(data.created_at as string),
    };
  }
}

// ============================================================================
// Singleton Export
// ============================================================================

let unifiedPriceService: UnifiedPriceService | null = null;

export function getUnifiedPriceService(): UnifiedPriceService {
  if (!unifiedPriceService) {
    unifiedPriceService = new UnifiedPriceService();
  }
  return unifiedPriceService;
}
