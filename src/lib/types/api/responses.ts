/**
 * API Response Types - API 响应类型
 */

import type { ApiResponse, PaginatedResult } from '../domain/base';
import type {
  OracleInstance,
  OracleConfig,
  OracleStats,
  SyncState,
  ConfigTemplate,
} from '../domain/oracle';
import type { PriceFeed, PriceHistory, CrossOracleComparison } from '../domain/price';
import type { Assertion, Dispute, UMAUserStats, UMALeaderboardEntry } from '../domain/uma';
import type { SecurityDetection, Alert, AlertRule, AuditLog } from '../domain/security';

// ============================================================================
// Oracle 响应
// ============================================================================

export type GetOracleConfigResponse = ApiResponse<OracleConfig>;

export type UpdateOracleConfigResponse = ApiResponse<OracleConfig>;

export type ListOracleInstancesResponse = ApiResponse<PaginatedResult<OracleInstance>>;

export type GetOracleStatsResponse = ApiResponse<OracleStats>;

export type GetSyncStateResponse = ApiResponse<SyncState>;

export type ListConfigTemplatesResponse = ApiResponse<ConfigTemplate[]>;

// ============================================================================
// 价格响应
// ============================================================================

export type GetPriceResponse = ApiResponse<PriceFeed>;

export type GetPricesResponse = ApiResponse<PriceFeed[]>;

export type GetPriceHistoryResponse = ApiResponse<PriceHistory[]>;

export type ComparePricesResponse = ApiResponse<CrossOracleComparison>;

// ============================================================================
// UMA 响应
// ============================================================================

export type ListAssertionsResponse = ApiResponse<PaginatedResult<Assertion>>;

export type GetAssertionResponse = ApiResponse<Assertion>;

export type ListDisputesResponse = ApiResponse<PaginatedResult<Dispute>>;

export type GetDisputeResponse = ApiResponse<Dispute>;

export type GetUMAUserStatsResponse = ApiResponse<UMAUserStats>;

export type GetUMALeaderboardResponse = ApiResponse<UMALeaderboardEntry[]>;

// ============================================================================
// 安全响应
// ============================================================================

export type ListDetectionsResponse = ApiResponse<PaginatedResult<SecurityDetection>>;

export type GetDetectionResponse = ApiResponse<SecurityDetection>;

export type ListAlertsResponse = ApiResponse<PaginatedResult<Alert>>;

export type ListAlertRulesResponse = ApiResponse<AlertRule[]>;

export type GetAuditLogsResponse = ApiResponse<PaginatedResult<AuditLog>>;

// ============================================================================
// 健康检查
// ============================================================================

export interface HealthCheckDetails {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  version: string;
  uptime: number;
  checks: {
    database: boolean;
    cache: boolean;
    blockchain: boolean;
  };
}

export type HealthCheckResponse = ApiResponse<HealthCheckDetails>;

// ============================================================================
// 错误响应
// ============================================================================

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
    validationErrors?: ValidationError[];
  };
  meta: {
    requestId: string;
    timestamp: string;
    durationMs: number;
  };
}
