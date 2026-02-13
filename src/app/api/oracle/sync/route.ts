import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    chain: 'ethereum',
    contractAddress: '',
    mode: 'real',
    lastProcessedBlock: '0',
    assertions: 0,
    disputes: 0,
    sync: {
      lastSyncedAt: new Date().toISOString(),
      lastAttemptAt: new Date().toISOString(),
      durationMs: 0,
      error: null,
    },
  });
}
