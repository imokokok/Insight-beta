export interface OracleComparisonData {
  oracleId: string;
  oracleName: string;
  chain: string;
  assertions: number;
  disputes: number;
  accuracy: number;
  avgResponseTime: number;
  uptime: number;
  costEfficiency: number;
  lastUpdated: string;
}

export interface ComparisonMetrics {
  assertionsDiff: number;
  disputesDiff: number;
  accuracyDiff: number;
  responseTimeDiff: number;
  uptimeDiff: number;
  costEfficiencyDiff: number;
  overallScore: number;
  winner: string | null;
}

export interface TimeSeriesComparisonPoint {
  timestamp: string;
  oracle1Value: number;
  oracle2Value: number;
  difference: number;
  percentDiff: number;
}

export interface OracleRanking {
  rank: number;
  oracleId: string;
  oracleName: string;
  score: number;
  strengths: string[];
  weaknesses: string[];
  recommendation: string;
}

export interface CorrelationAnalysis {
  oracle1: string;
  oracle2: string;
  correlationCoefficient: number;
  correlationStrength: "very_strong" | "strong" | "moderate" | "weak" | "very_weak";
  isStatisticallySignificant: boolean;
  pValue: number;
  sampleSize: number;
  interpretation: string;
}

export interface ComparativeInsight {
  type: "advantage" | "disadvantage" | "neutral" | "opportunity";
  metric: string;
  description: string;
  impactedOracle: string;
  magnitude: number;
  recommendation: string;
}

export class MultiOracleComparator {
  private oracles: Map<string, OracleComparisonData> = new Map();
  private historicalData: Map<string, TimeSeriesComparisonPoint[]> = new Map();

  addOracleData(data: OracleComparisonData): void {
    this.oracles.set(data.oracleId, data);
  }

  removeOracle(oracleId: string): boolean {
    return this.oracles.delete(oracleId);
  }

  getOracleData(oracleId: string): OracleComparisonData | null {
    return this.oracles.get(oracleId) || null;
  }

  getAllOracles(): OracleComparisonData[] {
    return Array.from(this.oracles.values());
  }

  compareTwoOracles(oracleId1: string, oracleId2: string): ComparisonMetrics | null {
    const oracle1 = this.oracles.get(oracleId1);
    const oracle2 = this.oracles.get(oracleId2);

    if (!oracle1 || !oracle2) return null;

    const assertionsDiff = oracle2.assertions - oracle1.assertions;
    const disputesDiff = oracle2.disputes - oracle1.disputes;
    const accuracyDiff = oracle2.accuracy - oracle1.accuracy;
    const responseTimeDiff = oracle1.avgResponseTime - oracle2.avgResponseTime;
    const uptimeDiff = oracle2.uptime - oracle1.uptime;
    const costEfficiencyDiff = oracle2.costEfficiency - oracle1.costEfficiency;

    const overallScore = this.calculateOverallScore({
      assertionsDiff,
      disputesDiff,
      accuracyDiff,
      responseTimeDiff,
      uptimeDiff,
      costEfficiencyDiff,
    });

    let winner: string | null = null;
    if (overallScore > 0) winner = oracle2.oracleId;
    else if (overallScore < 0) winner = oracle1.oracleId;

    return {
      assertionsDiff,
      disputesDiff,
      accuracyDiff,
      responseTimeDiff,
      uptimeDiff,
      costEfficiencyDiff,
      overallScore,
      winner,
    };
  }

  private calculateOverallScore(metrics: Omit<ComparisonMetrics, "overallScore" | "winner">): number {
    const weights = {
      assertions: 0.2,
      disputes: 0.15,
      accuracy: 0.25,
      responseTime: 0.15,
      uptime: 0.15,
      costEfficiency: 0.1,
    };

    let score = 0;
    score += (metrics.assertionsDiff / 100) * weights.assertions * 10;
    score += (-metrics.disputesDiff / 10) * weights.disputes * 10;
    score += (metrics.accuracyDiff / 100) * weights.accuracy * 10;
    score += (metrics.responseTimeDiff / 1000) * weights.responseTime * 10;
    score += (metrics.uptimeDiff / 100) * weights.uptime * 10;
    score += (metrics.costEfficiencyDiff / 10) * weights.costEfficiency * 10;

    return score;
  }

