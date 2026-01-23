"use client";

import { useState, useEffect, useCallback } from "react";
import { MessageSquare, ThumbsUp, Reply, Pin, Trash2, Edit2 } from "lucide-react";
import { useI18n } from "@/i18n/LanguageProvider";
import { useWallet } from "@/contexts/WalletContext";
import { fetchApiData, getErrorCode } from "@/lib/utils";
import { getUiErrorMessage } from "@/i18n/translations";
import type { Comment, CommentCreateInput, CommentWithReplies } from "@/lib/commentTypes";
import { useToast } from "@/components/ui/toast";

interface CommentSectionProps {
  entityType: Comment["entityType"];
  entityId: string;
}

export function CommentSection({ entityType, entityId }: CommentSectionProps) {
  const { t } = useI18n();
  const { address } = useWallet();
  const { toast } = useToast();
  const [comments, setComments] = useState<CommentWithReplies[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [replyingTo, setReplyingTo] = useState<number | null>(null);
  const [replyContent, setReplyContent] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editContent, setEditContent] = useState("");

  useEffect(() => {
    loadComments();
  }, [entityType, entityId]);

  const loadComments = async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      params.set("entityType", entityType);
      params.set("entityId", entityId);
      params.set("limit", "50");
      params.set("sortBy", "newest");

      const data = await fetchApiData<{ items: Comment[] }>(
        `/api/comments?${params.toString()}`,
      );

      const commentsWithReplies = buildCommentTree(data.items || []);
      setComments(commentsWithReplies);
    } catch (e) {
      setError(getErrorCode(e));
    } finally {
      setLoading(false);
    }
  };

  const buildCommentTree = (flatComments: Comment[]): CommentWithReplies[] => {
    const commentMap = new Map<number, CommentWithReplies>();
    const rootComments: CommentWithReplies[] = [];

    for (const comment of flatComments) {
      commentMap.set(comment.id, { ...comment, replies: [] });
    }

    for (const comment of flatComments) {
      if (comment.parentId && commentMap.has(comment.parentId)) {
        commentMap.get(comment.parentId)!.replies!.push(commentMap.get(comment.id)!);
      } else {
        rootComments.push(commentMap.get(comment.id)!);
      }
    }

    return rootComments;
  };

  const handleSubmitReply = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!address || !replyContent.trim() || replyingTo === null) return;

    try {
      const input: CommentCreateInput = {
        entityType,
        entityId,
        content: replyContent.trim(),
        parentId: replyingTo,
      };

      await fetchApiData("/api/comments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(input),
      });

      setReplyContent("");
      setReplyingTo(null);
      await loadComments();

      toast({
        title: t("common.success"),
        message: "Comment posted successfully",
        type: "success",
      });
    } catch (err) {
      toast({
        title: "Error",
        message: getUiErrorMessage(getErrorCode(err), t),
        type: "error",
      });
    }
  };

  const handleEditComment = async (commentId: number) => {
    if (!address || !editContent.trim()) return;

    try {
      await fetchApiData(`/api/comments/${commentId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ content: editContent.trim() }),
      });

      setEditContent("");
      setEditingId(null);
      await loadComments();

      toast({
        title: t("common.success"),
        message: "Comment updated successfully",
        type: "success",
      });
    } catch (err) {
      toast({
        title: "Error",
        message: getUiErrorMessage(getErrorCode(err), t),
        type: "error",
      });
    }
  };

  const handleDeleteComment = async (commentId: number) => {
    if (!address) return;

    try {
      await fetchApiData(`/api/comments/${commentId}`, {
        method: "DELETE",
      });

      await loadComments();

      toast({
        title: t("common.success"),
        message: "Comment deleted successfully",
        type: "success",
      });
    } catch (err) {
      toast({
        title: "Error",
        message: getUiErrorMessage(getErrorCode(err), t),
        type: "error",
      });
    }
  };

  const handleLikeComment = async (commentId: number) => {
    if (!address) return;

    try {
      await fetchApiData(`/api/comments/${commentId}/like`, {
        method: "POST",
      });

      await loadComments();
    } catch (err) {
      toast({
        title: "Error",
        message: getUiErrorMessage(getErrorCode(err), t),
        type: "error",
      });
    }
  };

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const renderComment = (comment: CommentWithReplies, depth: number = 0) => {
    const isEditing = editingId === comment.id;
    const isReplying = replyingTo === comment.id;
    const maxDepth = 3;

    return (
      <div
        key={comment.id}
        className={`border-l-2 ${depth === 0 ? "border-purple-200" : "border-gray-200"} pl-4 py-3`}
        style={{ marginLeft: depth > 0 ? `${depth * 16}px` : "0" }}
      >
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0">
            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center text-white font-semibold text-sm">
              {comment.authorName ? comment.authorName[0]?.toUpperCase() : formatAddress(comment.authorAddress)}
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-semibold text-gray-900">
                {comment.authorName || formatAddress(comment.authorAddress)}
              </span>

              {comment.isPinned && (
                <Pin size={14} className="text-purple-600" />
              )}

              <span className="text-xs text-gray-500">
                {formatTimestamp(comment.createdAt)}
                {comment.isEdited && " (edited)"}
              </span>
            </div>

            {isEditing ? (
              <div className="mb-2">
                <textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 p-3 text-sm focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                  rows={3}
                  placeholder="Edit your comment..."
                />
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={() => handleEditComment(comment.id)}
                    className="px-3 py-1.5 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => {
                      setEditingId(null);
                      setEditContent("");
                    }}
                    className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-gray-700 text-sm whitespace-pre-wrap break-words">
                {comment.content}
              </div>
            )}

            <div className="flex items-center gap-4 mt-2">
              <button
                onClick={() => setReplyingTo(comment.id)}
                className="flex items-center gap-1 text-gray-500 hover:text-purple-600 transition-colors text-sm"
              >
                <Reply size={14} />
                <span>Reply</span>
              </button>

              <button
                onClick={() => handleLikeComment(comment.id)}
                className="flex items-center gap-1 text-gray-500 hover:text-purple-600 transition-colors text-sm"
              >
                <ThumbsUp size={14} />
                <span>{comment.likes}</span>
              </button>

              {comment.authorAddress === address && (
                <>
                  <button
                    onClick={() => {
                      setEditingId(comment.id);
                      setEditContent(comment.content);
                    }}
                    className="text-gray-500 hover:text-purple-600 transition-colors"
                  >
                    <Edit2 size={14} />
                  </button>

                  <button
                    onClick={() => handleDeleteComment(comment.id)}
                    className="text-gray-500 hover:text-rose-600 transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </>
              )}
            </div>

            {isReplying && (
              <form onSubmit={handleSubmitReply} className="mt-3">
                <textarea
                  value={replyContent}
                  onChange={(e) => setReplyContent(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 p-3 text-sm focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                  rows={3}
                  placeholder="Write a reply..."
                  autoFocus
                />
                <div className="flex gap-2 mt-2">
                  <button
                    type="submit"
                    className="px-3 py-1.5 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700"
                  >
                    Reply
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setReplyingTo(null);
                      setReplyContent("");
                    }}
                    className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}

            {comment.replies && comment.replies.length > 0 && depth < maxDepth && (
              <div className="mt-4 space-y-3">
                {comment.replies.map((reply) => renderComment(reply, depth + 1))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-gray-500">Loading comments...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-rose-700">
        <p className="text-sm">Failed to load comments: {error}</p>
      </div>
    );
  }

  if (comments.length === 0) {
    return (
      <div className="text-center py-8">
        <MessageSquare className="mx-auto h-12 w-12 text-gray-300 mb-3" />
        <p className="text-gray-500 text-sm">No comments yet. Be the first to share your thoughts!</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">
          Discussion ({comments.length})
        </h3>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <span>Sorted by: Newest</span>
        </div>
      </div>

      <div className="space-y-4">
        {comments.map((comment) => renderComment(comment))}
      </div>
    </div>
  );
}