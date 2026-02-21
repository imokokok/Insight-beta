import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import type { API3AlertConfig, API3AlertType } from '@/features/oracle/api3/types/api3';

const alertConfigs: Map<string, API3AlertConfig> = new Map();

const mockAlertConfigs: API3AlertConfig[] = [
  {
    id: '1',
    type: 'price_deviation',
    name: 'BTC 价格偏差告警',
    enabled: true,
    threshold: 5,
    targetDapi: 'BTC/USD',
    chain: 'ethereum',
    createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: '2',
    type: 'update_frequency',
    name: '更新频率异常告警',
    enabled: true,
    threshold: 300,
    targetDapi: 'ETH/USD',
    chain: 'ethereum',
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: '3',
    type: 'airnode_offline',
    name: 'Airnode 离线告警',
    enabled: true,
    threshold: 0,
    targetAirnode: '0xF6d2D3...',
    chain: 'ethereum',
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

mockAlertConfigs.forEach((config) => {
  alertConfigs.set(config.id, config);
});

function generateId(): string {
  return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function validateAlertConfig(config: Partial<API3AlertConfig>): string[] {
  const errors: string[] = [];

  if (!config.type) {
    errors.push('Alert type is required');
  } else if (!['price_deviation', 'update_frequency', 'airnode_offline'].includes(config.type)) {
    errors.push('Invalid alert type');
  }

  if (!config.name) {
    errors.push('Alert name is required');
  }

  if (config.type === 'price_deviation' || config.type === 'update_frequency') {
    if (!config.targetDapi) {
      errors.push('Target dAPI is required for price deviation and update frequency alerts');
    }
  }

  if (config.type === 'airnode_offline') {
    if (!config.targetAirnode) {
      errors.push('Target Airnode is required for airnode offline alerts');
    }
  }

  if (config.threshold !== undefined && config.threshold < 0) {
    errors.push('Threshold must be a positive number');
  }

  return errors;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') as API3AlertType | null;
    const enabled = searchParams.get('enabled');
    const id = searchParams.get('id');

    let configs = Array.from(alertConfigs.values());

    if (id) {
      const config = alertConfigs.get(id);
      if (!config) {
        return NextResponse.json(
          { success: false, error: 'Alert config not found', code: 'NOT_FOUND' },
          { status: 404 },
        );
      }
      return NextResponse.json({
        success: true,
        data: config,
        timestamp: new Date().toISOString(),
      });
    }

    if (type) {
      configs = configs.filter((c) => c.type === type);
    }

    if (enabled !== null) {
      const isEnabled = enabled === 'true';
      configs = configs.filter((c) => c.enabled === isEnabled);
    }

    configs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const summary = {
      total: configs.length,
      byType: {
        price_deviation: configs.filter((c) => c.type === 'price_deviation').length,
        update_frequency: configs.filter((c) => c.type === 'update_frequency').length,
        airnode_offline: configs.filter((c) => c.type === 'airnode_offline').length,
      },
      enabled: configs.filter((c) => c.enabled).length,
      disabled: configs.filter((c) => !c.enabled).length,
    };

    return NextResponse.json({
      success: true,
      data: {
        alerts: configs,
        summary,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { success: false, error: message, code: 'INTERNAL_ERROR' },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updateData } = body;

    if (id) {
      const existing = alertConfigs.get(id);
      if (!existing) {
        return NextResponse.json(
          { success: false, error: 'Alert config not found', code: 'NOT_FOUND' },
          { status: 404 },
        );
      }

      const merged = { ...existing, ...updateData, updatedAt: new Date().toISOString() };
      const errors = validateAlertConfig(merged);
      if (errors.length > 0) {
        return NextResponse.json(
          { success: false, error: errors.join(', '), code: 'VALIDATION_ERROR' },
          { status: 400 },
        );
      }

      alertConfigs.set(id, merged);
      return NextResponse.json({
        success: true,
        data: merged,
        message: 'Alert config updated successfully',
        timestamp: new Date().toISOString(),
      });
    }

    const newConfig: API3AlertConfig = {
      id: generateId(),
      type: body.type,
      name: body.name,
      enabled: body.enabled ?? true,
      threshold: body.threshold ?? 0,
      targetDapi: body.targetDapi,
      targetAirnode: body.targetAirnode,
      chain: body.chain,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const errors = validateAlertConfig(newConfig);
    if (errors.length > 0) {
      return NextResponse.json(
        { success: false, error: errors.join(', '), code: 'VALIDATION_ERROR' },
        { status: 400 },
      );
    }

    alertConfigs.set(newConfig.id, newConfig);

    return NextResponse.json({
      success: true,
      data: newConfig,
      message: 'Alert config created successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { success: false, error: message, code: 'INTERNAL_ERROR' },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Alert ID is required', code: 'VALIDATION_ERROR' },
        { status: 400 },
      );
    }

    if (!alertConfigs.has(id)) {
      return NextResponse.json(
        { success: false, error: 'Alert config not found', code: 'NOT_FOUND' },
        { status: 404 },
      );
    }

    alertConfigs.delete(id);

    return NextResponse.json({
      success: true,
      message: 'Alert config deleted successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { success: false, error: message, code: 'INTERNAL_ERROR' },
      { status: 500 },
    );
  }
}
