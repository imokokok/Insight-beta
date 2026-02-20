import { translations } from '@/i18n/translations';
import { query } from '@/lib/database/db';
import { logger } from '@/shared/logger';
import type { OracleProtocol, SupportedChain } from '@/types/unifiedOracleTypes';

const DEFAULT_LANG: keyof typeof translations = 'en';

function t(key: string, values?: Record<string, string>): string {
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
      return key;
    }
  }

  if (typeof result !== 'string') {
    return key;
  }

  if (values) {
    return result.replace(/\{\{(\w+)\}\}/g, (substring: string, match: string) => {
      return Object.prototype.hasOwnProperty.call(values, match)
        ? (values[match] ?? substring)
        : substring;
    });
  }

  return result;
}

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
  priceChangePercent?: number;
  timestamp: Date;
  blockNumber?: number;
  txHash?: string;
  createdAt: Date;
}

interface PriceHistoryRow {
  id: number;
  feed_id: string;
  protocol: string;
  chain: string;
  symbol: string;
  base_asset: string;
  quote_asset: string;
  price: number;
  price_raw: string;
  decimals: number;
  timestamp: string;
  block_number: number | null;
  confidence: number | null;
  sources: number | null;
  is_stale: boolean | null;
  staleness_seconds: number | null;
  tx_hash: string | null;
  log_index: number | null;
  volume_24h: number | null;
  change_24h: number | null;
  created_at: string;
}

interface OHLCVRow {
  timestamp: string;
  price_open: number;
  price_high: number;
  price_low: number;
  price_close: number;
  volume: number | null;
  sample_count: number;
  avg_confidence: number | null;
}

interface CurrentPriceFeedRow {
  id: number;
  feed_id: string;
  protocol: string;
  chain: string;
  symbol: string;
  base_asset: string;
  quote_asset: string;
  price: number;
  price_raw: string;
  decimals: number;
  timestamp: string;
  block_number: number | null;
  confidence: number | null;
  sources: number | null;
  is_stale: boolean | null;
  staleness_seconds: number | null;
  tx_hash: string | null;
  log_index: number | null;
  created_at: string;
}

interface PriceUpdateEventRow {
  id: number;
  feed_id: string;
  protocol: string;
  chain: string;
  symbol: string;
  previous_price: number | null;
  current_price: number;
  price_change: number | null;
  price_change_percent: number | null;
  timestamp: string;
  block_number: number | null;
  tx_hash: string | null;
  created_at: string;
}

export class UnifiedPriceService {
  async getPriceHistory(queryParams: PriceHistoryQuery): Promise<PriceHistoryRecord[]> {
    try {
      const tableName = this.getTableNameForInterval(queryParams.interval);
      const conditions: string[] = [];
      const values: (string | Date | number)[] = [];
      let paramIndex = 1;

      conditions.push(`timestamp >= $${paramIndex++}`);
      values.push(queryParams.startTime);
      conditions.push(`timestamp <= $${paramIndex++}`);
      values.push(queryParams.endTime);

      if (queryParams.symbol) {
        conditions.push(`symbol = $${paramIndex++}`);
        values.push(queryParams.symbol);
      }
      if (queryParams.protocol) {
        conditions.push(`protocol = $${paramIndex++}`);
        values.push(queryParams.protocol);
      }
      if (queryParams.chain) {
        conditions.push(`chain = $${paramIndex++}`);
        values.push(queryParams.chain);
      }
      if (queryParams.feedId) {
        conditions.push(`feed_id = $${paramIndex++}`);
        values.push(queryParams.feedId);
      }

      const orderBy = queryParams.orderBy || 'timestamp';
      const orderDirection = queryParams.orderDirection || 'desc';

      let sql = `SELECT * FROM ${tableName} WHERE ${conditions.join(' AND ')} ORDER BY ${orderBy} ${orderDirection}`;

      if (queryParams.limit) {
        sql += ` LIMIT $${paramIndex++}`;
        values.push(queryParams.limit);
      }
      if (queryParams.offset) {
        sql += ` OFFSET $${paramIndex++}`;
        values.push(queryParams.offset);
      }

      const result = await query<PriceHistoryRow>(sql, values);

      return result.rows.map(this.mapToPriceHistoryRecord);
    } catch (error) {
      logger.error(t('errors.failedToFetchPriceHistory'), {
        error: error instanceof Error ? error.message : String(error),
        query: queryParams,
      });
      throw error;
    }
  }

