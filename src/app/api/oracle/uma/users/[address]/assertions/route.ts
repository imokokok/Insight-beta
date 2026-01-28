import { listUMAAssertions } from '@/server/oracle/umaState';
import type { UMAAssertion } from '@/lib/types/oracleTypes';
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
    const status = searchParams.get('status') as UMAAssertion['status'] | undefined;
    const limit = searchParams.get('limit');
    const offset = searchParams.get('offset');

    if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
      return NextResponse.json({ error: 'Invalid address' }, { status: 400 });
    }

    const result = await listUMAAssertions({
      instanceId,
      status,
      limit: limit ? parseInt(limit) : undefined,
      offset: offset ? parseInt(offset) : undefined,
    });

    const userAssertions = result.assertions.filter(
      (a) => a.proposer.toLowerCase() === address.toLowerCase(),
    );

    return NextResponse.json({
      assertions: userAssertions,
      total: userAssertions.length,
      limit: 100,
      offset: parseInt(offset || '0'),
    });
  } catch (error) {
    console.error('Failed to get user assertions:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