  rankAllOracles(): OracleRanking[] {
    const rankings: OracleRanking[] = [];

    this.oracles.forEach((oracle) => {
      const score = this.calculateOracleScore(oracle);
      const strengths = this.identifyStrengths(oracle);
      const weaknesses = this.identifyWeaknesses(oracle);
      const recommendation = this.generateRecommendation(oracle, score);

      rankings.push({
        rank: 0,
        oracleId: oracle.oracleId,
        oracleName: oracle.oracleName,
        score,
        strengths,
        weaknesses,
        recommendation,
      });
    });

    rankings.sort((a, b) => b.score - a.score);

    rankings.forEach((ranking, index) => {
      ranking.rank = index + 1;
    });

    return rankings;
  }

  private calculateOracleScore(oracle: OracleComparisonData): number {
    const weights = {
      accuracy: 0.3,
      uptime: 0.2,
      responseTime: 0.15,
      costEfficiency: 0.15,
      disputeRate: 0.2,
    };

    const disputeRate = oracle.assertions > 0
      ? (oracle.disputes / oracle.assertions) * 100
      : 0;

    const responseTimeScore = Math.max(0, 100 - (oracle.avgResponseTime / 10));
    const disputeRateScore = Math.max(0, 100 - disputeRate);

    return (
      oracle.accuracy * weights.accuracy +
      oracle.uptime * weights.uptime +
      responseTimeScore * weights.responseTime +
      oracle.costEfficiency * weights.costEfficiency +
      disputeRateScore * weights.disputeRate
    ) / 100;
  }

  private identifyStrengths(oracle: OracleComparisonData): string[] {
    const strengths: string[] = [];

    if (oracle.accuracy >= 99) strengths.push("Excellent accuracy (≥99%)");
    if (oracle.uptime >= 99.9) strengths.push("High uptime (≥99.9%)");
    if (oracle.avgResponseTime < 100) strengths.push("Fast response time (<100ms)");
    if (oracle.costEfficiency >= 8) strengths.push("Cost-efficient operations");
    if (oracle.disputes === 0 && oracle.assertions > 10) strengths.push("Zero disputes");
    if (oracle.assertions > 1000) strengths.push("High throughput (>1000 assertions)");

    return strengths;
  }

  private identifyWeaknesses(oracle: OracleComparisonData): string[] {
    const weaknesses: string[] = [];

    if (oracle.accuracy < 95) weaknesses.push("Below average accuracy (<95%)");
    if (oracle.uptime < 99) weaknesses.push("Uptime concerns (<99%)");
    if (oracle.avgResponseTime > 500) weaknesses.push("Slow response time (>500ms)");
    if (oracle.costEfficiency < 5) weaknesses.push("High operational costs");
    if (oracle.disputes > oracle.assertions * 0.1) weaknesses.push("High dispute rate (>10%)");

    return weaknesses;
  }

  private generateRecommendation(oracle: OracleComparisonData, score: number): string {
    if (score >= 90) {
      return "Top performer - recommended for critical applications";
    } else if (score >= 70) {
      return "Solid choice - suitable for most use cases";
    } else if (score >= 50) {
      return "Consider improvements before mission-critical use";
    } else {
      return "Requires significant improvements - use with caution";
    }
  }

