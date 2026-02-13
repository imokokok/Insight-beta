import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    totalAssertions: 0,
    activeAssertions: 0,
    disputedAssertions: 0,
    settledAssertions: 0,
    chains: {},
    recentActivity: [],
  });
}
