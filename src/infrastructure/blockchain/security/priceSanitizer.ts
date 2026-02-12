/**
 * Price Sanitizer Module
 *
 * 价格清洗模块
 * 防止价格操纵攻击、异常值检测、价格偏离分析
 */

// ============================================================================
// 常量定义
// ============================================================================

export const PRICE_SANITIZER_DEFAULTS = {
  // 偏离阈值
  MAX_DEVIATION_PERCENT: 5, // 5% 最大偏离
  MAX_ABSOLUTE_DEVIATION: 0.1, // 10% 绝对偏离
  OUTLIER_THRESHOLD: 3, // 3 倍标准差

  // 时间窗口
  STALENESS_THRESHOLD_SECONDS: 300, // 5 分钟
  PRICE_HISTORY_SIZE: 100,
  MIN_SOURCES_FOR_CONSENSUS: 3,

  // 价格范围检查
  MIN_PRICE: 0.00000001,
  MAX_PRICE: 1000000000000, // 1 trillion

  // 波动率
  MAX_VOLATILITY_PERCENT: 50, // 50% 最大波动率
} as const;

// ============================================================================
// 类型定义
// ============================================================================

export interface PriceData {
  source: string;
  price: number;
  timestamp: number;
  confidence?: number;
  volume?: number;
}

export interface SanitizedPrice {
  price: number;
  confidence: number;
  sources: string[];
  outliers: OutlierInfo[];
  deviation: number;
  volatility: number;
  timestamp: number;
  isValid: boolean;
  warnings: string[];
}

export interface OutlierInfo {
  source: string;
  price: number;
  deviation: number;
  reason: string;
}

export interface PriceSanitizerConfig {
  maxDeviationPercent: number;
  outlierThreshold: number;
  minSourcesForConsensus: number;
  stalenessThresholdSeconds: number;
  priceHistorySize: number;
}

export interface PriceHistoryEntry {
  price: number;
  timestamp: number;
  source: string;
}

// ============================================================================
// 价格清洗器
// ============================================================================

export class PriceSanitizer {
  private config: PriceSanitizerConfig;
  private priceHistory: Map<string, PriceHistoryEntry[]> = new Map();

  constructor(config: Partial<PriceSanitizerConfig> = {}) {
    this.config = {
      maxDeviationPercent: config.maxDeviationPercent ?? PRICE_SANITIZER_DEFAULTS.MAX_DEVIATION_PERCENT,
      outlierThreshold: config.outlierThreshold ?? PRICE_SANITIZER_DEFAULTS.OUTLIER_THRESHOLD,
      minSourcesForConsensus: config.minSourcesForConsensus ?? PRICE_SANITIZER_DEFAULTS.MIN_SOURCES_FOR_CONSENSUS,
      stalenessThresholdSeconds: config.stalenessThresholdSeconds ?? PRICE_SANITIZER_DEFAULTS.STALENESS_THRESHOLD_SECONDS,
      priceHistorySize: config.priceHistorySize ?? PRICE_SANITIZER_DEFAULTS.PRICE_HISTORY_SIZE,
    };
  }

  /**
   * 清洗价格数据
   */
  sanitize(symbol: string, prices: PriceData[]): SanitizedPrice {
    const warnings: string[] = [];
    const outliers: OutlierInfo[] = [];
    const now = Date.now();

    // 1. 基本验证
    const validPrices = this.filterValidPrices(prices, warnings);

    if (validPrices.length === 0) {
      return this.createInvalidResult(now, warnings, 'No valid prices available');
    }

    // 2. 检查数据新鲜度
    const freshPrices = this.filterStalePrices(validPrices, warnings);

    // 3. 检测异常值
    const { cleaned: pricesWithoutOutliers, outliers: detectedOutliers } =
      this.detectOutliers(freshPrices);
    outliers.push(...detectedOutliers);

    // 4. 计算共识价格
    const consensusResult = this.calculateConsensus(pricesWithoutOutliers, warnings);

    // 5. 检查波动率
    const volatility = this.calculateVolatility(symbol, consensusResult.price);

    // 6. 更新历史记录
    this.updateHistory(symbol, consensusResult.price, consensusResult.primarySource);

    // 7. 最终验证
    const isValid = this.validateFinalPrice(
      consensusResult.price,
      consensusResult.sources.length,
      volatility,
      warnings,
    );

    return {
      price: consensusResult.price,
      confidence: consensusResult.confidence,
      sources: consensusResult.sources,
      outliers,
      deviation: consensusResult.deviation,
      volatility,
      timestamp: now,
      isValid,
      warnings,
    };
  }