  analyzeCorrelation(
    oracleId1: string,
    oracleId2: string,
    dataPoints: TimeSeriesComparisonPoint[],
  ): CorrelationAnalysis {
    const oracle1 = this.oracles.get(oracleId1);
    const oracle2 = this.oracles.get(oracleId2);

    if (!oracle1 || !oracle2) {
      return this.getDefaultCorrelation(oracleId1, oracleId2);
    }

    const values1 = dataPoints.map((p) => p.oracle1Value);
    const values2 = dataPoints.map((p) => p.oracle2Value);

    const correlation = this.calculatePearsonCorrelation(values1, values2);
    const n = dataPoints.length;
    const tStat = correlation * Math.sqrt((n - 2) / (1 - correlation * correlation));
    const pValue = this.calculatePValue(Math.abs(tStat), n - 2);
    const isSignificant = pValue < 0.05;

    let strength: CorrelationAnalysis["correlationStrength"];
    const absCorrelation = Math.abs(correlation);

    if (absCorrelation >= 0.9) strength = "very_strong";
    else if (absCorrelation >= 0.7) strength = "strong";
    else if (absCorrelation >= 0.5) strength = "moderate";
    else if (absCorrelation >= 0.3) strength = "weak";
    else strength = "very_weak";

    const interpretation = this.generateCorrelationInterpretation(
      correlation,
      strength,
      isSignificant,
      oracle1.oracleName,
      oracle2.oracleName,
    );

    return {
      oracle1: oracle1.oracleName,
      oracle2: oracle2.oracleName,
      correlationCoefficient: correlation,
      correlationStrength: strength,
      isStatisticallySignificant: isSignificant,
      pValue,
      sampleSize: n,
      interpretation,
    };
  }

  private calculatePearsonCorrelation(x: number[], y: number[]): number {
    if (x.length !== y.length || x.length === 0) return 0;

    const n = x.length;
    const meanX = x.reduce((a, b) => a + b, 0) / n;
    const meanY = y.reduce((a, b) => a + b, 0) / n;

    let numerator = 0;
    let denomX = 0;
    let denomY = 0;

    for (let i = 0; i < n; i++) {
      const diffX = x[i] - meanX;
      const diffY = y[i] - meanY;
      numerator += diffX * diffY;
      denomX += diffX * diffX;
      denomY += diffY * diffY;
    }

    const denominator = Math.sqrt(denomX * denomY);
    return denominator !== 0 ? numerator / denominator : 0;
  }

  private calculatePValue(tStat: number, df: number): number {
    const x = df / (df + tStat * tStat);
    return this.incompleteBetaFunction(x, df / 2, 0.5);
  }

  private incompleteBetaFunction(x: number, a: number, b: number): number {
    return Math.exp(
      this.logGamma(a + b) -
      this.logGamma(a) -
      this.logGamma(b) +
      a * Math.log(x) +
      b * Math.log(1 - x)
    );
  }

   
  private logGamma(x: number): number {
    const cof = [
      76.18009172947146, -86.50532032941677, 24.01409824083091,
      -1.231739572450155, 0.1208650973866179e-2, -0.5395239384953e-5,
    ];

    let y = x;
    let tmp = x + 5.5;
    tmp -= (x + 0.5) * Math.log(tmp);
    let ser = 1.000000000190015;

    for (let j = 0; j < 6; j++) {
      ser += cof[j] / ++y;
    }

     
    return -tmp + Math.log(2.5066282746310005 * ser / x);
  }

  private generateCorrelationInterpretation(
    correlation: number,
    strength: string,
    isSignificant: boolean,
    name1: string,
    name2: string,
  ): string {
    const direction = correlation > 0 ? "positive" : "negative";
    const significance = isSignificant ? "statistically significant" : "not statistically significant";

    let strengthDesc = "";
    switch (strength) {
      case "very_strong": strengthDesc = "very strong"; break;
      case "strong": strengthDesc = "strong"; break;
      case "moderate": strengthDesc = "moderate"; break;
      case "weak": strengthDesc = "weak"; break;
      case "very_weak": strengthDesc = "very weak or no"; break;
    }

    return `${name1} and ${name2} show a ${strengthDesc} ${direction} correlation that is ${significance}.`;
  }

