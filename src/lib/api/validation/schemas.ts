import { z } from 'zod';

export const notificationChannelTypeSchema = z.enum(['webhook', 'email', 'telegram', 'slack']);

export const notificationChannelConfigSchema = z.object({
  url: z.string().url().optional(),
  email: z.string().email().optional(),
  botToken: z.string().optional(),
  chatId: z.string().optional(),
  secret: z.string().optional(),
  headers: z.record(z.string()).optional(),
});

export const createNotificationChannelSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name must be at most 100 characters'),
  type: notificationChannelTypeSchema,
  enabled: z.boolean().optional().default(true),
  config: notificationChannelConfigSchema,
  description: z.string().optional(),
});

export const updateNotificationChannelSchema = createNotificationChannelSchema.partial();

export const alertEventSchema = z.enum([
  'price_deviation',
  'price_stale',
  'price_volatility_spike',
  'price_update_failed',
  'assertion_created',
  'assertion_expiring',
  'assertion_disputed',
  'assertion_settled',
  'dispute_created',
  'dispute_resolved',
  'voting_period_ending',
  'sync_error',
  'sync_stale',
  'rpc_failure',
  'contract_error',
  'high_latency',
  'low_uptime',
  'rate_limit_hit',
  'liveness_expiring',
  'contract_paused',
  'sync_backlog',
  'backlog_assertions',
  'backlog_disputes',
  'market_stale',
  'execution_delayed',
  'low_participation',
  'high_vote_divergence',
  'high_dispute_rate',
  'slow_api_request',
  'high_error_rate',
  'database_slow_query',
  'low_gas',
]);

export const alertSeveritySchema = z.enum(['info', 'warning', 'error', 'critical']);

export const alertChannelSchema = z.enum(['webhook', 'email', 'telegram', 'slack', 'pagerduty']);

export const createAlertRuleSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name must be at most 100 characters'),
  event: alertEventSchema,
  severity: alertSeveritySchema.optional().default('warning'),
  enabled: z.boolean().optional().default(true),
  protocols: z.array(z.string()).optional(),
  chains: z.array(z.string()).optional(),
  symbols: z.array(z.string()).optional(),
  params: z.record(z.unknown()).optional(),
  channels: z.array(alertChannelSchema).optional(),
  recipients: z.array(z.string()).optional(),
  cooldownMinutes: z.number().min(0, 'Cooldown minutes must be non-negative').optional(),
  maxNotificationsPerHour: z
    .number()
    .min(1, 'Max notifications per hour must be at least 1')
    .optional(),
  runbook: z.string().url('Runbook must be a valid URL').optional(),
  owner: z.string().optional(),
});

export const updateAlertRuleSchema = createAlertRuleSchema.partial();

export type CreateNotificationChannelInput = z.infer<typeof createNotificationChannelSchema>;
export type UpdateNotificationChannelInput = z.infer<typeof updateNotificationChannelSchema>;
export type CreateAlertRuleInput = z.infer<typeof createAlertRuleSchema>;
export type UpdateAlertRuleInput = z.infer<typeof updateAlertRuleSchema>;