  async getOHLCVData(queryParams: PriceHistoryQuery): Promise<OHLCVData[]> {
    try {
      const tableName = this.getTableNameForInterval(queryParams.interval || '1min');
      const conditions: string[] = [];
      const values: (string | Date | number)[] = [];
      let paramIndex = 1;

      conditions.push(`timestamp >= $${paramIndex++}`);
      values.push(queryParams.startTime);
      conditions.push(`timestamp <= $${paramIndex++}`);
      values.push(queryParams.endTime);

      if (queryParams.symbol) {
        conditions.push(`symbol = $${paramIndex++}`);
        values.push(queryParams.symbol);
      }
      if (queryParams.protocol) {
        conditions.push(`protocol = $${paramIndex++}`);
        values.push(queryParams.protocol);
      }
      if (queryParams.chain) {
        conditions.push(`chain = $${paramIndex++}`);
        values.push(queryParams.chain);
      }
      if (queryParams.feedId) {
        conditions.push(`feed_id = $${paramIndex++}`);
        values.push(queryParams.feedId);
      }

      let sql = `SELECT * FROM ${tableName} WHERE ${conditions.join(' AND ')} ORDER BY timestamp ASC`;

      if (queryParams.limit) {
        sql += ` LIMIT $${paramIndex++}`;
        values.push(queryParams.limit);
      }

      const result = await query<OHLCVRow>(sql, values);

      return result.rows.map(this.mapToOHLCVData);
    } catch (error) {
      logger.error(t('errors.failedToFetchOhlcvData'), {
        error: error instanceof Error ? error.message : String(error),
        query: queryParams,
      });
      throw error;
    }
  }

