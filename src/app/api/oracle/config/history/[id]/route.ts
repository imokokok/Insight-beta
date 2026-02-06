import { NextResponse } from 'next/server';

import { z } from 'zod';

import { getConfigHistoryEntry, rollbackConfig } from '@/server/oracleConfigHistory';

const paramsSchema = z.object({
  id: z.coerce.number().int().positive(),
});

/**
 * @deprecated 此端点已弃用，请使用 /api/oracle/config-history/{id}
 * 获取配置历史记录详情
 */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = paramsSchema.parse(await params);
    const entry = await getConfigHistoryEntry(id);

    if (!entry) {
      return NextResponse.json({ error: 'History entry not found' }, { status: 404 });
    }

    // 添加弃用警告头
    return NextResponse.json(entry, {
      headers: {
        Deprecation: 'true',
        Sunset: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
        Link: `</api/oracle/config-history/${id}>; rel="successor-version"`,
      },
    });
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

/**
 * @deprecated 此端点已弃用，请使用 /api/oracle/config-history/{id}
 * 回滚到指定的配置版本
 */
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

    // 添加弃用警告头
    return NextResponse.json(
      {
        success: true,
        message: 'Configuration rolled back successfully',
        config: result.config,
      },
      {
        headers: {
          Deprecation: 'true',
          Sunset: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
          Link: `</api/oracle/config-history/${id}>; rel="successor-version"`,
        },
      },
    );
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
