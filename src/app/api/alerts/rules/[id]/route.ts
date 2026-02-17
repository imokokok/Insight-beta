import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { logger } from '@/shared/logger';
import type { AlertRule, AlertEvent, AlertSeverity } from '@/types/oracle/alert';

declare global {
  var rulesStore: AlertRule[] | undefined;
}

function getRulesStore(): AlertRule[] {
  if (!globalThis.rulesStore) {
    globalThis.rulesStore = [
      {
        id: 'rule-1',
        name: 'High Price Deviation Alert',
        enabled: true,
        event: 'price_deviation',
        severity: 'critical',
        protocols: ['chainlink', 'pyth'],
        chains: ['ethereum', 'arbitrum'],
        symbols: ['BTC', 'ETH'],
        channels: ['webhook', 'telegram'],
        recipients: ['alerts@example.com'],
        cooldownMinutes: 5,
        maxNotificationsPerHour: 10,
        runbook: 'https://docs.example.com/runbooks/price-deviation',
        owner: 'admin',
      },
      {
        id: 'rule-2',
        name: 'Stale Price Warning',
        enabled: true,
        event: 'price_stale',
        severity: 'warning',
        protocols: ['chainlink'],
        chains: ['ethereum'],
        channels: ['email'],
        recipients: ['ops@example.com'],
        cooldownMinutes: 10,
        maxNotificationsPerHour: 5,
        owner: 'admin',
      },
      {
        id: 'rule-3',
        name: 'Assertion Expiring Soon',
        enabled: false,
        event: 'assertion_expiring',
        severity: 'warning',
        protocols: ['uma'],
        chains: ['ethereum', 'polygon'],
        channels: ['webhook', 'slack'],
        recipients: ['uma-alerts@example.com'],
        cooldownMinutes: 30,
        maxNotificationsPerHour: 3,
        owner: 'uma-team',
      },
    ];
  }
  return globalThis.rulesStore;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const rules = getRulesStore();
    const rule = rules.find((r) => r.id === id);

    if (!rule) {
      return NextResponse.json(
        { ok: false, error: 'Alert rule not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ok: true,
      data: rule,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Failed to fetch alert rule', { error });
    return NextResponse.json(
      { ok: false, error: 'Failed to fetch alert rule' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const rules = getRulesStore();
    const index = rules.findIndex((r) => r.id === id);

    if (index === -1) {
      return NextResponse.json(
        { ok: false, error: 'Alert rule not found' },
        { status: 404 }
      );
    }

    const existingRule = rules[index];
    if (!existingRule) {
      return NextResponse.json(
        { ok: false, error: 'Alert rule not found' },
        { status: 404 }
      );
    }

    const updatedRule: AlertRule = {
      id: existingRule.id,
      name: body.name ?? existingRule.name,
      enabled: body.enabled ?? existingRule.enabled,
      event: (body.event as AlertEvent) ?? existingRule.event,
      severity: (body.severity as AlertSeverity) ?? existingRule.severity,
      protocols: body.protocols ?? existingRule.protocols,
      chains: body.chains ?? existingRule.chains,
      instances: body.instances ?? existingRule.instances,
      symbols: body.symbols ?? existingRule.symbols,
      params: body.params ?? existingRule.params,
      channels: body.channels ?? existingRule.channels,
      recipients: body.recipients ?? existingRule.recipients,
      cooldownMinutes: body.cooldownMinutes ?? existingRule.cooldownMinutes,
      maxNotificationsPerHour: body.maxNotificationsPerHour ?? existingRule.maxNotificationsPerHour,
      runbook: body.runbook ?? existingRule.runbook,
      owner: body.owner ?? existingRule.owner,
    };

    rules[index] = updatedRule;
    globalThis.rulesStore = rules;

    return NextResponse.json({
      ok: true,
      data: updatedRule,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Failed to update alert rule', { error });
    return NextResponse.json(
      { ok: false, error: 'Failed to update alert rule' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const rules = getRulesStore();
    const index = rules.findIndex((r) => r.id === id);

    if (index === -1) {
      return NextResponse.json(
        { ok: false, error: 'Alert rule not found' },
        { status: 404 }
      );
    }

    rules.splice(index, 1);
    globalThis.rulesStore = rules;

    return NextResponse.json({
      ok: true,
      message: 'Alert rule deleted successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Failed to delete alert rule', { error });
    return NextResponse.json(
      { ok: false, error: 'Failed to delete alert rule' },
      { status: 500 }
    );
  }
}
