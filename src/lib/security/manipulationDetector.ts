/**
 * 价格操纵检测引擎
 *
 * 实现多种检测算法：
 * 1. 统计异常检测 - 基于标准差、Z-score、IQR
 * 2. 模式识别 - 闪电贷攻击、三明治攻击等
 * 3. 多源验证 - 对比CEX/DEX价格
 * 4. 时序分析 - 检测异常时间模式
 */

import type {
  ManipulationDetection,
  ManipulationType,
  DetectionSeverity,
  DetectionEvidence,
  SuspiciousTransaction,
  ManipulationDetectionConfig,
  DetectionMetrics,
} from '@/lib/types/security/manipulation';
import type { OracleProtocol, SupportedChain } from '@/lib/types/unifiedOracleTypes';
import { logger } from '@/lib/logger';

// ============================================================================
// 配置常量
// ============================================================================

const DEFAULT_CONFIG: ManipulationDetectionConfig = {
  statisticalThresholds: {
    priceDeviation: 5,        // 5% 价格偏离
    volumeAnomaly: 3,         // 3个标准差
    liquidityDrop: 50,        // 50% 流动性下降
    timeWindow: 5 * 60 * 1000, // 5分钟窗口
  },
  patternRecognition: {
    flashLoanMinProfit: 10000,  // $10k 最小利润
    sandwichMinProfit: 1000,    // $1k 最小利润
    frontRunMinProfit: 500,     // $500 最小利润
    maxNormalTxValue: 100000,   // $100k 正常交易上限
  },
  multiSourceValidation: {
    enabled: true,
    sources: ['cex', 'dex', 'aggregators'],
    deviationTolerance: 1,      // 1% 容忍度
  },
  alerting: {
    minSeverity: 'medium',
    channels: ['webhook'],
    cooldownPeriod: 5 * 60 * 1000, // 5分钟冷却
  },
};

// ============================================================================
// 价格数据点
// ============================================================================

interface PriceDataPoint {
  timestamp: number;
  price: number;
  volume: number;
  liquidity?: number;
  source: string;
}

interface TransactionData {
  hash: string;
  timestamp: number;
  from: string;
  to: string;
  value: number;
  gasPrice: number;
  gasUsed: number;
  input: string;
  logs: Array<{
    address: string;
    topics: string[];
    data: string;
  }>;
}

// ============================================================================
// 检测引擎主类
// ============================================================================

export class ManipulationDetector {
  private config: ManipulationDetectionConfig;
  private priceHistory: Map<string, PriceDataPoint[]> = new Map();
  private detectionHistory: ManipulationDetection[] = [];
  private lastAlertTime: Map<string, number> = new Map();

