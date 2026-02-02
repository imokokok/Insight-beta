import type { NextRequest } from 'next/server';
import { handleApi } from '@/server/apiResponse';
import { logger } from '@/lib/logger';
import type { Comment, CommentFilter } from '@/lib/types/commentTypes';
import { db } from '@/server/db';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  return handleApi(request, async () => {
    const { searchParams } = new URL(request.url);
    const entityType = searchParams.get('entityType') as Comment['entityType'] | undefined;
    const entityId = searchParams.get('entityId') || undefined;
    const authorAddress = searchParams.get('authorAddress') || undefined;
    const limit = Number(searchParams.get('limit')) || 50;
    const offset = Number(searchParams.get('offset')) || 0;
    const sortBy = searchParams.get('sortBy') || 'newest';

    const filter: CommentFilter = {
      entityType,
      entityId,
      authorAddress,
      limit,
      offset,
      sortBy: sortBy as 'newest' | 'oldest' | 'most_liked',
    };

    // 使用白名单映射防止 SQL 注入
    const SORT_BY_MAP: Record<string, string> = {
      newest: 'ORDER BY c.created_at DESC',
      oldest: 'ORDER BY c.created_at ASC',
      most_liked: 'ORDER BY c.likes DESC, c.created_at DESC',
    };
    const orderByClause = SORT_BY_MAP[sortBy] || SORT_BY_MAP['newest'];

    try {
      // Build query conditions and parameters safely
      const conditions: string[] = ['c.is_deleted = false'];
      const params: (string | number)[] = [];
      let paramIndex = 1;

      if (filter.entityType) {
        conditions.push(`c.entity_type = $${paramIndex++}`);
        params.push(filter.entityType);
      }
      if (filter.entityId) {
        conditions.push(`c.entity_id = $${paramIndex++}`);
        params.push(filter.entityId);
      }
      if (filter.authorAddress) {
        conditions.push(`c.author_address = $${paramIndex++}`);
        params.push(filter.authorAddress);
      }

      // Add limit and offset with correct parameter indices
      params.push(limit, offset);

      const result = await db.query<Comment>(
        `
        SELECT 
          c.id,
          c.entity_type,
          c.entity_id,
          c.author_address,
          c.author_name,
          c.content,
          c.parent_id,
          c.created_at,
          c.updated_at,
          c.likes,
          c.is_edited,
          c.is_pinned,
          c.is_deleted
        FROM comments c
        WHERE ${conditions.join(' AND ')}
        ${orderByClause}
        LIMIT $${paramIndex++} OFFSET $${paramIndex++}
        `,
        params,
      );

      // Build count query with same conditions (without limit/offset)
      const countParams = params.slice(0, -2); // Remove limit and offset
      const countResult = await db.query<{ count: bigint }>(
        `
        SELECT COUNT(*) as count 
        FROM comments c
        WHERE ${conditions.join(' AND ')}
        `,
        countParams,
      );

      return {
        items: result.rows,
        total: Number(countResult.rows[0]?.count || 0),
        limit,
        offset,
      };
    } catch (error) {
      logger.error('Failed to query comments', { error, filter });
      throw error;
    }
  });
}

const commentCreateSchema = z.object({
  entityType: z.enum(['assertion', 'dispute', 'market', 'protocol']),
  entityId: z.string().min(1).max(100),
  content: z.string().min(1).max(1000),
  parentId: z.number().int().positive().optional().nullable(),
});

export async function POST(request: NextRequest) {
  return handleApi(request, async () => {
    // Check content length before parsing JSON
    const contentLength = request.headers.get('content-length');
    if (contentLength && parseInt(contentLength) > 1024 * 1024) {
      return { error: 'request_body_too_large' };
    }

    const body = await request.json().catch(() => null);
    if (!body) {
      return { error: 'invalid_json' };
    }

    const parseResult = commentCreateSchema.safeParse(body);
    if (!parseResult.success) {
      return { error: 'invalid_request_body', details: parseResult.error.format() };
    }

    const input = parseResult.data;
    const { searchParams } = new URL(request.url);
    const authorAddress = searchParams.get('authorAddress');

    if (!authorAddress || !/^0x[a-fA-F0-9]{40}$/.test(authorAddress)) {
      return { error: 'invalid_author_address' };
    }

    try {
      const result = await db.query<{ id: number }>(
        `
        INSERT INTO comments (
          entity_type, entity_id, author_address, content, parent_id,
          likes, is_edited, is_pinned, is_deleted
        ) VALUES ($1, $2, $3, $4, $5, 0, false, false, false)
        RETURNING id
        `,
        [input.entityType, input.entityId, authorAddress, input.content, input.parentId || null],
      );

      logger.info('Comment created', {
        commentId: result.rows[0]?.id,
        entityType: input.entityType,
        entityId: input.entityId,
        authorAddress,
      });

      return {
        ok: true,
        comment: {
          ...input,
          id: result.rows[0]?.id || 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          likes: 0,
          isEdited: false,
          isPinned: false,
          isDeleted: false,
        },
      };
    } catch (error) {
      logger.error('Failed to create comment', { error, input });
      throw error;
    }
  });
}
