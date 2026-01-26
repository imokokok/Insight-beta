export interface PredictionResult {
  prediction: number;
  confidence: number;
  trend: 'increasing' | 'decreasing' | 'stable';
  factors: Array<{
    name: string;
    impact: number;
    description: string;
  }>;
  riskLevel: 'low' | 'medium' | 'high';
  recommendations: string[];
  timestamp: number;
}

export interface HistoricalDataPoint {
  timestamp: number;
  value: number;
  metadata?: Record<string, unknown>;
}

export interface PredictionInput {
  historicalData: HistoricalDataPoint[];
  currentValue: number;
  timeWindow?: number;
  confidenceLevel?: number;
}

export interface TimeSeriesFeatures {
  mean: number;
  stdDev: number;
  min: number;
  max: number;
  trend: number;
  seasonality: number;
  volatility: number;
  autocorrelation: number;
}

export interface AnomalyPrediction {
  isAnomaly: boolean;
  anomalyProbability: number;
  anomalyType: 'spike' | 'drop' | 'drift' | 'pattern_break';
  severity: 'low' | 'medium' | 'high';
  expectedValue: number;
  actualValue: number;
  deviation: number;
  timestamp: number;
}

export interface RiskAssessment {
  overallScore: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  factors: Array<{
    name: string;
    score: number;
    weight: number;
    description: string;
  }>;
  trend: 'improving' | 'stable' | 'declining';
  recommendations: string[];
}

export class PredictiveAnalyticsEngine {
  private readonly SEASONALITY_THRESHOLD = 0.3;
  private readonly VOLATILITY_THRESHOLD = 0.5;
  private readonly ANOMALY_THRESHOLD = 2.5;

  extractFeatures(data: HistoricalDataPoint[]): TimeSeriesFeatures {
    if (data.length < 2) {
      return {
        mean: data[0]?.value || 0,
        stdDev: 0,
        min: data[0]?.value || 0,
        max: data[0]?.value || 0,
        trend: 0,
        seasonality: 0,
        volatility: 0,
        autocorrelation: 0,
      };
    }

    const values = data.map((d) => d.value);
    const n = values.length;

    const mean = values.reduce((sum, val) => sum + val, 0) / n;
    const squaredDiffs = values.map((val) => Math.pow(val - mean, 2));
    const stdDev = Math.sqrt(squaredDiffs.reduce((sum, val) => sum + val, 0) / n);

    const min = Math.min(...values);
    const max = Math.max(...values);

    const trend = this.calculateTrend(values);
    const seasonality = this.detectSeasonality(values);
    const volatility = stdDev / (mean || 1);
    const autocorrelation = this.calculateAutocorrelation(values);

    return {
      mean,
      stdDev,
      min,
      max,
      trend,
      seasonality,
      volatility,
      autocorrelation,
    };
  }

  private calculateTrend(values: number[]): number {
    if (values.length < 2) return 0;

    const n = values.length;
    let sumX = 0;
    let sumY = 0;
    let sumXY = 0;
    let sumX2 = 0;

    for (let i = 0; i < n; i++) {
      const value = values[i];
      if (value !== undefined) {
        sumX += i;
        sumY += value;
        sumXY += i * value;
        sumX2 += i * i;
      }
    }

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const normalizedSlope = slope / (Math.abs(slope) + Math.abs(this.calculateMean(values)));

    return normalizedSlope;
  }

  private detectSeasonality(values: number[]): number {
    if (values.length < 10) return 0;

    const n = values.length;
    let sumSin = 0;
    let sumCos = 0;

    for (let i = 0; i < n; i++) {
      const value = values[i];
      if (value !== undefined) {
        const angle = (2 * Math.PI * i) / 7;
        sumSin += value * Math.sin(angle);
        sumCos += value * Math.cos(angle);
      }
    }

    const amplitude = Math.sqrt(Math.pow(sumSin / n, 2) + Math.pow(sumCos / n, 2));
    const mean = this.calculateMean(values);

    return amplitude / (mean || 1);
  }

  private calculateAutocorrelation(values: number[], lag = 1): number {
    if (values.length <= lag) return 0;

    const n = values.length;
    const mean = this.calculateMean(values);
    let numerator = 0;
    let denominator = 0;

    for (let i = 0; i < n - lag; i++) {
      const currentValue = values[i];
      const lagValue = values[i + lag];
      if (currentValue !== undefined && lagValue !== undefined) {
        numerator += (currentValue - mean) * (lagValue - mean);
      }
    }

    for (let i = 0; i < n; i++) {
      const value = values[i];
      if (value !== undefined) {
        denominator += Math.pow(value - mean, 2);
      }
    }

    return denominator === 0 ? 0 : numerator / denominator;
  }

