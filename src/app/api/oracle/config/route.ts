import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    mode: 'real',
    chains: [],
    syncInterval: 30000,
  });
}
