/**
 * AI-Powered Anomaly Detection Service
 * Uses machine learning algorithms to detect price anomalies
 */

import { logger } from '@/lib/logger';
import { calculateMean, calculateStdDev } from '@/lib/utils/math';
import { query } from '@/server/db';

export interface AnomalyConfig {
  // Z-score threshold for statistical anomalies
  zScoreThreshold: number;
  // Minimum number of data points required for detection
  minDataPoints: number;
  // Lookback window in milliseconds
  lookbackWindowMs: number;
  // Whether to use seasonal decomposition
  useSeasonalDecomposition: boolean;
  // Seasonal period in data points (e.g., 24 for hourly data with daily seasonality)
  seasonalPeriod: number;
}

export interface PriceDataPoint {
  timestamp: number;
  price: number;
  symbol: string;
  protocol: string;
}

export interface AnomalyResult {
  isAnomaly: boolean;
  symbol: string;
  timestamp: number;
  currentPrice: number;
  expectedPrice: number;
  deviation: number;
  confidence: number;
  type: 'statistical' | 'seasonal' | 'multi_protocol' | 'trend_break';
  severity: 'low' | 'medium' | 'high' | 'critical';
  details: Record<string, unknown>;
}

export interface MultiProtocolData {
  protocol: string;
  price: number;
  timestamp: number;
  confidence?: number;
}

const DEFAULT_CONFIG: AnomalyConfig = {
  zScoreThreshold: 3,
  minDataPoints: 30,
  lookbackWindowMs: 24 * 60 * 60 * 1000, // 24 hours
  useSeasonalDecomposition: true,
  seasonalPeriod: 24, // Assuming hourly data
};

export class AnomalyDetectionService {
  private config: AnomalyConfig;