  async getCurrentPrices(): Promise<CurrentPriceFeed[]> {
    try {
      const result = await query<CurrentPriceFeedRow>(`SELECT * FROM current_price_feeds`);

      return result.rows.map(this.mapToCurrentPriceFeed);
    } catch (error) {
      logger.error(t('errors.failedToFetchCurrentPrices'), {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async getCurrentPrice(feedId: string): Promise<CurrentPriceFeed | null> {
    try {
      const result = await query<CurrentPriceFeedRow>(
        `SELECT * FROM current_price_feeds WHERE feed_id = $1 LIMIT 1`,
        [feedId],
      );

      if (result.rows.length === 0) {
        return null;
      }

      return this.mapToCurrentPriceFeed(result.rows[0]!);
    } catch (error) {
      logger.error(t('errors.failedToFetchCurrentPrice'), {
        error: error instanceof Error ? error.message : String(error),
        feedId,
      });
      throw error;
    }
  }

  async getCurrentPricesByFeeds(feedIds: string[]): Promise<Map<string, CurrentPriceFeed>> {
    const results = new Map<string, CurrentPriceFeed>();

    try {
      const placeholders = feedIds.map((_, i) => `$${i + 1}`).join(', ');
      const result = await query<CurrentPriceFeedRow>(
        `SELECT * FROM current_price_feeds WHERE feed_id IN (${placeholders})`,
        feedIds,
      );

      result.rows.forEach((row) => {
        const record = this.mapToCurrentPriceFeed(row);
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
      const conditions: string[] = [];
      const values: (string | Date | number)[] = [];
      let paramIndex = 1;

      if (options.feedId) {
        conditions.push(`feed_id = $${paramIndex++}`);
        values.push(options.feedId);
      }
      if (options.protocol) {
        conditions.push(`protocol = $${paramIndex++}`);
        values.push(options.protocol);
      }
      if (options.chain) {
        conditions.push(`chain = $${paramIndex++}`);
        values.push(options.chain);
      }
      if (options.symbol) {
        conditions.push(`symbol = $${paramIndex++}`);
        values.push(options.symbol);
      }
      if (options.startTime) {
        conditions.push(`timestamp >= $${paramIndex++}`);
        values.push(options.startTime);
      }
      if (options.endTime) {
        conditions.push(`timestamp <= $${paramIndex++}`);
        values.push(options.endTime);
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      let sql = `SELECT * FROM price_update_events ${whereClause} ORDER BY timestamp DESC`;

      if (options.limit) {
        sql += ` LIMIT $${paramIndex++}`;
        values.push(options.limit);
      }
      if (options.offset) {
        sql += ` OFFSET $${paramIndex++}`;
        values.push(options.offset);
      }

      const result = await query<PriceUpdateEventRow>(sql, values);

      return result.rows.map(this.mapToPriceUpdateEvent);
    } catch (error) {
      logger.error(t('errors.failedToFetchPriceUpdateEvents'), {
        error: error instanceof Error ? error.message : String(error),
        options,
      });
      throw error;
    }
  }

  async getPriceStats(options: {
    symbol: string;
    protocol?: OracleProtocol;
    chain?: SupportedChain;
    startTime: Date;
    endTime: Date;
  }): Promise<PriceStats> {
    try {
      const conditions: string[] = ['symbol = $1', 'timestamp >= $2', 'timestamp <= $3'];
      const values: (string | Date)[] = [options.symbol, options.startTime, options.endTime];

      let paramIndex = 4;
      if (options.protocol) {
        conditions.push(`protocol = $${paramIndex++}`);
        values.push(options.protocol);
      }
      if (options.chain) {
        conditions.push(`chain = $${paramIndex++}`);
        values.push(options.chain);
      }

      const result = await query<{ price: number }>(
        `SELECT price FROM price_history WHERE ${conditions.join(' AND ')}`,
        values,
      );

      const prices = result.rows.map((d) => d.price);

      if (prices.length === 0) {
        throw new Error(t('errors.noPriceDataFound'));
      }

      const min = Math.min(...prices);
      const max = Math.max(...prices);
      const avg = prices.reduce((a, b) => a + b, 0) / prices.length;
      const first = prices[0] ?? 0;
      const last = prices[prices.length - 1] ?? 0;
      const change = last - first;
      const changePercent = first > 0 ? change / first : 0;

      const variance =
        prices.reduce((sum, price) => sum + Math.pow(price - avg, 2), 0) / prices.length;
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

  async insertPriceHistory(records: Omit<PriceHistoryRecord, 'id' | 'createdAt'>[]): Promise<void> {
    if (records.length === 0) return;

    try {
      const columns = [
        'feed_id',
        'protocol',
        'chain',
        'symbol',
        'base_asset',
        'quote_asset',
        'price',
        'price_raw',
        'decimals',
        'timestamp',
        'block_number',
        'confidence',
        'sources',
        'is_stale',
        'staleness_seconds',
        'tx_hash',
        'log_index',
        'volume_24h',
        'change_24h',
      ];

      const valueGroups: string[] = [];
      const allValues: (string | number | boolean | Date | null | undefined)[] = [];
      let paramIndex = 1;

      for (const record of records) {
        const placeholders: string[] = [];
        const values: (string | number | boolean | Date | null | undefined)[] = [
          record.feedId,
          record.protocol,
          record.chain,
          record.symbol,
          record.baseAsset,
          record.quoteAsset,
          record.price,
          record.priceRaw,
          record.decimals,
          record.timestamp,
          record.blockNumber ?? null,
          record.confidence ?? null,
          record.sources ?? null,
          record.isStale ?? null,
          record.stalenessSeconds ?? null,
          record.txHash ?? null,
          record.logIndex ?? null,
          record.volume24h ?? null,
          record.change24h ?? null,
        ];

        for (let i = 0; i < values.length; i++) {
          placeholders.push(`$${paramIndex++}`);
        }

        valueGroups.push(`(${placeholders.join(', ')})`);
        allValues.push(...values);
      }

      const sql = `
        INSERT INTO price_history (${columns.join(', ')})
        VALUES ${valueGroups.join(', ')}
      `;

      await query(sql, allValues);
    } catch (error) {
      logger.error(t('errors.failedToInsertPriceHistory'), {
        error: error instanceof Error ? error.message : String(error),
        recordCount: records.length,
      });
      throw error;
    }
  }

  async refreshMaterializedView(viewName: '1min' | '5min' | '1hour' | '1day'): Promise<void> {
    try {
      await query(`REFRESH MATERIALIZED VIEW price_history_${viewName}`);
      logger.info(t('oracle.priceService.refreshedMaterializedView', { viewName }));
    } catch (error) {
      logger.error(t('errors.failedToRefreshMaterializedView'), {
        error: error instanceof Error ? error.message : String(error),
        viewName,
      });
      throw error;
    }
  }

  async refreshAllMaterializedViews(): Promise<void> {
    const views: Array<'1min' | '5min' | '1hour' | '1day'> = ['1min', '5min', '1hour', '1day'];

    for (const view of views) {
      await this.refreshMaterializedView(view);
    }
  }

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

  private mapToPriceHistoryRecord(data: PriceHistoryRow): PriceHistoryRecord {
    return {
      id: data.id,
      feedId: data.feed_id,
      protocol: data.protocol as OracleProtocol,
      chain: data.chain as SupportedChain,
      symbol: data.symbol,
      baseAsset: data.base_asset,
      quoteAsset: data.quote_asset,
      price: data.price,
      priceRaw: data.price_raw,
      decimals: data.decimals,
      timestamp: new Date(data.timestamp),
      blockNumber: data.block_number ?? undefined,
      confidence: data.confidence ?? undefined,
      sources: data.sources ?? undefined,
      isStale: data.is_stale ?? undefined,
      stalenessSeconds: data.staleness_seconds ?? undefined,
      txHash: data.tx_hash ?? undefined,
      logIndex: data.log_index ?? undefined,
      volume24h: data.volume_24h ?? undefined,
      change24h: data.change_24h ?? undefined,
      createdAt: new Date(data.created_at),
    };
  }

  private mapToCurrentPriceFeed(data: CurrentPriceFeedRow): CurrentPriceFeed {
    return {
      id: data.id,
      feedId: data.feed_id,
      protocol: data.protocol as OracleProtocol,
      chain: data.chain as SupportedChain,
      symbol: data.symbol,
      baseAsset: data.base_asset,
      quoteAsset: data.quote_asset,
      price: data.price,
      priceRaw: data.price_raw,
      decimals: data.decimals,
      timestamp: new Date(data.timestamp),
      blockNumber: data.block_number ?? undefined,
      confidence: data.confidence ?? undefined,
      sources: data.sources ?? undefined,
      isStale: data.is_stale ?? undefined,
      stalenessSeconds: data.staleness_seconds ?? undefined,
      txHash: data.tx_hash ?? undefined,
      logIndex: data.log_index ?? undefined,
      createdAt: new Date(data.created_at),
    };
  }

  private mapToOHLCVData(data: OHLCVRow): OHLCVData {
    return {
      timestamp: new Date(data.timestamp),
      open: data.price_open,
      high: data.price_high,
      low: data.price_low,
      close: data.price_close,
      volume: data.volume ?? undefined,
      sampleCount: data.sample_count,
      avgConfidence: data.avg_confidence ?? undefined,
    };
  }

  private mapToPriceUpdateEvent(data: PriceUpdateEventRow): PriceUpdateEvent {
    return {
      id: data.id,
      feedId: data.feed_id,
      protocol: data.protocol as OracleProtocol,
      chain: data.chain as SupportedChain,
      symbol: data.symbol,
      previousPrice: data.previous_price ?? undefined,
      currentPrice: data.current_price,
      priceChange: data.price_change ?? undefined,
      priceChangePercent: data.price_change_percent ?? undefined,
      timestamp: new Date(data.timestamp),
      blockNumber: data.block_number ?? undefined,
      txHash: data.tx_hash ?? undefined,
      createdAt: new Date(data.created_at),
    };
  }
}

export const unifiedPriceService = new UnifiedPriceService();
