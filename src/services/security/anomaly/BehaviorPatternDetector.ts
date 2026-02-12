/**
 * Behavior Pattern Anomaly Detector
 * 行为模式异常检测器
 */

export class BehaviorPatternDetector {
  /**
   * 检测行为模式变化
   */
  detectBehaviorChange(
    currentPattern: number[],
    historicalPatterns: number[][],
  ): { hasChanged: boolean; similarity: number; changeMagnitude: number } {
    if (historicalPatterns.length === 0) {
      return { hasChanged: false, similarity: 1, changeMagnitude: 0 };
    }

    // 计算与历史模式的平均相似度
    const similarities = historicalPatterns.map((pattern) =>
      this.calculatePatternSimilarity(currentPattern, pattern),
    );

    const avgSimilarity = similarities.reduce((a, b) => a + b, 0) / similarities.length;
    const changeMagnitude = 1 - avgSimilarity;

    return {
      hasChanged: changeMagnitude > 0.3, // 阈值可配置
      similarity: avgSimilarity,
      changeMagnitude,
    };
  }

  /**
   * 计算模式相似度 (余弦相似度)
   */
  calculatePatternSimilarity(pattern1: number[], pattern2: number[]): number {
    const minLength = Math.min(pattern1.length, pattern2.length);
    const p1 = pattern1.slice(0, minLength);
    const p2 = pattern2.slice(0, minLength);

    const dotProduct = p1.reduce((sum, val, i) => sum + val * (p2[i] ?? 0), 0);
    const norm1 = Math.sqrt(p1.reduce((sum, val) => sum + val * val, 0));
    const norm2 = Math.sqrt(p2.reduce((sum, val) => sum + val * val, 0));

    if (norm1 === 0 || norm2 === 0) return 0;
    return dotProduct / (norm1 * norm2);
  }

  /**
   * 检测周期性异常
   */
  detectSeasonalityAnomaly(
    values: number[],
    period: number = 24, // 默认24小时周期
  ): Array<{ index: number; expected: number; actual: number; deviation: number }> {
    const anomalies: Array<{ index: number; expected: number; actual: number; deviation: number }> =
      [];

    // 需要至少2个周期的数据
    if (values.length < period * 2) return anomalies;

    // 计算每个时间点的季节性平均值
    const seasonalAverages: number[] = [];
    for (let i = 0; i < period; i++) {
      const periodValues: number[] = [];
      for (let j = i; j < values.length; j += period) {
        const value = values[j];
        if (value !== undefined) {
          periodValues.push(value);
        }
      }
      seasonalAverages.push(periodValues.reduce((a, b) => a + b, 0) / periodValues.length);
    }

    // 检测偏离季节性模式的点
    values.forEach((value, index) => {
      const periodIndex = index % period;
      const expected = seasonalAverages[periodIndex] ?? 0;
      const deviation = Math.abs(value - expected) / (expected || 1);

      if (deviation > 0.5) {
        // 偏离超过50%
        anomalies.push({
          index,
          expected,
          actual: value,
          deviation,
        });
      }
    });

    return anomalies;
  }

  /**
   * 检测相关性变化
   */
  detectCorrelationChange(
    series1: number[],
    series2: number[],
    windowSize: number = 30,
  ): Array<{ index: number; correlation: number; change: number }> {
    const changes: Array<{ index: number; correlation: number; change: number }> = [];

    for (let i = windowSize; i < series1.length; i++) {
      const window1 = series1.slice(i - windowSize, i);
      const window2 = series2.slice(i - windowSize, i);

      const prevCorr = this.calculateCorrelation(
        series1.slice(i - windowSize - 1, i - 1),
        series2.slice(i - windowSize - 1, i - 1),
      );
      const currCorr = this.calculateCorrelation(window1, window2);

      const change = Math.abs(currCorr - prevCorr);

      if (change > 0.3) {
        changes.push({
          index: i,
          correlation: currCorr,
          change,
        });
      }
    }

    return changes;
  }

  /**
   * 计算皮尔逊相关系数
   */
  private calculateCorrelation(x: number[], y: number[]): number {
    const n = Math.min(x.length, y.length);
    if (n === 0) return 0;

    const xSlice = x.slice(0, n);
    const ySlice = y.slice(0, n);

    const xMean = xSlice.reduce((a, b) => a + b, 0) / n;
    const yMean = ySlice.reduce((a, b) => a + b, 0) / n;

    let numerator = 0;
    let xDenominator = 0;
    let yDenominator = 0;

    for (let i = 0; i < n; i++) {
      const xDiff = (xSlice[i] ?? 0) - xMean;
      const yDiff = (ySlice[i] ?? 0) - yMean;

      numerator += xDiff * yDiff;
      xDenominator += xDiff * xDiff;
      yDenominator += yDiff * yDiff;
    }

    const denominator = Math.sqrt(xDenominator * yDenominator);
    return denominator === 0 ? 0 : numerator / denominator;
  }
}
