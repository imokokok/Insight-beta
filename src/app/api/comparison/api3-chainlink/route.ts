import type { NextRequest } from 'next/server';

import { ok, error } from '@/lib/api/apiResponse';
import { logger } from '@/shared/logger';

export interface ComparisonData {
  latency: {
    api3: {
      avgResponseTime: number;
      p50ResponseTime: number;
      p95ResponseTime: number;
      p99ResponseTime: number;
      samples: number;
    };
    chainlink: {
      avgResponseTime: number;
      ocrLatency: number;
      p50Latency: number;
      p95Latency: number;
      p99Latency: number;
      samples: number;
    };
    comparison: {
      fasterProtocol: 'api3' | 'chainlink';
      differencePercent: number;
    };
  };
  availability: {
    api3: {
      uptime: number;
      airnodeCount: number;
      onlineAirnodes: number;
      offlineAirnodes: number;
      avgHeartbeatAge: number;
      last24hDowntime: number;
    };
    chainlink: {
      uptime: number;
      nodeCount: number;
      onlineNodes: number;
      offlineNodes: number;
      last24hDowntime: number;
    };
    comparison: {
      higherUptime: 'api3' | 'chainlink';
      differencePercent: number;
    };
  };
  gasCost: {
    api3: {
      avgGasPerUpdate: number;
      avgGasCostUsd: number;
      avgGasCostEth: number;
      updateFrequency: number;
      dailyGasCostUsd: number;
    };
    chainlink: {
      avgGasPerUpdate: number;
      avgGasCostUsd: number;
      avgGasCostEth: number;
      ocrGasOverhead: number;
      dailyGasCostUsd: number;
    };
    comparison: {
      cheaperProtocol: 'api3' | 'chainlink';
      savingsPercent: number;
    };
  };
  dataQuality: {
    api3: {
      deviationRate: number;
      deviationThreshold: number;
      updateFrequency: number;
      dataFreshness: number;
      signatureVerification: boolean;
      updateCount24h: number;
    };
    chainlink: {
      deviationRate: number;
      deviationThreshold: number;
      updateFrequency: number;
      deviationCheckCount: number;
      fallbackTriggeredCount: number;
    };
    comparison: {
      betterQuality: 'api3' | 'chainlink';
      freshnessDiff: number;
    };
  };
  historicalData: {
    latencyHistory: Array<{
      timestamp: string;
      api3: number;
      chainlink: number;
    }>;
    uptimeHistory: Array<{
      timestamp: string;
      api3: number;
      chainlink: number;
    }>;
    gasHistory: Array<{
      timestamp: string;
      api3: number;
      chainlink: number;
    }>;
  };
  lastUpdated: string;
  isMock: boolean;
}

