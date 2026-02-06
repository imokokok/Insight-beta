import { NextResponse } from 'next/server';

import { z } from 'zod';

import { getConfigHistory } from '@/server/oracleConfigHistory';

const querySchema = z.object({
  instanceId: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  cursor: z.coerce.number().int().min(0).optional().default(0),
  changeType: z.enum(['create', 'update', 'delete', 'rollback']).optional(),
});

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const params = querySchema.parse(Object.fromEntries(searchParams));

    const result = await getConfigHistory({
      instanceId: params.instanceId,
      limit: params.limit,
      cursor: params.cursor,
      changeType: params.changeType,
    });

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid parameters', details: error.format() },
        { status: 400 },
      );
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