  /**
   * 批量清洗
   */
  sanitizeBatch(
    priceData: Map<string, PriceData[]>,
  ): Map<string, SanitizedPrice> {
    const results = new Map<string, SanitizedPrice>();

    for (const [symbol, prices] of priceData) {
      results.set(symbol, this.sanitize(symbol, prices));
    }

    return results;
  }

  /**
   * 检测价格操纵
   */
  detectManipulation(
    _symbol: string,
    newPrice: number,
    historicalPrices: PriceHistoryEntry[],
  ): {
    isManipulation: boolean;
    confidence: number;
    reasons: string[];
  } {
    const reasons: string[] = [];
    let manipulationScore = 0;

    if (historicalPrices.length < 5) {
      return { isManipulation: false, confidence: 0, reasons: ['Insufficient historical data'] };
    }

    const lastEntry = historicalPrices[historicalPrices.length - 1];
    if (!lastEntry) {
      return { isManipulation: false, confidence: 0, reasons: ['No historical data'] };
    }

    const lastPrice = lastEntry.price;
    const priceChange = Math.abs(newPrice - lastPrice) / lastPrice;
    if (priceChange > 0.1) {
      reasons.push(`Sudden price change: ${(priceChange * 100).toFixed(2)}%`);
      manipulationScore += 30;
    }

    // 2. 检查与移动平均的偏离
    const ma = this.calculateMovingAverage(historicalPrices);
    const deviationFromMA = Math.abs(newPrice - ma) / ma;
    if (deviationFromMA > 0.15) {
      // 15% 偏离
      reasons.push(`Price deviates ${(deviationFromMA * 100).toFixed(2)}% from moving average`);
      manipulationScore += 25;
    }

    // 3. 检查价格波动率异常
    const volatility = this.calculateHistoricalVolatility(historicalPrices);
    if (volatility > PRICE_SANITIZER_DEFAULTS.MAX_VOLATILITY_PERCENT / 100) {
      reasons.push(`High volatility detected: ${(volatility * 100).toFixed(2)}%`);
      manipulationScore += 20;
    }

    // 4. 检查时间异常（短时间内大幅变化）
    const recentPrices = historicalPrices.filter(
      (p) => Date.now() - p.timestamp < 300000, // 5 minutes
    );
    if (recentPrices.length >= 3) {
      const recentAvg = recentPrices.reduce((sum, p) => sum + p.price, 0) / recentPrices.length;
      const recentDeviation = Math.abs(newPrice - recentAvg) / recentAvg;
      if (recentDeviation > 0.05) {
        // 5% 短期偏离
        reasons.push(`Short-term deviation: ${(recentDeviation * 100).toFixed(2)}%`);
        manipulationScore += 25;
      }
    }

    const isManipulation = manipulationScore >= 50;
    const confidence = Math.min(manipulationScore / 100, 1);

    return { isManipulation, confidence, reasons };
  }

  /**
   * 获取历史价格
   */
  getHistory(symbol: string): PriceHistoryEntry[] {
    return this.priceHistory.get(symbol) || [];
  }

  /**
   * 清除历史
   */
  clearHistory(symbol?: string): void {
    if (symbol) {
      this.priceHistory.delete(symbol);
    } else {
      this.priceHistory.clear();
    }
  }

  // ============================================================================
  // 私有方法
  // ============================================================================

  private filterValidPrices(prices: PriceData[], warnings: string[]): PriceData[] {
    return prices.filter((p) => {
      // 检查价格范围
      if (p.price <= 0) {
        warnings.push(`Invalid price from ${p.source}: price <= 0`);
        return false;
      }

      if (p.price < PRICE_SANITIZER_DEFAULTS.MIN_PRICE) {
        warnings.push(`Price from ${p.source} below minimum threshold`);
        return false;
      }

      if (p.price > PRICE_SANITIZER_DEFAULTS.MAX_PRICE) {
        warnings.push(`Price from ${p.source} above maximum threshold`);
        return false;
      }

      // 检查是否为有限数
      if (!Number.isFinite(p.price)) {
        warnings.push(`Non-finite price from ${p.source}`);
        return false;
      }

      return true;
    });
  }

