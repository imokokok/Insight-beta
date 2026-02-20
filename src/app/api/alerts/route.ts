import type { NextRequest } from 'next/server';

import type {
  AlertSource,
  AlertStatus,
  UnifiedAlert,
  AlertsSummary,
} from '@/features/alerts/types';
import { getSeverityFromDeviation } from '@/features/alerts/utils/alertScoring';
import { normalizeSeverity, normalizeStatus } from '@/features/alerts/utils/normalize';
import { crossChainAnalysisService } from '@/features/oracle/services/crossChainAnalysisService';
import { priceDeviationAnalytics } from '@/features/oracle/services/priceDeviationAnalytics';
import { error, ok } from '@/lib/api/apiResponse';
import { AppError } from '@/lib/errors';
import { logger } from '@/shared/logger';

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
        status: 'active' as AlertStatus,
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

function calculateSummary(alerts: UnifiedAlert[]): AlertsSummary {
  const summary: AlertsSummary = {
    total: alerts.length,
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
    active: 0,
    resolved: 0,
    bySource: {
      price_anomaly: 0,
      cross_chain: 0,
      security: 0,
    },
  };

  for (const alert of alerts) {
    if (alert.severity === 'critical') summary.critical++;
    else if (alert.severity === 'high' || alert.severity === 'warning') summary.high++;
    else if (alert.severity === 'medium') summary.medium++;
    else if (alert.severity === 'low' || alert.severity === 'info') summary.low++;

    if (alert.status === 'active') summary.active++;
    else if (alert.status === 'resolved') summary.resolved++;

    summary.bySource[alert.source]++;
  }

  return summary;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const source = searchParams.get('source');
    const severity = searchParams.get('severity');
    const status = searchParams.get('status');

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

    if (status && status !== 'all') {
      allAlerts = allAlerts.filter((a) => a.status === status);
    }

    allAlerts.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    const summary = calculateSummary(allAlerts);

    return ok({
      alerts: allAlerts,
      summary,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    logger.error('Failed to fetch alerts', { error: err });

    return error(
      new AppError('Failed to fetch alerts', {
        category: 'INTERNAL',
        statusCode: 500,
        code: 'INTERNAL_ERROR',
        details: {
          alerts: [],
          summary: {
            total: 0,
            critical: 0,
            high: 0,
            medium: 0,
            low: 0,
            active: 0,
            resolved: 0,
            bySource: {
              price_anomaly: 0,
              cross_chain: 0,
              security: 0,
            },
          },
          timestamp: new Date().toISOString(),
        },
      }),
    );
  }
}
