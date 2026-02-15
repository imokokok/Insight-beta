import { v4 as uuidv4 } from 'uuid';

import { query } from '@/lib/database/db';
import { logger } from '@/shared/logger';
import type {
  CrossChainAnalysisConfig,
  CrossChainComparisonResult,
  CrossChainDashboardData,
  CrossChainDeviationAlert,
  CrossChainHistoricalAnalysis,
  CrossChainPriceData,
} from '@/types/crossChainAnalysisTypes';
import type { OracleProtocol, SupportedChain } from '@/types/unifiedOracleTypes';

interface PriceFeedRow {
  chain: string;
  protocol: string;
  symbol: string;
  price: string | number;
  price_raw: string;
  decimals: number;
  timestamp: string;
  confidence: number | null;
  block_number: number | null;
  tx_hash: string | null;
  staleness_seconds: number | null;
}

interface CrossOracleComparisonRow {
  timestamp: string;
  avg_price: string | number;
  median_price: string | number;
  max_deviation: string | number;
  max_deviation_chains: string | null;
  price_range_percent: string | number;
}

export class CrossChainAnalysisService {
  private config: CrossChainAnalysisConfig;

  constructor(config?: Partial<CrossChainAnalysisConfig>) {
    this.config = {
      enabled: config?.enabled ?? true,
      symbols: config?.symbols ?? ['BTC', 'ETH', 'SOL'],
      chains: config?.chains ?? ['ethereum', 'bsc', 'polygon', 'avalanche', 'arbitrum'],
      protocols: config?.protocols ?? ['chainlink', 'pyth'],
      deviationThreshold: config?.deviationThreshold ?? 0.5,
      criticalDeviationThreshold: config?.criticalDeviationThreshold ?? 2.0,
      analysisIntervalMs: config?.analysisIntervalMs ?? 60000,
      alertEnabled: config?.alertEnabled ?? true,
      alertChannels: config?.alertChannels ?? ['webhook'],
    };
  }

  private isStaleData(timestamp: Date, maxAgeMinutes: number = 5): boolean {
    const now = new Date();
    const ageMinutes = (now.getTime() - new Date(timestamp).getTime()) / (1000 * 60);
    return ageMinutes > maxAgeMinutes;
  }

  async getCurrentPricesByChain(
    symbol: string,
    chains?: SupportedChain[],
    protocols?: OracleProtocol[],
  ): Promise<CrossChainPriceData[]> {
    try {
      const targetChains = chains ?? this.config.chains;
      const targetProtocols = protocols ?? this.config.protocols;

      const placeholders = targetChains.map((_, i) => `$${i + 3}`).join(', ');
      const protocolPlaceholders = targetProtocols
        .map((_, i) => `$${targetChains.length + 3 + i}`)
        .join(', ');

      const sql = `
        SELECT DISTINCT ON (chain, protocol) 
          chain, protocol, symbol, price, price_raw, decimals, timestamp, 
          confidence, block_number, tx_hash, staleness_seconds
        FROM unified_price_feeds
        WHERE symbol = $1 
          AND chain IN (${placeholders})
          AND protocol IN (${protocolPlaceholders})
        ORDER BY chain, protocol, timestamp DESC
      `;

      const params = [symbol.toUpperCase(), ...targetChains, ...targetProtocols];

      const result = await query<PriceFeedRow>(sql, params);

      const chainProtocolMap = new Map<string, CrossChainPriceData>();

      for (const row of result.rows) {
        const chain = row.chain as SupportedChain;
        const protocol = row.protocol as OracleProtocol;
        const key = `${chain}-${protocol}`;
        const timestamp = new Date(row.timestamp);
        const isStale = this.isStaleData(timestamp);

        const existing = chainProtocolMap.get(key);

        if (!existing || timestamp > new Date(existing.timestamp)) {
          chainProtocolMap.set(key, {
            chain,
            protocol,
            symbol: row.symbol,
            price: parseFloat(String(row.price)),
            priceRaw: row.price_raw,
            decimals: row.decimals,
            timestamp,
            confidence: row.confidence ?? undefined,
            blockNumber: row.block_number ?? undefined,
            txHash: row.tx_hash ?? undefined,
            isStale,
            stalenessSeconds: row.staleness_seconds ?? undefined,
          });
        }
      }

      const priceData = Array.from(chainProtocolMap.values());

      logger.info('Fetched cross-chain prices', {
        symbol,
        chains: targetChains,
        pricesCount: priceData.length,
        staleCount: priceData.filter((p) => p.isStale).length,
      });

      return priceData;
    } catch (error) {
      logger.error('Error fetching cross-chain prices', {
        error: error instanceof Error ? error.message : String(error),
        symbol,
      });
      throw error;
    }
  }

