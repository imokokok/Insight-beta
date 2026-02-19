import { crossChainAnalysisService } from '@/features/oracle/services/crossChainAnalysisService';
import { priceDeviationAnalytics } from '@/features/oracle/services/priceDeviationAnalytics';
import { logger } from '@/shared/logger';

import { getSeverityFromDeviation } from '../utils/alertScoring';
import { normalizeSeverity, normalizeStatus } from '../utils/normalize';

import type {
  AlertHistoryPoint,
  AlertHeatmapCell,
  AlertHistoryStats,
  TimeRange,
  GroupBy,
} from '../hooks/useAlertHistory';
import type { AlertSource, UnifiedAlert } from '../types';

async function fetchPriceAnomalies(): Promise<UnifiedAlert[]> {
  try {
    const report = await priceDeviationAnalytics.generateReport();
    const anomalies = report.anomalies || [];

    return anomalies.map((anomaly) => {
      const severity = getSeverityFromDeviation(anomaly.maxDeviationPercent);

      return {
        id: `anomaly-${anomaly.symbol}-${anomaly.timestamp}`,
        source: 'price_anomaly' as AlertSource,
        timestamp: anomaly.timestamp,
        severity,
        status: 'active' as const,
        title: `${anomaly.symbol} Price Deviation`,
        description: `Price deviation detected for ${anomaly.symbol} across protocols`,
        symbol: anomaly.symbol,
        protocols: anomaly.protocols,
        deviation: anomaly.maxDeviationPercent,
        avgPrice: anomaly.avgPrice,
        outlierProtocols: anomaly.outlierProtocols,
      };
    });
  } catch (error) {
    logger.warn('Failed to fetch price anomalies', { error });
    return [];
  }
}

async function fetchCrossChainAlerts(): Promise<UnifiedAlert[]> {
  try {
    const symbols = ['BTC', 'ETH', 'SOL', 'LINK', 'AVAX'];
    const allAlerts: UnifiedAlert[] = [];

    for (const symbol of symbols) {
      try {
        const alerts = await crossChainAnalysisService.detectDeviationAlerts(symbol);
        for (const alert of alerts) {
          allAlerts.push({
            id: `crosschain-${alert.id}`,
            source: 'cross_chain' as AlertSource,
            timestamp:
              typeof alert.timestamp === 'string' ? alert.timestamp : alert.timestamp.toISOString(),
            severity: normalizeSeverity(alert.severity),
            status: normalizeStatus(alert.status),
            title: `${alert.symbol} Cross-Chain Deviation`,
            description: `Price deviation between ${alert.chainA} and ${alert.chainB}`,
            symbol: alert.symbol,
            chainA: alert.chainA,
            chainB: alert.chainB,
            deviation: alert.deviationPercent / 100,
            priceA: alert.priceA,
            priceB: alert.priceB,
            avgPrice: alert.avgPrice,
            reason: alert.reason,
          });
        }
      } catch {
        // Continue with other symbols if one fails
      }
    }

    return allAlerts;
  } catch (error) {
    logger.warn('Failed to fetch cross-chain alerts', { error });
    return [];
  }
}

function getTimeRangeMs(timeRange: TimeRange): number {
  const ranges: Record<TimeRange, number> = {
    '1h': 60 * 60 * 1000,
    '6h': 6 * 60 * 60 * 1000,
    '24h': 24 * 60 * 60 * 1000,
    '7d': 7 * 24 * 60 * 60 * 1000,
    '30d': 30 * 24 * 60 * 60 * 1000,
  };
  return ranges[timeRange];
}

function getIntervalMs(timeRange: TimeRange): number {
  const intervals: Record<TimeRange, number> = {
    '1h': 5 * 60 * 1000,
    '6h': 30 * 60 * 1000,
    '24h': 60 * 60 * 1000,
    '7d': 6 * 60 * 60 * 1000,
    '30d': 24 * 60 * 60 * 1000,
  };
  return intervals[timeRange];
}

function generateTrendData(
  alerts: UnifiedAlert[],
  timeRange: TimeRange,
  groupBy: GroupBy,
): AlertHistoryPoint[] {
  const now = Date.now();
  const rangeMs = getTimeRangeMs(timeRange);
  const intervalMs = getIntervalMs(timeRange);
  const startTime = now - rangeMs;

  const intervals: AlertHistoryPoint[] = [];
  for (let t = startTime; t <= now; t += intervalMs) {
    intervals.push({
      timestamp: new Date(t).toISOString(),
      count: 0,
    });
  }

  alerts.forEach((alert) => {
    const alertTime = new Date(alert.timestamp).getTime();
    if (alertTime >= startTime && alertTime <= now) {
      const intervalIndex = Math.floor((alertTime - startTime) / intervalMs);
      const interval = intervals[intervalIndex];
      if (intervalIndex >= 0 && intervalIndex < intervals.length && interval) {
        interval.count++;

        if (groupBy === 'severity') {
          const sev = alert.severity as keyof AlertHistoryPoint;
          if (sev === 'critical' || sev === 'high' || sev === 'medium' || sev === 'low') {
            interval[sev] = ((interval[sev] as number) || 0) + 1;
          }
        } else if (groupBy === 'source') {
          const src = alert.source as keyof AlertHistoryPoint;
          if (src === 'price_anomaly' || src === 'cross_chain') {
            interval[src] = ((interval[src] as number) || 0) + 1;
          }
        }
      }
    }
  });

  return intervals;
}

