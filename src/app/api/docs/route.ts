import { NextResponse } from 'next/server';
import { getApiDocs } from '@/lib/swagger';

/**
 * @swagger
 * /api/docs:
 *   get:
 *     summary: 获取 OpenAPI 规范
 *     description: 返回 API 的 OpenAPI 3.0 规范文档
 *     tags:
 *       - Docs
 *     responses:
 *       200:
 *         description: 成功返回 OpenAPI 规范
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 */
export async function GET() {
  const spec = getApiDocs();
  return NextResponse.json(spec);
}