  async getLatestPriceByChain(
    symbol: string,
    chain: SupportedChain,
  ): Promise<CrossChainPriceData | null> {
    try {
      const prices = await this.getCurrentPricesByChain(symbol, [chain]);
      return prices[0] || null;
    } catch (error) {
      logger.error('Error fetching latest price', {
        error: error instanceof Error ? error.message : String(error),
        symbol,
        chain,
      });
      return null;
    }
  }

  async comparePrices(
    symbol: string,
    chains?: SupportedChain[],
  ): Promise<CrossChainComparisonResult> {
    try {
      const prices = await this.getCurrentPricesByChain(symbol, chains);

      if (prices.length < 2) {
        throw new Error(`Need at least 2 chains for comparison, got ${prices.length}`);
      }

      const validPrices = prices.filter((p) => !p.isStale);
      if (validPrices.length === 0) {
        throw new Error('No valid (non-stale) price data available');
      }

      const priceValues = validPrices.map((p) => p.price);
      const avgPrice = priceValues.reduce((a, b) => a + b, 0) / priceValues.length;
      const sortedPrices = [...priceValues].sort((a, b) => a - b);

      if (sortedPrices.length === 0) {
        throw new Error('No price data available');
      }

      const medianIndex = Math.floor(sortedPrices.length / 2);
      const medianPriceVal = sortedPrices[medianIndex];
      const medianPrice: number =
        medianPriceVal !== undefined ? medianPriceVal : (sortedPrices[medianIndex - 1] ?? avgPrice);
      const minPrice = sortedPrices[0]!;
      const maxPrice = sortedPrices[sortedPrices.length - 1]!;
      const priceRange = maxPrice - minPrice;
      const priceRangePercent = avgPrice > 0 ? (priceRange / avgPrice) * 100 : 0;

      const minPriceData = validPrices.find((p) => p.price === minPrice);
      const maxPriceData = validPrices.find((p) => p.price === maxPrice);
      const minChain = minPriceData?.chain ?? 'ethereum';
      const maxChain = maxPriceData?.chain ?? 'ethereum';

      const deviations = validPrices.map((p) => {
        const deviationFromAvg = p.price - avgPrice;
        const deviationFromAvgPercent = avgPrice > 0 ? (deviationFromAvg / avgPrice) * 100 : 0;
        const deviationFromMedian = p.price - medianPrice;
        const deviationFromMedianPercent =
          medianPrice > 0 ? (deviationFromMedian / medianPrice) * 100 : 0;

        const isOutlier =
          Math.abs(deviationFromAvgPercent) > this.config.criticalDeviationThreshold;

        return {
          chain: p.chain,
          price: p.price,
          protocol: p.protocol,
          deviationFromAvg,
          deviationFromAvgPercent,
          deviationFromMedian,
          deviationFromMedianPercent,
          isOutlier,
          confidence: p.confidence ?? 0,
        };
      });

      const nonOutlierIndices = deviations
        .map((d, i) => (!d.isOutlier ? i : -1))
        .filter((i): i is number => i !== -1);

      let mostReliableChain = validPrices[0]?.chain ?? 'ethereum';
      let highestConfidence = 0;

      for (const idx of nonOutlierIndices) {
        const priceData = validPrices[idx];
        if (!priceData) continue;
        const confidence = priceData.confidence ?? 0;
        if (confidence > highestConfidence) {
          highestConfidence = confidence;
          mostReliableChain = priceData.chain;
        }
      }

      const outliers = deviations.filter((d) => d.isOutlier).map((d) => d.chain);

      const result = {
        symbol,
        baseAsset: symbol,
        quoteAsset: 'USD',
        timestamp: new Date(),
        pricesByChain: validPrices.map((p) => ({
          chain: p.chain,
          protocol: p.protocol,
          price: p.price,
          confidence: p.confidence,
          timestamp: p.timestamp,
          isStale: p.isStale ?? false,
        })),
        statistics: {
          avgPrice,
          medianPrice,
          minPrice,
          maxPrice,
          minChain,
          maxChain,
          priceRange,
          priceRangePercent,
        },
        deviations,
        recommendations: {
          mostReliableChain,
          reason:
            outliers.length === 0
              ? 'All prices within normal range'
              : `${outliers.length} chain(s) showing significant deviation: ${outliers.join(', ')}`,
          alternativeChains: validPrices
            .filter((p) => p.chain !== mostReliableChain)
            .map((p) => p.chain),
        },
      };

      logger.info('Price comparison completed', {
        symbol,
        validChains: validPrices.length,
        priceRangePercent: priceRangePercent.toFixed(4),
        outlierCount: outliers.length,
        mostReliableChain,
      });

      return result;
    } catch (error) {
      logger.error('Error comparing prices cross-chain', {
        error: error instanceof Error ? error.message : String(error),
        symbol,
        chains,
      });
      throw error;
    }
  }

