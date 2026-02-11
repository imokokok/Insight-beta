import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';

import { crossChainAnalysisService } from '@/server/oracle/crossChainAnalysisService';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get('symbol');
  const severity = searchParams.get('severity');

  try {
    if (!symbol) {
      return NextResponse.json(
        { error: 'Symbol is required' },
        { status: 400 }
      );
    }

    const alerts = await crossChainAnalysisService.detectDeviationAlerts(symbol);

    const filteredAlerts = severity
      ? alerts.filter(a => a.severity === severity)
      : alerts;

    return NextResponse.json({
      success: true,
      data: {
        symbol,
        alerts: filteredAlerts,
        summary: {
          total: filteredAlerts.length,
          critical: filteredAlerts.filter(a => a.severity === 'critical').length,
          warning: filteredAlerts.filter(a => a.severity === 'warning').length,
          info: filteredAlerts.filter(a => a.severity === 'info').length,
          active: filteredAlerts.filter(a => a.status === 'active').length,
        },
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Deviation alerts error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to detect deviation alerts',
      },
      { status: 500 }
    );
  }
}
