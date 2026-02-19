import { fetchCurrentPrice } from '@/features/oracle/services/priceFetcher';
import { query, hasDatabase } from '@/lib/database/db';
import type {
  InsertPriceHistoryParams,
  PriceHistoryRecord,
} from '@/lib/database/priceHistoryTables';

export const SUPPORTED_PROTOCOLS = ['chainlink', 'pyth', 'redstone'] as const;
export type SupportedProtocol = (typeof SUPPORTED_PROTOCOLS)[number];

export const DEFAULT_SYMBOLS = ['BTC/USD', 'ETH/USD', 'SOL/USD', 'AVAX/USD', 'MATIC/USD'] as const;

export interface PriceCollectionResult {
  protocol: string;
  symbol: string;
  chain: string | null;
  price: number;
  sourcePrice: number | null;
  deviation: number | null;
  latencyMs: number;
  success: boolean;
  error?: string;
}

export interface CollectionSummary {
  totalAttempted: number;
  successful: number;
  failed: number;
  duration: number;
  results: PriceCollectionResult[];
}

export async function insertPriceHistory(params: InsertPriceHistoryParams): Promise<number> {
  if (!hasDatabase()) {
    throw new Error('Database not available');
  }

  const result = await query<{ id: number }>(
    `INSERT INTO price_history (
      protocol, symbol, chain, price, confidence, source_price, deviation, latency_ms, timestamp
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    RETURNING id`,
    [
      params.protocol,
      params.symbol,
      params.chain ?? null,
      params.price,
      params.confidence ?? null,
      params.source_price ?? null,
      params.deviation ?? null,
      params.latency_ms ?? null,
      params.timestamp,
    ],
  );

  return result.rows[0]!.id;
}

export async function batchInsertPriceHistory(
  records: InsertPriceHistoryParams[],
): Promise<number[]> {
  if (!hasDatabase()) {
    throw new Error('Database not available');
  }

  if (records.length === 0) return [];

  const ids: number[] = [];
  const client = await (await import('@/lib/database/db')).getClient();

  try {
    await client.query('BEGIN');

    for (const params of records) {
      const result = await client.query<{ id: number }>(
        `INSERT INTO price_history (
          protocol, symbol, chain, price, confidence, source_price, deviation, latency_ms, timestamp
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING id`,
        [
          params.protocol,
          params.symbol,
          params.chain ?? null,
          params.price,
          params.confidence ?? null,
          params.source_price ?? null,
          params.deviation ?? null,
          params.latency_ms ?? null,
          params.timestamp,
        ],
      );
      ids.push(result.rows[0]!.id);
    }

    await client.query('COMMIT');
    return ids;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function collectPricesForProtocol(
  protocol: SupportedProtocol,
  symbols: readonly string[] = DEFAULT_SYMBOLS,
): Promise<PriceCollectionResult[]> {
  const results: PriceCollectionResult[] = [];
  const timestamp = new Date();

  for (const symbolPair of symbols) {
    const symbol = symbolPair.replace('/USD', '');
    const startTime = Date.now();

    try {
      const { referencePrice, oraclePrice } = await fetchCurrentPrice(symbol);
      const latencyMs = Date.now() - startTime;

      const deviation =
        referencePrice > 0 ? Math.abs(oraclePrice - referencePrice) / referencePrice : null;

      const result: PriceCollectionResult = {
        protocol,
        symbol: symbolPair,
        chain: null,
        price: oraclePrice,
        sourcePrice: referencePrice,
        deviation,
        latencyMs,
        success: true,
      };

      results.push(result);

      if (hasDatabase()) {
        await insertPriceHistory({
          protocol,
          symbol: symbolPair,
          price: oraclePrice,
          source_price: referencePrice,
          deviation: deviation ?? undefined,
          latency_ms: latencyMs,
          timestamp,
        });
      }
    } catch (error) {
      const latencyMs = Date.now() - startTime;
      results.push({
        protocol,
        symbol: symbolPair,
        chain: null,
        price: 0,
        sourcePrice: null,
        deviation: null,
        latencyMs,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  return results;
}

export async function collectAllPrices(
  symbols: readonly string[] = DEFAULT_SYMBOLS,
): Promise<CollectionSummary> {
  const startTime = Date.now();
  const allResults: PriceCollectionResult[] = [];

  for (const protocol of SUPPORTED_PROTOCOLS) {
    const protocolResults = await collectPricesForProtocol(protocol, symbols);
    allResults.push(...protocolResults);
  }

  const duration = Date.now() - startTime;

  return {
    totalAttempted: allResults.length,
    successful: allResults.filter((r) => r.success).length,
    failed: allResults.filter((r) => !r.success).length,
    duration,
    results: allResults,
  };
}

export async function getPriceHistory(
  protocol: string,
  symbol: string,
  options?: {
    startTime?: Date;
    endTime?: Date;
    limit?: number;
  },
): Promise<PriceHistoryRecord[]> {
  if (!hasDatabase()) {
    return [];
  }

  const { startTime, endTime, limit = 1000 } = options ?? {};
  const conditions: string[] = ['protocol = $1', 'symbol = $2'];
  const params: (string | number | Date)[] = [protocol, symbol];
  let paramIndex = 3;

  if (startTime) {
    conditions.push(`timestamp >= $${paramIndex}`);
    params.push(startTime);
    paramIndex++;
  }

  if (endTime) {
    conditions.push(`timestamp <= $${paramIndex}`);
    params.push(endTime);
    paramIndex++;
  }

  params.push(limit);

  const result = await query<PriceHistoryRecord>(
    `SELECT * FROM price_history
     WHERE ${conditions.join(' AND ')}
     ORDER BY timestamp DESC
     LIMIT $${paramIndex}`,
    params,
  );

  return result.rows;
}

export async function getLatestPrices(
  protocol?: string,
  symbol?: string,
): Promise<PriceHistoryRecord[]> {
  if (!hasDatabase()) {
    return [];
  }

  if (protocol && symbol) {
    const result = await query<PriceHistoryRecord>(
      `SELECT DISTINCT ON (protocol, symbol) *
       FROM price_history
       WHERE protocol = $1 AND symbol = $2
       ORDER BY protocol, symbol, timestamp DESC
       LIMIT 1`,
      [protocol, symbol],
    );
    return result.rows;
  }

  if (protocol) {
    const result = await query<PriceHistoryRecord>(
      `SELECT DISTINCT ON (symbol) *
       FROM price_history
       WHERE protocol = $1
       ORDER BY symbol, timestamp DESC`,
      [protocol],
    );
    return result.rows;
  }

  const result = await query<PriceHistoryRecord>(
    `SELECT DISTINCT ON (protocol, symbol) *
     FROM price_history
     ORDER BY protocol, symbol, timestamp DESC`,
  );
  return result.rows;
}

export async function cleanupOldPriceHistory(retentionDays: number = 90): Promise<number> {
  if (!hasDatabase()) {
    return 0;
  }

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

  const result = await query('DELETE FROM price_history WHERE timestamp < $1', [cutoffDate]);

  return result.rowCount ?? 0;
}
