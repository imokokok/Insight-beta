import { calculateMean } from '@/lib/utils/math';

export interface CostMetrics {
  totalCost: number;
  costPerAssertion: number;
  costPerDispute: number;
  costPerVote: number;
  gasCosts: number;
  bondCosts: number;
  operationalCosts: number;
  period: string;
  startDate: string;
  endDate: string;
}

export interface BenefitMetrics {
  totalValueSecured: number;
  valuePerAssertion: number;
  disputesResolved: number;
  disputesPrevented: number;
  averageResolutionTime: number;
  accuracyRate: number;
  uptimePercentage: number;
  period: string;
  startDate: string;
  endDate: string;
}

export interface CostBenefitResult {
  roi: number;
  roiPercentage: number;
  costEfficiencyRatio: number;
  netBenefit: number;
  breakEvenPoint: number;
  efficiencyScore: number;
  recommendations: string[];
}

export interface TimeSeriesDataPoint {
  timestamp: string;
  value: number;
}

export interface CostBenefitAnalysis {
  id: string;
  userId: string;
  period: string;
  costMetrics: CostMetrics;
  benefitMetrics: BenefitMetrics;
  result: CostBenefitResult;
  timeSeriesData: {
    costs: TimeSeriesDataPoint[];
    benefits: TimeSeriesDataPoint[];
    roi: TimeSeriesDataPoint[];
  };
  createdAt: string;
  updatedAt: string;
}

export interface CostProjection {
  period: string;
  projectedCost: number;
  confidence: number;
  factors: string[];
}

export interface BenefitProjection {
  period: string;
  projectedBenefit: number;
  confidence: number;
  factors: string[];
}

export interface EfficiencyBenchmark {
  metric: string;
  current: number;
  industryAverage: number;
  topQuartile: number;
  percentile: number;
}

export class CostBenefitAnalyzer {
  private historicalData: CostBenefitAnalysis[] = [];
  private readonly GAS_PRICE_MULTIPLIER = 0.000000001;
  private readonly BOND_APY = 0.05;

  calculateCostMetrics(
    assertions: number,
    disputes: number,
    votes: number,
    gasUsed: number,
    gasPrice: number,
    bondAmount: number,
    operationalOverhead: number,
    period: string,
    startDate: string,
    endDate: string,
  ): CostMetrics {
    const gasCosts = gasUsed * gasPrice * this.GAS_PRICE_MULTIPLIER;
    const bondCosts = (bondAmount * this.BOND_APY) / 12;
    const totalCost = gasCosts + bondCosts + operationalOverhead;

    return {
      totalCost: Number(totalCost.toFixed(2)),
      costPerAssertion: assertions > 0 ? Number((totalCost / assertions).toFixed(4)) : 0,
      costPerDispute: disputes > 0 ? Number((totalCost / disputes).toFixed(4)) : 0,
      costPerVote: votes > 0 ? Number((totalCost / votes).toFixed(4)) : 0,
      gasCosts: Number(gasCosts.toFixed(2)),
      bondCosts: Number(bondCosts.toFixed(2)),
      operationalCosts: operationalOverhead,
      period,
      startDate,
      endDate,
    };
  }

  calculateBenefitMetrics(
    valueSecured: number,
    assertions: number,
    resolvedDisputes: number,
    preventedDisputes: number,
    avgResolutionHours: number,
    accurateAssertions: number,
    totalAssertions: number,
    uptimeSeconds: number,
    totalSeconds: number,
    period: string,
    startDate: string,
    endDate: string,
  ): BenefitMetrics {
    return {
      totalValueSecured: valueSecured,
      valuePerAssertion: assertions > 0 ? valueSecured / assertions : 0,
      disputesResolved: resolvedDisputes,
      disputesPrevented: preventedDisputes,
      averageResolutionTime: avgResolutionHours,
      accuracyRate: totalAssertions > 0 ? (accurateAssertions / totalAssertions) * 100 : 0,
      uptimePercentage: totalSeconds > 0 ? (uptimeSeconds / totalSeconds) * 100 : 100,
      period,
      startDate,
      endDate,
    };
  }

