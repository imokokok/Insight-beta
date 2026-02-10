/**
 * SLO Reports API
 *
 * SLO 报告查询 API
 */

import { NextResponse } from 'next/server';

import { logger } from '@/lib/logger';
import { query } from '@/server/db';

interface SloDefinition {
  id: string;
  name: string;
  protocol: string;
  chain: string;
  metricType: string;
  targetValue: string;
  thresholdValue: string;
  evaluationWindow: string;
}

interface SloMetric {
  actualValue: string;
  targetValue: string;
  isCompliant: boolean;
  complianceRate: string;
  totalEvents: string;
  goodEvents: string;
  badEvents: string;
  windowStart: string;
  windowEnd: string;
}

interface ErrorBudgetRow {
  totalBudget: string;
  usedBudget: string;
  remainingBudget: string;
  burnRate: string;
  status: string;
}

// GET /api/slo/reports - 获取 SLO 报告列表
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const sloId = searchParams.get('sloId');
    const protocol = searchParams.get('protocol');
    const chain = searchParams.get('chain');

    // 获取所有 SLO 定义
    let sloSql = `
      SELECT 
        id, name, protocol, chain, metric_type as "metricType",
        target_value as "targetValue", threshold_value as "thresholdValue",
        evaluation_window as "evaluationWindow"
      FROM slo_definitions
      WHERE is_active = true
    `;
    const sloParams: string[] = [];

    if (sloId) {
      sloParams.push(sloId);
      sloSql += ` AND id = $${sloParams.length}`;
    }

    if (protocol) {
      sloParams.push(protocol);
      sloSql += ` AND protocol = $${sloParams.length}`;
    }

    if (chain) {
      sloParams.push(chain);
      sloSql += ` AND chain = $${sloParams.length}`;
    }

    const sloResult = await query(sloSql, sloParams);
    const slos = sloResult.rows as SloDefinition[];

    // 为每个 SLO 生成报告
    const reports = await Promise.all(
      slos.map(async (slo) => {
        // 获取最新的 SLO 指标
        const metricsResult = await query(
          `
          SELECT 
            actual_value as "actualValue",
            target_value as "targetValue",
            is_compliant as "isCompliant",
            compliance_rate as "complianceRate",
            total_events as "totalEvents",
            good_events as "goodEvents",
            bad_events as "badEvents",
            window_start as "windowStart",
            window_end as "windowEnd"
          FROM slo_metrics
          WHERE slo_id = $1
          ORDER BY window_end DESC
          LIMIT 30
        `,
          [slo.id],
        );

        const metrics = metricsResult.rows as SloMetric[];
        const latestMetric = metrics[0];

        // 计算当前合规率
        const currentCompliance = latestMetric ? parseFloat(latestMetric.complianceRate) : 100;

        // 确定状态
        let status: 'compliant' | 'at_risk' | 'breached' = 'compliant';
        if (currentCompliance < parseFloat(slo.thresholdValue)) {
          status = 'breached';
        } else if (currentCompliance < parseFloat(slo.targetValue)) {
          status = 'at_risk';
        }

        // 获取 Error Budget
        const ebResult = await query(
          `
          SELECT 
            total_budget as "totalBudget",
            used_budget as "usedBudget",
            remaining_budget as "remainingBudget",
            burn_rate as "burnRate",
            status as "status"
          FROM error_budgets
          WHERE slo_id = $1
          AND period_end > NOW()
          ORDER BY period_start DESC
          LIMIT 1
        `,
          [slo.id],
        );

        const errorBudgetRow = ebResult.rows[0] as ErrorBudgetRow | undefined;
        const errorBudget = errorBudgetRow || {
          totalBudget: String((100 - parseFloat(slo.targetValue)) * 432),
          usedBudget: '0',
          remainingBudget: String((100 - parseFloat(slo.targetValue)) * 432),
          burnRate: '0',
          status: 'healthy',
        };

        // 计算趋势
        const trend = calculateTrend(metrics);

        // 计算预计耗尽时间
        const burnRate = parseFloat(errorBudget.burnRate);
        const remainingBudget = parseFloat(errorBudget.remainingBudget);
        const daysUntilExhaustion =
          burnRate > 0 ? Math.round(remainingBudget / burnRate) : undefined;

        return {
          sloId: slo.id,
          name: slo.name,
          protocol: slo.protocol,
          chain: slo.chain,
          metricType: slo.metricType,
          targetValue: parseFloat(slo.targetValue),
          currentCompliance,
          status,
          evaluationWindow: slo.evaluationWindow,
          errorBudget: {
            total: parseFloat(errorBudget.totalBudget),
            used: parseFloat(errorBudget.usedBudget),
            remaining: remainingBudget,
            burnRate: burnRate,
            daysUntilExhaustion,
            status: errorBudget.status,
          },
          recentMetrics: metrics.map((m) => ({
            timestamp: m.windowEnd,
            complianceRate: parseFloat(m.complianceRate),
            isCompliant: m.isCompliant,
            totalEvents: parseInt(m.totalEvents),
            goodEvents: parseInt(m.goodEvents),
            badEvents: parseInt(m.badEvents),
          })),
          trend,
        };
      }),
    );

    return NextResponse.json({
      success: true,
      data: {
        reports,
        summary: {
          total: reports.length,
          compliant: reports.filter((r) => r.status === 'compliant').length,
          atRisk: reports.filter((r) => r.status === 'at_risk').length,
          breached: reports.filter((r) => r.status === 'breached').length,
        },
      },
    });
  } catch (error) {
    logger.error('Failed to fetch SLO reports', { error });
    return NextResponse.json(
      { success: false, error: 'Failed to fetch SLO reports' },
      { status: 500 },
    );
  }
}

