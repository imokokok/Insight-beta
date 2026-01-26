export interface Comment {
  id: number;
  entityType: 'assertion' | 'dispute' | 'alert' | 'incident';
  entityId: string;
  authorAddress: string;
  authorName?: string;
  content: string;
  parentId?: number;
  createdAt: string;
  updatedAt: string;
  likes: number;
  isEdited: boolean;
  isPinned: boolean;
  isDeleted: boolean;
}

export interface CommentWithReplies extends Comment {
  replies?: CommentWithReplies[];
}

export interface CommentCreateInput {
  entityType: Comment['entityType'];
  entityId: string;
  content: string;
  parentId?: number;
}

export interface CommentUpdateInput {
  content: string;
}

export interface CommentFilter {
  entityType?: Comment['entityType'];
  entityId?: string;
  authorAddress?: string;
  limit?: number;
  offset?: number;
  sortBy?: 'newest' | 'oldest' | 'most_liked';
}

export interface CommentStats {
  totalComments: number;
  totalReplies: number;
  uniqueCommenters: number;
  averageRating?: number;
}