  calculateCostBenefit(
    costMetrics: CostMetrics,
    benefitMetrics: BenefitMetrics,
  ): CostBenefitResult {
    const totalBenefits = this.estimateTotalBenefits(benefitMetrics);
    const totalCosts = costMetrics.totalCost;
    const netBenefit = totalBenefits - totalCosts;

    const roi = totalCosts > 0 ? netBenefit / totalCosts : 0;
    const roiPercentage = roi * 100;

    const costEfficiencyRatio = totalCosts > 0 ? totalBenefits / totalCosts : 0;

    const breakEvenPoint = this.calculateBreakEvenPoint(costMetrics, benefitMetrics);

    const efficiencyScore = this.calculateEfficiencyScore(costMetrics, benefitMetrics);

    const recommendations = this.generateRecommendations(costMetrics, benefitMetrics);

    return {
      roi: Number(roi.toFixed(4)),
      roiPercentage: Number(roiPercentage.toFixed(2)),
      costEfficiencyRatio: Number(costEfficiencyRatio.toFixed(4)),
      netBenefit: Number(netBenefit.toFixed(2)),
      breakEvenPoint,
      efficiencyScore: Number(efficiencyScore.toFixed(1)),
      recommendations,
    };
  }

  private estimateTotalBenefits(benefits: BenefitMetrics): number {
    const valueSecuredBenefit = benefits.totalValueSecured * 0.01;
    const disputeResolutionBenefit = benefits.disputesResolved * 100;
    const preventionBenefit = benefits.disputesPrevented * 500;
    const accuracyBenefit = benefits.accuracyRate * 10;
    const uptimeBenefit = benefits.uptimePercentage * 5;

    return (
      valueSecuredBenefit +
      disputeResolutionBenefit +
      preventionBenefit +
      accuracyBenefit +
      uptimeBenefit
    );
  }

  private calculateBreakEvenPoint(costs: CostMetrics, benefits: BenefitMetrics): number {
    const monthlyCost = costs.totalCost;
    const monthlyBenefit = this.estimateTotalBenefits(benefits);

    if (monthlyBenefit <= 0) return Infinity;
    if (monthlyCost <= 0) return 0;

    return Number((monthlyCost / monthlyBenefit).toFixed(1));
  }

  private calculateEfficiencyScore(costs: CostMetrics, benefits: BenefitMetrics): number {
    const costScore = Math.min(100, 100 - costs.costPerAssertion * 10);
    const valueScore = Math.min(100, (benefits.valuePerAssertion / 1000) * 100);
    const accuracyScore = benefits.accuracyRate;
    const uptimeScore = benefits.uptimePercentage;

    const weights = { cost: 0.3, value: 0.25, accuracy: 0.25, uptime: 0.2 };

    return (
      costScore * weights.cost +
      valueScore * weights.value +
      accuracyScore * weights.accuracy +
      uptimeScore * weights.uptime
    );
  }

  private generateRecommendations(costs: CostMetrics, benefits: BenefitMetrics): string[] {
    const recommendations: string[] = [];

    if (costs.costPerAssertion > 10) {
      recommendations.push('Consider optimizing gas usage to reduce assertion costs');
    }

    if (benefits.accuracyRate < 95) {
      recommendations.push('Improve data source reliability to increase assertion accuracy');
    }

    if (benefits.uptimePercentage < 99.9) {
      recommendations.push('Enhance infrastructure redundancy to improve uptime');
    }

    if (costs.operationalCosts > costs.totalCost * 0.3) {
      recommendations.push('Review operational overhead for potential cost reductions');
    }

    if (benefits.disputesPrevented < benefits.disputesResolved) {
      recommendations.push('Implement proactive monitoring to prevent disputes before they occur');
    }

    if (recommendations.length === 0) {
      recommendations.push('Great job! Your oracle operations are highly efficient');
      recommendations.push('Consider sharing best practices with the community');
    }

    return recommendations.slice(0, 5);
  }

  projectCosts(historicalCosts: CostMetrics[], months: number): CostProjection[] {
    if (historicalCosts.length < 2) {
      return this.getDefaultProjections(months, 'cost');
    }

    const recentCosts = historicalCosts.slice(-6);
    const avgGrowth = this.calculateAverageGrowth(recentCosts.map((c) => c.totalCost));
    const avgCost = calculateMean(recentCosts.map((c) => c.totalCost));

    const projections: CostProjection[] = [];
    let currentCost = avgCost;

    for (let i = 1; i <= months; i++) {
      currentCost *= 1 + avgGrowth;
      const confidence = Math.max(0.5, 0.95 - i * 0.05);

      projections.push({
        period: `Month ${i}`,
        projectedCost: Number(currentCost.toFixed(2)),
        confidence: Number(confidence.toFixed(2)),
        factors: ['Historical growth rate', 'Network conditions', 'Gas price projections'],
      });
    }

    return projections;
  }

