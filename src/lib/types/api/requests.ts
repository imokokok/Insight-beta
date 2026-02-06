/**
 * API Request Types - API 请求类型
 */

import type { EntityId, PaginationParams, TimeRange, SortParams } from '../domain/base';
import type { OracleProtocol, SupportedChain, OracleConfigPatch } from '../domain/oracle';
import type { AlertChannel, AlertEvent } from '../domain/security';

// ============================================================================
// 通用请求
// ============================================================================

export interface ListRequest extends PaginationParams {
  sort?: SortParams;
  search?: string;
}

export interface TimeRangeRequest extends ListRequest {
  timeRange?: TimeRange;
}

// ============================================================================
// Oracle 请求
// ============================================================================

export interface GetOracleConfigRequest {
  instanceId?: EntityId;
}

export interface UpdateOracleConfigRequest {
  instanceId?: EntityId;
  config: OracleConfigPatch;
}

export interface BatchUpdateOracleConfigRequest {
  updates: Array<{
    instanceId: EntityId;
    config: OracleConfigPatch;
  }>;
}

export interface CreateOracleInstanceRequest {
  name: string;
  protocol: OracleProtocol;
  chain: SupportedChain;
  config: OracleConfigPatch;
}

export interface ListOracleInstancesRequest extends ListRequest {
  protocols?: OracleProtocol[];
  chains?: SupportedChain[];
  enabled?: boolean;
}

// ============================================================================
// 价格请求
// ============================================================================

export interface GetPriceRequest {
  symbol: string;
  protocols?: OracleProtocol[];
}

export interface GetPriceHistoryRequest extends TimeRangeRequest {
  symbol: string;
  granularity?: '1m' | '5m' | '15m' | '1h' | '4h' | '1d';
}

export interface ComparePricesRequest {
  symbol: string;
  protocols: OracleProtocol[];
}

// ============================================================================
// UMA 请求
// ============================================================================

export interface ListAssertionsRequest extends ListRequest {
  protocol?: OracleProtocol;
  chain?: SupportedChain;
  status?: 'Pending' | 'Disputed' | 'Resolved' | 'Expired';
  asserter?: string;
}

export interface ListDisputesRequest extends ListRequest {
  protocol?: OracleProtocol;
  chain?: SupportedChain;
  status?: 'Voting' | 'Pending Execution' | 'Executed';
  disputer?: string;
}

export interface SubmitEvidenceRequest {
  disputeId: EntityId;
  evidenceType: 'document' | 'link' | 'text';
  content: string;
  metadata?: Record<string, unknown>;
}

// ============================================================================
// 安全请求
// ============================================================================

export interface ListDetectionsRequest extends ListRequest {
  type?: string;
  severity?: 'info' | 'warning' | 'critical';
  status?: 'open' | 'investigating' | 'resolved';
  protocol?: OracleProtocol;
  chain?: SupportedChain;
}

export interface ReviewDetectionRequest {
  status: 'investigating' | 'resolved' | 'false_positive';
  resolution?: string;
}

export interface CreateAlertRuleRequest {
  name: string;
  event: AlertEvent;
  severity: 'info' | 'warning' | 'critical';
  channels: AlertChannel[];
  cooldownMinutes?: number;
  params?: Record<string, unknown>;
}

export interface UpdateAlertRuleRequest {
  enabled?: boolean;
  channels?: AlertChannel[];
  params?: Record<string, unknown>;
}

export interface AcknowledgeAlertRequest {
  alertId: EntityId;
}

export interface ResolveAlertRequest {
  alertId: EntityId;
  resolution: string;
}

// ============================================================================
// 配置请求
// ============================================================================

export interface CreateWebhookRequest {
  name: string;
  url: string;
  events: string[];
  secret?: string;
  headers?: Record<string, string>;
}

export interface TestWebhookRequest {
  webhookId: EntityId;
}

export interface CreateNotificationChannelRequest {
  type: 'email' | 'slack' | 'telegram' | 'webhook';
  name: string;
  config: Record<string, unknown>;
}
