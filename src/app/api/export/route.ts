import type { NextRequest } from 'next/server';
import { handleApi } from '@/server/apiResponse';
import { generateExportFilename } from '@/lib/api/export';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

// 输入验证 schema
const exportQuerySchema = z.object({
  type: z.enum(['assertions', 'disputes', 'alerts']),
  format: z.enum(['csv', 'json', 'xlsx']).default('csv'),
  instanceId: z.string().optional(),
  status: z.string().optional(),
  chain: z.string().optional(),
  limit: z.coerce.number().min(1).max(10000).default(1000),
});

export async function GET(request: NextRequest) {
  return handleApi(request, async () => {
    const { searchParams } = new URL(request.url);

    // 解析和验证参数
    const parseResult = exportQuerySchema.safeParse({
      type: searchParams.get('type'),
      format: searchParams.get('format') || 'csv',
      instanceId: searchParams.get('instanceId') || undefined,
      status: searchParams.get('status') || undefined,
      chain: searchParams.get('chain') || undefined,
      limit: searchParams.get('limit'),
    });

    if (!parseResult.success) {
      return { error: 'invalid_parameters', details: parseResult.error.format() };
    }

    const { type, format, instanceId, status, chain, limit } = parseResult.data;

    let data: unknown[] = [];

    switch (type) {
      case 'assertions': {
        const params = new URLSearchParams();
        if (instanceId) params.set('instanceId', instanceId);
        if (status) params.set('status', status);
        if (chain) params.set('chain', chain);
        params.set('limit', String(limit));

        const response = await fetch(
          `${process.env.INSIGHT_BASE_URL || 'http://localhost:3000'}/api/oracle/assertions?${params.toString()}`,
        );
        const result = await response.json();
        data = result.items || [];
        break;
      }
      case 'disputes': {
        const params = new URLSearchParams();
        if (instanceId) params.set('instanceId', instanceId);
        if (status) params.set('status', status);
        if (chain) params.set('chain', chain);
        params.set('limit', String(limit));

        const response = await fetch(
          `${process.env.INSIGHT_BASE_URL || 'http://localhost:3000'}/api/oracle/disputes?${params.toString()}`,
        );
        const result = await response.json();
        data = result.items || [];
        break;
      }
      case 'alerts': {
        const params = new URLSearchParams();
        if (instanceId) params.set('instanceId', instanceId);
        if (status) params.set('status', status);
        params.set('limit', String(limit));

        const response = await fetch(
          `${process.env.INSIGHT_BASE_URL || 'http://localhost:3000'}/api/oracle/alerts?${params.toString()}`,
        );
        const result = await response.json();
        data = result.items || [];
        break;
      }
      default:
        return { error: 'invalid_type' };
    }

    const filename = generateExportFilename(type, format);

    return {
      ok: true,
      data,
      filename,
      format,
    };
  });
}
