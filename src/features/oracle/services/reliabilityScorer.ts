import { query, hasDatabase } from '@/lib/database/db';
import { getTimePeriodDates } from '@/lib/database/reliabilityTables';
import type {
  InsertReliabilityScoreParams,
  ReliabilityScoreRecord,
  TimePeriod,
} from '@/types/oracle/reliability';

export interface ReliabilityMetrics {
  protocol: string;
  symbol: string | null;
  chain: string | null;
  periodStart: Date;
  periodEnd: Date;
  score: number;
  accuracyScore: number;
  latencyScore: number;
  availabilityScore: number;
  deviationAvg: number;
  deviationMax: number;
  deviationMin: number;
  latencyAvgMs: number;
  successCount: number;
  totalCount: number;
  sampleCount: number;
}

export interface ProtocolRanking {
  protocol: string;
  score: number;
  rank: number;
  metrics: ReliabilityMetrics;
}

export function calculateAccuracyScore(avgDeviation: number): number {
  const score = 100 - avgDeviation * 1000;
  return Math.max(0, Math.min(100, score));
}

export function calculateLatencyScore(avgLatencyMs: number): number {
  const score = 100 - Math.min(avgLatencyMs / 10, 100);
  return Math.max(0, Math.min(100, score));
}

export function calculateAvailabilityScore(successCount: number, totalCount: number): number {
  if (totalCount === 0) return 0;
  return (successCount / totalCount) * 100;
}

export function calculateOverallScore(
  accuracyScore: number,
  latencyScore: number,
  availabilityScore: number,
): number {
  return accuracyScore * 0.5 + latencyScore * 0.3 + availabilityScore * 0.2;
}

export async function calculateReliabilityMetrics(
  protocol: string,
  symbol: string | null,
  chain: string | null,
  periodStart: Date,
  periodEnd: Date,
): Promise<ReliabilityMetrics | null> {
  if (!hasDatabase()) {
    return null;
  }

  const conditions: string[] = ['protocol = $1', 'timestamp >= $2', 'timestamp <= $3'];
  const params: (string | Date | null)[] = [protocol, periodStart, periodEnd];
  let paramIndex = 4;

  if (symbol) {
    conditions.push(`symbol = $${paramIndex}`);
    params.push(symbol);
    paramIndex++;
  }

  if (chain) {
    conditions.push(`chain = $${paramIndex}`);
    params.push(chain);
    paramIndex++;
  }

  const result = await query<{
    deviation_avg: string | null;
    deviation_max: string | null;
    deviation_min: string | null;
    latency_avg_ms: string | null;
    success_count: string;
    total_count: string;
  }>(
    `SELECT 
      AVG(deviation) as deviation_avg,
      MAX(deviation) as deviation_max,
      MIN(deviation) as deviation_min,
      AVG(latency_ms) as latency_avg_ms,
      COUNT(*) FILTER (WHERE deviation IS NOT NULL) as success_count,
      COUNT(*) as total_count
    FROM price_history
    WHERE ${conditions.join(' AND ')}`,
    params,
  );

  const row = result.rows[0];
  if (!row || Number(row.total_count) === 0) {
    return null;
  }

  const deviationAvg = row.deviation_avg ? parseFloat(row.deviation_avg) : 0;
  const deviationMax = row.deviation_max ? parseFloat(row.deviation_max) : 0;
  const deviationMin = row.deviation_min ? parseFloat(row.deviation_min) : 0;
  const latencyAvgMs = row.latency_avg_ms ? parseFloat(row.latency_avg_ms) : 0;
  const successCount = parseInt(row.success_count, 10);
  const totalCount = parseInt(row.total_count, 10);

  const accuracyScore = calculateAccuracyScore(deviationAvg);
  const latencyScore = calculateLatencyScore(latencyAvgMs);
  const availabilityScore = calculateAvailabilityScore(successCount, totalCount);
  const overallScore = calculateOverallScore(accuracyScore, latencyScore, availabilityScore);

  return {
    protocol,
    symbol,
    chain,
    periodStart,
    periodEnd,
    score: Math.round(overallScore * 100) / 100,
    accuracyScore: Math.round(accuracyScore * 100) / 100,
    latencyScore: Math.round(latencyScore * 100) / 100,
    availabilityScore: Math.round(availabilityScore * 100) / 100,
    deviationAvg,
    deviationMax,
    deviationMin,
    latencyAvgMs,
    successCount,
    totalCount,
    sampleCount: totalCount,
  };
}

