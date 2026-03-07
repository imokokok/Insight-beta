import { NextRequest, NextResponse } from 'next/server';

interface DataSourceReliability {
  sourceId: string;
  name: string;
  category: string;
  reliabilityScore: number;
  accuracyScore: number;
  availabilityScore: number;
  latencyScore: number;
  totalRequests: number;
  failedRequests: number;
  avgLatency: number;
  uptimePercent: number;
  lastUpdate: string;
  trend: 'up' | 'down' | 'stable';
  historicalAccuracy: number[];
}

export async function GET() {
  try {
    const mockSources: DataSourceReliability[] = [
      {
        sourceId: 'binance',
        name: 'Binance API',
        category: 'CEX',
        reliabilityScore: 98.5,
        accuracyScore: 99.2,
        availabilityScore: 99.8,
        latencyScore: 96.5,
        totalRequests: 2500000,
        failedRequests: 1250,
        avgLatency: 120,
        uptimePercent: 99.95,
        lastUpdate: new Date(Date.now() - 60000).toISOString(),
        trend: 'up',
        historicalAccuracy: [98.8, 98.9, 99.0, 99.1, 99.2, 99.2, 99.2],
      },
      {
        sourceId: 'coinbase',
        name: 'Coinbase Pro',
        category: 'CEX',
        reliabilityScore: 97.8,
        accuracyScore: 98.9,
        availabilityScore: 99.5,
        latencyScore: 95.0,
        totalRequests: 1800000,
        failedRequests: 1800,
        avgLatency: 150,
        uptimePercent: 99.85,
        lastUpdate: new Date(Date.now() - 90000).toISOString(),
        trend: 'stable',
        historicalAccuracy: [98.7, 98.8, 98.8, 98.9, 98.9, 98.9, 98.9],
      },
      {
        sourceId: 'kraken',
        name: 'Kraken',
        category: 'CEX',
        reliabilityScore: 96.5,
        accuracyScore: 98.2,
        availabilityScore: 98.9,
        latencyScore: 92.4,
        totalRequests: 1200000,
        failedRequests: 2400,
        avgLatency: 180,
        uptimePercent: 99.70,
        lastUpdate: new Date(Date.now() - 120000).toISOString(),
        trend: 'down',
        historicalAccuracy: [98.5, 98.4, 98.3, 98.2, 98.2, 98.2, 98.2],
      },
      {
        sourceId: 'chainlink',
        name: 'Chainlink Feeds',
        category: 'Oracle',
        reliabilityScore: 99.2,
        accuracyScore: 99.5,
        availabilityScore: 99.9,
        latencyScore: 98.2,
        totalRequests: 3200000,
        failedRequests: 960,
        avgLatency: 95,
        uptimePercent: 99.98,
        lastUpdate: new Date(Date.now() - 30000).toISOString(),
        trend: 'up',
        historicalAccuracy: [99.2, 99.3, 99.3, 99.4, 99.4, 99.5, 99.5],
      },
      {
        sourceId: 'pyth',
        name: 'Pyth Network',
        category: 'Oracle',
        reliabilityScore: 98.9,
        accuracyScore: 99.3,
        availabilityScore: 99.7,
        latencyScore: 97.7,
        totalRequests: 2800000,
        failedRequests: 1120,
        avgLatency: 85,
        uptimePercent: 99.92,
        lastUpdate: new Date(Date.now() - 45000).toISOString(),
        trend: 'up',
        historicalAccuracy: [99.0, 99.1, 99.1, 99.2, 99.2, 99.3, 99.3],
      },
      {
        sourceId: 'coingecko',
        name: 'CoinGecko API',
        category: 'Aggregator',
        reliabilityScore: 95.2,
        accuracyScore: 97.5,
        availabilityScore: 97.8,
        latencyScore: 90.3,
        totalRequests: 950000,
        failedRequests: 4750,
        avgLatency: 250,
        uptimePercent: 99.50,
        lastUpdate: new Date(Date.now() - 180000).toISOString(),
        trend: 'stable',
        historicalAccuracy: [97.4, 97.5, 97.5, 97.5, 97.5, 97.5, 97.5],
      },
    ];

    const summary = {
      avgReliability: mockSources.reduce((acc, s) => acc + s.reliabilityScore, 0) / mockSources.length,
      totalSources: mockSources.length,
      totalRequests: mockSources.reduce((acc, s) => acc + s.totalRequests, 0),
      avgUptime: mockSources.reduce((acc, s) => acc + s.uptimePercent, 0) / mockSources.length,
    };

    const response: ReliabilityResponse = {
      sources: mockSources,
      summary,
      lastUpdated: new Date().toISOString(),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Failed to fetch data source reliability:', error);
    return NextResponse.json(
      { error: 'Failed to fetch data source reliability' },
      { status: 500 }
    );
  }
}