  private calculateMean(values: number[]): number {
    if (values.length === 0) return 0;
    return values.reduce((sum, val) => sum + val, 0) / values.length;
  }

  private calculateStdDev(values: number[], mean: number): number {
    if (values.length === 0) return 0;
    const squaredDiffs = values.map((val) => Math.pow(val - mean, 2));
    return Math.sqrt(squaredDiffs.reduce((sum, val) => sum + val, 0) / values.length);
  }

  predictDisputeProbability(input: PredictionInput): PredictionResult {
    const { historicalData, timeWindow = 7 } = input;
    const features = this.extractFeatures(historicalData);

    const disputeRateHistory = historicalData
      .slice(-timeWindow)
      .map((d): number => d.metadata?.['disputeRate'] as number || 0);

    const avgDisputeRate = this.calculateMean(disputeRateHistory);
    const disputeTrend = this.calculateTrend(disputeRateHistory);

    const volatilityPenalty = Math.min(features.volatility, 1) * 0.2;
    const trendPenalty = Math.max(0, disputeTrend) * 0.15;
    const deviationPenalty = Math.abs(features.trend) * 0.1;

    let prediction = avgDisputeRate + volatilityPenalty + trendPenalty + deviationPenalty;
    prediction = Math.max(0, Math.min(1, prediction));

    const confidence = this.calculateConfidence(historicalData, features);

    const trend: 'increasing' | 'decreasing' | 'stable' =
      disputeTrend > 0.05 ? 'increasing' : disputeTrend < -0.05 ? 'decreasing' : 'stable';

    const riskLevel: 'low' | 'medium' | 'high' =
      prediction > 0.7 ? 'high' : prediction > 0.4 ? 'medium' : 'low';

    const factors = [
      {
        name: 'Historical Dispute Rate',
        impact: avgDisputeRate * 0.4,
        description: `Average dispute rate over the past ${timeWindow} periods: ${(avgDisputeRate * 100).toFixed(1)}%`,
      },
      {
        name: 'Market Volatility',
        impact: volatilityPenalty,
        description: `Current volatility level: ${(features.volatility * 100).toFixed(1)}%`,
      },
      {
        name: 'Dispute Trend',
        impact: trendPenalty,
        description: `Dispute rate is ${trend}`,
      },
    ];

    const recommendations = this.generateRecommendations(prediction, features, riskLevel);

    return {
      prediction,
      confidence,
      trend,
      factors,
      riskLevel,
      recommendations,
      timestamp: Date.now(),
    };
  }

  predictSettlementOutcome(
    assertionData: {
      bondAmount: number;
      livenessPeriod: number;
      marketVolatility: number;
      historicalAccuracy: number;
      disputerActivity: number;
    },
  ): PredictionResult {
    const accuracyData = [{ timestamp: Date.now(), value: assertionData.historicalAccuracy }];
    const features = this.extractFeatures(accuracyData);

    let settlementProbability = 0.5;

    settlementProbability += (assertionData.historicalAccuracy - 0.5) * 0.3;
    settlementProbability -= (assertionData.marketVolatility - 0.2) * 0.15;
    settlementProbability += Math.min(assertionData.bondAmount / 10000, 1) * 0.1;
    settlementProbability += Math.min(assertionData.disputerActivity / 10, 1) * 0.1;

    settlementProbability = Math.max(0, Math.min(1, settlementProbability));

    const confidence = Math.min(0.95, 0.5 + this.calculateConfidence(accuracyData, features) * 0.4);

    const trend: 'increasing' | 'decreasing' | 'stable' = 'stable';

    const riskLevel: 'low' | 'medium' | 'high' =
      settlementProbability > 0.8 ? 'low' : settlementProbability > 0.5 ? 'medium' : 'high';

    const factors = [
      {
        name: 'Historical Accuracy',
        impact: assertionData.historicalAccuracy,
        description: `Historical accuracy of assertions: ${(assertionData.historicalAccuracy * 100).toFixed(1)}%`,
      },
      {
        name: 'Market Volatility',
        impact: assertionData.marketVolatility,
        description: `Current market volatility level: ${(assertionData.marketVolatility * 100).toFixed(1)}%`,
      },
      {
        name: 'Bond Amount',
        impact: assertionData.bondAmount,
        description: `Staked bond amount: ${assertionData.bondAmount} USD`,
      },
      {
        name: 'Disputer Activity',
        impact: assertionData.disputerActivity,
        description: `Recent disputer activity level: ${assertionData.disputerActivity}`,
      },
    ];

    const recommendations = this.generateSettlementRecommendations(settlementProbability, assertionData);

    return {
      prediction: settlementProbability,
      confidence,
      trend,
      factors,
      riskLevel,
      recommendations,
      timestamp: Date.now(),
    };
  }

