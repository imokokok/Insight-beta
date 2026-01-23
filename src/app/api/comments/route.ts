import { NextRequest } from "next/server";
import { handleApi } from "@/server/apiResponse";
import { logger } from "@/lib/logger";
import type { Comment, CommentCreateInput, CommentFilter } from "@/lib/commentTypes";
import { db } from "@/server/db";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  return handleApi(request, async () => {
    const { searchParams } = new URL(request.url);
    const entityType = searchParams.get("entityType") as Comment["entityType"] | undefined;
    const entityId = searchParams.get("entityId") || undefined;
    const authorAddress = searchParams.get("authorAddress") || undefined;
    const limit = Number(searchParams.get("limit")) || 50;
    const offset = Number(searchParams.get("offset")) || 0;
    const sortBy = searchParams.get("sortBy") || "newest";

    const filter: CommentFilter = {
        entityType,
        entityId,
        authorAddress,
        limit,
        offset,
        sortBy: sortBy as "newest" | "oldest" | "most_liked",
      };

    try {
      const orderByClause = sortBy === "newest"
        ? "ORDER BY c.created_at DESC"
        : sortBy === "oldest"
          ? "ORDER BY c.created_at ASC"
          : sortBy === "most_liked"
            ? "ORDER BY c.likes DESC, c.created_at DESC"
            : "ORDER BY c.created_at DESC";

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
        WHERE c.is_deleted = false
          ${filter.entityType ? "AND c.entity_type = $1" : ""}
          ${filter.entityId ? "AND c.entity_id = $2" : ""}
          ${filter.authorAddress ? "AND c.author_address = $3" : ""}
        ${orderByClause}
        LIMIT $4 OFFSET $5
        `,
        [
          filter.entityType,
          filter.entityId,
          filter.authorAddress,
          limit,
          offset,
        ].filter(Boolean),
      );

      const countResult = await db.query<{ count: bigint }>(
        `
        SELECT COUNT(*) as count 
        FROM comments c
        WHERE c.is_deleted = false
          ${filter.entityType ? "AND c.entity_type = $1" : ""}
          ${filter.entityId ? "AND c.entity_id = $2" : ""}
          ${filter.authorAddress ? "AND c.author_address = $3" : ""}
        `,
        [
          filter.entityType,
          filter.entityId,
          filter.authorAddress,
        ].filter(Boolean),
      );

      return {
        items: result.rows,
        total: Number(countResult.rows[0]?.count || 0),
        limit,
        offset,
      };
    } catch (error) {
      logger.error("Failed to query comments", { error, filter });
      throw error;
    }
  });
}

export async function POST(request: NextRequest) {
  return handleApi(request, async () => {
    const input = (await request.json()) as CommentCreateInput;
    const { searchParams } = new URL(request.url);
    const authorAddress = searchParams.get("authorAddress");

    if (!authorAddress) {
      return { error: "missing_author_address" };
    }

    if (!input.entityType || !input.entityId || !input.content) {
      return { error: "invalid_request_body" };
    }

    if (input.content.length > 1000) {
      return { error: "comment_too_long" };
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
        [
          input.entityType,
          input.entityId,
          authorAddress,
          input.content,
          input.parentId || null,
        ],
      );

      logger.info("Comment created", {
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
      logger.error("Failed to create comment", { error, input });
      throw error;
    }
  });
}