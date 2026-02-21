import type { ReliabilityScore, Operator } from '../types/chainlink';

const WEIGHTS = {
  uptime: 0.5,
  responseTime: 0.3,
  feedSupport: 0.2,
};

const RESPONSE_TIME_THRESHOLDS = {
  excellent: 200,
  good: 500,
  average: 1000,
  poor: 2000,
};

const FEED_THRESHOLDS = {
  excellent: 6,
  good: 4,
  average: 2,
};

export function calculateResponseTimeScore(responseTime: number, online: boolean): number {
  if (!online || responseTime <= 0) return 0;

  if (responseTime <= RESPONSE_TIME_THRESHOLDS.excellent) return 100;
  if (responseTime <= RESPONSE_TIME_THRESHOLDS.good) {
    const ratio =
      (responseTime - RESPONSE_TIME_THRESHOLDS.excellent) /
      (RESPONSE_TIME_THRESHOLDS.good - RESPONSE_TIME_THRESHOLDS.excellent);
    return 100 - ratio * 15;
  }
  if (responseTime <= RESPONSE_TIME_THRESHOLDS.average) {
    const ratio =
      (responseTime - RESPONSE_TIME_THRESHOLDS.good) /
      (RESPONSE_TIME_THRESHOLDS.average - RESPONSE_TIME_THRESHOLDS.good);
    return 85 - ratio * 25;
  }
  if (responseTime <= RESPONSE_TIME_THRESHOLDS.poor) {
    const ratio =
      (responseTime - RESPONSE_TIME_THRESHOLDS.average) /
      (RESPONSE_TIME_THRESHOLDS.poor - RESPONSE_TIME_THRESHOLDS.average);
    return 60 - ratio * 30;
  }
  return Math.max(0, 30 - (responseTime - RESPONSE_TIME_THRESHOLDS.poor) / 100);
}

export function calculateFeedSupportScore(feedCount: number): number {
  if (feedCount >= FEED_THRESHOLDS.excellent) return 100;
  if (feedCount >= FEED_THRESHOLDS.good) {
    return (
      80 +
      ((feedCount - FEED_THRESHOLDS.good) / (FEED_THRESHOLDS.excellent - FEED_THRESHOLDS.good)) * 20
    );
  }
  if (feedCount >= FEED_THRESHOLDS.average) {
    return (
      60 +
      ((feedCount - FEED_THRESHOLDS.average) / (FEED_THRESHOLDS.good - FEED_THRESHOLDS.average)) *
        20
    );
  }
  return Math.max(30, (feedCount / FEED_THRESHOLDS.average) * 60);
}

export function calculateUptimeScore(uptimePercentage: number, online: boolean): number {
  if (!online) return 0;
  return Math.min(100, Math.max(0, uptimePercentage));
}

export function calculateReliabilityScore(operator: Operator): ReliabilityScore {
  const uptimePercentage = operator.uptimePercentage ?? (operator.online ? 95 : 0);
  const uptimeScore = calculateUptimeScore(uptimePercentage, operator.online);
  const responseTimeScore = calculateResponseTimeScore(operator.responseTime, operator.online);
  const feedSupportScore = calculateFeedSupportScore(operator.supportedFeeds.length);

  const overall = Math.round(
    uptimeScore * WEIGHTS.uptime +
      responseTimeScore * WEIGHTS.responseTime +
      feedSupportScore * WEIGHTS.feedSupport,
  );

  const trend = generateTrend();

  return {
    overall: Math.min(100, Math.max(0, overall)),
    uptime: Math.round(uptimeScore),
    responseTime: Math.round(responseTimeScore),
    feedSupport: Math.round(feedSupportScore),
    trend,
  };
}

function generateTrend(): 'up' | 'down' | 'stable' {
  const rand = Math.random();
  if (rand < 0.3) return 'up';
  if (rand < 0.6) return 'stable';
  return 'down';
}

export function getScoreColor(score: number): string {
  if (score >= 90) return 'text-green-500';
  if (score >= 80) return 'text-blue-500';
  if (score >= 70) return 'text-yellow-500';
  return 'text-red-500';
}

export function getScoreBgColor(score: number): string {
  if (score >= 90) return 'bg-green-500';
  if (score >= 80) return 'bg-blue-500';
  if (score >= 70) return 'bg-yellow-500';
  return 'bg-red-500';
}

export function getScoreLabel(score: number): string {
  if (score >= 90) return 'excellent';
  if (score >= 80) return 'good';
  if (score >= 70) return 'average';
  return 'poor';
}
