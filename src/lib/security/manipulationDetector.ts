/**
 * 价格操纵检测引擎
 *
 * 实现多种检测算法：
 * 1. 统计异常检测 - 基于标准差、Z-score、IQR
 * 2. 模式识别 - 闪电贷攻击、三明治攻击等
 * 3. 多源验证 - 对比CEX/DEX价格
 * 4. 时序分析 - 检测异常时间模式
 */

import { logger } from '@/lib/logger';
import type {
  ManipulationDetection,
  ManipulationType,
  DetectionSeverity,
  DetectionEvidence,
  SuspiciousTransaction,
  ManipulationDetectionConfig,
  DetectionMetrics,
} from '@/lib/types/security/detection';
import type { OracleProtocol, SupportedChain } from '@/lib/types/unifiedOracleTypes';

// ============================================================================
// 配置常量
// ============================================================================

const DEFAULT_CONFIG: ManipulationDetectionConfig = {
  zScoreThreshold: 3,
  minConfidenceScore: 0.7,
  timeWindowMs: 300000,
  minDataPoints: 10,
  flashLoanMinAmountUsd: 100000,
  sandwichProfitThresholdUsd: 1000,
  liquidityChangeThreshold: 0.3,
  maxPriceDeviationPercent: 5,
  correlationThreshold: 0.8,
  enabledRules: [
    'statistical_anomaly',
    'flash_loan_attack',
    'sandwich_attack',
    'liquidity_manipulation',
  ],
  alertChannels: {
    email: true,
    webhook: true,
    slack: false,
    telegram: false,
  },
  autoBlockSuspiciousFeeds: false,
  notificationCooldownMs: 300000,
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
// 循环价格缓冲区 - 优化内存使用
// ============================================================================

class CircularPriceBuffer {
  private buffer: (PriceDataPoint | undefined)[];
  private head = 0;
  private count = 0;

  constructor(private capacity: number) {
    this.buffer = new Array(capacity);
  }

  /**
   * 添加数据点
   */
  push(item: PriceDataPoint): void {
    this.buffer[this.head] = item;
    this.head = (this.head + 1) % this.capacity;
    if (this.count < this.capacity) {
      this.count++;
    }
  }

  /**
   * 批量添加数据点
   */
  pushMany(items: PriceDataPoint[]): void {
    for (const item of items) {
      this.push(item);
    }
  }

  /**
   * 获取时间戳之后的数据点（使用生成器避免创建新数组）
   */
  *getItemsSince(cutoff: number): Generator<PriceDataPoint> {
    // 从最新数据开始遍历
    for (let i = 0; i < this.count; i++) {
      const idx = (this.head - 1 - i + this.capacity) % this.capacity;
      const item = this.buffer[idx];
      if (item && item.timestamp > cutoff) {
        yield item;
      }
    }
  }

  /**
   * 获取所有数据点（按时间排序）
   */
  getAllSorted(): PriceDataPoint[] {
    const result: PriceDataPoint[] = [];
    for (let i = 0; i < this.count; i++) {
      const idx = (this.head - 1 - i + this.capacity) % this.capacity;
      const item = this.buffer[idx];
      if (item) {
        result.push(item);
      }
    }
    // 按时间戳升序排序
    return result.reverse();
  }

  /**
   * 获取数据点数量
   */
  get length(): number {
    return this.count;
  }

  /**
   * 清空缓冲区
   */
  clear(): void {
    this.buffer.fill(undefined);
    this.head = 0;
    this.count = 0;
  }
}

// ============================================================================
// 检测引擎主类
// ============================================================================

export class ManipulationDetector {
  private config: ManipulationDetectionConfig;
  private priceHistory: Map<string, CircularPriceBuffer> = new Map();
  private detectionHistory: ManipulationDetection[] = [];
  private lastAlertTime: Map<string, number> = new Map();
  private readonly maxPriceHistoryPerFeed: number;
  private readonly maxDetectionHistorySize: number = 10000; // 最大检测历史记录数

  constructor(config: Partial<ManipulationDetectionConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    // 根据时间窗口和数据点间隔计算最大历史记录数
    // 假设每5秒一个数据点，时间窗口为5分钟
    this.maxPriceHistoryPerFeed = Math.ceil(this.config.timeWindowMs / 5000) + 100;
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
    const feedKey = `${protocol}:${chain}:${symbol}`;

    // 更新价格历史
    this.updatePriceHistory(feedKey, currentPrice, historicalData);

    // 执行多种检测算法
    const detections: Array<{
      type: ManipulationType;
      severity: DetectionSeverity;
      confidence: number;
      evidence: DetectionEvidence[];
      suspiciousTxs: SuspiciousTransaction[];
    }> = [];

    // 1. 统计异常检测
    if (this.config.enabledRules.includes('statistical_anomaly')) {
      const statisticalResult = this.detectStatisticalAnomaly(feedKey, currentPrice);
      if (statisticalResult) detections.push(statisticalResult);
    }

    // 2. 闪电贷攻击检测
    if (this.config.enabledRules.includes('flash_loan_attack')) {
      const flashLoanResult = this.detectFlashLoanAttack(recentTransactions, currentPrice);
      if (flashLoanResult) detections.push(flashLoanResult);
    }

    // 3. 三明治攻击检测
    if (this.config.enabledRules.includes('sandwich_attack')) {
      const sandwichResult = this.detectSandwichAttack(recentTransactions);
      if (sandwichResult) detections.push(sandwichResult);
    }

    // 4. 流动性操纵检测
    if (this.config.enabledRules.includes('liquidity_manipulation')) {
      const liquidityResult = this.detectLiquidityManipulation(feedKey, currentPrice);
      if (liquidityResult) detections.push(liquidityResult);
    }

    // 合并检测结果
    if (detections.length === 0) return null;

    // 选择最高置信度的检测结果
    const bestDetection = detections.reduce((best, current) =>
      current.confidence > best.confidence ? current : best,
    );

    // 检查置信度阈值
    if (bestDetection.confidence < this.config.minConfidenceScore) {
      return null;
    }

    // 检查冷却期
    const lastAlert = this.lastAlertTime.get(feedKey);
    if (lastAlert && Date.now() - lastAlert < this.config.notificationCooldownMs) {
      return null;
    }

    // 创建检测结果
    const detection: ManipulationDetection = {
      id: this.generateDetectionId(),
      protocol,
      symbol,
      chain,
      feedKey,
      type: bestDetection.type,
      severity: bestDetection.severity,
      confidenceScore: bestDetection.confidence,
      detectedAt: Date.now(),
      evidence: bestDetection.evidence,
      suspiciousTransactions: bestDetection.suspiciousTxs,
      relatedBlocks: this.extractRelatedBlocks(bestDetection.suspiciousTxs),
      priceImpact: this.calculatePriceImpact(feedKey, currentPrice),
      financialImpactUsd: this.estimateFinancialImpact(bestDetection),
      affectedAddresses: this.extractAffectedAddresses(bestDetection.suspiciousTxs),
      status: 'pending',
    };

    // 记录检测历史，限制大小防止内存泄漏
    this.detectionHistory.push(detection);
    if (this.detectionHistory.length > this.maxDetectionHistorySize) {
      this.detectionHistory = this.detectionHistory.slice(-this.maxDetectionHistorySize);
    }
    this.lastAlertTime.set(feedKey, Date.now());

    logger.warn(`Manipulation detected: ${detection.type} (${detection.severity})`, {
      protocol,
      symbol,
      chain,
      confidence: detection.confidenceScore,
    });

    return detection;
  }

  // ============================================================================
  // 统计异常检测
  // ============================================================================

  private detectStatisticalAnomaly(
    feedKey: string,
    currentPrice: number,
  ): {
    type: ManipulationType;
    severity: DetectionSeverity;
    confidence: number;
    evidence: DetectionEvidence[];
    suspiciousTxs: SuspiciousTransaction[];
  } | null {
    const history = this.getSortedPriceHistory(feedKey);
    if (history.length < this.config.minDataPoints) {
      return null;
    }

    // 计算统计指标
    const prices = history.map((p) => p.price);
    const mean = prices.reduce((a, b) => a + b, 0) / prices.length;
    const variance = prices.reduce((sum, p) => sum + Math.pow(p - mean, 2), 0) / prices.length;
    const stdDev = Math.sqrt(variance);

    // 防止除零：如果标准差为0，说明所有价格相同，无异常
    if (stdDev === 0) {
      return null;
    }

    // 计算Z-score
    const zScore = Math.abs((currentPrice - mean) / stdDev);

    // 计算价格变化百分比，小数形式 (0.01 = 1%)
    const priceChangePercent = (currentPrice - mean) / mean;

    // 判断是否异常
    if (zScore < this.config.zScoreThreshold) {
      return null;
    }

    // 确定严重程度
    let severity: DetectionSeverity = 'medium';
    if (zScore > 5) severity = 'critical';
    else if (zScore > 4) severity = 'high';
    else if (zScore < 2) severity = 'low';

    // 计算置信度
    const confidence = Math.min(zScore / 5, 1);

    const evidence: DetectionEvidence[] = [
      {
        type: 'statistical_deviation',
        description: `价格偏离均值 ${(priceChangePercent * 100).toFixed(2)}%，Z-score: ${zScore.toFixed(2)}`,
        confidence,
        data: {
          mean,
          stdDev,
          zScore,
          priceChangePercent,
          sampleSize: prices.length,
        },
      },
    ];

    return {
      type: 'statistical_anomaly',
      severity,
      confidence,
      evidence,
      suspiciousTxs: [],
    };
  }

  // ============================================================================
  // 闪电贷攻击检测
  // ============================================================================

  private detectFlashLoanAttack(
    transactions: TransactionData[],
    _currentPrice: number,
  ): {
    type: ManipulationType;
    severity: DetectionSeverity;
    confidence: number;
    evidence: DetectionEvidence[];
    suspiciousTxs: SuspiciousTransaction[];
  } | null {
    const suspiciousTxs: SuspiciousTransaction[] = [];
    let totalFlashLoanValue = 0;

    for (const tx of transactions) {
      // 检测闪电贷特征
      const isFlashLoan = this.isFlashLoanTransaction(tx);

      if (isFlashLoan) {
        const valueUsd = this.estimateTransactionValue(tx);

        if (valueUsd >= this.config.flashLoanMinAmountUsd) {
          suspiciousTxs.push({
            hash: tx.hash,
            timestamp: tx.timestamp,
            from: tx.from,
            to: tx.to,
            value: tx.value.toString(),
            gasPrice: tx.gasPrice.toString(),
            gasUsed: tx.gasUsed,
            method: this.extractMethodSignature(tx.input),
            input: tx.input,
            type: 'flash_loan',
            valueUsd,
          });
          totalFlashLoanValue += valueUsd;
        }
      }
    }

    if (suspiciousTxs.length === 0) {
      return null;
    }

    // 计算置信度
    const confidence = Math.min(
      suspiciousTxs.length * 0.3 + (totalFlashLoanValue / this.config.flashLoanMinAmountUsd) * 0.1,
      1,
    );

    const evidence: DetectionEvidence[] = [
      {
        type: 'flash_loan_pattern',
        description: `检测到 ${suspiciousTxs.length} 笔闪电贷交易，总价值 $${totalFlashLoanValue.toLocaleString()}`,
        confidence,
        data: {
          transactionCount: suspiciousTxs.length,
          totalValue: totalFlashLoanValue,
          transactions: suspiciousTxs.map((tx) => tx.hash),
        },
      },
    ];

    return {
      type: 'flash_loan_attack',
      severity: totalFlashLoanValue > this.config.flashLoanMinAmountUsd * 2 ? 'critical' : 'high',
      confidence,
      evidence,
      suspiciousTxs,
    };
  }

  // ============================================================================
  // 三明治攻击检测
  // ============================================================================

  private detectSandwichAttack(transactions: TransactionData[]): {
    type: ManipulationType;
    severity: DetectionSeverity;
    confidence: number;
    evidence: DetectionEvidence[];
    suspiciousTxs: SuspiciousTransaction[];
  } | null {
    if (transactions.length < 3) {
      return null;
    }

    const suspiciousTxs: SuspiciousTransaction[] = [];

    // 按时间排序
    const sortedTxs = [...transactions].sort((a, b) => a.timestamp - b.timestamp);

    // 查找三明治模式：同一地址在目标交易前后进行相反方向的交易
    for (let i = 1; i < sortedTxs.length - 1; i++) {
      const prevTx = sortedTxs[i - 1];
      const targetTx = sortedTxs[i];
      const nextTx = sortedTxs[i + 1];

      if (!prevTx || !targetTx || !nextTx) continue;

      // 检查是否可能是三明治攻击
      if (
        prevTx.from === nextTx.from &&
        prevTx.from !== targetTx.from &&
        this.isSwapTransaction(prevTx) &&
        this.isSwapTransaction(nextTx) &&
        this.isSwapTransaction(targetTx)
      ) {
        const timeDiff1 = targetTx.timestamp - prevTx.timestamp;
        const timeDiff2 = nextTx.timestamp - targetTx.timestamp;

        // 时间窗口检查（通常在同一个区块内）
        if (timeDiff1 < 60000 && timeDiff2 < 60000) {
          suspiciousTxs.push(
            {
              hash: prevTx.hash,
              timestamp: prevTx.timestamp,
              from: prevTx.from,
              to: prevTx.to,
              value: prevTx.value.toString(),
              gasPrice: prevTx.gasPrice.toString(),
              gasUsed: prevTx.gasUsed,
              method: this.extractMethodSignature(prevTx.input),
              input: prevTx.input,
              type: 'front_run',
            },
            {
              hash: targetTx.hash,
              timestamp: targetTx.timestamp,
              from: targetTx.from,
              to: targetTx.to,
              value: targetTx.value.toString(),
              gasPrice: targetTx.gasPrice.toString(),
              gasUsed: targetTx.gasUsed,
              method: this.extractMethodSignature(targetTx.input),
              input: targetTx.input,
              type: 'victim',
            },
            {
              hash: nextTx.hash,
              timestamp: nextTx.timestamp,
              from: nextTx.from,
              to: nextTx.to,
              value: nextTx.value.toString(),
              gasPrice: nextTx.gasPrice.toString(),
              gasUsed: nextTx.gasUsed,
              method: this.extractMethodSignature(nextTx.input),
              input: nextTx.input,
              type: 'back_run',
            },
          );
        }
      }
    }

    if (suspiciousTxs.length === 0) {
      return null;
    }

    const confidence = Math.min(suspiciousTxs.length / 6, 1);

    const evidence: DetectionEvidence[] = [
      {
        type: 'sandwich_pattern',
        description: `检测到 ${suspiciousTxs.length / 3} 组可能的三明治攻击模式`,
        confidence,
        data: {
          patternCount: suspiciousTxs.length / 3,
          transactions: suspiciousTxs.map((tx) => tx.hash),
        },
      },
    ];

    return {
      type: 'sandwich_attack',
      severity: 'high',
      confidence,
      evidence,
      suspiciousTxs,
    };
  }

  // ============================================================================
  // 流动性操纵检测
  // ============================================================================

  private detectLiquidityManipulation(
    feedKey: string,
    _currentPrice: number,
  ): {
    type: ManipulationType;
    severity: DetectionSeverity;
    confidence: number;
    evidence: DetectionEvidence[];
    suspiciousTxs: SuspiciousTransaction[];
  } | null {
    const history = this.getSortedPriceHistory(feedKey);
    if (history.length < 2) {
      return null;
    }

    const currentItem = history[history.length - 1];
    const previousItem = history[history.length - 2];
    // 确保 previousItem 存在，否则返回 null
    if (!previousItem) {
      return null;
    }
    const currentLiquidity = currentItem?.liquidity ?? 0;
    const previousLiquidity = previousItem.liquidity ?? currentLiquidity;

    if (previousLiquidity === 0) {
      return null;
    }

    const liquidityChange = Math.abs((currentLiquidity - previousLiquidity) / previousLiquidity);

    if (liquidityChange < this.config.liquidityChangeThreshold) {
      return null;
    }

    const confidence = Math.min(liquidityChange * 2, 1);

    const evidence: DetectionEvidence[] = [
      {
        type: 'liquidity_anomaly',
        description: `流动性异常变化 ${(liquidityChange * 100).toFixed(2)}%`,
        confidence,
        data: {
          previousLiquidity,
          currentLiquidity,
          // 使用小数形式存储 (0.01 = 1%)
          changePercent: liquidityChange,
        },
      },
    ];

    return {
      type: 'liquidity_manipulation',
      severity: liquidityChange > 0.5 ? 'high' : 'medium',
      confidence,
      evidence,
      suspiciousTxs: [],
    };
  }

  // ============================================================================
  // 辅助方法
  // ============================================================================

  private updatePriceHistory(
    feedKey: string,
    _currentPrice: number,
    historicalData: PriceDataPoint[],
  ): void {
    // 获取或创建循环缓冲区
    let buffer = this.priceHistory.get(feedKey);
    if (!buffer) {
      buffer = new CircularPriceBuffer(this.maxPriceHistoryPerFeed);
      this.priceHistory.set(feedKey, buffer);
    }

    // 批量添加历史数据
    buffer.pushMany(historicalData);
  }

  /**
   * 获取排序后的价格历史
   */
  private getSortedPriceHistory(feedKey: string): PriceDataPoint[] {
    const buffer = this.priceHistory.get(feedKey);
    if (!buffer) return [];
    return buffer.getAllSorted();
  }

  private isFlashLoanTransaction(tx: TransactionData): boolean {
    // 检测闪电贷特征
    const flashLoanSignatures = [
      '0xc3018a0e', // flashLoan
      '0x6b07c94f', // flashLoanSimple
      '0x3d7b66bf', // flashLoan (Aave V3)
    ];

    const methodSig = tx.input.slice(0, 10);
    return flashLoanSignatures.includes(methodSig);
  }

  private isSwapTransaction(tx: TransactionData): boolean {
    const swapSignatures = [
      '0x38ed1739', // swapExactTokensForTokens
      '0x8803dbee', // swapTokensForExactTokens
      '0x472b43f3', // swapExactTokensForTokensSupportingFeeOnTransferTokens
      '0x5c11d795', // swapExactTokensForETHSupportingFeeOnTransferTokens
      '0xb6f9de95', // swapExactETHForTokensSupportingFeeOnTransferTokens
    ];

    const methodSig = tx.input.slice(0, 10);
    return swapSignatures.includes(methodSig);
  }

  private extractMethodSignature(input: string): string {
    if (input.length < 10) return 'unknown';

    const signatures: Record<string, string> = {
      '0x38ed1739': 'swapExactTokensForTokens',
      '0x8803dbee': 'swapTokensForExactTokens',
      '0xc3018a0e': 'flashLoan',
      '0x6b07c94f': 'flashLoanSimple',
    };

    return signatures[input.slice(0, 10)] || `0x${input.slice(2, 10)}`;
  }

  private estimateTransactionValue(tx: TransactionData): number {
    // 简化的价值估算，实际应该根据代币价格计算
    return tx.value / 1e18;
  }

  private calculatePriceImpact(feedKey: string, currentPrice: number): number | undefined {
    const history = this.getSortedPriceHistory(feedKey);
    if (history.length < 2) return undefined;

    const previousItem = history[history.length - 2];
    if (!previousItem) return undefined;
    const previousPrice = previousItem.price;
    // 价格影响百分比，小数形式 (0.01 = 1%)
    return (currentPrice - previousPrice) / previousPrice;
  }

  private estimateFinancialImpact(detection: {
    type: ManipulationType;
    suspiciousTxs: SuspiciousTransaction[];
  }): number | undefined {
    if (detection.suspiciousTxs.length === 0) return undefined;

    const totalValue = detection.suspiciousTxs.reduce((sum, tx) => sum + (tx.valueUsd || 0), 0);

    return totalValue;
  }

  private extractRelatedBlocks(_txs: SuspiciousTransaction[]): number[] {
    // 从交易中提取区块号（简化实现）
    return [];
  }

  private extractAffectedAddresses(txs: SuspiciousTransaction[]): string[] {
    const addresses = new Set<string>();
    txs.forEach((tx) => {
      addresses.add(tx.from);
      addresses.add(tx.to);
    });
    return Array.from(addresses);
  }

  private generateDetectionId(): string {
    const timestamp = Date.now().toString(36);
    const randomPart =
      typeof crypto !== 'undefined' && crypto.getRandomValues
        ? Array.from(crypto.getRandomValues(new Uint8Array(5)))
            .map((b) => b.toString(36).padStart(2, '0'))
            .join('')
        : Math.random().toString(36).slice(2, 12);
    return `det-${timestamp}-${randomPart}`;
  }

  // ============================================================================
  // 公共查询方法
  // ============================================================================

  getDetectionHistory(): ManipulationDetection[] {
    return [...this.detectionHistory];
  }

  getMetrics(): DetectionMetrics {
    const total = this.detectionHistory.length;
    const byType: Record<string, number> = {};
    const bySeverity: Record<string, number> = {};
    let totalConfidence = 0;

    this.detectionHistory.forEach((detection) => {
      byType[detection.type] = (byType[detection.type] || 0) + 1;
      bySeverity[detection.severity] = (bySeverity[detection.severity] || 0) + 1;
      totalConfidence += detection.confidenceScore;
    });

    return {
      totalDetections: total,
      detectionsByType: byType,
      detectionsBySeverity: bySeverity,
      falsePositives: 0,
      averageConfidence: total > 0 ? totalConfidence / total : 0,
      lastDetectionTime: this.detectionHistory[this.detectionHistory.length - 1]?.detectedAt,
    };
  }
}
