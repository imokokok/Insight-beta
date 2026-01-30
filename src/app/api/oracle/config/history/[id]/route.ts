import { NextResponse } from 'next/server';
import { getConfigHistoryEntry, rollbackConfig } from '@/server/oracleConfigHistory';
import { z } from 'zod';

const paramsSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = paramsSchema.parse(await params);
    const entry = await getConfigHistoryEntry(id);

    if (!entry) {
      return NextResponse.json({ error: 'History entry not found' }, { status: 404 });
    }

    return NextResponse.json(entry);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid ID', details: error.format() }, { status: 400 });
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

const rollbackSchema = z.object({
  changeReason: z.string().optional(),
  changedBy: z.string().optional(),
});

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = paramsSchema.parse(await params);
    const body = await request.json();
    const options = rollbackSchema.parse(body);

    const result = await rollbackConfig(id, {
      changedBy: options.changedBy,
      changeReason: options.changeReason,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: 'Configuration rolled back successfully',
      config: result.config,
    });
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
