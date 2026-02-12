/**
 * SLO Definitions API
 *
 * SLO 定义管理 API
 */

import { NextResponse } from 'next/server';

import { logger } from '@/shared/logger';
import { query } from '@/infrastructure/database/db';

// GET /api/slo/definitions - 获取 SLO 定义列表
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const protocol = searchParams.get('protocol');
    const chain = searchParams.get('chain');
    const isActive = searchParams.get('isActive');

    let sql = `
      SELECT 
        id, name, description, protocol, chain, metric_type as "metricType",
        target_value as "targetValue", threshold_value as "thresholdValue",
        evaluation_window as "evaluationWindow", error_budget_policy as "errorBudgetPolicy",
        condition_config as "conditionConfig", is_active as "isActive",
        created_at as "createdAt", updated_at as "updatedAt"
      FROM slo_definitions
      WHERE 1=1
    `;
    const params: string[] = [];

    if (protocol) {
      params.push(protocol);
      sql += ` AND protocol = $${params.length}`;
    }

    if (chain) {
      params.push(chain);
      sql += ` AND chain = $${params.length}`;
    }

    if (isActive !== null) {
      params.push(String(isActive === 'true'));
      sql += ` AND is_active = $${params.length}`;
    }

    sql += ` ORDER BY created_at DESC`;

    const result = await query(sql, params);

    return NextResponse.json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    logger.error('Failed to fetch SLO definitions', { error });
    return NextResponse.json(
      { success: false, error: 'Failed to fetch SLO definitions' },
      { status: 500 },
    );
  }
}

// POST /api/slo/definitions - 创建 SLO 定义
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      name,
      description,
      protocol,
      chain,
      metricType,
      targetValue,
      thresholdValue,
      evaluationWindow,
      errorBudgetPolicy,
      conditionConfig,
    } = body;

    const result = await query(
      `
      INSERT INTO slo_definitions (
        id, name, description, protocol, chain, metric_type,
        target_value, threshold_value, evaluation_window, error_budget_policy,
        condition_config, is_active, created_at, updated_at
      ) VALUES (
        gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, true, NOW(), NOW()
      )
      RETURNING 
        id, name, description, protocol, chain, metric_type as "metricType",
        target_value as "targetValue", threshold_value as "thresholdValue",
        evaluation_window as "evaluationWindow", error_budget_policy as "errorBudgetPolicy",
        condition_config as "conditionConfig", is_active as "isActive",
        created_at as "createdAt", updated_at as "updatedAt"
    `,
      [
        name,
        description,
        protocol,
        chain,
        metricType,
        targetValue,
        thresholdValue,
        evaluationWindow,
        errorBudgetPolicy,
        conditionConfig ? JSON.stringify(conditionConfig) : null,
      ],
    );

    return NextResponse.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error) {
    logger.error('Failed to create SLO definition', { error });
    return NextResponse.json(
      { success: false, error: 'Failed to create SLO definition' },
      { status: 500 },
    );
  }
}
