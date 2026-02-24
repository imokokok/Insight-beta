import type { NextRequest } from 'next/server';

import { fetchAlertRules, createAlertRule } from '@/features/alerts/api';
import { ok, error } from '@/lib/api/apiResponse';
import { createAlertRuleSchema } from '@/lib/api/validation/schemas';
import { parseAndValidate } from '@/lib/api/validation/validate';
import { logger } from '@/shared/logger';

export async function GET() {
  try {
    const rules = await fetchAlertRules();
    return ok({ rules, total: rules.length, timestamp: new Date().toISOString() });
  } catch (err) {
    logger.error('Failed to fetch alert rules', { error: err });
    return error({ code: 'INTERNAL_ERROR', message: 'Failed to fetch alert rules' }, 500);
  }
}

export async function POST(request: NextRequest) {
  const parsed = await parseAndValidate(request, createAlertRuleSchema);
  if (!parsed.success) {
    return parsed.response;
  }

  const data = parsed.data;

  try {
    const rule = await createAlertRule({
      name: data.name,
      enabled: data.enabled ?? true,
      event: data.event,
      severity: data.severity ?? 'warning',
      protocols: data.protocols,
      chains: data.chains,
      symbols: data.symbols,
      params: data.params,
      channels: data.channels,
      recipients: data.recipients,
      cooldownMinutes: data.cooldownMinutes ?? 5,
      maxNotificationsPerHour: data.maxNotificationsPerHour ?? 10,
      runbook: data.runbook,
      owner: data.owner,
    });

    return ok({ rule, timestamp: new Date().toISOString() });
  } catch (err) {
    logger.error('Failed to create alert rule', { error: err });
    return error({ code: 'INTERNAL_ERROR', message: 'Failed to create alert rule' }, 500);
  }
}