  projectBenefits(historicalBenefits: BenefitMetrics[], months: number): BenefitProjection[] {
    if (historicalBenefits.length < 2) {
      return this.getDefaultProjections(months, 'benefit');
    }

    const recentBenefits = historicalBenefits.slice(-6);
    const avgGrowth = this.calculateAverageGrowth(recentBenefits.map((b) => b.totalValueSecured));
    const avgBenefit = calculateMean(recentBenefits.map((b) => b.totalValueSecured));

    const projections: BenefitProjection[] = [];
    let currentBenefit = avgBenefit;

    for (let i = 1; i <= months; i++) {
      currentBenefit *= 1 + avgGrowth;
      const confidence = Math.max(0.5, 0.95 - i * 0.05);

      projections.push({
        period: `Month ${i}`,
        projectedBenefit: Number(currentBenefit.toFixed(2)),
        confidence: Number(confidence.toFixed(2)),
        factors: ['Historical growth rate', 'Market expansion', 'User adoption'],
      });
    }

    return projections;
  }

  getEfficiencyBenchmarks(costs: CostMetrics, benefits: BenefitMetrics): EfficiencyBenchmark[] {
    return [
      {
        metric: 'Cost per Assertion',
        current: costs.costPerAssertion,
        industryAverage: 5.0,
        topQuartile: 2.0,
        percentile: this.calculateScorePercentile(costs.costPerAssertion, 2.0, 5.0, 10.0),
      },
      {
        metric: 'Value Secured per Dollar',
        current: benefits.valuePerAssertion / costs.costPerAssertion,
        industryAverage: 100,
        topQuartile: 500,
        percentile: this.calculateScorePercentile(
          benefits.valuePerAssertion / costs.costPerAssertion,
          500,
          100,
          50,
        ),
      },
      {
        metric: 'Dispute Resolution Time',
        current: benefits.averageResolutionTime,
        industryAverage: 72,
        topQuartile: 24,
        percentile: this.calculateScorePercentile(
          benefits.averageResolutionTime,
          24,
          72,
          120,
          true,
        ),
      },
      {
        metric: 'Accuracy Rate',
        current: benefits.accuracyRate,
        industryAverage: 95,
        topQuartile: 99,
        percentile: this.calculateScorePercentile(benefits.accuracyRate, 99, 95, 90, false),
      },
      {
        metric: 'Uptime Percentage',
        current: benefits.uptimePercentage,
        industryAverage: 99.5,
        topQuartile: 99.99,
        percentile: this.calculateScorePercentile(
          benefits.uptimePercentage,
          99.99,
          99.5,
          99,
          false,
        ),
      },
    ];
  }

  private calculateAverageGrowth(values: number[]): number {
    if (values.length < 2) return 0;

    const growthRates: number[] = [];
    for (let i = 1; i < values.length; i++) {
      const prevValue = values[i - 1];
      const currentValue = values[i];
      if (prevValue != null && currentValue != null && prevValue > 0) {
        growthRates.push((currentValue - prevValue) / prevValue);
      }
    }

    return growthRates.length > 0 ? calculateMean(growthRates) : 0;
  }

  // 注意：calculateMean 现在从 @/lib/utils/math 导入

  // 这是一个评分函数，不是统计百分位数函数
  private calculateScorePercentile(
    current: number,
    topQuartile: number,
    average: number,
    bottomQuartile: number,
    lowerIsBetter = false,
  ): number {
    if (lowerIsBetter) {
      if (current <= topQuartile) return 90;
      if (current <= average) return 60;
      if (current <= bottomQuartile) return 40;
      return 20;
    } else {
      if (current >= topQuartile) return 90;
      if (current >= average) return 60;
      if (current >= bottomQuartile) return 40;
      return 20;
    }
  }

