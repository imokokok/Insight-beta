/**
 * Event Timeline API
 *
 * 事件时间线 API
 */

import { NextResponse } from 'next/server';

import { query } from '@/lib/database/db';
import { logger } from '@/shared/logger';

// GET /api/timeline/events - 获取事件列表
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const eventTypes = searchParams.getAll('eventType');
    const severity = searchParams.get('severity');
    const protocol = searchParams.get('protocol');
    const chain = searchParams.get('chain');
    const symbol = searchParams.get('symbol');
    const entityType = searchParams.get('entityType');
    const entityId = searchParams.get('entityId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    let sql = `
      SELECT 
        id,
        event_type as "eventType",
        severity,
        title,
        description,
        protocol,
        chain,
        symbol,
        entity_type as "entityType",
        entity_id as "entityId",
        metadata,
        occurred_at as "occurredAt",
        parent_event_id as "parentEventId",
        related_event_ids as "relatedEventIds",
        source,
        source_user as "sourceUser",
        created_at as "createdAt"
      FROM event_timeline
      WHERE 1=1
    `;
    const params: (string | string[])[] = [];

    if (eventTypes.length > 0) {
      params.push(eventTypes);
      sql += ` AND event_type = ANY($${params.length})`;
    }

    if (severity) {
      params.push(severity);
      sql += ` AND severity = $${params.length}`;
    }

    if (protocol) {
      params.push(protocol);
      sql += ` AND protocol = $${params.length}`;
    }

    if (chain) {
      params.push(chain);
      sql += ` AND chain = $${params.length}`;
    }

    if (symbol) {
      params.push(symbol);
      sql += ` AND symbol = $${params.length}`;
    }

    if (entityType) {
      params.push(entityType);
      sql += ` AND entity_type = $${params.length}`;
    }

    if (entityId) {
      params.push(entityId);
      sql += ` AND entity_id = $${params.length}`;
    }

    if (startDate) {
      params.push(startDate);
      sql += ` AND occurred_at >= $${params.length}`;
    }

    if (endDate) {
      params.push(endDate);
      sql += ` AND occurred_at <= $${params.length}`;
    }

    // 获取总数
    const countResult = await query(`SELECT COUNT(*) as count FROM (${sql}) as sub`, params);
    const countRow = countResult.rows[0] as { count: string } | undefined;
    const total = countRow ? parseInt(countRow.count) : 0;

    // 添加排序和分页
    sql += ` ORDER BY occurred_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(String(limit), String(offset));

    const result = await query(sql, params);

    return NextResponse.json({
      success: true,
      data: {
        events: result.rows.map((row) => ({
          ...row,
          metadata: row.metadata ? JSON.parse(row.metadata as string) : null,
        })),
        pagination: {
          total,
          limit,
          offset,
          hasMore: offset + limit < total,
        },
      },
    });
  } catch (error) {
    logger.error('Failed to fetch timeline events', { error });
    return NextResponse.json(
      { success: false, error: 'Failed to fetch timeline events' },
      { status: 500 },
    );
  }
}

// POST /api/timeline/events - 创建事件
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      eventType,
      severity = 'info',
      title,
      description,
      protocol,
      chain,
      symbol,
      entityType,
      entityId,
      metadata,
      occurredAt,
      parentEventId,
      relatedEventIds,
      source = 'system',
      sourceUser,
    } = body;

    const result = await query(
      `
      INSERT INTO event_timeline (
        id, event_type, severity, title, description,
        protocol, chain, symbol, entity_type, entity_id,
        metadata, occurred_at, parent_event_id, related_event_ids,
        source, source_user, created_at
      ) VALUES (
        gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, NOW()
      )
      RETURNING 
        id,
        event_type as "eventType",
        severity,
        title,
        description,
        protocol,
        chain,
        symbol,
        entity_type as "entityType",
        entity_id as "entityId",
        metadata,
        occurred_at as "occurredAt",
        parent_event_id as "parentEventId",
        related_event_ids as "relatedEventIds",
        source,
        source_user as "sourceUser",
        created_at as "createdAt"
    `,
      [
        eventType,
        severity,
        title,
        description,
        protocol,
        chain,
        symbol,
        entityType,
        entityId,
        metadata ? JSON.stringify(metadata) : null,
        occurredAt || new Date().toISOString(),
        parentEventId,
        relatedEventIds,
        source,
        sourceUser,
      ],
    );

    const row = result.rows[0];
    if (!row) {
      return NextResponse.json(
        { success: false, error: 'Failed to create timeline event' },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        ...row,
        metadata: row.metadata ? JSON.parse(row.metadata as string) : null,
      },
    });
  } catch (error) {
    logger.error('Failed to create timeline event', { error });
    return NextResponse.json(
      { success: false, error: 'Failed to create timeline event' },
      { status: 500 },
    );
  }
}
