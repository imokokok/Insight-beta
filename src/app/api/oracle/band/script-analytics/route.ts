import { NextRequest, NextResponse } from 'next/server';

interface ScriptPerformance {
  scriptId: string;
  name: string;
  totalRequests: number;
  successRate: number;
  avgResponseTime: number;
  requests24h: number;
  requestsChange: number;
  reliability: number;
  popularity: number;
  category: string;
}

export async function GET() {
  try {
    const mockScripts: ScriptPerformance[] = [
      {
        scriptId: 'price_feed',
        name: 'Price Feed',
        totalRequests: 1250000,
        successRate: 99.8,
        avgResponseTime: 450,
        requests24h: 52000,
        requestsChange: 12.5,
        reliability: 99.9,
        popularity: 95,
        category: 'Price Data',
      },
      {
        scriptId: 'crypto_prices',
        name: 'Crypto Prices',
        totalRequests: 890000,
        successRate: 99.5,
        avgResponseTime: 380,
        requests24h: 38000,
        requestsChange: 8.3,
        reliability: 99.7,
        popularity: 88,
        category: 'Price Data',
      },
      {
        scriptId: 'weather_data',
        name: 'Weather Data',
        totalRequests: 345000,
        successRate: 98.9,
        avgResponseTime: 820,
        requests24h: 15000,
        requestsChange: -3.2,
        reliability: 98.5,
        popularity: 65,
        category: 'Real World',
      },
      {
        scriptId: 'sports_results',
        name: 'Sports Results',
        totalRequests: 123000,
        successRate: 97.8,
        avgResponseTime: 580,
        requests24h: 5200,
        requestsChange: 5.1,
        reliability: 97.2,
        popularity: 45,
        category: 'Sports',
      },
      {
        scriptId: 'stock_prices',
        name: 'Stock Prices',
        totalRequests: 892000,
        successRate: 99.6,
        avgResponseTime: 420,
        requests24h: 42000,
        requestsChange: 15.7,
        reliability: 99.8,
        popularity: 92,
        category: 'Price Data',
      },
      {
        scriptId: 'randomness',
        name: 'Randomness Generator',
        totalRequests: 567000,
        successRate: 99.9,
        avgResponseTime: 250,
        requests24h: 25000,
        requestsChange: 22.4,
        reliability: 99.95,
        popularity: 78,
        category: 'Utility',
      },
    ];

    const summary = {
      totalScripts: mockScripts.length,
      avgSuccessRate: mockScripts.reduce((acc, s) => acc + s.successRate, 0) / mockScripts.length,
      avgResponseTime: mockScripts.reduce((acc, s) => acc + s.avgResponseTime, 0) / mockScripts.length,
      totalRequests24h: mockScripts.reduce((acc, s) => acc + s.requests24h, 0),
    };

    const response: ScriptsResponse = {
      scripts: mockScripts,
      summary,
      lastUpdated: new Date().toISOString(),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Failed to fetch script analytics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch script analytics' },
      { status: 500 }
    );
  }
}