  private getDefaultCorrelation(oracle1: string, oracle2: string): CorrelationAnalysis {
    return {
      oracle1,
      oracle2,
      correlationCoefficient: 0,
      correlationStrength: "very_weak",
      isStatisticallySignificant: false,
      pValue: 1,
      sampleSize: 0,
      interpretation: `Insufficient data to analyze correlation between ${oracle1} and ${oracle2}.`,
    };
  }

  generateComparativeInsights(oracleId1: string, oracleId2: string): ComparativeInsight[] {
    const comparison = this.compareTwoOracles(oracleId1, oracleId2);
    const oracle1 = this.oracles.get(oracleId1);
    const oracle2 = this.oracles.get(oracleId2);

    if (!comparison || !oracle1 || !oracle2) return [];

    const insights: ComparativeInsight[] = [];

    if (comparison.accuracyDiff > 1) {
      insights.push({
        type: "advantage",
        metric: "Accuracy",
        description: `${oracle2.oracleName} has ${comparison.accuracyDiff.toFixed(1)}% higher accuracy`,
        impactedOracle: oracle2.oracleId,
        magnitude: comparison.accuracyDiff,
        recommendation: "Consider using the higher accuracy oracle for critical decisions",
      });
    } else if (comparison.accuracyDiff < -1) {
      insights.push({
        type: "advantage",
        metric: "Accuracy",
        description: `${oracle1.oracleName} has ${Math.abs(comparison.accuracyDiff).toFixed(1)}% higher accuracy`,
        impactedOracle: oracle1.oracleId,
        magnitude: Math.abs(comparison.accuracyDiff),
        recommendation: "Consider using the higher accuracy oracle for critical decisions",
      });
    }

    if (comparison.responseTimeDiff > 50) {
      insights.push({
        type: "advantage",
        metric: "Response Time",
        description: `${oracle1.oracleName} responds ${comparison.responseTimeDiff.toFixed(0)}ms faster`,
        impactedOracle: oracle1.oracleId,
        magnitude: comparison.responseTimeDiff,
        recommendation: "Use the faster oracle for time-sensitive applications",
      });
    }

    if (comparison.uptimeDiff > 0.1) {
      insights.push({
        type: "advantage",
        metric: "Uptime",
        description: `${oracle2.oracleName} has ${comparison.uptimeDiff.toFixed(2)}% better uptime`,
        impactedOracle: oracle2.oracleId,
        magnitude: comparison.uptimeDiff,
        recommendation: "Prioritize the more reliable oracle for continuous operations",
      });
    }

    if (comparison.costEfficiencyDiff > 1) {
      insights.push({
        type: "opportunity",
        metric: "Cost Efficiency",
        description: `${oracle2.oracleName} is ${comparison.costEfficiencyDiff.toFixed(1)} points more cost-efficient`,
        impactedOracle: oracle2.oracleId,
        magnitude: comparison.costEfficiencyDiff,
        recommendation: "Consider switching to the more cost-efficient option for routine operations",
      });
    }

    return insights;
  }

  getComparisonSummary(): {
    totalOracles: number;
    bestPerformer: OracleRanking | null;
    averageAccuracy: number;
    averageUptime: number;
    totalAssertions: number;
    topCorrelation: CorrelationAnalysis | null;
  } {
    const rankings = this.rankAllOracles();
    const oracles = this.getAllOracles();

    const averageAccuracy = oracles.reduce((sum, o) => sum + o.accuracy, 0) / oracles.length || 0;
    const averageUptime = oracles.reduce((sum, o) => sum + o.uptime, 0) / oracles.length || 0;
    const totalAssertions = oracles.reduce((sum, o) => sum + o.assertions, 0);

    let topCorrelation: CorrelationAnalysis | null = null;
    const oracleIds = Array.from(this.oracles.keys());

    if (oracleIds.length >= 2) {
      for (let i = 0; i < oracleIds.length - 1; i++) {
        for (let j = i + 1; j < oracleIds.length; j++) {
          const correlation = this.analyzeCorrelation(
            oracleIds[i],
            oracleIds[j],
            this.historicalData.get(`${oracleIds[i]}-${oracleIds[j]}`) || [],
          );
          if (!topCorrelation || Math.abs(correlation.correlationCoefficient) > Math.abs(topCorrelation.correlationCoefficient)) {
            topCorrelation = correlation;
          }
        }
      }
    }

    return {
      totalOracles: oracles.length,
      bestPerformer: rankings[0] || null,
      averageAccuracy,
      averageUptime,
      totalAssertions,
      topCorrelation,
    };
  }

