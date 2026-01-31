import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { logger } from '@/lib/logger';

const querySchema = z.object({
  chainId: z
    .string()
    .optional()
    .transform((v) => (v ? parseInt(v, 10) : 1)),
  fromBlock: z
    .string()
    .optional()
    .transform((v) => (v ? BigInt(v) : 0n)),
  toBlock: z
    .string()
    .optional()
    .transform((v) => (v ? BigInt(v) : 100n)),
});

/**
 * GET /api/oracle/uma/bridge
 *
 * Query params:
 * - chainId: Chain ID (default: 1)
 * - fromBlock: Start block (default: 0)
 * - toBlock: End block (default: 100)
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const params = querySchema.parse(Object.fromEntries(searchParams));

    // Note: This is a placeholder implementation
    // In production, you would need to configure the bridge address and RPC URL
    return NextResponse.json({
      ok: true,
      data: {
        message: 'Bridge monitoring endpoint - configure bridge address to use',
        params,
      },
    });
  } catch (error) {
    logger.error('Failed to get bridge data', { error });
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : 'Failed to get bridge data',
      },
      { status: 500 },
    );
  }
}