function generateHeatmapData(alerts: UnifiedAlert[], timeRange: TimeRange): AlertHeatmapCell[] {
  const now = Date.now();
  const rangeMs = getTimeRangeMs(timeRange);
  const startTime = now - rangeMs;

  const filteredAlerts = alerts.filter((alert) => {
    const alertTime = new Date(alert.timestamp).getTime();
    return alertTime >= startTime && alertTime <= now;
  });

  const heatmap: Map<string, AlertHeatmapCell> = new Map();

  filteredAlerts.forEach((alert) => {
    const date = new Date(alert.timestamp);
    const hour = date.getHours();
    const day = date.getDay();

    const key = `${alert.source}-${hour}-${day}`;
    const existing = heatmap.get(key);

    if (existing) {
      existing.count++;
      if (
        alert.severity === 'critical' ||
        (existing.severity !== 'critical' && alert.severity === 'high')
      ) {
        existing.severity = alert.severity;
      }
    } else {
      heatmap.set(key, {
        source: alert.source,
        hour,
        day,
        count: 1,
        severity: alert.severity,
      });
    }
  });

  return Array.from(heatmap.values());
}

function calculateStats(alerts: UnifiedAlert[], timeRange: TimeRange): AlertHistoryStats {
  const now = Date.now();
  const rangeMs = getTimeRangeMs(timeRange);
  const startTime = now - rangeMs;

  const filteredAlerts = alerts.filter((alert) => {
    const alertTime = new Date(alert.timestamp).getTime();
    return alertTime >= startTime && alertTime <= now;
  });

  const totalAlerts = filteredAlerts.length;
  const hoursInRange = rangeMs / (60 * 60 * 1000);
  const avgPerHour = totalAlerts / hoursInRange;

  const hourCounts = new Map<number, number>();
  filteredAlerts.forEach((alert) => {
    const hour = new Date(alert.timestamp).getHours();
    hourCounts.set(hour, (hourCounts.get(hour) || 0) + 1);
  });

  let peakHour = 0;
  let peakCount = 0;
  hourCounts.forEach((count, hour) => {
    if (count > peakCount) {
      peakCount = count;
      peakHour = hour;
    }
  });

  const halfPoint = startTime + rangeMs / 2;
  const firstHalfCount = filteredAlerts.filter(
    (a) => new Date(a.timestamp).getTime() < halfPoint,
  ).length;
  const secondHalfCount = totalAlerts - firstHalfCount;

  let trend: 'increasing' | 'decreasing' | 'stable' = 'stable';
  let trendPercent = 0;

  if (firstHalfCount > 0) {
    trendPercent = ((secondHalfCount - firstHalfCount) / firstHalfCount) * 100;
    if (trendPercent > 10) trend = 'increasing';
    else if (trendPercent < -10) trend = 'decreasing';
  }

  return {
    totalAlerts,
    avgPerHour: Math.round(avgPerHour * 10) / 10,
    peakHour,
    peakCount,
    trend,
    trendPercent: Math.round(trendPercent * 10) / 10,
  };
}

export interface AlertHistoryOptions {
  timeRange: TimeRange;
  groupBy: GroupBy;
  source?: string;
  severity?: string;
}

export interface AlertHistoryResult {
  trend: AlertHistoryPoint[];
  heatmap: AlertHeatmapCell[];
  stats: AlertHistoryStats;
}

export async function getAlertHistory(options: AlertHistoryOptions): Promise<AlertHistoryResult> {
  const { timeRange, groupBy, source, severity } = options;

  const [priceAnomalies, crossChainAlerts] = await Promise.all([
    fetchPriceAnomalies(),
    fetchCrossChainAlerts(),
  ]);

  let allAlerts: UnifiedAlert[] = [...priceAnomalies, ...crossChainAlerts];

  if (source && source !== 'all') {
    allAlerts = allAlerts.filter((a) => a.source === source);
  }

  if (severity && severity !== 'all') {
    allAlerts = allAlerts.filter((a) => a.severity === severity);
  }

  const trend = generateTrendData(allAlerts, timeRange, groupBy);
  const heatmap = generateHeatmapData(allAlerts, timeRange);
  const stats = calculateStats(allAlerts, timeRange);

  return {
    trend,
    heatmap,
    stats,
  };
}