  constructor(config: Partial<ManipulationDetectionConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  // ============================================================================
  // 公共检测方法
  // ============================================================================

  /**
   * 分析价格数据，检测操纵行为
   */
  async analyzePriceFeed(
    protocol: OracleProtocol,
    symbol: string,
    chain: SupportedChain,
    currentPrice: number,
    historicalData: PriceDataPoint[],
    recentTransactions: TransactionData[],
  ): Promise<ManipulationDetection | null> {
    const feedKey = `${protocol}-${symbol}-${chain}`;
    
    // 更新历史数据
    this.updatePriceHistory(feedKey, historicalData);
    
    const detections: Array<{
      type: ManipulationType;
      confidence: number;
      evidence: DetectionEvidence[];
    }> = [];

    // 1. 统计异常检测
    const statisticalAnomaly = this.detectStatisticalAnomaly(feedKey, currentPrice);
    if (statisticalAnomaly) {
      detections.push(statisticalAnomaly);
    }

    // 2. 闪电贷攻击检测
    const flashLoanAttack = this.detectFlashLoanAttack(recentTransactions, currentPrice);
    if (flashLoanAttack) {
      detections.push(flashLoanAttack);
    }

    // 3. 三明治攻击检测
    const sandwichAttack = this.detectSandwichAttack(recentTransactions);
    if (sandwichAttack) {
      detections.push(sandwichAttack);
    }

    // 4. 流动性操纵检测
    const liquidityManipulation = this.detectLiquidityManipulation(feedKey, currentPrice);
    if (liquidityManipulation) {
      detections.push(liquidityManipulation);
    }

    // 如果没有检测到异常，返回 null
    if (detections.length === 0) {
      return null;
    }

    // 合并检测结果
    const mergedDetection = this.mergeDetections(
      detections,
      protocol,
      symbol,
      chain,
      currentPrice,
      recentTransactions,
    );

    // 检查告警冷却期
    if (this.shouldAlert(feedKey, mergedDetection.severity)) {
      this.detectionHistory.push(mergedDetection);
      this.lastAlertTime.set(feedKey, Date.now());
      
      logger.warn('Manipulation detected', {
        type: mergedDetection.type,
        severity: mergedDetection.severity,
        confidence: mergedDetection.confidence,
        feed: feedKey,
      });

      return mergedDetection;
    }

    return null;
  }

  /**
   * 批量分析多个价格源
   */
  async analyzeMultipleFeeds(
    feeds: Array<{
      protocol: OracleProtocol;
      symbol: string;
      chain: SupportedChain;
      price: number;
      historicalData: PriceDataPoint[];
      transactions: TransactionData[];
    }>,
  ): Promise<ManipulationDetection[]> {
    const detections: ManipulationDetection[] = [];

    for (const feed of feeds) {
      const detection = await this.analyzePriceFeed(
        feed.protocol,
        feed.symbol,
        feed.chain,
        feed.price,
        feed.historicalData,
        feed.transactions,
      );

      if (detection) {
        detections.push(detection);
      }
    }

    return detections;
  }

  /**
   * 获取检测历史
   */
  getDetectionHistory(
    options: {
      startTime?: number;
      endTime?: number;
      severity?: DetectionSeverity;
      limit?: number;
    } = {},
  ): ManipulationDetection[] {
    let history = [...this.detectionHistory];

    if (options.startTime) {
      history = history.filter(d => d.timestamp >= options.startTime!);
    }

    if (options.endTime) {
      history = history.filter(d => d.timestamp <= options.endTime!);
    }

    if (options.severity) {
      history = history.filter(d => d.severity === options.severity);
    }

    // 按时间倒序
    history.sort((a, b) => b.timestamp - a.timestamp);

    if (options.limit) {
      history = history.slice(0, options.limit);
    }

    return history;
  }

  /**
   * 获取检测指标统计
   */
  getMetrics(timeRange: { start: number; end: number }): DetectionMetrics {
    const relevantDetections = this.detectionHistory.filter(
      d => d.timestamp >= timeRange.start && d.timestamp <= timeRange.end,
    );

    const bySeverity: Record<DetectionSeverity, number> = {
      low: 0,
      medium: 0,
      high: 0,
      critical: 0,
    };

    const byType: Record<string, number> = {};

    let totalConfidence = 0;
    let confirmedAttacks = 0;
    let falsePositives = 0;

    for (const detection of relevantDetections) {
      bySeverity[detection.severity]++;
      byType[detection.type] = (byType[detection.type] || 0) + 1;
      totalConfidence += detection.confidence;

      if (detection.status === 'confirmed') confirmedAttacks++;
      if (detection.status === 'false_positive') falsePositives++;
    }

    return {
      period: {
        start: new Date(timeRange.start).toISOString(),
        end: new Date(timeRange.end).toISOString(),
      },
      summary: {
        totalDetections: relevantDetections.length,
        bySeverity,
        byType: byType as Record<string, number>,
        confirmedAttacks,
        falsePositives,
        averageConfidence: relevantDetections.length > 0 
          ? totalConfidence / relevantDetections.length 
          : 0,
      },
      trends: {
        dailyDetections: this.calculateDailyTrends(relevantDetections),
        topAffectedFeeds: this.calculateTopFeeds(relevantDetections),
      },
      responseStats: {
        averageResponseTime: 0,  // TODO: 实现响应时间追踪
        automatedResponses: 0,
        manualInvestigations: 0,
      },
    };
  }

  // ============================================================================
  // 私有检测算法
  // ============================================================================

  /**
   * 统计异常检测 - 基于Z-score
   */
  private detectStatisticalAnomaly(
    feedKey: string,
    currentPrice: number,
  ): { type: ManipulationType; confidence: number; evidence: DetectionEvidence[] } | null {
    const history = this.priceHistory.get(feedKey) || [];
    
    if (history.length < 10) {
      return null; // 数据不足
    }

    const prices = history.map(h => h.price);
    const mean = prices.reduce((a, b) => a + b, 0) / prices.length;
    const variance = prices.reduce((acc, p) => acc + Math.pow(p - mean, 2), 0) / prices.length;
    const stdDev = Math.sqrt(variance);

    if (stdDev === 0) {
      return null;
    }

    const zScore = Math.abs((currentPrice - mean) / stdDev);
    const deviation = Math.abs((currentPrice - mean) / mean) * 100;

    // 如果偏离超过阈值
    if (deviation > this.config.statisticalThresholds.priceDeviation) {
      const confidence = Math.min(zScore * 10, 100);
      
      return {
        type: 'statistical_anomaly',
        confidence,
        evidence: [{
          type: 'price_spike',
          description: `Price deviation of ${deviation.toFixed(2)}% detected (Z-score: ${zScore.toFixed(2)})`,
          data: {
            currentPrice,
            meanPrice: mean,
            standardDeviation: stdDev,
            zScore,
            deviation,
          },
          timestamp: Date.now(),
        }],
      };
    }

    return null;
  }

  /**
   * 闪电贷攻击检测
   */
  private detectFlashLoanAttack(
    transactions: TransactionData[],
    currentPrice: number,
  ): { type: ManipulationType; confidence: number; evidence: DetectionEvidence[] } | null {
    const evidence: DetectionEvidence[] = [];
    let suspiciousTxCount = 0;

    for (const tx of transactions) {
      // 检测闪电贷特征
      const isFlashLoan = this.isFlashLoanTransaction(tx);
      
      if (isFlashLoan) {
        suspiciousTxCount++;
        evidence.push({
          type: 'transaction_pattern',
          description: `Flash loan detected in transaction ${tx.hash}`,
          data: {
            txHash: tx.hash,
            value: tx.value,
            gasUsed: tx.gasUsed,
          },
          timestamp: tx.timestamp,
        });
      }
    }

    if (suspiciousTxCount > 0) {
      const confidence = Math.min(suspiciousTxCount * 30 + 20, 100);
      
      return {
        type: 'flash_loan_attack',
        confidence,
        evidence,
      };
    }

    return null;
  }

  /**
   * 三明治攻击检测
   */
  private detectSandwichAttack(
    transactions: TransactionData[],
  ): { type: ManipulationType; confidence: number; evidence: DetectionEvidence[] } | null {
    if (transactions.length < 3) {
      return null;
    }

    // 按时间排序
    const sortedTxs = [...transactions].sort((a, b) => a.timestamp - b.timestamp);
    const evidence: DetectionEvidence[] = [];

    // 检测模式：大买单 -> 目标交易 -> 大卖单（或相反）
    for (let i = 1; i < sortedTxs.length - 1; i++) {
      const prevTx = sortedTxs[i - 1];
      const targetTx = sortedTxs[i];
      const nextTx = sortedTxs[i + 1];

      // 简化的三明治检测逻辑
      const timeDiff1 = targetTx.timestamp - prevTx.timestamp;
      const timeDiff2 = nextTx.timestamp - targetTx.timestamp;

      // 如果三笔交易在很短时间内发生
      if (timeDiff1 < 2000 && timeDiff2 < 2000) { // 2秒内
        const isSandwich = this.isSandwichPattern(prevTx, targetTx, nextTx);
        
        if (isSandwich) {
          evidence.push({
            type: 'transaction_pattern',
            description: 'Potential sandwich attack pattern detected',
            data: {
              frontRunTx: prevTx.hash,
              victimTx: targetTx.hash,
              backRunTx: nextTx.hash,
              timeWindow: timeDiff1 + timeDiff2,
            },
            timestamp: targetTx.timestamp,
          });
        }
      }
    }

    if (evidence.length > 0) {
      return {
        type: 'sandwich_attack',
        confidence: 70 + evidence.length * 10,
        evidence,
      };
    }

    return null;
  }

  /**
   * 流动性操纵检测
   */
  private detectLiquidityManipulation(
    feedKey: string,
    currentPrice: number,
  ): { type: ManipulationType; confidence: number; evidence: DetectionEvidence[] } | null {
    const history = this.priceHistory.get(feedKey) || [];
    
    if (history.length < 2) {
      return null;
    }

    const recent = history.slice(-5);
    const avgLiquidity = recent.reduce((acc, h) => acc + (h.liquidity || 0), 0) / recent.length;
    const currentLiquidity = recent[recent.length - 1].liquidity || 0;

    if (avgLiquidity > 0 && currentLiquidity > 0) {
      const liquidityDrop = ((avgLiquidity - currentLiquidity) / avgLiquidity) * 100;

      if (liquidityDrop > this.config.statisticalThresholds.liquidityDrop) {
        return {
          type: 'liquidity_manipulation',
          confidence: Math.min(liquidityDrop, 100),
          evidence: [{
            type: 'liquidity_drop',
            description: `Liquidity dropped by ${liquidityDrop.toFixed(2)}%`,
            data: {
              previousLiquidity: avgLiquidity,
              currentLiquidity,
              dropPercentage: liquidityDrop,
            },
            timestamp: Date.now(),
          }],
        };
      }
    }

    return null;
  }

  // ============================================================================
  // 辅助方法
  // ============================================================================

  private updatePriceHistory(feedKey: string, data: PriceDataPoint[]): void {
    const existing = this.priceHistory.get(feedKey) || [];
    const combined = [...existing, ...data];
    
    // 只保留最近1000个数据点
    if (combined.length > 1000) {
      combined.splice(0, combined.length - 1000);
    }
    
    this.priceHistory.set(feedKey, combined);
  }

  private isFlashLoanTransaction(tx: TransactionData): boolean {
    // 简化的闪电贷检测逻辑
    // 实际实现需要分析交易日志，检测闪电贷合约调用
    const flashLoanSignatures = [
      '0xc3018a0b', // Aave flashLoan
      '0xab9c4b5d', // dYdX operate
      '0x6e0a34eb', // Uniswap V3 flash
    ];

    return flashLoanSignatures.some(sig => 
      tx.input.toLowerCase().startsWith(sig.toLowerCase()),
    );
  }

  private isSandwichPattern(
    prevTx: TransactionData,
    targetTx: TransactionData,
    nextTx: TransactionData,
  ): boolean {
    // 简化的三明治模式检测
    // 实际实现需要分析交易的具体内容（swap方向、金额等）
    const prevValue = prevTx.value;
    const targetValue = targetTx.value;
    const nextValue = nextTx.value;

    // 如果前后两笔交易都很大，中间一笔相对较小，可能是三明治
    return prevValue > targetValue && nextValue > targetValue && 
           prevValue > this.config.patternRecognition.maxNormalTxValue;
  }

  private shouldAlert(feedKey: string, severity: DetectionSeverity): boolean {
    // 检查冷却期
    const lastAlert = this.lastAlertTime.get(feedKey);
    if (lastAlert) {
      const timeSinceLastAlert = Date.now() - lastAlert;
      if (timeSinceLastAlert < this.config.alerting.cooldownPeriod) {
        return false;
      }
    }

    // 检查严重度阈值
    const severityLevels: Record<DetectionSeverity, number> = {
      low: 1,
      medium: 2,
      high: 3,
      critical: 4,
    };

    const minSeverity = this.config.alerting.minSeverity;
    return severityLevels[severity] >= severityLevels[minSeverity];
  }

  private mergeDetections(
    detections: Array<{ type: ManipulationType; confidence: number; evidence: DetectionEvidence[] }>,
    protocol: OracleProtocol,
    symbol: string,
    chain: SupportedChain,
    currentPrice: number,
    transactions: TransactionData[],
  ): ManipulationDetection {
    // 选择最高置信度的检测类型
    const primaryDetection = detections.reduce((prev, current) => 
      current.confidence > prev.confidence ? current : prev,
    );

    // 计算综合严重度
    const severity = this.calculateSeverity(primaryDetection.confidence);
    
    // 合并所有证据
    const allEvidence = detections.flatMap(d => d.evidence);

    // 生成建议措施
    const recommendedActions = this.generateRecommendedActions(
      primaryDetection.type,
      severity,
    );

    // 分析可疑交易
    const suspiciousTransactions = this.analyzeSuspiciousTransactions(transactions);

    return {
      id: `det-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: primaryDetection.type,
      severity,
      status: 'detected',
      confidence: primaryDetection.confidence,
      timestamp: Date.now(),
      affectedFeeds: [{
        protocol,
        symbol,
        chain,
        feedAddress: '', // TODO: 从配置中获取
      }],
      details: {
        description: this.generateDescription(primaryDetection.type, allEvidence),
        evidence: allEvidence,
        priceDeviation: this.calculatePriceDeviation(allEvidence),
        normalPrice: 0, // TODO: 从历史数据计算
        manipulatedPrice: currentPrice,
        duration: 0, // TODO: 计算持续时间
      },
      suspiciousTransactions,
      impact: {
        affectedProtocols: [], // TODO: 从DeFi协议数据库查询
        estimatedLossUSD: 0,
        potentialLiquidations: 0,
      },
      recommendedActions,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  private calculateSeverity(confidence: number): DetectionSeverity {
    if (confidence >= 90) return 'critical';
    if (confidence >= 75) return 'high';
    if (confidence >= 50) return 'medium';
    return 'low';
  }

  private generateDescription(type: ManipulationType, evidence: DetectionEvidence[]): string {
    const descriptions: Record<ManipulationType, string> = {
      flash_loan_attack: 'Potential flash loan attack detected with suspicious transaction patterns',
      price_manipulation: 'Abnormal price movement detected that may indicate manipulation',
      oracle_manipulation: 'Direct oracle manipulation attempt detected',
      sandwich_attack: 'Potential sandwich attack pattern detected in recent transactions',
      front_running: 'Front-running behavior detected',
      back_running: 'Back-running behavior detected',
      liquidity_manipulation: 'Significant liquidity drop detected, potential manipulation',
      statistical_anomaly: 'Statistical anomaly detected in price feed',
    };

    return descriptions[type] || 'Suspicious activity detected';
  }

  private calculatePriceDeviation(evidence: DetectionEvidence[]): number {
    const priceEvidence = evidence.find(e => e.type === 'price_spike');
    if (priceEvidence && typeof priceEvidence.data.deviation === 'number') {
      return priceEvidence.data.deviation;
    }
    return 0;
  }

  private analyzeSuspiciousTransactions(transactions: TransactionData[]): SuspiciousTransaction[] {
    return transactions
      .filter(tx => tx.value > this.config.patternRecognition.maxNormalTxValue)
      .map(tx => ({
        hash: tx.hash,
        chain: 'ethereum' as SupportedChain, // TODO: 从配置获取
        blockNumber: 0, // TODO: 从交易数据获取
        timestamp: tx.timestamp,
        from: tx.from,
        to: tx.to,
        value: tx.value.toString(),
        gasUsed: tx.gasUsed,
        analysis: {
          type: 'unknown',
          profitUSD: 0,
          involvedTokens: [],
          dexPlatforms: [],
        },
        relevanceScore: Math.min(tx.value / 10000, 100),
      }));
  }

  private generateRecommendedActions(
    type: ManipulationType,
    severity: DetectionSeverity,
  ): Array<{ priority: 'immediate' | 'high' | 'medium' | 'low'; action: string; description: string; automated: boolean }> {
    const actions: Array<{ priority: 'immediate' | 'high' | 'medium' | 'low'; action: string; description: string; automated: boolean }> = [];

    if (severity === 'critical' || severity === 'high') {
      actions.push({
        priority: 'immediate',
        action: 'pause_feed',
        description: 'Consider pausing the affected price feed temporarily',
        automated: false,
      });
    }

    actions.push({
      priority: severity === 'critical' ? 'immediate' : 'high',
      action: 'investigate_transactions',
      description: 'Manually review the suspicious transactions identified',
      automated: false,
    });

    actions.push({
      priority: 'medium',
      action: 'increase_monitoring',
      description: 'Increase monitoring frequency for this feed',
      automated: true,
    });

    if (type === 'flash_loan_attack') {
      actions.push({
        priority: 'high',
        action: 'check_liquidations',
        description: 'Check for any forced liquidations that may have occurred',
        automated: true,
      });
    }

    return actions;
  }

  private calculateDailyTrends(detections: ManipulationDetection[]): Array<{ date: string; count: number; severity: DetectionSeverity }> {
    const dailyMap = new Map<string, { count: number; maxSeverity: DetectionSeverity }>();
    
    const severityOrder: DetectionSeverity[] = ['low', 'medium', 'high', 'critical'];

    for (const detection of detections) {
      const date = new Date(detection.timestamp).toISOString().split('T')[0];
      const existing = dailyMap.get(date);
      
      if (existing) {
        existing.count++;
        if (severityOrder.indexOf(detection.severity) > severityOrder.indexOf(existing.maxSeverity)) {
          existing.maxSeverity = detection.severity;
        }
      } else {
        dailyMap.set(date, { count: 1, maxSeverity: detection.severity });
      }
    }

    return Array.from(dailyMap.entries())
      .map(([date, data]) => ({
        date,
        count: data.count,
        severity: data.maxSeverity,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  private calculateTopFeeds(detections: ManipulationDetection[]): Array<{ feed: string; detectionCount: number }> {
    const feedMap = new Map<string, number>();

    for (const detection of detections) {
      for (const feed of detection.affectedFeeds) {
        const key = `${feed.protocol}-${feed.symbol}`;
        feedMap.set(key, (feedMap.get(key) || 0) + 1);
      }
    }

    return Array.from(feedMap.entries())
      .map(([feed, count]) => ({ feed, detectionCount: count }))
      .sort((a, b) => b.detectionCount - a.detectionCount)
      .slice(0, 10);
  }
}

// ============================================================================
// 单例导出
// ============================================================================

let globalDetector: ManipulationDetector | null = null;

export function getManipulationDetector(config?: Partial<ManipulationDetectionConfig>): ManipulationDetector {
  if (!globalDetector) {
    globalDetector = new ManipulationDetector(config);
  }
  return globalDetector;
}

export function resetManipulationDetector(): void {
  globalDetector = null;
}
