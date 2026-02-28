import { SUPPORTED_SYMBOLS } from '@/config/constants';
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
import { logger } from '@/shared/logger';

export interface FetchAlertsOptions {
  source?: string;
  severity?: string;
  status?: string;
}

export interface FetchAlertsResult {
  alerts: UnifiedAlert[];
  summary: AlertsSummary;
  timestamp: string;
  partialFailure?: {
    failedSymbols: string[];
    hasPartialFailure: boolean;
  };
}

interface CrossChainAlertsResult {
  alerts: UnifiedAlert[];
  failedSymbols: string[];
  hasPartialFailure: boolean;
}

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

async function fetchCrossChainAlerts(): Promise<CrossChainAlertsResult> {
  try {
    const symbols = [...SUPPORTED_SYMBOLS.TICKERS];

    const results = await Promise.allSettled(
      symbols.map(async (symbol) => {
        const alerts = await crossChainAnalysisService.detectDeviationAlerts(symbol);
        return { symbol, alerts };
      }),
    );

    const allAlerts: UnifiedAlert[] = [];
    const failedSymbols: string[] = [];

    for (const result of results) {
      if (result.status === 'fulfilled') {
        const { alerts } = result.value;
        allAlerts.push(
          ...alerts.map((alert) => ({
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
          })),
        );
      } else {
        const resultIndex = results.indexOf(result);
        if (resultIndex >= 0 && resultIndex < symbols.length) {
          failedSymbols.push(symbols[resultIndex]!);
        }
        logger.warn('Failed to fetch cross-chain alerts for a symbol', {
          symbol:
            resultIndex >= 0 && resultIndex < symbols.length ? symbols[resultIndex]! : 'unknown',
          error: result.reason instanceof Error ? result.reason.message : String(result.reason),
        });
      }
    }

    return {
      alerts: allAlerts,
      failedSymbols,
      hasPartialFailure: failedSymbols.length > 0,
    };
  } catch (err) {
    logger.warn('Failed to fetch cross-chain alerts', { error: err });
    return {
      alerts: [],
      failedSymbols: [...SUPPORTED_SYMBOLS.TICKERS],
      hasPartialFailure: true,
    };
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

export async function fetchAlerts(options: FetchAlertsOptions = {}): Promise<FetchAlertsResult> {
  const { source, severity, status } = options;

  const [priceAnomalies, crossChainResult] = await Promise.all([
    fetchPriceAnomalies(),
    fetchCrossChainAlerts(),
  ]);

  let allAlerts: UnifiedAlert[] = [...priceAnomalies, ...crossChainResult.alerts];

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

  const result: FetchAlertsResult = {
    alerts: allAlerts,
    summary,
    timestamp: new Date().toISOString(),
  };

  if (crossChainResult.hasPartialFailure) {
    result.partialFailure = {
      failedSymbols: crossChainResult.failedSymbols,
      hasPartialFailure: crossChainResult.hasPartialFailure,
    };
  }

  return result;
}
