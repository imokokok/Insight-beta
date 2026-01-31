/**
 * Swagger UI API Documentation
 *
 * API 文档页面 - 返回 Swagger JSON 规范
 */

import { getApiDocs } from '@/lib/swagger';

export async function GET() {
  const spec = getApiDocs();
  return new Response(JSON.stringify(spec), {
    headers: {
      'Content-Type': 'application/json',
    },
  });
}
