import { NextResponse } from 'next/server';

import { z } from 'zod';

import { getConfigHistoryEntry, rollbackConfig } from '@/server/oracleConfigHistory';

const paramsSchema = z.object({
  id: z.coerce.number().int().positive(),
});

/**
 * 获取配置历史记录详情
 * @param _request - 请求对象
 * @param params - 路由参数，包含历史记录 ID
 * @returns 配置历史记录详情
 *
 * @example
 * GET /api/oracle/config-history/123
 */
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

/**
 * 回滚到指定的配置版本
 * @param request - 请求对象
 * @param params - 路由参数，包含历史记录 ID
 * @returns 回滚结果
 *
 * @example
 * POST /api/oracle/config-history/123
 * {
 *   "changeReason": "Rollback to previous version",
 *   "changedBy": "admin"
 * }
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
