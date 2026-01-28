import { getUMAUserStats } from '@/server/oracle/umaState';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ address: string }> },
) {
  try {
    const { address } = await params;
    const { searchParams } = new URL(request.url);
    const instanceId = searchParams.get('instanceId') || undefined;

    if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
      return NextResponse.json({ error: 'Invalid address' }, { status: 400 });
    }

    const stats = await getUMAUserStats(address, instanceId);

    return NextResponse.json(stats);
  } catch (error) {
    console.error('Failed to get UMA user stats:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