  private getDefaultProjections<T extends 'cost' | 'benefit'>(
    months: number,
    type: T,
  ): T extends 'cost' ? CostProjection[] : BenefitProjection[] {
    const projections: Array<CostProjection | BenefitProjection> = [];

    for (let i = 1; i <= months; i++) {
      if (type === 'cost') {
        projections.push({
          period: `Month ${i}`,
          projectedCost: 1000 * Math.pow(1.05, i),
          confidence: 0.7,
          factors: ['Historical data insufficient', 'Market conditions'],
        });
      } else {
        projections.push({
          period: `Month ${i}`,
          projectedBenefit: 50000 * Math.pow(1.08, i),
          confidence: 0.7,
          factors: ['Historical data insufficient', 'Market conditions'],
        });
      }
    }

    return projections as T extends 'cost' ? CostProjection[] : BenefitProjection[];
  }

  generateReport(analysis: CostBenefitAnalysis, benchmarks: EfficiencyBenchmark[]): string {
    return `
# Cost-Benefit Analysis Report

## Summary
- **Period**: ${analysis.period}
- **ROI**: ${analysis.result.roiPercentage.toFixed(2)}%
- **Net Benefit**: $${analysis.result.netBenefit.toFixed(2)}
- **Efficiency Score**: ${analysis.result.efficiencyScore}/100

## Cost Breakdown
- **Total Cost**: $${analysis.costMetrics.totalCost.toFixed(2)}
- **Gas Costs**: $${analysis.costMetrics.gasCosts.toFixed(2)}
- **Bond Costs**: $${analysis.costMetrics.bondCosts.toFixed(2)}
- **Operational Costs**: $${analysis.costMetrics.operationalCosts.toFixed(2)}
- **Cost per Assertion**: $${analysis.costMetrics.costPerAssertion.toFixed(4)}

## Benefit Breakdown
- **Total Value Secured**: $${analysis.benefitMetrics.totalValueSecured.toFixed(2)}
- **Disputes Resolved**: ${analysis.benefitMetrics.disputesResolved}
- **Disputes Prevented**: ${analysis.benefitMetrics.disputesPrevented}
- **Accuracy Rate**: ${analysis.benefitMetrics.accuracyRate.toFixed(2)}%
- **Uptime**: ${analysis.benefitMetrics.uptimePercentage.toFixed(2)}%

## Recommendations
${analysis.result.recommendations.map((r) => `- ${r}`).join('\n')}

## Benchmark Comparison
${benchmarks.map((b) => `- ${b.metric}: ${b.percentile}th percentile`).join('\n')}
    `.trim();
  }

  addAnalysis(analysis: CostBenefitAnalysis): void {
    this.historicalData.push(analysis);
  }

  getHistoricalAnalyses(): CostBenefitAnalysis[] {
    return [...this.historicalData];
  }

  getLatestAnalysis(): CostBenefitAnalysis | null {
    const lastIndex = this.historicalData.length - 1;
    if (lastIndex < 0) return null;
    return this.historicalData[lastIndex] ?? null;
  }
}

export const costBenefitAnalyzer = new CostBenefitAnalyzer();

export function calculateOracleCostBenefit(
  assertions: number,
  disputes: number,
  votes: number,
  gasUsed: number,
  gasPrice: number,
  bondAmount: number,
  operationalOverhead: number,
  valueSecured: number,
  resolvedDisputes: number,
  preventedDisputes: number,
  avgResolutionHours: number,
  accurateAssertions: number,
  totalAssertions: number,
  uptimeSeconds: number,
  totalSeconds: number,
  period: string,
  startDate: string,
  endDate: string,
): CostBenefitResult {
  const costMetrics = costBenefitAnalyzer.calculateCostMetrics(
    assertions,
    disputes,
    votes,
    gasUsed,
    gasPrice,
    bondAmount,
    operationalOverhead,
    period,
    startDate,
    endDate,
  );

  const benefitMetrics = costBenefitAnalyzer.calculateBenefitMetrics(
    valueSecured,
    assertions,
    resolvedDisputes,
    preventedDisputes,
    avgResolutionHours,
    accurateAssertions,
    totalAssertions,
    uptimeSeconds,
    totalSeconds,
    period,
    startDate,
    endDate,
  );

  return costBenefitAnalyzer.calculateCostBenefit(costMetrics, benefitMetrics);
}
