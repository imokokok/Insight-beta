import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { withMiddleware, DEFAULT_RATE_LIMIT } from '@/lib/api/middleware';
import type { AlertRule, AlertEvent, AlertSeverity } from '@/types/oracle/alert';

const mockRules: AlertRule[] = [
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

let rulesStore: AlertRule[] = [...mockRules];

function generateId(): string {
  return `rule-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

async function handleGet(): Promise<NextResponse> {
  return NextResponse.json({
    ok: true,
    rules: rulesStore,
    total: rulesStore.length,
    timestamp: new Date().toISOString(),
  });
}

async function handlePost(request: NextRequest): Promise<NextResponse> {
  const body = await request.json();

  if (!body.name || !body.event) {
    return NextResponse.json(
      { ok: false, error: 'Missing required fields: name, event' },
      { status: 400 },
    );
  }

  const newRule: AlertRule = {
    id: generateId(),
    name: body.name,
    enabled: body.enabled ?? true,
    event: body.event as AlertEvent,
    severity: (body.severity as AlertSeverity) || 'warning',
    protocols: body.protocols,
    chains: body.chains,
    instances: body.instances,
    symbols: body.symbols,
    params: body.params,
    channels: body.channels || ['webhook'],
    recipients: body.recipients || [],
    cooldownMinutes: body.cooldownMinutes ?? 5,
    maxNotificationsPerHour: body.maxNotificationsPerHour ?? 10,
    runbook: body.runbook,
    owner: body.owner,
  };

  rulesStore.push(newRule);

  return NextResponse.json({
    ok: true,
    data: newRule,
    timestamp: new Date().toISOString(),
  });
}

export const GET = withMiddleware({
  rateLimit: DEFAULT_RATE_LIMIT,
  auth: { required: true },
  validate: { allowedMethods: ['GET'] },
})(handleGet);

export const POST = withMiddleware({
  rateLimit: DEFAULT_RATE_LIMIT,
  auth: { required: true },
  validate: { allowedMethods: ['POST'] },
})(handlePost);
