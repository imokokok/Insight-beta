import { NextResponse } from 'next/server';

import { crossChainAnalysisService } from '@/server/oracle/crossChainAnalysisService';

export async function GET() {
  try {
    const dashboard = await crossChainAnalysisService.getDashboardData();

    return NextResponse.json({
      success: true,
      data: dashboard,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Cross-chain dashboard error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get dashboard data',
      },
      { status: 500 }
    );
  }
}
