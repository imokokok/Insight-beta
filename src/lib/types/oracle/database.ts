/**
 * Database Types - 数据库行类型定义
 */

import type { AssertionStatus } from './assertion';
import type { OracleChain } from './chain';

export interface DbAssertionRow {
  id: string;
  instance_id: string;
  chain: OracleChain;
  asserter: string;
  protocol: string;
  market: string;
  assertion_data: string;
  asserted_at: Date;
  liveness_ends_at: Date;
  block_number?: string | number | null;
  log_index?: number | null;
  resolved_at: Date | null;
  settlement_resolution: boolean | null;
  status: AssertionStatus;
  bond_usd: string | number;
  disputer: string | null;
  tx_hash: string;
}

export interface DbDisputeRow {
  id: string;
  instance_id: string;
  chain: OracleChain;
  assertion_id: string;
  market: string;
  reason: string;
  disputer: string;
  disputed_at: Date;
  voting_ends_at: Date | null;
  tx_hash?: string | null;
  block_number?: string | number | null;
  log_index?: number | null;
  status: string;
  votes_for: string | number;
  votes_against: string | number;
  total_votes: string | number;
}

export type AuditLogEntry = {
  id: number;
  createdAt: string;
  actor: string | null;
  action: string;
  entityType: string | null;
  entityId: string | null;
  details: unknown;
};