  constructor(config: Partial<AnomalyConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Detect anomalies for a specific symbol
   */
  async detectAnomalies(symbol: string): Promise<AnomalyResult[]> {
    try {
      // Fetch historical price data
      const historicalData = await this.fetchHistoricalData(symbol);

      if (historicalData.length < this.config.minDataPoints) {
        logger.warn(`Insufficient data for anomaly detection: ${symbol}`, {
          dataPoints: historicalData.length,
          required: this.config.minDataPoints,
        });
        return [];
      }

      const anomalies: AnomalyResult[] = [];

      // Statistical anomaly detection (Z-score)
      const statisticalAnomalies = this.detectStatisticalAnomalies(symbol, historicalData);
      anomalies.push(...statisticalAnomalies);

      // Seasonal anomaly detection
      if (this.config.useSeasonalDecomposition) {
        const seasonalAnomalies = this.detectSeasonalAnomalies(symbol, historicalData);
        anomalies.push(...seasonalAnomalies);
      }

      // Trend break detection
      const trendBreaks = this.detectTrendBreaks(symbol, historicalData);
      anomalies.push(...trendBreaks);

      return anomalies;
    } catch (error) {
      logger.error(`Failed to detect anomalies for ${symbol}`, {
        error: error instanceof Error ? error.message : String(error),
      });
      return [];
    }
  }

  /**
   * Detect cross-protocol price anomalies
   */
  async detectCrossProtocolAnomalies(symbol: string): Promise<AnomalyResult[]> {
    try {
      const protocolData = await this.fetchMultiProtocolData(symbol);

      if (protocolData.length < 2) {
        return [];
      }

      const anomalies: AnomalyResult[] = [];
      const prices = protocolData.map((p) => p.price);
      const mean = calculateMean(prices);
      const stdDev = calculateStdDev(prices, mean);

      for (const data of protocolData) {
        const zScore = Math.abs((data.price - mean) / stdDev);

        if (zScore > this.config.zScoreThreshold) {
          const deviation = Math.abs((data.price - mean) / mean);

          anomalies.push({
            isAnomaly: true,
            symbol,
            timestamp: data.timestamp,
            currentPrice: data.price,
            expectedPrice: mean,
            deviation,
            confidence: Math.min(zScore / (this.config.zScoreThreshold * 2), 1),
            type: 'multi_protocol',
            severity: this.calculateSeverity(deviation),
            details: {
              protocol: data.protocol,
              zScore,
              protocolCount: protocolData.length,
              otherProtocols: protocolData
                .filter((p) => p.protocol !== data.protocol)
                .map((p) => ({ protocol: p.protocol, price: p.price })),
            },
          });
        }
      }

      return anomalies;
    } catch (error) {
      logger.error(`Failed to detect cross-protocol anomalies for ${symbol}`, {
        error: error instanceof Error ? error.message : String(error),
      });
      return [];
    }
  }

  /**
   * Detect statistical anomalies using Z-score
   */
  private detectStatisticalAnomalies(symbol: string, data: PriceDataPoint[]): AnomalyResult[] {
    const anomalies: AnomalyResult[] = [];
    const prices = data.map((d) => d.price);
    const mean = calculateMean(prices);
    const stdDev = calculateStdDev(prices, mean);

    // Check the most recent data point
    const latest = data[data.length - 1];
    if (!latest) return anomalies;

    const zScore = Math.abs((latest.price - mean) / stdDev);

    if (zScore > this.config.zScoreThreshold) {
      const deviation = Math.abs((latest.price - mean) / mean);

      anomalies.push({
        isAnomaly: true,
        symbol,
        timestamp: latest.timestamp,
        currentPrice: latest.price,
        expectedPrice: mean,
        deviation,
        confidence: Math.min(zScore / (this.config.zScoreThreshold * 2), 1),
        type: 'statistical',
        severity: this.calculateSeverity(deviation),
        details: {
          zScore,
          mean,
          stdDev,
          dataPoints: data.length,
        },
      });
    }

    return anomalies;
  }

  /**
   * Detect seasonal anomalies using decomposition
   */
  private detectSeasonalAnomalies(symbol: string, data: PriceDataPoint[]): AnomalyResult[] {
    const anomalies: AnomalyResult[] = [];

    if (data.length < this.config.seasonalPeriod * 2) {
      return anomalies;
    }

    const prices = data.map((d) => d.price);

    // Simple moving average as trend
    const trend = this.calculateMovingAverage(prices, this.config.seasonalPeriod);

    // Detrended series
    const detrended = prices.map((p, i) => p - (trend[i] ?? p));

    // Calculate seasonal component
    const seasonal = this.calculateSeasonalComponent(detrended);

    // Residuals
    const residuals = detrended.map((d, i) => d - (seasonal[i % this.config.seasonalPeriod] ?? 0));

    // Detect anomalies in residuals
    const residualMean = calculateMean(residuals);
    const residualStdDev = calculateStdDev(residuals, residualMean);

    const latestIndex = residuals.length - 1;
    const latestResidual = residuals[latestIndex];
    if (latestResidual === undefined) return anomalies;

    const zScore = Math.abs((latestResidual - residualMean) / residualStdDev);

    if (zScore > this.config.zScoreThreshold) {
      const latest = data[data.length - 1];
      if (!latest) return anomalies;

      const trendValue = trend[latestIndex];
      const seasonalValue = seasonal[latestIndex % this.config.seasonalPeriod];
      if (trendValue === undefined || seasonalValue === undefined) return anomalies;

      const expectedPrice = trendValue + seasonalValue;
      const deviation = Math.abs((latest.price - expectedPrice) / expectedPrice);

      anomalies.push({
        isAnomaly: true,
        symbol,
        timestamp: latest.timestamp,
        currentPrice: latest.price,
        expectedPrice,
        deviation,
        confidence: Math.min(zScore / (this.config.zScoreThreshold * 2), 1),
        type: 'seasonal',
        severity: this.calculateSeverity(deviation),
        details: {
          zScore,
          trend: trendValue,
          seasonal: seasonalValue,
          residual: latestResidual,
        },
      });
    }

    return anomalies;
  }

  /**
   * Detect trend breaks using change point detection
   */
  private detectTrendBreaks(symbol: string, data: PriceDataPoint[]): AnomalyResult[] {
    const anomalies: AnomalyResult[] = [];
    const prices = data.map((d) => d.price);

    // Split data into two windows
    const midPoint = Math.floor(prices.length / 2);
    const firstHalf = prices.slice(0, midPoint);
    const secondHalf = prices.slice(midPoint);

    const firstMean = calculateMean(firstHalf);
    const secondMean = calculateMean(secondHalf);

    const firstStdDev = calculateStdDev(firstHalf, firstMean);
    const secondStdDev = calculateStdDev(secondHalf, secondMean);

    // Check for significant change in mean
    const meanChange = Math.abs(secondMean - firstMean) / firstMean;
    const pooledStdDev = Math.sqrt((firstStdDev ** 2 + secondStdDev ** 2) / 2);
    const zScore = Math.abs(secondMean - firstMean) / (pooledStdDev / Math.sqrt(midPoint));

    if (zScore > this.config.zScoreThreshold && meanChange > 0.05) {
      const latest = data[data.length - 1];
      if (!latest) return anomalies;

      anomalies.push({
        isAnomaly: true,
        symbol,
        timestamp: latest.timestamp,
        currentPrice: latest.price,
        expectedPrice: firstMean,
        deviation: meanChange,
        confidence: Math.min(zScore / (this.config.zScoreThreshold * 2), 1),
        type: 'trend_break',
        severity: this.calculateSeverity(meanChange),
        details: {
          previousMean: firstMean,
          currentMean: secondMean,
          zScore,
          // 使用小数形式存储 (0.01 = 1%)
          changePercent: meanChange,
        },
      });
    }

    return anomalies;
  }

  /**
   * Fetch historical price data from database
   */
  private async fetchHistoricalData(symbol: string): Promise<PriceDataPoint[]> {
    const result = await query(
      `SELECT 
        timestamp,
        price,
        symbol,
        protocol
      FROM unified_price_feeds
      WHERE symbol = $1
        AND timestamp > NOW() - INTERVAL '24 hours'
      ORDER BY timestamp ASC`,
      [symbol],
    );

    return result.rows.map((row) => ({
      timestamp: new Date(row.timestamp).getTime(),
      price: parseFloat(row.price),
      symbol: row.symbol,
      protocol: row.protocol,
    }));
  }

  /**
   * Fetch multi-protocol data for cross-protocol analysis
   */
  private async fetchMultiProtocolData(symbol: string): Promise<MultiProtocolData[]> {
    const result = await query(
      `SELECT DISTINCT ON (protocol)
        protocol,
        price,
        timestamp,
        confidence
      FROM unified_price_feeds
      WHERE symbol = $1
      ORDER BY protocol, timestamp DESC`,
      [symbol],
    );

    return result.rows.map((row) => ({
      protocol: row.protocol,
      price: parseFloat(row.price),
      timestamp: new Date(row.timestamp).getTime(),
      confidence: row.confidence ? parseFloat(row.confidence) : undefined,
    }));
  }

  /**
   * Calculate moving average
   */
  private calculateMovingAverage(values: number[], period: number): number[] {
    const result: number[] = [];

    for (let i = 0; i < values.length; i++) {
      if (i < period - 1) {
        result.push(values[i] ?? 0);
        continue;
      }

      const sum = values.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
      result.push(sum / period);
    }

    return result;
  }

  /**
   * Calculate seasonal component
   */
  private calculateSeasonalComponent(detrended: number[]): number[] {
    const seasonal: number[] = new Array(this.config.seasonalPeriod).fill(0);
    const counts: number[] = new Array(this.config.seasonalPeriod).fill(0);

    for (let i = 0; i < detrended.length; i++) {
      const periodIndex = i % this.config.seasonalPeriod;
      const currentSeasonal = seasonal[periodIndex];
      const currentCount = counts[periodIndex];
      const detrendedValue = detrended[i];

      if (
        currentSeasonal !== undefined &&
        currentCount !== undefined &&
        detrendedValue !== undefined
      ) {
        seasonal[periodIndex] = currentSeasonal + detrendedValue;
        counts[periodIndex] = currentCount + 1;
      }
    }

    return seasonal.map((sum, i) => {
      const count = counts[i];
      return count && count > 0 ? (sum ?? 0) / count : 0;
    });
  }

  /**
   * Calculate severity based on deviation
   */
  private calculateSeverity(deviation: number): 'low' | 'medium' | 'high' | 'critical' {
    if (deviation > 0.5) return 'critical';
    if (deviation > 0.2) return 'high';
    if (deviation > 0.1) return 'medium';
    return 'low';
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<AnomalyConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  getConfig(): AnomalyConfig {
    return { ...this.config };
  }
}

// Export singleton instance
export const anomalyDetectionService = new AnomalyDetectionService();