function generateMockData(): ComparisonData {
  const now = Date.now();
  const historyPoints = 48;
  const interval = 3600000;

  const latencyHistory = [];
  const uptimeHistory = [];
  const gasHistory = [];

  for (let i = 0; i < historyPoints; i++) {
    const timestamp = new Date(now - (historyPoints - 1 - i) * interval).toISOString();

    latencyHistory.push({
      timestamp,
      api3: 25 + Math.random() * 15,
      chainlink: 40 + Math.random() * 20,
    });

    uptimeHistory.push({
      timestamp,
      api3: 99.5 + Math.random() * 0.5,
      chainlink: 99.3 + Math.random() * 0.7,
    });

    gasHistory.push({
      timestamp,
      api3: 45000 + Math.random() * 15000,
      chainlink: 85000 + Math.random() * 25000,
    });
  }

  const api3Latency = 28 + Math.random() * 8;
  const chainlinkLatency = 45 + Math.random() * 15;
  const latencyDiff =
    (Math.abs(api3Latency - chainlinkLatency) / Math.max(api3Latency, chainlinkLatency)) * 100;

  const api3Uptime = 99.85 + Math.random() * 0.15;
  const chainlinkUptime = 99.75 + Math.random() * 0.25;

  const api3Gas = 48000 + Math.random() * 12000;
  const chainlinkGas = 90000 + Math.random() * 30000;

  const api3Deviation = 0.015 + Math.random() * 0.02;
  const chainlinkDeviation = 0.02 + Math.random() * 0.025;

  return {
    latency: {
      api3: {
        avgResponseTime: api3Latency,
        p50ResponseTime: api3Latency * 0.8,
        p95ResponseTime: api3Latency * 1.5,
        p99ResponseTime: api3Latency * 2.2,
        samples: 15000 + Math.floor(Math.random() * 5000),
      },
      chainlink: {
        avgResponseTime: chainlinkLatency,
        ocrLatency: chainlinkLatency * 1.8,
        p50Latency: chainlinkLatency * 0.85,
        p95Latency: chainlinkLatency * 1.6,
        p99Latency: chainlinkLatency * 2.5,
        samples: 25000 + Math.floor(Math.random() * 10000),
      },
      comparison: {
        fasterProtocol: api3Latency < chainlinkLatency ? 'api3' : 'chainlink',
        differencePercent: latencyDiff,
      },
    },
    availability: {
      api3: {
        uptime: api3Uptime,
        airnodeCount: 18 + Math.floor(Math.random() * 6),
        onlineAirnodes: 17 + Math.floor(Math.random() * 3),
        offlineAirnodes: Math.floor(Math.random() * 2),
        avgHeartbeatAge: 25 + Math.random() * 20,
        last24hDowntime: Math.random() * 5,
      },
      chainlink: {
        uptime: chainlinkUptime,
        nodeCount: 31 + Math.floor(Math.random() * 10),
        onlineNodes: 29 + Math.floor(Math.random() * 4),
        offlineNodes: Math.floor(Math.random() * 3),
        last24hDowntime: Math.random() * 15,
      },
      comparison: {
        higherUptime: api3Uptime > chainlinkUptime ? 'api3' : 'chainlink',
        differencePercent: Math.abs(api3Uptime - chainlinkUptime),
      },
    },
    gasCost: {
      api3: {
        avgGasPerUpdate: api3Gas,
        avgGasCostUsd: (api3Gas / 1e6) * 35,
        avgGasCostEth: (api3Gas / 1e6) * 0.012,
        updateFrequency: 30 + Math.random() * 15,
        dailyGasCostUsd: (api3Gas / 1e6) * 35 * 2880,
      },
      chainlink: {
        avgGasPerUpdate: chainlinkGas,
        avgGasCostUsd: (chainlinkGas / 1e6) * 35,
        avgGasCostEth: (chainlinkGas / 1e6) * 0.012,
        ocrGasOverhead: 35000 + Math.random() * 10000,
        dailyGasCostUsd: (chainlinkGas / 1e6) * 35 * 2880,
      },
      comparison: {
        cheaperProtocol: api3Gas < chainlinkGas ? 'api3' : 'chainlink',
        savingsPercent: (Math.abs(api3Gas - chainlinkGas) / Math.max(api3Gas, chainlinkGas)) * 100,
      },
    },
    dataQuality: {
      api3: {
        deviationRate: api3Deviation * 100,
        deviationThreshold: 0.5,
        updateFrequency: 96 + Math.random() * 4,
        dataFreshness: 28 + Math.random() * 10,
        signatureVerification: true,
        updateCount24h: 2700 + Math.floor(Math.random() * 300),
      },
      chainlink: {
        deviationRate: chainlinkDeviation * 100,
        deviationThreshold: 0.5,
        updateFrequency: 94 + Math.random() * 6,
        deviationCheckCount: 5000 + Math.floor(Math.random() * 2000),
        fallbackTriggeredCount: Math.floor(Math.random() * 3),
      },
      comparison: {
        betterQuality: api3Deviation < chainlinkDeviation ? 'api3' : 'chainlink',
        freshnessDiff: Math.abs(28 + Math.random() * 10 - (35 + Math.random() * 15)),
      },
    },
    historicalData: {
      latencyHistory,
      uptimeHistory,
      gasHistory,
    },
    lastUpdated: new Date().toISOString(),
    isMock: true,
  };
}

export async function GET(_request: NextRequest) {
  const requestStartTime = performance.now();

  try {
    const data = generateMockData();

    const requestTime = performance.now() - requestStartTime;

    logger.info('API3 vs Chainlink comparison API request completed', {
      performance: { totalRequestTimeMs: Math.round(requestTime) },
      responseStats: {
        hasLatencyData: !!data.latency,
        hasAvailabilityData: !!data.availability,
        hasGasCostData: !!data.gasCost,
        hasDataQualityData: !!data.dataQuality,
      },
    });

    return ok(data);
  } catch (err) {
    const requestTime = performance.now() - requestStartTime;

    logger.error('API3 vs Chainlink comparison API request failed', {
      error: err,
      performance: { totalRequestTimeMs: Math.round(requestTime) },
    });

    return error(
      {
        code: 'internal_error',
        message: err instanceof Error ? err.message : 'Internal server error',
      },
      500,
    );
  }
}