export async function insertReliabilityScore(
  params: InsertReliabilityScoreParams,
): Promise<number> {
  if (!hasDatabase()) {
    throw new Error('Database not available');
  }

  const result = await query<{ id: number }>(
    `INSERT INTO oracle_reliability_scores (
      protocol, symbol, chain, score, accuracy_score, latency_score, availability_score,
      deviation_avg, deviation_max, deviation_min, latency_avg_ms,
      success_count, total_count, sample_count, period_start, period_end
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
    ON CONFLICT (protocol, symbol, chain, period_start, period_end) 
    DO UPDATE SET
      score = EXCLUDED.score,
      accuracy_score = EXCLUDED.accuracy_score,
      latency_score = EXCLUDED.latency_score,
      availability_score = EXCLUDED.availability_score,
      deviation_avg = EXCLUDED.deviation_avg,
      deviation_max = EXCLUDED.deviation_max,
      deviation_min = EXCLUDED.deviation_min,
      latency_avg_ms = EXCLUDED.latency_avg_ms,
      success_count = EXCLUDED.success_count,
      total_count = EXCLUDED.total_count,
      sample_count = EXCLUDED.sample_count,
      calculated_at = NOW()
    RETURNING id`,
    [
      params.protocol,
      params.symbol ?? null,
      params.chain ?? null,
      params.score,
      params.accuracy_score ?? null,
      params.latency_score ?? null,
      params.availability_score ?? null,
      params.deviation_avg ?? null,
      params.deviation_max ?? null,
      params.deviation_min ?? null,
      params.latency_avg_ms ?? null,
      params.success_count ?? null,
      params.total_count ?? null,
      params.sample_count ?? null,
      params.period_start,
      params.period_end,
    ],
  );

  return result.rows[0]!.id;
}

export async function calculateAndStoreReliabilityScores(
  period: TimePeriod = '30d',
  protocols: string[] = ['chainlink', 'pyth', 'redstone'],
): Promise<ReliabilityMetrics[]> {
  const { start, end } = getTimePeriodDates(period);
  const results: ReliabilityMetrics[] = [];

  for (const protocol of protocols) {
    const metrics = await calculateReliabilityMetrics(protocol, null, null, start, end);
    if (metrics) {
      await insertReliabilityScore({
        protocol: metrics.protocol,
        symbol: metrics.symbol ?? undefined,
        chain: metrics.chain ?? undefined,
        score: metrics.score,
        accuracy_score: metrics.accuracyScore,
        latency_score: metrics.latencyScore,
        availability_score: metrics.availabilityScore,
        deviation_avg: metrics.deviationAvg,
        deviation_max: metrics.deviationMax,
        deviation_min: metrics.deviationMin,
        latency_avg_ms: metrics.latencyAvgMs,
        success_count: metrics.successCount,
        total_count: metrics.totalCount,
        sample_count: metrics.sampleCount,
        period_start: metrics.periodStart,
        period_end: metrics.periodEnd,
      });
      results.push(metrics);
    }
  }

  return results;
}

export async function getReliabilityScores(
  period: TimePeriod = '30d',
  protocol?: string,
): Promise<ReliabilityScoreRecord[]> {
  if (!hasDatabase()) {
    return [];
  }

  const { start, end } = getTimePeriodDates(period);

  if (protocol) {
    const result = await query<ReliabilityScoreRecord>(
      `SELECT * FROM oracle_reliability_scores
       WHERE protocol = $1 AND period_start >= $2 AND period_end <= $3
       ORDER BY score DESC`,
      [protocol, start, end],
    );
    return result.rows;
  }

  const result = await query<ReliabilityScoreRecord>(
    `SELECT DISTINCT ON (protocol) *
     FROM oracle_reliability_scores
     WHERE period_start >= $1 AND period_end <= $2
     ORDER BY protocol, calculated_at DESC`,
    [start, end],
  );
  return result.rows;
}

export async function getProtocolRankings(period: TimePeriod = '30d'): Promise<ProtocolRanking[]> {
  const scores = await getReliabilityScores(period);

  const sortedScores = [...scores].sort((a, b) => b.score - a.score);

  return sortedScores.map((score, index) => ({
    protocol: score.protocol,
    score: score.score,
    rank: index + 1,
    metrics: {
      protocol: score.protocol,
      symbol: score.symbol,
      chain: score.chain,
      periodStart: score.period_start,
      periodEnd: score.period_end,
      score: score.score,
      accuracyScore: score.accuracy_score ?? 0,
      latencyScore: score.latency_score ?? 0,
      availabilityScore: score.availability_score ?? 0,
      deviationAvg: score.deviation_avg ?? 0,
      deviationMax: score.deviation_max ?? 0,
      deviationMin: score.deviation_min ?? 0,
      latencyAvgMs: score.latency_avg_ms ?? 0,
      successCount: score.success_count ?? 0,
      totalCount: score.total_count ?? 0,
      sampleCount: score.sample_count ?? 0,
    },
  }));
}

export async function getReliabilityTrend(
  protocol: string,
  days: number = 30,
): Promise<Array<{ date: Date; score: number }>> {
  if (!hasDatabase()) {
    return [];
  }

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const result = await query<{ calculated_at: Date; score: string }>(
    `SELECT calculated_at, score
     FROM oracle_reliability_scores
     WHERE protocol = $1 AND calculated_at >= $2
     ORDER BY calculated_at ASC`,
    [protocol, startDate],
  );

  return result.rows.map((row) => ({
    date: row.calculated_at,
    score: parseFloat(row.score),
  }));
}
