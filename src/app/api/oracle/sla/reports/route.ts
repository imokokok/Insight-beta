/**
 * SLA Reports API Route
 *
 * SLA 报告 API 路由
 */

import { NextRequest, NextResponse } from 'next/server';
import { generateSLAReport } from '@/server/monitoring/slaMonitor';
import { query } from '@/server/db';
import { logger } from '@/lib/logger';

export async function GET(_request: NextRequest) {
  try {
    // 获取所有活跃的协议和链
    const instances = await query(
      `SELECT DISTINCT protocol, chain FROM unified_oracle_instances WHERE enabled = true`
    );

    // 为每个实例生成报告
    const reports = await Promise.all(
      instances.rows.map(async (instance) => {
        try {
          return await generateSLAReport(instance.protocol, instance.chain, '24h');
        } catch (error) {
          logger.error('Failed to generate SLA report', {
            error,
            protocol: instance.protocol,
            chain: instance.chain,
          });
          return null;
        }
      })
    );

    return NextResponse.json(reports.filter(Boolean));
  } catch (error) {
    logger.error('Failed to get SLA reports', { error });
    return NextResponse.json(
      { error: 'Failed to get SLA reports' },
      { status: 500 }
    );
  }
}