  async detectDeviationAlerts(symbol: string): Promise<CrossChainDeviationAlert[]> {
    try {
      const comparison = await this.comparePrices(symbol);
      const alerts: CrossChainDeviationAlert[] = [];
      const avgPrice = comparison.statistics.avgPrice;

      for (const deviation of comparison.deviations) {
        const absDeviationPercent = Math.abs(deviation.deviationFromAvgPercent);

        if (absDeviationPercent >= this.config.criticalDeviationThreshold) {
          alerts.push({
            id: uuidv4(),
            symbol,
            chainA: deviation.chain,
            chainB: comparison.statistics.minChain,
            timestamp: new Date(),
            deviationPercent: absDeviationPercent,
            threshold: this.config.criticalDeviationThreshold,
            severity: 'critical',
            status: 'active',
            priceA: deviation.price,
            priceB: avgPrice,
            avgPrice,
            reason: `Price on ${deviation.chain} deviates ${absDeviationPercent.toFixed(2)}% from average`,
            suggestedAction: 'Verify data source and consider using median price for calculations',
          });
        } else if (absDeviationPercent >= this.config.deviationThreshold) {
          alerts.push({
            id: uuidv4(),
            symbol,
            chainA: deviation.chain,
            chainB: comparison.statistics.minChain,
            timestamp: new Date(),
            deviationPercent: absDeviationPercent,
            threshold: this.config.deviationThreshold,
            severity: 'warning',
            status: 'active',
            priceA: deviation.price,
            priceB: avgPrice,
            avgPrice,
            reason: `Price on ${deviation.chain} is ${absDeviationPercent.toFixed(2)}% above/below average`,
          });
        }
      }

      logger.info('Deviation alerts generated', {
        symbol,
        alertsCount: alerts.length,
        criticalCount: alerts.filter((a) => a.severity === 'critical').length,
        warningCount: alerts.filter((a) => a.severity === 'warning').length,
      });

      return alerts;
    } catch (error) {
      logger.error('Error detecting deviation alerts', {
        error: error instanceof Error ? error.message : String(error),
        symbol,
      });
      throw error;
    }
  }

