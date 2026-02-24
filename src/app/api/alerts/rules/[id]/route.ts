import type { NextRequest } from 'next/server';

import { fetchAlertRuleById, updateAlertRule, deleteAlertRule } from '@/features/alerts/api';
import { ok, error } from '@/lib/api/apiResponse';
import { logger } from '@/shared/logger';

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const rule = await fetchAlertRuleById(id);

    if (!rule) {
      return error({ code: 'NOT_FOUND', message: 'Alert rule not found' }, 404);
    }

    return ok({ rule, timestamp: new Date().toISOString() });
  } catch (err) {
    logger.error('Failed to fetch alert rule', { error: err });
    return error({ code: 'INTERNAL_ERROR', message: 'Failed to fetch alert rule' }, 500);
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();

    const rule = await updateAlertRule(id, {
      name: body.name,
      enabled: body.enabled,
      event: body.event,
      severity: body.severity,
      protocols: body.protocols,
      chains: body.chains,
      symbols: body.symbols,
      params: body.params,
      channels: body.channels,
      recipients: body.recipients,
      cooldownMinutes: body.cooldownMinutes,
      maxNotificationsPerHour: body.maxNotificationsPerHour,
      runbook: body.runbook,
      owner: body.owner,
      silencedUntil: body.silencedUntil,
    });

    if (!rule) {
      return error({ code: 'NOT_FOUND', message: 'Alert rule not found' }, 404);
    }

    return ok({ rule, timestamp: new Date().toISOString() });
  } catch (err) {
    logger.error('Failed to update alert rule', { error: err });
    return error({ code: 'INTERNAL_ERROR', message: 'Failed to update alert rule' }, 500);
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const deleted = await deleteAlertRule(id);

    if (!deleted) {
      return error({ code: 'NOT_FOUND', message: 'Alert rule not found' }, 404);
    }

    return ok({
      success: true,
      message: 'Alert rule deleted',
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    logger.error('Failed to delete alert rule', { error: err });
    return error({ code: 'INTERNAL_ERROR', message: 'Failed to delete alert rule' }, 500);
  }
}
