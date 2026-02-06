/**
 * Database Types - 数据库模型类型扩展
 *
 * 扩展 Prisma 生成的类型，添加业务相关字段
 */

import type { Prisma } from '@prisma/client';

// 重新导出 Prisma 类型
export type {
  OracleConfig as OracleConfigDB,
  PriceHistory,
  Assertion as AssertionDB,
  Dispute as DisputeDB,
  Alert as AlertDB,
  AuditLog as AuditLogDB,
  Prisma,
} from '@prisma/client';

// ============================================================================
// 数据库查询选项
// ============================================================================

export interface QueryOptions {
  include?: Record<string, boolean>;
  select?: Record<string, boolean>;
  where?: Record<string, unknown>;
  orderBy?: Record<string, 'asc' | 'desc'>;
  skip?: number;
  take?: number;
}

export interface TransactionOptions {
  isolationLevel?: Prisma.TransactionIsolationLevel;
  maxWait?: number;
  timeout?: number;
}

// ============================================================================
// 批量操作结果
// ============================================================================

export interface BatchOperationResult {
  count: number;
  success: boolean;
  errors?: Array<{ id: string; error: string }>;
}

// ============================================================================
// 数据库连接状态
// ============================================================================

export interface DatabaseHealth {
  connected: boolean;
  latency: number;
  activeConnections: number;
  idleConnections: number;
  waitingConnections: number;
  lastError?: string;
  lastCheck: Date;
}