  private filterStalePrices(prices: PriceData[], warnings: string[]): PriceData[] {
    const now = Date.now();
    return prices.filter((p) => {
      const age = (now - p.timestamp) / 1000;
      if (age > this.config.stalenessThresholdSeconds) {
        warnings.push(`Stale price from ${p.source}: ${age.toFixed(0)}s old`);
        return false;
      }
      return true;
    });
  }

  private detectOutliers(prices: PriceData[]): {
    cleaned: PriceData[];
    outliers: OutlierInfo[];
  } {
    if (prices.length < 3) {
      return { cleaned: prices, outliers: [] };
    }

    const priceValues = prices.map((p) => p.price);
    const mean = this.calculateMean(priceValues);
    const stdDev = this.calculateStdDev(priceValues, mean);

    const cleaned: PriceData[] = [];
    const outliers: OutlierInfo[] = [];

    for (const p of prices) {
      const deviation = Math.abs(p.price - mean) / stdDev;

      if (deviation > this.config.outlierThreshold) {
        outliers.push({
          source: p.source,
          price: p.price,
          deviation: deviation,
          reason: `Deviation ${(deviation * 100).toFixed(2)}% exceeds threshold`,
        });
      } else {
        cleaned.push(p);
      }
    }

    return { cleaned, outliers };
  }

  private calculateConsensus(
    prices: PriceData[],
    warnings: string[],
  ): {
    price: number;
    confidence: number;
    sources: string[];
    deviation: number;
    primarySource: string;
  } {
    if (prices.length === 0) {
      warnings.push('No prices available for consensus');
      return {
        price: 0,
        confidence: 0,
        sources: [],
        deviation: 0,
        primarySource: '',
      };
    }

    // 加权平均（根据置信度和交易量）
    let totalWeight = 0;
    let weightedSum = 0;
    const sources: string[] = [];

    for (const p of prices) {
      const confidence = p.confidence ?? 1;
      const volume = p.volume ?? 1;
      const weight = confidence * Math.log10(volume + 1);

      weightedSum += p.price * weight;
      totalWeight += weight;
      sources.push(p.source);
    }

    const price = weightedSum / totalWeight;

    // 计算偏离度
    const deviations = prices.map((p) => Math.abs(p.price - price) / price);
    const avgDeviation = this.calculateMean(deviations);

    // 计算置信度
    let confidence = 1;
    if (prices.length < this.config.minSourcesForConsensus) {
      confidence *= 0.7;
      warnings.push(
        `Only ${prices.length} sources, below minimum ${this.config.minSourcesForConsensus}`,
      );
    }
    confidence *= Math.max(0.5, 1 - avgDeviation * 10);

    const firstPrice = prices[0];
    return {
      price,
      confidence,
      sources,
      deviation: avgDeviation,
      primarySource: firstPrice?.source ?? '',
    };
  }

  private calculateVolatility(symbol: string, currentPrice: number): number {
    const history = this.priceHistory.get(symbol) || [];
    if (history.length < 2) return 0;

    const prices = [...history.map((h) => h.price), currentPrice];
    const returns: number[] = [];

    for (let i = 1; i < prices.length; i++) {
      const prevPrice = prices[i - 1];
      const currentP = prices[i];
      if (prevPrice !== 0 && prevPrice !== undefined && currentP !== undefined) {
        returns.push((currentP - prevPrice) / prevPrice);
      }
    }

    if (returns.length === 0) return 0;

    const mean = this.calculateMean(returns);
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
    return Math.sqrt(variance);
  }

  private updateHistory(symbol: string, price: number, source: string): void {
    let history = this.priceHistory.get(symbol) || [];

    history.push({
      price,
      timestamp: Date.now(),
      source,
    });

    // 限制历史大小
    if (history.length > this.config.priceHistorySize) {
      history = history.slice(-this.config.priceHistorySize);
    }

    this.priceHistory.set(symbol, history);
  }