// POST /api/slo/evaluate - 手动触发 SLO 评估
export async function POST(_request: Request) {
  try {
    // 获取所有活跃的 SLO 定义
    const sloResult = await query(
      `
      SELECT id, target_value as "targetValue", evaluation_window as "evaluationWindow"
      FROM slo_definitions
      WHERE is_active = true
    `,
    );

    const slos = sloResult.rows as Array<{
      id: string;
      targetValue: string;
      evaluationWindow: string;
    }>;
    const results = [];

    for (const slo of slos) {
      // 模拟评估逻辑（实际应该查询真实数据）
      const windowEnd = new Date();
      const windowStart = new Date(windowEnd.getTime() - parseWindow(slo.evaluationWindow));

      // 这里应该查询实际的指标数据
      // 现在使用模拟数据
      const totalEvents = 1000;
      const goodEvents = 995;
      const badEvents = totalEvents - goodEvents;
      const complianceRate = (goodEvents / totalEvents) * 100;
      const isCompliant = complianceRate >= parseFloat(slo.targetValue);

      // 保存指标
      const metricResult = await query(
        `
        INSERT INTO slo_metrics (
          id, slo_id, actual_value, target_value, is_compliant,
          compliance_rate, total_events, good_events, bad_events,
          window_start, window_end, created_at
        ) VALUES (
          gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW()
        )
        RETURNING id
      `,
        [
          slo.id,
          complianceRate,
          parseFloat(slo.targetValue),
          isCompliant,
          complianceRate,
          totalEvents,
          goodEvents,
          badEvents,
          windowStart,
          windowEnd,
        ],
      );

      const row = metricResult.rows[0] as { id: string } | undefined;
      if (row) {
        results.push({
          sloId: slo.id,
          metricId: row.id,
          complianceRate,
          isCompliant,
        });
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        evaluated: results.length,
        results,
      },
    });
  } catch (error) {
    logger.error('Failed to evaluate SLOs', { error });
    return NextResponse.json({ success: false, error: 'Failed to evaluate SLOs' }, { status: 500 });
  }
}

// 辅助函数：计算趋势
function calculateTrend(
  metrics: Array<{ complianceRate: string }>,
): 'improving' | 'stable' | 'degrading' {
  if (metrics.length < 2) return 'stable';

  const recent = metrics.slice(0, 7);
  const old = metrics.slice(-7);

  const recentAvg =
    recent.reduce((sum, m) => sum + parseFloat(m.complianceRate), 0) / recent.length;
  const oldAvg = old.reduce((sum, m) => sum + parseFloat(m.complianceRate), 0) / old.length;

  const diff = recentAvg - oldAvg;

  if (diff > 1) return 'improving';
  if (diff < -1) return 'degrading';
  return 'stable';
}

// 辅助函数：解析时间窗口
function parseWindow(window: string): number {
  const units: Record<string, number> = {
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  };

  const match = window.match(/(\d+)([hd])/);
  if (!match) return 30 * 24 * 60 * 60 * 1000; // 默认 30 天

  const num = match[1];
  const unit = match[2];
  if (!num || !unit) return 30 * 24 * 60 * 60 * 1000;
  const unitValue = units[unit];
  if (!unitValue) return 30 * 24 * 60 * 60 * 1000;
  return parseInt(num) * unitValue;
}
