/**
 * Config Domain Types - 配置领域类型
 */

import type { EntityId, Timestamp } from './base';

// ============================================================================
// 应用配置
// ============================================================================

export interface AppConfig {
  // 服务器配置
  server: ServerConfig;

  // 数据库配置
  database: DatabaseConfig;

  // 缓存配置
  cache: CacheConfig;

  // 区块链配置
  blockchain: BlockchainConfig;

  // 安全配置
  security: SecurityConfig;

  // 监控配置
  monitoring: MonitoringConfig;

  // 通知配置
  notification: NotificationConfig;
}

export interface ServerConfig {
  port: number;
  host: string;
  env: 'development' | 'staging' | 'production';
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  requestTimeout: number;
  maxRequestSize: string;
}

export interface DatabaseConfig {
  url: string;
  poolSize: number;
  timeout: number;
  ssl?: boolean;
}

export interface CacheConfig {
  type: 'redis' | 'memory';
  url?: string;
  ttl: number;
  maxSize: number;
}

export interface BlockchainConfig {
  defaultTimeout: number;
  maxRetries: number;
  confirmationBlocks: number;
  rpcRotation: boolean;
}

export interface SecurityConfig {
  jwtSecret: string;
  jwtExpiresIn: string;
  bcryptRounds: number;
  rateLimitWindow: number;
  rateLimitMax: number;
  encryptionKey: string;
}

export interface MonitoringConfig {
  enabled: boolean;
  metricsPort: number;
  tracingEnabled: boolean;
  profilingEnabled: boolean;
}

export interface NotificationConfig {
  email?: EmailConfig;
  slack?: WebhookConfig;
  telegram?: BotConfig;
  webhook?: WebhookConfig;
}

export interface EmailConfig {
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpPass: string;
  fromAddress: string;
}

export interface WebhookConfig {
  url: string;
  secret?: string;
  timeout: number;
  retries: number;
}

export interface BotConfig {
  token: string;
  chatId: string;
}

// ============================================================================
// 配置版本
// ============================================================================

export interface ConfigVersion {
  id: EntityId;
  configType: string;
  version: number;
  data: Record<string, unknown>;
  createdBy: string;
  createdAt: Timestamp;
  comment?: string;
}

export interface ConfigDiff {
  field: string;
  oldValue: unknown;
  newValue: unknown;
  type: 'added' | 'removed' | 'modified';
}

// ============================================================================
// Webhook 配置
// ============================================================================

export interface Webhook {
  id: EntityId;
  name: string;
  url: string;
  secret?: string;
  events: string[];
  active: boolean;
  headers?: Record<string, string>;
  timeout: number;
  retries: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  lastTriggeredAt?: Timestamp;
  lastError?: string;
}

// ============================================================================
// 通知渠道
// ============================================================================

export interface NotificationChannel {
  id: EntityId;
  type: 'email' | 'slack' | 'telegram' | 'webhook' | 'pagerduty';
  name: string;
  config: Record<string, unknown>;
  enabled: boolean;
  verified: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