  async getDashboardData(): Promise<CrossChainDashboardData> {
    try {
      const symbols = this.config.symbols;
      const dashboardData: CrossChainDashboardData = {
        lastUpdated: new Date(),
        monitoredSymbols: symbols,
        monitoredChains: this.config.chains,
        activeAlerts: 0,
        opportunities: {
          total: 0,
          actionable: 0,
          avgProfitPercent: 0,
        },
        priceComparisons: [],
        chainHealth: [],
      };

      const symbolPromises = symbols.map(async (symbol) => {
        try {
          const comparison = await this.comparePrices(symbol);

          const priceComparison = {
            symbol,
            chainsCount: comparison.pricesByChain.length,
            priceRangePercent: comparison.statistics.priceRangePercent,
            status: (comparison.statistics.priceRangePercent >
            this.config.criticalDeviationThreshold
              ? 'critical'
              : comparison.statistics.priceRangePercent > this.config.deviationThreshold
                ? 'warning'
                : 'normal') as 'critical' | 'warning' | 'normal',
          };

          const alerts = await this.detectDeviationAlerts(symbol);

          const activeAlerts = alerts.filter((a) => a.status === 'active').length;

          return {
            priceComparison,
            activeAlerts,
          };
        } catch (error) {
          logger.warn('Failed to process symbol for dashboard', { symbol, error });
          return {
            priceComparison: {
              symbol,
              chainsCount: 0,
              priceRangePercent: 0,
              status: 'critical' as const,
            },
            activeAlerts: 0,
          };
        }
      });

      const results = await Promise.all(symbolPromises);

      for (const result of results) {
        dashboardData.priceComparisons.push(result.priceComparison);
        dashboardData.activeAlerts += result.activeAlerts;
      }

      for (const chain of this.config.chains) {
        const firstSymbol = symbols[0];
        if (!firstSymbol) continue;

        const latestPrice = await this.getLatestPriceByChain(firstSymbol, chain);

        if (latestPrice) {
          const stalenessMinutes = latestPrice.stalenessSeconds
            ? latestPrice.stalenessSeconds / 60
            : 0;

          dashboardData.chainHealth.push({
            chain,
            status:
              stalenessMinutes > 30 ? 'offline' : stalenessMinutes > 5 ? 'degraded' : 'healthy',
            lastPriceTimestamp: latestPrice.timestamp,
            staleMinutes: stalenessMinutes,
          });
        } else {
          dashboardData.chainHealth.push({
            chain,
            status: 'offline',
            lastPriceTimestamp: new Date(0),
          });
        }
      }

      logger.info('Dashboard data generated', {
        symbolsProcessed: symbols.length,
        activeAlerts: dashboardData.activeAlerts,
        healthyChains: dashboardData.chainHealth.filter((c) => c.status === 'healthy').length,
      });

      return dashboardData;
    } catch (error) {
      logger.error('Error getting dashboard data', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async getHistoricalAnalysis(
    symbol: string,
    analysisType: 'price_comparison' | 'deviation_analysis',
    startTime: Date,
    endTime: Date,
    interval: '1hour' | '1day' = '1day',
  ): Promise<CrossChainHistoricalAnalysis> {
    try {
      const sql = `
        SELECT * FROM cross_oracle_comparisons
        WHERE symbol = $1
          AND timestamp >= $2
          AND timestamp <= $3
        ORDER BY timestamp ASC
        LIMIT 1000
      `;

      const result = await query<CrossOracleComparisonRow>(sql, [
        symbol.toUpperCase(),
        startTime.toISOString(),
        endTime.toISOString(),
      ]);

      const dataPoints = result.rows.map((row) => ({
        timestamp: new Date(row.timestamp),
        pricesByChain: {} as Record<SupportedChain, number | null>,
        avgPrice: parseFloat(String(row.avg_price)) || 0,
        medianPrice: parseFloat(String(row.median_price)) || 0,
        maxDeviation: Math.abs(parseFloat(String(row.max_deviation)) || 0),
        maxDeviationChains: this.parseChainPair(row.max_deviation_chains),
      }));

      const deviations = dataPoints.map((d) => d.maxDeviation);
      const avgPriceRanges = result.rows.map((d) => parseFloat(String(d.price_range_percent)) || 0);

      const avgPriceRangePercent =
        avgPriceRanges.length > 0
          ? avgPriceRanges.reduce((a, b) => a + b, 0) / avgPriceRanges.length
          : 0;

      const maxObservedDeviation = deviations.length > 0 ? Math.max(...deviations) : 0;

      const volatilityByChain = new Map<SupportedChain, number[]>();
      dataPoints.forEach((dp) => {
        Object.entries(dp.pricesByChain).forEach(([chain, price]) => {
          if (price !== null) {
            const prices = volatilityByChain.get(chain as SupportedChain) || [];
            prices.push(price);
            volatilityByChain.set(chain as SupportedChain, prices);
          }
        });
      });

      let mostVolatileChain = this.config.chains[0] ?? 'ethereum';
      let mostStableChain = this.config.chains[0] ?? 'ethereum';
      let maxVolatility = 0;
      let minVolatility = Infinity;

      volatilityByChain.forEach((prices, chain) => {
        if (prices.length > 1) {
          const mean = prices.reduce((a, b) => a + b, 0) / prices.length;
          const variance =
            prices.reduce((sum, p) => sum + Math.pow(p - mean, 2), 0) / prices.length;
          const volatility = Math.sqrt(variance) / mean;

          if (volatility > maxVolatility) {
            maxVolatility = volatility;
            mostVolatileChain = chain;
          }
          if (volatility < minVolatility) {
            minVolatility = volatility;
            mostStableChain = chain;
          }
        }
      });

      if (minVolatility === Infinity) {
        mostStableChain = mostVolatileChain;
      }

      const analysisResult: CrossChainHistoricalAnalysis = {
        symbol,
        analysisType,
        startTime,
        endTime,
        timeInterval: interval,
        dataPoints,
        summary: {
          avgPriceRangePercent,
          maxObservedDeviation,
          convergenceCount: deviations.filter((d) => d < 0.1).length,
          divergenceCount: deviations.filter((d) => d > 0.5).length,
          significantDeviationCount: deviations.filter((d) => d > 0.3).length,
          mostVolatileChain,
          mostStableChain,
        },
      };

      logger.info('Historical analysis completed', {
        symbol,
        dataPointsCount: dataPoints.length,
        maxObservedDeviation,
        avgPriceRangePercent,
      });

      return analysisResult;
    } catch (error) {
      logger.error('Error getting historical analysis', {
        error: error instanceof Error ? error.message : String(error),
        symbol,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        interval,
      });
      throw error;
    }
  }

  private parseChainPair(chains: string | null): [SupportedChain, SupportedChain] {
    if (!chains) {
      return ['ethereum', 'bsc'];
    }
    const [a, b] = chains.split('-');
    return [(a as SupportedChain) || 'ethereum', (b as SupportedChain) || 'bsc'];
  }
}

export const crossChainAnalysisService = new CrossChainAnalysisService();