  exportComparisonReport(oracleId1: string, oracleId2: string): string {
    const comparison = this.compareTwoOracles(oracleId1, oracleId2);
    const oracle1 = this.oracles.get(oracleId1);
    const oracle2 = this.oracles.get(oracleId2);
    const insights = this.generateComparativeInsights(oracleId1, oracleId2);
    const correlation = this.analyzeCorrelation(
      oracleId1,
      oracle2,
      this.historicalData.get(`${oracleId1}-${oracleId2}`) || [],
    );

    if (!comparison || !oracle1 || !oracle2) {
      return "Insufficient data to generate comparison report";
    }

    return `
# Oracle Comparison Report

## Overview
- **Oracle 1**: ${oracle1.oracleName} (${oracle1.chain})
- **Oracle 2**: ${oracle2.oracleName} (${oracle2.chain})
- **Generated**: ${new Date().toISOString()}

## Metrics Comparison

| Metric | ${oracle1.oracleName} | ${oracle2.oracleName} | Difference |
|--------|----------------------|----------------------|------------|
| Assertions | ${oracle1.assertions} | ${oracle2.assertions} | ${comparison.assertionsDiff} |
| Disputes | ${oracle1.disputes} | ${oracle2.disputes} | ${comparison.disputesDiff} |
| Accuracy | ${oracle1.accuracy.toFixed(2)}% | ${oracle2.accuracy.toFixed(2)}% | ${comparison.accuracyDiff.toFixed(2)}% |
| Avg Response Time | ${oracle1.avgResponseTime}ms | ${oracle2.avgResponseTime}ms | ${comparison.responseTimeDiff}ms |
| Uptime | ${oracle1.uptime.toFixed(2)}% | ${oracle2.uptime.toFixed(2)}% | ${comparison.uptimeDiff.toFixed(2)}% |
| Cost Efficiency | ${oracle1.costEfficiency} | ${oracle2.costEfficiency} | ${comparison.costEfficiencyDiff} |

## Overall Analysis
- **Score Difference**: ${Math.abs(comparison.overallScore).toFixed(2)}
- **Winner**: ${comparison.winner ? (comparison.winner === oracleId1 ? oracle1.oracleName : oracle2.oracleName) : "Tie"}

## Correlation Analysis
- **Correlation Coefficient**: ${correlation.correlationCoefficient.toFixed(4)}
- **Correlation Strength**: ${correlation.correlationStrength.replace("_", " ")}
- **Statistical Significance**: ${correlation.isStatisticallySignificant ? "Yes" : "No"} (p=${correlation.pValue.toFixed(4)})
- **Interpretation**: ${correlation.interpretation}

## Key Insights
${insights.map((i) => `- **${i.metric}**: ${i.description}`).join("\n") || "No significant differences found"}

## Recommendations
${insights.map((i) => `- ${i.recommendation}`).join("\n") || "Both oracles perform similarly"}
    `.trim();
  }
}

export const multiOracleComparator = new MultiOracleComparator();

export function compareOracles(
  oracle1: OracleComparisonData,
  oracle2: OracleComparisonData,
): ComparisonMetrics {
  multiOracleComparator.addOracleData(oracle1);
  multiOracleComparator.addOracleData(oracle2);

  return multiOracleComparator.compareTwoOracles(oracle1.oracleId, oracle2.oracleId)!;
}

export function getOracleRankings(): OracleRanking[] {
  return multiOracleComparator.rankAllOracles();
}