  private validateFinalPrice(
    price: number,
    sourceCount: number,
    volatility: number,
    warnings: string[],
  ): boolean {
    if (price <= 0) {
      warnings.push('Final price is invalid');
      return false;
    }

    if (sourceCount < 1) {
      warnings.push('No valid sources');
      return false;
    }

    if (volatility > PRICE_SANITIZER_DEFAULTS.MAX_VOLATILITY_PERCENT / 100) {
      warnings.push('Volatility exceeds maximum threshold');
    }

    return true;
  }

  private createInvalidResult(
    timestamp: number,
    warnings: string[],
    reason: string,
  ): SanitizedPrice {
    warnings.push(reason);
    return {
      price: 0,
      confidence: 0,
      sources: [],
      outliers: [],
      deviation: 0,
      volatility: 0,
      timestamp,
      isValid: false,
      warnings,
    };
  }

  private calculateMean(values: number[]): number {
    if (values.length === 0) return 0;
    return values.reduce((sum, v) => sum + v, 0) / values.length;
  }

  private calculateStdDev(values: number[], mean: number): number {
    if (values.length === 0) return 0;
    const squaredDiffs = values.map((v) => Math.pow(v - mean, 2));
    const variance = squaredDiffs.reduce((sum, v) => sum + v, 0) / values.length;
    return Math.sqrt(variance);
  }

  private calculateMovingAverage(history: PriceHistoryEntry[]): number {
    if (history.length === 0) return 0;
    const prices = history.map((h) => h.price);
    return this.calculateMean(prices);
  }

  private calculateHistoricalVolatility(history: PriceHistoryEntry[]): number {
    if (history.length < 2) return 0;

    const prices = history.map((h) => h.price);
    const returns: number[] = [];

    for (let i = 1; i < prices.length; i++) {
      const prevPrice = prices[i - 1];
      const currentP = prices[i];
      if (prevPrice !== undefined && prevPrice !== 0 && currentP !== undefined) {
        returns.push((currentP - prevPrice) / prevPrice);
      }
    }

    if (returns.length === 0) return 0;

    const mean = this.calculateMean(returns);
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
    return Math.sqrt(variance);
  }
}

// ============================================================================
// 价格偏离检测器
// ============================================================================

export class PriceDeviationDetector {
  private thresholds: Map<string, { maxDeviation: number; lastPrice: number }> = new Map();

  /**
   * 检查价格偏离
   */
  checkDeviation(
    symbol: string,
    newPrice: number,
    threshold: number = PRICE_SANITIZER_DEFAULTS.MAX_DEVIATION_PERCENT / 100,
  ): {
    isDeviation: boolean;
    deviationPercent: number;
    previousPrice: number | null;
  } {
    const entry = this.thresholds.get(symbol);
    let previousPrice: number | null = null;
    let deviationPercent = 0;
    let isDeviation = false;

    if (entry) {
      previousPrice = entry.lastPrice;
      if (previousPrice > 0) {
        deviationPercent = Math.abs(newPrice - previousPrice) / previousPrice;
        isDeviation = deviationPercent > threshold;
      }
    }

    // 更新记录
    this.thresholds.set(symbol, {
      maxDeviation: threshold,
      lastPrice: newPrice,
    });

    return { isDeviation, deviationPercent, previousPrice };
  }

  /**
   * 批量检查偏离
   */
  checkBatchDeviations(
    prices: Map<string, number>,
    thresholds?: Map<string, number>,
  ): Map<
    string,
    {
      isDeviation: boolean;
      deviationPercent: number;
    }
  > {
    const results = new Map();

    for (const [symbol, price] of prices) {
      const threshold = thresholds?.get(symbol) ?? PRICE_SANITIZER_DEFAULTS.MAX_DEVIATION_PERCENT / 100;
      const result = this.checkDeviation(symbol, price, threshold);
      results.set(symbol, {
        isDeviation: result.isDeviation,
        deviationPercent: result.deviationPercent,
      });
    }

    return results;
  }

  /**
   * 清除记录
   */
  clear(symbol?: string): void {
    if (symbol) {
      this.thresholds.delete(symbol);
    } else {
      this.thresholds.clear();
    }
  }
}

// ============================================================================
// 工厂函数
// ============================================================================

export function createPriceSanitizer(
  config?: Partial<PriceSanitizerConfig>,
): PriceSanitizer {
  return new PriceSanitizer(config);
}

export function createPriceDeviationDetector(): PriceDeviationDetector {
  return new PriceDeviationDetector();
}