  detectAnomalies(data: HistoricalDataPoint[]): AnomalyPrediction[] {
    if (data.length < 5) return [];

    const anomalies: AnomalyPrediction[] = [];
    const values = data.map((d) => d.value);

    for (let i = 10; i < values.length; i++) {
      const currentValue = values[i];
      if (currentValue === undefined) continue;
      
      const window = values.slice(i - 10, i);
      const mean = this.calculateMean(window);
      const stdDev = this.calculateStdDev(window, mean);

      if (stdDev === 0 || mean === 0) continue;

      const zScore = Math.abs((currentValue - mean) / stdDev);

      if (zScore > this.ANOMALY_THRESHOLD) {
        const deviation = ((currentValue - mean) / mean) * 100;
        const anomalyType: 'spike' | 'drop' | 'drift' | 'pattern_break' =
          deviation > 0 ? 'spike' : deviation < 0 ? 'drop' : 'drift';

        const severity: 'low' | 'medium' | 'high' =
          zScore > 4 ? 'high' : zScore > 3 ? 'medium' : 'low';

        anomalies.push({
          isAnomaly: true,
          anomalyProbability: Math.min(0.99, Math.max(0, zScore / 5)),
          anomalyType,
          severity,
          expectedValue: mean,
          actualValue: currentValue,
          deviation,
          timestamp: data[i]?.timestamp || Date.now(),
        });
      }
    }

    return anomalies;
  }

  assessRisk(data: {
    disputeRate: number[];
    assertionVolume: number[];
    errorRate: number[];
    syncLatency: number[];
    livenessScore: number[];
  }): RiskAssessment {
    const weights = {
      disputeRate: 0.25,
      assertionVolume: 0.15,
      errorRate: 0.25,
      syncLatency: 0.15,
      livenessScore: 0.2,
    };

    const factors = [
      {
        name: 'Dispute Rate',
        score: Math.min(data.disputeRate.reduce((a, b) => a + b, 0) / data.disputeRate.length, 1),
        weight: weights.disputeRate,
        description: 'Rate of disputed assertions',
      },
      {
        name: 'Assertion Volume',
        score: 1 - Math.min(data.assertionVolume.reduce((a, b) => a + b, 0) / (data.assertionVolume.length * 100), 1),
        weight: weights.assertionVolume,
        description: 'Volume of assertions being made',
      },
      {
        name: 'Error Rate',
        score: 1 - Math.min(data.errorRate.reduce((a, b) => a + b, 0) / data.errorRate.length, 1),
        weight: weights.errorRate,
        description: 'Rate of errors in oracle operations',
      },
      {
        name: 'Sync Latency',
        score: 1 - Math.min(data.syncLatency.reduce((a, b) => a + b, 0) / (data.syncLatency.length * 10000), 1),
        weight: weights.syncLatency,
        description: 'Time to sync new data',
      },
      {
        name: 'Liveness Score',
        score: data.livenessScore.reduce((a, b) => a + b, 0) / data.livenessScore.length,
        weight: weights.livenessScore,
        description: 'Overall system liveness',
      },
    ];

    const overallScore = factors.reduce((sum, factor) => sum + factor.score * factor.weight, 0);

    const riskLevel: 'low' | 'medium' | 'high' | 'critical' =
      overallScore > 0.8
        ? 'low'
        : overallScore > 0.6
          ? 'medium'
          : overallScore > 0.4
            ? 'high'
            : 'critical';

    const recommendations = this.generateRiskRecommendations(overallScore, factors);

    return {
      overallScore,
      riskLevel,
      factors,
      trend: 'stable',
      recommendations,
    };
  }

  private calculateConfidence(data: HistoricalDataPoint[], features: TimeSeriesFeatures): number {
    const dataPoints = data.length;
    const volatilityBonus = Math.max(0, 1 - features.volatility * 2);
    const trendBonus = Math.max(0, 1 - Math.abs(features.trend));
    const autocorrelationBonus = Math.max(0, features.autocorrelation);

    const baseConfidence = 0.5;
    const dataBonus = Math.min(dataPoints / 30, 0.3);
    const confidence =
      baseConfidence +
      dataBonus * 0.3 +
      volatilityBonus * 0.15 +
      trendBonus * 0.1 +
      autocorrelationBonus * 0.1;

    return Math.min(0.99, confidence);
  }

  private generateRecommendations(
    prediction: number,
    features: TimeSeriesFeatures,
    _riskLevel: 'low' | 'medium' | 'high',
  ): string[] {
    const recommendations: string[] = [];

    if (prediction > 0.7) {
      recommendations.push('High dispute probability detected. Consider increasing bond amount for new assertions.');
      recommendations.push('Review recent disputed assertions to identify common issues.');
    }

    if (features.volatility > this.VOLATILITY_THRESHOLD) {
      recommendations.push('Market volatility is elevated. Monitor prices closely before asserting.');
    }

    if (features.seasonality > this.SEASONALITY_THRESHOLD) {
      recommendations.push('Strong seasonality detected. Consider timing assertions based on historical patterns.');
    }

    if (features.trend > 0.1) {
      recommendations.push('Dispute rate is trending upward. Investigate root causes.');
    }

    if (prediction > 0.5) {
      recommendations.push('Consider shorter liveness periods to reduce exposure.');
    }

    if (recommendations.length === 0) {
      recommendations.push('System is operating within normal parameters.');
    }

    return recommendations;
  }

  private generateSettlementRecommendations(
    probability: number,
    data: {
      bondAmount: number;
      livenessPeriod: number;
      marketVolatility: number;
      historicalAccuracy: number;
    },
  ): string[] {
    const recommendations: string[] = [];

    if (probability < 0.5) {
      recommendations.push('Settlement outcome is uncertain. Consider increasing bond amount.');
      recommendations.push('Monitor for potential disputes closely.');
    }

    if (data.marketVolatility > 0.3) {
      recommendations.push('High market volatility may affect settlement. Prepare for potential disputes.');
    }

    if (data.livenessPeriod > 7 * 24 * 60 * 60) {
      recommendations.push('Long liveness period increases exposure. Consider shortening if possible.');
    }

    if (probability > 0.8) {
      recommendations.push('High confidence in positive settlement. System appears healthy.');
    }

    return recommendations;
  }

  private generateRiskRecommendations(
    overallScore: number,
    factors: Array<{ name: string; score: number; description: string }>,
  ): string[] {
    const recommendations: string[] = [];

    const lowScoreFactors = factors.filter((f) => f.score < 0.5);

    if (overallScore < 0.5) {
      recommendations.push('Critical risk level detected. Immediate attention required.');
    }

    lowScoreFactors.forEach((factor) => {
      if (factor.name === 'Dispute Rate') {
        recommendations.push('High dispute rate detected. Review assertion quality and consider increasing bonds.');
      } else if (factor.name === 'Error Rate') {
        recommendations.push('High error rate requires investigation. Check system logs and RPC connectivity.');
      } else if (factor.name === 'Sync Latency') {
        recommendations.push('Sync latency is high. Consider upgrading RPC endpoints or increasing resources.');
      } else if (factor.name === 'Liveness Score') {
        recommendations.push('Liveness score is low. Check if all required services are operational.');
      }
    });

    if (recommendations.length === 0) {
      recommendations.push('System risk is within acceptable levels. Continue monitoring.');
    }

    return recommendations;
  }
}

export const predictiveAnalytics = new PredictiveAnalyticsEngine();

export function usePredictiveAnalytics() {
  return {
    predictDisputeProbability: (input: PredictionInput) => predictiveAnalytics.predictDisputeProbability(input),
    predictSettlementOutcome: (data: Parameters<typeof predictiveAnalytics.predictSettlementOutcome>[0]) =>
      predictiveAnalytics.predictSettlementOutcome(data),
    detectAnomalies: (data: HistoricalDataPoint[]) => predictiveAnalytics.detectAnomalies(data),
    assessRisk: (data: Parameters<typeof predictiveAnalytics.assessRisk>[0]) => predictiveAnalytics.assessRisk(data),
  };
}
